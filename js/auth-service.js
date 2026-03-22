import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  GeoPoint,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { auth, db } from "./firebase-init.js";

function generateReferralCode(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function applyReferralBonus(referralCode, newUserId, newUserName, newUserEmail) {
  if (!referralCode || !referralCode.trim()) return;

  const q = query(collection(db, "userId"), where("referralId", "==", referralCode.trim()));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const referrerRef = snap.docs[0].ref;
  await updateDoc(referrerRef, {
    points: increment(3),
    referredUsers: arrayUnion({
      userId: newUserId,
      name: newUserName,
      email: newUserEmail,
      signupDate: new Date().toISOString(),
    }),
  });
}

async function safeUpdateLastSeen(uid, role) {
  const refs = [
    doc(db, "userId", uid),
    doc(db, "users", uid),
    doc(db, role === "artisan" ? "vendors" : "customers", uid),
  ];

  for (const ref of refs) {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { lastTimeOnline: serverTimestamp() });
    }
  }
}

export async function registerCustomer({
  email,
  password,
  name,
  phoneNumber,
  address,
  referralCode = "",
  lat = 0,
  lng = 0,
}) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;
  const referralId = generateReferralCode();

  const batch = writeBatch(db);

  batch.set(doc(db, "referralId", referralId), {
    username: name.trim(),
    points: 0,
    address: address.trim(),
    referralId,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    users: uid,
    userId: uid,
    lastTimeOnline: serverTimestamp(),
    lat,
    lng,
    imageUrl: "",
    profileImage: "",
  });

  batch.set(doc(db, "customers", uid), {
    username: name.trim(),
    name: name.trim(),
    points: 0,
    address: address.trim(),
    blockedUsers: [],
    referralId,
    users: uid,
    userId: uid,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    imageUrl: "",
    profileImage: "",
    lat,
    lng,
    lastTimeOnline: serverTimestamp(),
  });

  batch.set(doc(db, "users", uid), {
    name: name.trim(),
    username: name.trim(),
    points: 0,
    address: address.trim(),
    referralId,
    users: uid,
    userId: uid,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    profileImage: "",
    imageUrl: "",
    lat,
    lng,
    accountType: "customer",
    lastTimeOnline: serverTimestamp(),
  });

  batch.set(doc(db, "userId", uid), {
    username: name.trim(),
    points: 0,
    address: address.trim(),
    referralId,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    users: uid,
    userId: uid,
    imageUrl: "",
    profileImage: "",
    lat,
    lng,
    lastTimeOnline: serverTimestamp(),
  });

  await batch.commit();
  await applyReferralBonus(referralCode, uid, name.trim(), email.trim());

  return { uid, role: "customer", referralId };
}

export async function registerArtisan({
  email,
  password,
  name,
  phoneNumber,
  address,
  title,
  bio,
  skills = [],
  referralCode = "",
  lat = 0,
  lng = 0,
}) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;
  const referralId = generateReferralCode();

  const batch = writeBatch(db);

  batch.set(doc(db, "referralId", referralId), {
    username: name.trim(),
    points: 0,
    address: address.trim(),
    referralId,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    userId: uid,
    users: uid,
    lastTimeOnline: serverTimestamp(),
    lat,
    lng,
    imageUrl: "",
    profileImage: "",
  });

  batch.set(doc(db, "vendors", uid), {
    userId: uid,
    users: uid,
    username: name.trim(),
    name: name.trim(),
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    phone: phoneNumber.trim(),
    address: address.trim(),
    locationAddress: address.trim(),
    location: new GeoPoint(lat, lng),
    lat,
    lng,
    title: title.trim(),
    bio: bio.trim(),
    skills,
    blockedUsers: [],
    accountType: "artisan",
    subscriptionStatus: "Free",
    rating: 0,
    ratingCount: 0,
    points: 0,
    referralId,
    imageUrl: "",
    profileImage: "",
    lastTimeOnline: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, "users", uid), {
    userId: uid,
    users: uid,
    name: name.trim(),
    username: name.trim(),
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    phone: phoneNumber.trim(),
    address: address.trim(),
    locationAddress: address.trim(),
    profileImage: "",
    imageUrl: "",
    lat,
    lng,
    location: new GeoPoint(lat, lng),
    title: title.trim(),
    bio: bio.trim(),
    skills,
    accountType: "artisan",
    subscriptionStatus: "Free",
    rating: 0,
    ratingCount: 0,
    points: 0,
    referralId,
    lastTimeOnline: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, "userId", uid), {
    username: name.trim(),
    points: 0,
    address: address.trim(),
    referralId,
    email: email.trim(),
    phoneNumber: phoneNumber.trim(),
    userId: uid,
    users: uid,
    imageUrl: "",
    profileImage: "",
    lat,
    lng,
    lastTimeOnline: serverTimestamp(),
  });

  await batch.commit();
  await applyReferralBonus(referralCode, uid, name.trim(), email.trim());

  return { uid, role: "artisan", referralId };
}

export async function loginUser({ email, password, role }) {
  const wantedRole = role === "artisan" ? "artisan" : "customer";
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;

  const [customerSnap, vendorSnap] = await Promise.all([
    getDoc(doc(db, "customers", uid)),
    getDoc(doc(db, "vendors", uid)),
  ]);

  if (wantedRole === "customer" && !customerSnap.exists()) {
    await signOut(auth);
    throw new Error("This account is not a customer account.");
  }

  if (wantedRole === "artisan" && !vendorSnap.exists()) {
    await signOut(auth);
    throw new Error("This account is not an artisan account.");
  }

  await safeUpdateLastSeen(uid, wantedRole);

  return {
    uid,
    role: wantedRole,
    profile: wantedRole === "artisan" ? vendorSnap.data() : customerSnap.data(),
  };
}

export async function forgotPassword(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  await signOut(auth);
}

export function mapAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "Email already in use.",
    "auth/invalid-email": "Invalid email address.",
    "auth/user-not-found": "No user found for this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid login details.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/network-request-failed": "Network error. Check your internet.",
  };
  return map[code] || error?.message || "Authentication failed.";
}
