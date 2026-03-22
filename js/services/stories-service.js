import { auth, db, storage } from "../firebase-init.js";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const STORIES_COL = "stories";
const STORY_VIEWS_COL = "storyViews";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeMediaUrls(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean).map((x) => String(x));
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function chunk(arr, size = 10) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function buildStoryItems(storyDocId, storyData) {
  const urls = normalizeMediaUrls(storyData.imageUrl);
  return urls.map((mediaUrl, index) => ({
    storyKey: `${storyDocId}_${index}`,
    storyDocId,
    mediaIndex: index,
    mediaUrl,
    artisanId: storyData.artisanId || "",
    postId: storyData.postId || "",
    content: storyData.content || "",
    timestamp: toDate(storyData.timestamp),
    expiresAt: toDate(storyData.expiresAt),
    latitude: typeof storyData.latitude === "number" ? storyData.latitude : null,
    longitude: typeof storyData.longitude === "number" ? storyData.longitude : null,
    isAdminPost: storyData.isAdminPost === true,
  }));
}

function isExpiredStory(data) {
  const exp = toDate(data?.expiresAt);
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

async function fetchVendorsByIds(vendorIds) {
  if (!vendorIds.length) return new Map();
  const map = new Map();

  for (const ids of chunk(vendorIds, 10)) {
    const snap = await getDocs(query(collection(db, "vendors"), where(documentId(), "in", ids)));
    snap.forEach((d) => map.set(d.id, d.data() || {}));
  }

  return map;
}

export async function getViewedStoryKeySet(viewerId, storyKeys) {
  if (!viewerId || !storyKeys?.length) return new Set();
  const viewed = new Set();

  for (const keys of chunk([...new Set(storyKeys)], 10)) {
    const snap = await getDocs(
      query(
        collection(db, STORY_VIEWS_COL),
        where("viewerId", "==", viewerId),
        where("storyId", "in", keys)
      )
    );
    snap.forEach((d) => viewed.add(d.data()?.storyId));
  }

  return viewed;
}

export async function createStoryFromMediaUrls({
  mediaUrls,
  content = "",
  postId = "",
  latitude = null,
  longitude = null,
  isAdminPost = false,
  expiresInHours = 48,
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");
  const now = new Date();

  const payload = {
    artisanId: user.uid,
    postId: postId || "",
    content: String(content || ""),
    imageUrl: normalizeMediaUrls(mediaUrls),
    timestamp: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + expiresInHours * 60 * 60 * 1000)),
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    isAdminPost: isAdminPost === true,
  };

  const refDoc = await addDoc(collection(db, STORIES_COL), payload);
  return refDoc.id;
}

export async function uploadStoryFiles({
  files,
  content = "",
  postId = "",
  latitude = null,
  longitude = null,
  isAdminPost = false,
  expiresInHours = 48,
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");

  const fileList = Array.from(files || []).filter(Boolean);
  if (!fileList.length) throw new Error("No files selected.");

  const mediaUrls = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const extRaw = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `stories/${user.uid}/${Date.now()}_${i}.${ext}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
    const url = await getDownloadURL(storageRef);
    mediaUrls.push(url);
  }

  return createStoryFromMediaUrls({
    mediaUrls,
    content,
    postId,
    latitude,
    longitude,
    isAdminPost,
    expiresInHours,
  });
}

export async function getStoriesForVendor(
  vendorId,
  { viewerId = auth.currentUser?.uid || "", hoursBack = 48 } = {}
) {
  if (!vendorId) return [];

  const cutoff = Timestamp.fromDate(new Date(Date.now() - hoursBack * 60 * 60 * 1000));

  const snap = await getDocs(
    query(
      collection(db, STORIES_COL),
      where("artisanId", "==", vendorId),
      where("timestamp", ">", cutoff),
      orderBy("timestamp", "asc")
    )
  );

  const items = [];
  const storyKeys = [];

  snap.forEach((d) => {
    const data = d.data() || {};
    if (isExpiredStory(data)) return;
    const perDocItems = buildStoryItems(d.id, data);
    perDocItems.forEach((item) => {
      items.push(item);
      storyKeys.push(item.storyKey);
    });
  });

  if (!viewerId || !storyKeys.length) {
    return items.map((x) => ({ ...x, isViewed: false }));
  }

  const viewedSet = await getViewedStoryKeySet(viewerId, storyKeys);
  return items.map((x) => ({
    ...x,
    isViewed: viewedSet.has(x.storyKey),
  }));
}

export async function markStoryViewed(storyKey, viewerId = auth.currentUser?.uid) {
  if (!viewerId || !storyKey) return;

  const safe = String(storyKey).replace(/[^\w-]/g, "_");
  const id = `${viewerId}_${safe}`;

  await setDoc(
    doc(db, STORY_VIEWS_COL, id),
    {
      viewerId,
      storyId: storyKey,
      viewedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function markStoriesViewed(storyKeys, viewerId = auth.currentUser?.uid) {
  if (!viewerId || !storyKeys?.length) return;
  await Promise.all([...new Set(storyKeys)].map((k) => markStoryViewed(k, viewerId)));
}

export function subscribeStoryVendors({
  viewerId = auth.currentUser?.uid || "",
  customerLocation = null,
  useLocationFilter = false,
  radiusKm = 10,
  hoursBack = 48,
  onData,
  onError = console.error,
}) {
  if (typeof onData !== "function") throw new Error("onData callback is required");

  let seq = 0;
  const cutoff = Timestamp.fromDate(new Date(Date.now() - hoursBack * 60 * 60 * 1000));

  const q = query(
    collection(db, STORIES_COL),
    where("timestamp", ">", cutoff),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(
    q,
    async (snap) => {
      const run = ++seq;
      const groups = new Map();

      snap.forEach((d) => {
        const data = d.data() || {};
        if (isExpiredStory(data)) return;

        const artisanId = data.artisanId;
        if (!artisanId) return;

        if (useLocationFilter && customerLocation) {
          const lat = Number(data.latitude);
          const lng = Number(data.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const dist = haversineKm(customerLocation, { lat, lng });
            if (dist > radiusKm) return;
          }
        }

        const prev = groups.get(artisanId) || {
          artisanId,
          latestTs: 0,
          docs: [],
        };

        const ts = toDate(data.timestamp)?.getTime() || 0;
        prev.latestTs = Math.max(prev.latestTs, ts);
        prev.docs.push({ id: d.id, data });

        groups.set(artisanId, prev);
      });

      const vendorIds = [...groups.keys()];
      const vendorMap = await fetchVendorsByIds(vendorIds);

      const allStoryKeys = [];
      const prepared = vendorIds.map((artisanId) => {
        const g = groups.get(artisanId);
        const items = [];
        g.docs.forEach((x) => {
          const docItems = buildStoryItems(x.id, x.data);
          docItems.forEach((it) => {
            items.push(it);
            allStoryKeys.push(it.storyKey);
          });
        });
        return { artisanId, latestTs: g.latestTs, items };
      });

      const viewedSet = viewerId ? await getViewedStoryKeySet(viewerId, allStoryKeys) : new Set();

      if (run !== seq) return;

      const rows = prepared.map((v) => {
        const vendor = vendorMap.get(v.artisanId) || {};
        const unseenCount = v.items.filter((x) => !viewedSet.has(x.storyKey)).length;

        return {
          artisanId: v.artisanId,
          name: vendor.name || "Artisan",
          title: vendor.title || "",
          profileImage: vendor.profileImage || vendor.imageUrl || "",
          latestTimestampMs: v.latestTs,
          storyCount: v.items.length,
          storyKeys: v.items.map((x) => x.storyKey),
          unseenCount,
          hasUnseen: unseenCount > 0,
        };
      });

      rows.sort((a, b) => {
        if (a.artisanId === viewerId) return -1;
        if (b.artisanId === viewerId) return 1;
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
        return b.latestTimestampMs - a.latestTimestampMs;
      });

      onData(rows);
    },
    onError
  );
}

export async function deleteMyExpiredStories() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");

  const snap = await getDocs(query(collection(db, STORIES_COL), where("artisanId", "==", user.uid)));

  const now = Date.now();
  const expiredRefs = [];

  snap.forEach((d) => {
    const exp = toDate(d.data()?.expiresAt);
    if (exp && exp.getTime() < now) expiredRefs.push(d.ref);
  });

  await Promise.all(expiredRefs.map((r) => deleteDoc(r)));
  return expiredRefs.length;
}
