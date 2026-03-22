import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

export function getBrowserLocation(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function toMediaList(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function toStringList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw == null) return [];
  return [String(raw)];
}

function kmBetween(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function postDistanceKm(post, userLocation) {
  if (!userLocation) return 0;
  const lat = typeof post.latitude === "number" ? post.latitude : null;
  const lng = typeof post.longitude === "number" ? post.longitude : null;
  if (lat == null || lng == null) return 0;
  return kmBetween(userLocation.lat, userLocation.lng, lat, lng);
}

function isPostExpired(post) {
  if (!post.dueDate) return false;
  return toMillis(post.dueDate) < Date.now();
}

function normalizePost(docSnap, userLocation) {
  const data = docSnap.data() || {};
  const likes = toStringList(data.likes);

  // Collect all media from every possible field
  const mediaSet = new Set();
  toMediaList(data.mediaUrls).forEach((u) => mediaSet.add(u));
  toMediaList(data.imageUrl).forEach((u) => mediaSet.add(u));
  toMediaList(data.images).forEach((u) => mediaSet.add(u));
  toMediaList(data.photos).forEach((u) => mediaSet.add(u));

  const normalized = {
    id: docSnap.id,
    ...data,
    likes,
    likeCount: likes.length,
    mediaUrls: Array.from(mediaSet),
    // Widen name resolution
    name: data.name || data.username || data.artisanName || data.authorName || "",
    // Widen description resolution
    body: data.caption || data.text || data.description || data.body || data.content || "",
    timestampMs: toMillis(data.timestamp),
    dueDateMs: toMillis(data.dueDate),
  };

  if (userLocation) {
    normalized.distanceKm = postDistanceKm(normalized, userLocation);
  }

  return normalized;
}

function canShowInArea(post, userLocation, radiusKm = 10) {
  if (!userLocation) return true;
  const lat = typeof post.latitude === "number" ? post.latitude : null;
  const lng = typeof post.longitude === "number" ? post.longitude : null;
  if (lat == null || lng == null) return true;
  return kmBetween(userLocation.lat, userLocation.lng, lat, lng) <= radiusKm;
}

export async function getCurrentUserRole() {
  const user = auth.currentUser;
  if (!user) return "guest";

  const vendor = await getDoc(doc(db, "vendors", user.uid));
  if (vendor.exists()) return "artisan";

  const customer = await getDoc(doc(db, "customers", user.uid));
  if (customer.exists()) return "customer";

  return "unknown";
}

export async function getUserDataById(userId) {
  const customerSnap = await getDoc(doc(db, "customers", userId));
  if (customerSnap.exists()) return { role: "customer", ...customerSnap.data() };

  const vendorSnap = await getDoc(doc(db, "vendors", userId));
  if (vendorSnap.exists()) return { role: "artisan", ...vendorSnap.data() };

  const usersSnap = await getDoc(doc(db, "users", userId));
  if (usersSnap.exists()) return { role: "unknown", ...usersSnap.data() };

  return null;
}

export async function loadOpenJobPosts(max = 20) {
  try {
    const q = query(
      collection(db, "job_posts"),
      where("status", "==", "open"),
      orderBy("timestamp", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "job_post" }));
  } catch {
    return [];
  }
}

export function streamWorkfeeds({
  showGlobalPosts = true,
  userLocation = null,
  radiusKm = 10,
  includeJobPosts = false,
  onData,
  onError,
}) {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));

  return onSnapshot(
    q,
    async (snap) => {
      const adminPosts = [];
      const promotedPosts = [];
      const regularPosts = [];

      for (const docSnap of snap.docs) {
        const post = normalizePost(docSnap, userLocation);

        if (isPostExpired(post)) continue;

        if (post.isAdminPost === true) {
          adminPosts.push(post);
          continue;
        }

        if (post.type === "promotedPost") {
          promotedPosts.push(post);
          continue;
        }

        if (showGlobalPosts || canShowInArea(post, userLocation, radiusKm)) {
          regularPosts.push(post);
        }
      }

      const feed = [...adminPosts, ...promotedPosts, ...regularPosts];
      if (includeJobPosts) {
        const jobPosts = await loadOpenJobPosts(20);
        feed.push(...jobPosts);
      }

      onData?.({
        feed,
        adminPosts,
        promotedPosts,
        regularPosts,
      });
    },
    (err) => onError?.(err)
  );
}

export async function incrementPromotedPostView(postId) {
  await updateDoc(doc(db, "posts", postId), {
    views: increment(1),
  });
}

export async function togglePostLike(postId) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in.");

  const postRef = doc(db, "posts", postId);

  let nowLiked = false;
  let postOwnerId = "";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error("Post not found.");

    const data = snap.data() || {};
    const likes = toStringList(data.likes);
    const alreadyLiked = likes.includes(user.uid);

    const nextLikes = alreadyLiked ? likes.filter((id) => id !== user.uid) : [...likes, user.uid];

    nowLiked = !alreadyLiked;
    postOwnerId = String(data.artisanId || "");

    tx.update(postRef, { likes: nextLikes });
  });

  if (nowLiked && postOwnerId && postOwnerId !== user.uid) {
    const me = await getUserDataById(user.uid);
    const meName = me?.name || me?.username || "Someone";

    await addDoc(collection(db, "notifications"), {
      userId: postOwnerId,
      type: "like",
      title: "Post Liked!",
      body: `${meName} liked your post`,
      postId,
      timestamp: serverTimestamp(),
      isRead: false,
    });
  }

  return { liked: nowLiked };
}

export function streamPostComments(postId, { onData, onError }) {
  const q = query(
    collection(db, "posts", postId, "comments"),
    where("parentCommentId", "==", null),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() || {};
        const likes = toStringList(data.likes);
        return {
          id: d.id,
          ...data,
          likes,
          likeCount: typeof data.likeCount === "number" ? data.likeCount : likes.length,
          replyCount: typeof data.replyCount === "number" ? data.replyCount : 0,
        };
      });
      onData?.(rows);
    },
    (err) => onError?.(err)
  );
}

export function streamCommentReplies(postId, parentCommentId, { onData, onError }) {
  const q = query(
    collection(db, "posts", postId, "comments"),
    where("parentCommentId", "==", parentCommentId),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() || {};
        const likes = toStringList(data.likes);
        return {
          id: d.id,
          ...data,
          likes,
          likeCount: typeof data.likeCount === "number" ? data.likeCount : likes.length,
          replyCount: typeof data.replyCount === "number" ? data.replyCount : 0,
        };
      });
      onData?.(rows);
    },
    (err) => onError?.(err)
  );
}

export async function addComment(postId, text, parentCommentId = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in.");
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Comment is empty.");
  const profile = (await getUserDataById(user.uid)) || {};

  const commentsCol = collection(db, "posts", postId, "comments");
  const created = await addDoc(commentsCol, {
    userId: user.uid,
    text: trimmed,
    userName: profile.name || profile.username || "WorkPal User",
    username: profile.username || "",
    profileImage: profile.profileImage || profile.imageUrl || "",
    timestamp: serverTimestamp(),
    likes: [],
    likeCount: 0,
    replyCount: 0,
    parentCommentId: parentCommentId ?? null,
  });

  if (parentCommentId) {
    await updateDoc(doc(db, "posts", postId, "comments", parentCommentId), {
      replyCount: increment(1),
    });
  }

  await updateDoc(doc(db, "posts", postId), {
    commentCount: increment(1),
  });

  return created.id;
}

export async function toggleCommentLike(postId, commentId) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in.");

  const ref = doc(db, "posts", postId, "comments", commentId);
  let nowLiked = false;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Comment not found.");

    const data = snap.data() || {};
    const likes = toStringList(data.likes);
    const alreadyLiked = likes.includes(user.uid);

    const nextLikes = alreadyLiked ? likes.filter((id) => id !== user.uid) : [...likes, user.uid];

    nowLiked = !alreadyLiked;

    tx.update(ref, {
      likes: nextLikes,
      likeCount: nextLikes.length,
    });
  });

  return { liked: nowLiked };
}

export async function isPostFavorited(postId) {
  const user = auth.currentUser;
  if (!user) return false;
  const snap = await getDoc(doc(db, "users", user.uid, "favorites", postId));
  return snap.exists();
}

export async function togglePostFavorite(postId) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in.");

  const favRef = doc(db, "users", user.uid, "favorites", postId);
  const snap = await getDoc(favRef);

  if (snap.exists()) {
    await deleteDoc(favRef);
    return { favorited: false };
  }

  await setDoc(favRef, {
    postId,
    timestamp: serverTimestamp(),
  });
  return { favorited: true };
}
