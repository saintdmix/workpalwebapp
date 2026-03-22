import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { auth, db } from "../firebase-init.js";
import { getCurrentUserProfile } from "./profile-service.js";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (typeof value === "number") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function toNotification(row) {
  const data = row.data() || {};
  return {
    id: row.id,
    title: String(data.title || "Notification"),
    body: String(data.body || ""),
    type: String(data.type || ""),
    isRead: data.isRead === true,
    postId: String(data.postId || ""),
    timestampMs: toMillis(data.timestamp),
  };
}

function toPost(row) {
  const data = row.data() || {};
  const mediaCount =
    new Set([
      ...toList(data.mediaUrls).map(String),
      ...toList(data.imageUrl).map(String),
    ].filter(Boolean)).size;

  return {
    id: row.id,
    title: String(data.postTitle || ""),
    body: String(data.body || data.caption || data.content || ""),
    postFormat: String(data.postFormat || (data.isPortfolioPost ? "portfolio" : "status")),
    likesCount: Array.isArray(data.likes) ? data.likes.length : Number(data.likeCount || 0),
    commentCount: Number(data.commentCount || 0),
    mediaCount,
    timestampMs: toMillis(data.timestamp),
  };
}

function toStory(row) {
  const data = row.data() || {};
  return {
    id: row.id,
    content: String(data.content || ""),
    timestampMs: toMillis(data.timestamp),
    expiresAtMs: toMillis(data.expiresAt),
  };
}

async function getQueryDocsSafe(builder) {
  try {
    return await getDocs(builder());
  } catch {
    return await getDocs(builder(true));
  }
}

async function loadPosts(userId) {
  const snap = await getQueryDocsSafe((fallback = false) =>
    fallback
      ? query(collection(db, "posts"), where("artisanId", "==", userId))
      : query(collection(db, "posts"), where("artisanId", "==", userId), orderBy("timestamp", "desc"))
  );

  return snap.docs.map(toPost).sort((a, b) => b.timestampMs - a.timestampMs);
}

async function loadStories(userId) {
  const snap = await getQueryDocsSafe((fallback = false) =>
    fallback
      ? query(collection(db, "stories"), where("artisanId", "==", userId))
      : query(collection(db, "stories"), where("artisanId", "==", userId), orderBy("timestamp", "desc"))
  );

  return snap.docs.map(toStory).sort((a, b) => b.timestampMs - a.timestampMs);
}

async function loadNotifications(userId) {
  const base = collection(db, "NotificationWp", userId, "notification");
  const snap = await getQueryDocsSafe((fallback = false) =>
    fallback ? query(base, limit(40)) : query(base, orderBy("timestamp", "desc"), limit(40))
  );

  return snap.docs
    .map(toNotification)
    .filter((item) => item.type.toLowerCase() !== "chat")
    .sort((a, b) => b.timestampMs - a.timestampMs);
}

export function getDateRangeStart(rangeKey) {
  const now = Date.now();
  if (rangeKey === "90d") return now - 90 * 24 * 60 * 60 * 1000;
  if (rangeKey === "all") return 0;
  return now - 30 * 24 * 60 * 60 * 1000;
}

export function getPreviousRangeStart(rangeKey) {
  const currentStart = getDateRangeStart(rangeKey);
  if (rangeKey === "all") return 0;
  const duration = Date.now() - currentStart;
  return currentStart - duration;
}

export function filterByRange(items, rangeKey) {
  const start = getDateRangeStart(rangeKey);
  if (!start) return [...items];
  return items.filter((item) => (item.timestampMs || 0) >= start);
}

export function filterByPreviousRange(items, rangeKey) {
  if (rangeKey === "all") return [];
  const start = getDateRangeStart(rangeKey);
  const previousStart = getPreviousRangeStart(rangeKey);
  return items.filter((item) => {
    const ts = item.timestampMs || 0;
    return ts >= previousStart && ts < start;
  });
}

export function calculateProfileCompletion(profile) {
  const checks = [
    Boolean(profile?.name),
    Boolean(profile?.title),
    Boolean(profile?.bio),
    Boolean(profile?.address),
    Boolean(profile?.phone),
    Boolean(profile?.email),
    Boolean(profile?.profileImage),
    Boolean(profile?.coverImage),
    Boolean(profile?.locationText),
    Array.isArray(profile?.skills) && profile.skills.length > 0,
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export async function getCurrentArtisanAnalyticsSnapshot() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");

  const profile = await getCurrentUserProfile();
  if (profile.role !== "artisan") {
    throw new Error("Analytics are only available to artisan accounts.");
  }

  const [posts, stories, notifications] = await Promise.all([
    loadPosts(user.uid),
    loadStories(user.uid),
    loadNotifications(user.uid),
  ]);

  return {
    userId: user.uid,
    profile,
    posts,
    stories,
    notifications,
    profileCompletion: calculateProfileCompletion(profile),
  };
}
