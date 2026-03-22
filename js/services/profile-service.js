import { auth, db, storage } from "../firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  GeoPoint,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const s = (v) => (v == null ? "" : String(v));

function parseSkills(value) {
  if (Array.isArray(value)) return value.map((x) => s(x).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function toMillis(v) {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  if (typeof v === "number") return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function parseLocationInput(text) {
  const raw = s(text).trim();
  if (!raw) return { raw: "", geoPoint: null, lat: null, lng: null };
  const parts = raw.split(",").map((x) => x.trim());
  if (parts.length === 2) {
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { raw, geoPoint: new GeoPoint(lat, lng), lat, lng };
    }
  }
  return { raw, geoPoint: null, lat: null, lng: null };
}

function getLocationData(data) {
  const loc = data?.location;
  if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
    return { lat: loc.latitude, lng: loc.longitude, text: `${loc.latitude}, ${loc.longitude}` };
  }
  if (typeof loc === "string" && loc.trim()) {
    const parsed = parseLocationInput(loc);
    return { lat: parsed.lat, lng: parsed.lng, text: loc };
  }
  if (typeof data?.lat === "number" && typeof data?.lng === "number") {
    return { lat: data.lat, lng: data.lng, text: `${data.lat}, ${data.lng}` };
  }
  return { lat: null, lng: null, text: "" };
}

function normalizeProfile(uid, role, data) {
  const loc = getLocationData(data);
  const profileImage = data?.profileImage || data?.profilePic || data?.avatar || data?.imageUrl || "";
  const coverImage = data?.coverImage || data?.coverPhoto || data?.bannerImage || "";

  return {
    uid,
    role,
    name: role === "artisan" ? data?.name || data?.username || "" : data?.username || data?.name || "",
    email: data?.email || auth.currentUser?.email || "",
    phone: data?.phone || data?.phoneNumber || "",
    address: data?.address || "",
    title: data?.title || "",
    bio: data?.bio || "",
    skills: Array.isArray(data?.skills) ? data.skills : parseSkills(data?.skills),
    subscriptionStatus: data?.subscriptionStatus || "",
    isVerified: data?.isVerified === true,
    rating: typeof data?.rating === "number" ? data.rating : 0,
    ratingCount: typeof data?.ratingCount === "number" ? data.ratingCount : 0,
    profileImage,
    coverImage,
    locationText: loc.text,
    lat: loc.lat,
    lng: loc.lng,
    raw: data || {},
  };
}

async function resolveProfileRef(uid) {
  const vendorRef = doc(db, "vendors", uid);
  const vendorSnap = await getDoc(vendorRef);
  if (vendorSnap.exists()) return { role: "artisan", ref: vendorRef, data: vendorSnap.data() };

  const customerRef = doc(db, "customers", uid);
  const customerSnap = await getDoc(customerRef);
  if (customerSnap.exists()) return { role: "customer", ref: customerRef, data: customerSnap.data() };

  throw new Error("No profile found in vendors/customers for this user.");
}

async function updateIfExists(collectionName, uid, payload) {
  if (!payload || !Object.keys(payload).length) return;
  const target = doc(db, collectionName, uid);
  const snap = await getDoc(target);
  if (snap.exists()) await updateDoc(target, payload);
}

async function uploadImage(uid, file, kind) {
  if (!file) return "";
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "jpg";
  const path =
    kind === "cover"
      ? `cover_images/${uid}_cover_${Date.now()}.${safeExt}`
      : `profile_images/${uid}_profile_${Date.now()}.${safeExt}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");
  const resolved = await resolveProfileRef(user.uid);
  return normalizeProfile(user.uid, resolved.role, resolved.data);
}

export async function getProfileById(uid) {
  if (!uid) throw new Error("Profile id is required.");
  const resolved = await resolveProfileRef(uid);
  return normalizeProfile(uid, resolved.role, resolved.data);
}

export async function subscribeCurrentUserProfile(onChange, onError = console.error) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");
  const { role, ref } = await resolveProfileRef(user.uid);
  return onSnapshot(
    ref,
    (snap) => onChange(normalizeProfile(user.uid, role, snap.data() || {})),
    onError
  );
}

export async function subscribeProfileById(uid, onChange, onError = console.error) {
  if (!uid) throw new Error("Profile id is required.");
  const { role, ref } = await resolveProfileRef(uid);
  return onSnapshot(
    ref,
    (snap) => onChange(normalizeProfile(uid, role, snap.data() || {})),
    onError
  );
}

export async function updateCurrentUserProfile(input = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");

  const { role, ref: profileRef } = await resolveProfileRef(user.uid);

  let profileImageUrl = "";
  let coverImageUrl = "";

  if (input.profileImageFile instanceof File) {
    profileImageUrl = await uploadImage(user.uid, input.profileImageFile, "profile");
  }
  if (input.coverImageFile instanceof File) {
    coverImageUrl = await uploadImage(user.uid, input.coverImageFile, "cover");
  }

  const payload = { updatedAt: serverTimestamp() };

  if (hasOwn(input, "name")) {
    const name = s(input.name).trim();
    if (role === "artisan") payload.name = name;
    if (role === "customer") {
      payload.username = name;
      payload.name = name;
    }
  }

  if (hasOwn(input, "phone")) {
    const phone = s(input.phone).trim();
    if (role === "artisan") payload.phone = phone;
    if (role === "customer") payload.phoneNumber = phone;
  }

  if (hasOwn(input, "address")) payload.address = s(input.address).trim();
  if (hasOwn(input, "title")) payload.title = s(input.title).trim();
  if (hasOwn(input, "bio")) payload.bio = s(input.bio).trim();

  if (hasOwn(input, "skills")) payload.skills = parseSkills(input.skills);

  if (hasOwn(input, "locationText")) {
    const loc = parseLocationInput(input.locationText);
    if (role === "artisan") {
      payload.location = loc.geoPoint || loc.raw;
    } else if (loc.lat != null && loc.lng != null) {
      payload.lat = loc.lat;
      payload.lng = loc.lng;
    }
  }

  if (profileImageUrl || hasOwn(input, "profileImageUrl")) {
    const url = profileImageUrl || s(input.profileImageUrl).trim();
    if (url) {
      payload.profileImage = url;
      if (role === "customer") payload.imageUrl = url;
    }
  }

  if (coverImageUrl || hasOwn(input, "coverImageUrl")) {
    const url = coverImageUrl || s(input.coverImageUrl).trim();
    if (url) payload.coverImage = url;
  }

  await updateDoc(profileRef, payload);

  const mirrorPayload = {
    lastTimeOnline: serverTimestamp(),
  };
  if ("name" in payload) mirrorPayload.name = payload.name;
  if ("username" in payload) mirrorPayload.username = payload.username;
  if ("address" in payload) mirrorPayload.address = payload.address;
  if ("profileImage" in payload) {
    mirrorPayload.profileImage = payload.profileImage;
    mirrorPayload.imageUrl = payload.profileImage;
  }
  if ("phone" in payload) mirrorPayload.phone = payload.phone;
  if ("phoneNumber" in payload) mirrorPayload.phoneNumber = payload.phoneNumber;

  await Promise.all([
    updateIfExists("users", user.uid, mirrorPayload),
    updateIfExists("userId", user.uid, mirrorPayload),
  ]);

  return getCurrentUserProfile();
}

function mapPost(docSnap) {
  const d = docSnap.data() || {};
  const media = Array.isArray(d.imageUrl) ? d.imageUrl : d.imageUrl ? [d.imageUrl] : [];
  return {
    id: docSnap.id,
    ...d,
    imageUrl: media,
    likes: Array.isArray(d.likes) ? d.likes : [],
    timestampMs: toMillis(d.timestamp),
  };
}

export function subscribeArtisanPosts(artisanId, onChange, onError = console.error) {
  const q = query(collection(db, "posts"), where("artisanId", "==", artisanId), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(mapPost)), onError);
}

async function fetchPostsByIds(postIds) {
  if (!postIds.length) return [];
  const chunks = [];
  for (let i = 0; i < postIds.length; i += 10) chunks.push(postIds.slice(i, i + 10));

  const out = [];
  for (const ch of chunks) {
    const q = query(collection(db, "posts"), where(documentId(), "in", ch));
    const snap = await getDocs(q);
    snap.forEach((d) => out.push(mapPost(d)));
  }
  return out;
}

export function subscribeCustomerSavedPosts(customerId, onChange, onError = console.error) {
  let stop = false;
  let seq = 0;

  let idsA = [];
  let idsB = [];
  const timeA = new Map();
  const timeB = new Map();

  const emit = async () => {
    const run = ++seq;
    const ids = [...new Set([...idsA, ...idsB])];
    if (!ids.length) {
      onChange([]);
      return;
    }
    const posts = await fetchPostsByIds(ids);
    if (stop || run !== seq) return;

    posts.sort((x, y) => {
      const tx = Math.max(timeA.get(x.id) || 0, timeB.get(x.id) || 0);
      const ty = Math.max(timeA.get(y.id) || 0, timeB.get(y.id) || 0);
      return ty - tx;
    });

    onChange(posts);
  };

  const unsubA = onSnapshot(
    collection(db, "users", customerId, "favorites"),
    (snap) => {
      timeA.clear();
      idsA = snap.docs
        .map((d) => {
          const data = d.data() || {};
          const postId = data.postId || d.id;
          timeA.set(postId, toMillis(data.timestamp || data.savedAt));
          return postId;
        })
        .filter(Boolean);
      emit();
    },
    onError
  );

  const unsubB = onSnapshot(
    collection(db, "customers", customerId, "savedPosts"),
    (snap) => {
      timeB.clear();
      idsB = snap.docs
        .map((d) => {
          const data = d.data() || {};
          const postId = data.postId || d.id;
          timeB.set(postId, toMillis(data.savedAt || data.timestamp));
          return postId;
        })
        .filter(Boolean);
      emit();
    },
    onError
  );

  return () => {
    stop = true;
    unsubA();
    unsubB();
  };
}

export async function getVendorProfileStats(vendorId) {
  const snap = await getDocs(query(collection(db, "posts"), where("artisanId", "==", vendorId)));
  let totalLikes = 0;
  snap.forEach((d) => {
    const likes = d.data()?.likes;
    totalLikes += Array.isArray(likes) ? likes.length : 0;
  });
  return { postsCount: snap.size, totalLikes };
}

export async function getCustomerProfileStats(customerId) {
  const [jobs, favA, favB] = await Promise.all([
    getDocs(query(collection(db, "job_posts"), where("customerId", "==", customerId))),
    getDocs(collection(db, "users", customerId, "favorites")),
    getDocs(collection(db, "customers", customerId, "savedPosts")),
  ]);
  return {
    jobsPosted: jobs.size,
    savedPosts: new Set([
      ...favA.docs.map((d) => d.data()?.postId || d.id),
      ...favB.docs.map((d) => d.data()?.postId || d.id),
    ]).size,
  };
}

export async function signOutCurrentUser() {
  await signOut(auth);
}
