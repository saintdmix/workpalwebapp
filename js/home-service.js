import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth, db } from "./firebase-init.js";

export const DEFAULT_LOCATION = { lat: 6.4456, lng: 7.5251 };

export function waitForAuthUser(timeoutMs = 10000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

export async function getUserProfile(uid) {
  const checks = [
    { col: "vendors", role: "artisan" },
    { col: "customers", role: "customer" },
    { col: "users", role: "unknown" },
    { col: "userId", role: "unknown" },
  ];

  for (const c of checks) {
    const snap = await getDoc(doc(db, c.col, uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid,
        role: c.role,
        sourceCollection: c.col,
        data,
        name: data.name || data.username || "User",
        image: data.profileImage || data.imageUrl || "",
      };
    }
  }

  return { uid, role: "unknown", sourceCollection: "", data: {}, name: "User", image: "" };
}

export async function updateHomepagePresence(uid, role = "customer") {
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

export function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function getBrowserLocation(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}

export function getLocationFromProfile(profile) {
  const data = profile?.data || {};
  const gp = data.location;
  const lat = typeof data.lat === "number" ? data.lat : gp?.latitude;
  const lng = typeof data.lng === "number" ? data.lng : gp?.longitude;

  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng };
  }
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function getNewsSlides(max = 10) {
  const snap = await getDocs(collection(db, "news"));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows
    .filter((r) => r.url)
    .slice(0, max)
    .map((r) => ({ id: r.id, url: r.url, screen: r.screen || "" }));
}

export async function getTopArtisansNear({
  lat,
  lng,
  maxDistanceKm = 10,
  maxFetch = 200,
  limitTo = 20,
}) {
  const q = query(collection(db, "vendors"), orderBy("rating", "desc"), limit(maxFetch));
  const snap = await getDocs(q);

  const rows = snap.docs
    .map((d) => {
      const data = d.data();
      const gp = data.location;
      const vLat = typeof data.lat === "number" ? data.lat : gp?.latitude;
      const vLng = typeof data.lng === "number" ? data.lng : gp?.longitude;
      if (typeof vLat !== "number" || typeof vLng !== "number") return null;

      const distanceKm = haversineKm(lat, lng, vLat, vLng);
      return {
        id: d.id,
        userId: data.userId || data.users || d.id,
        name: data.name || data.username || "Unknown",
        title: data.title || "Professional",
        rating: Number(data.rating || 0),
        profileImage: data.profileImage || data.imageUrl || "",
        distanceKm,
      };
    })
    .filter(Boolean)
    .filter((x) => x.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limitTo);

  return rows;
}

export async function getPromotedPosts(max = 10) {
  const q = query(
    collection(db, "posts"),
    where("type", "==", "promotedPost"),
    orderBy("timestamp", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOpenJobs(max = 20) {
  const q = query(
    collection(db, "job_posts"),
    where("status", "==", "open"),
    orderBy("timestamp", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
