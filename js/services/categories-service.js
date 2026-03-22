import { db } from "../firebase-init.js";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  ALL_CATEGORIES,
  buildCategoryAliases,
  filterCategories,
} from "./categories-config.js";

const vendorsCol = collection(db, "vendors");

function parseLocation(value, fallbackLat, fallbackLng) {
  if (value && typeof value.latitude === "number" && typeof value.longitude === "number") {
    return { lat: value.latitude, lng: value.longitude };
  }
  if (value && typeof value.lat === "number" && typeof value.lng === "number") {
    return { lat: value.lat, lng: value.lng };
  }
  if (typeof value === "string") {
    const parts = value.split(",").map((x) => x.trim());
    if (parts.length === 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
    return { lat: fallbackLat, lng: fallbackLng };
  }
  return null;
}

function toRad(d) {
  return (d * Math.PI) / 180;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function toVendor(docSnap, customerLocation) {
  const d = docSnap.data() || {};
  const location = parseLocation(d.location, d.lat, d.lng);

  const subscriptionStatus = String(d.subscriptionStatus || "").trim().toLowerCase();
  const isOpenToWork = subscriptionStatus === "premium";
  const isFeatured = subscriptionStatus === "active" || subscriptionStatus === "premium";

  const v = {
    id: docSnap.id,
    userId: d.userId || docSnap.id,
    name: d.name || "Unknown",
    title: d.title || "Professional",
    bio: d.bio || "",
    skills: Array.isArray(d.skills) ? d.skills : [],
    profileImage: d.profileImage || d.imageUrl || "",
    rating: typeof d.rating === "number" ? d.rating : 0,
    reviewCount: typeof d.reviewCount === "number" ? d.reviewCount : 0,
    subscriptionStatus,
    isOpenToWork,
    isFeatured,
    location,
    raw: d,
  };

  if (customerLocation && location) {
    v.distanceKm = distanceKm(customerLocation, location);
  } else {
    v.distanceKm = null;
  }

  return v;
}

function matchesSearch(vendor, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return true;

  const hay = [vendor.name, vendor.title, vendor.bio, ...(vendor.skills || [])]
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

export function subscribeCategoryArtisans({
  category,
  customerLocation = null,
  search = "",
  within10km = false,
  openToWork = false,
  sortBy = "top_rated",
  onData,
  onError = console.error,
}) {
  if (!category) throw new Error("category is required");
  if (typeof onData !== "function") throw new Error("onData callback is required");

  const aliases = buildCategoryAliases(category);
  const q = query(vendorsCol, where("skills", "array-contains-any", aliases));

  return onSnapshot(
    q,
    (snap) => {
      let rows = snap.docs.map((d) => toVendor(d, customerLocation));

      if (openToWork) rows = rows.filter((x) => x.isOpenToWork);
      if (within10km && customerLocation) {
        rows = rows.filter((x) => x.distanceKm !== null && x.distanceKm <= 10);
      }

      rows = rows.filter((x) => matchesSearch(x, search));

      if (sortBy === "distance" && customerLocation) {
        rows.sort((a, b) => {
          const da = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
          const db = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
          return da - db;
        });
      } else {
        rows.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return a.name.localeCompare(b.name);
        });
      }

      onData(rows);
    },
    onError
  );
}

export function getBrowserLocation(options = {}) {
  const finalOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    ...options,
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      finalOptions
    );
  });
}

export async function getCategoryCounts() {
  const snap = await getDocs(vendorsCol);
  const counts = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0]));
  const aliasesMap = new Map(
    ALL_CATEGORIES.map((cat) => [cat, buildCategoryAliases(cat).map((x) => x.toLowerCase())])
  );

  for (const docSnap of snap.docs) {
    const d = docSnap.data() || {};
    const skills = Array.isArray(d.skills) ? d.skills : [];
    const skillSet = new Set(skills.map((x) => String(x).toLowerCase().trim()));

    for (const cat of ALL_CATEGORIES) {
      const aliases = aliasesMap.get(cat) || [];
      if (aliases.some((a) => skillSet.has(a))) {
        counts[cat] += 1;
      }
    }
  }

  return counts;
}

export async function getAllCategories({ search = "", includeCounts = true } = {}) {
  const names = filterCategories(search);

  if (!includeCounts) {
    return names.map((name) => ({ name, count: null }));
  }

  const counts = await getCategoryCounts();
  return names.map((name) => ({
    name,
    count: counts[name] || 0,
  }));
}
