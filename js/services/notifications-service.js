import { db } from "../firebase-init.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const notificationsCol = (userId) => collection(db, "NotificationWp", userId, "notification");

function toDate(value) {
  if (!value) return new Date();
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function mapNotification(snap) {
  const d = snap.data() || {};
  return {
    docId: snap.id,
    id: d.id || snap.id,
    title: d.title || "",
    body: d.body || "",
    sellerId: d.sellerId || "",
    postId: d.postId || "",
    commentId: d.commentId || "",
    type: d.type || "",
    isRead: d.isRead === true,
    timestamp: toDate(d.timestamp),
    rawTimestamp: d.timestamp,
  };
}

export function subscribeNotifications(userId, onChange, onError = console.error) {
  const q = query(notificationsCol(userId), orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map(mapNotification)
        .filter((n) => n.type !== "chat");
      onChange(items);
    },
    onError
  );
}

export function subscribeUnreadNotificationCount(userId, onChange, onError = console.error) {
  const q = query(notificationsCol(userId), where("isRead", "==", false));
  return onSnapshot(
    q,
    (snap) => {
      const count = snap.docs.reduce((acc, d) => {
        const type = (d.data()?.type || "").toLowerCase();
        return type === "chat" ? acc : acc + 1;
      }, 0);
      onChange(count);
    },
    onError
  );
}

export async function markNotificationAsRead(userId, docId) {
  await updateDoc(doc(db, "NotificationWp", userId, "notification", docId), {
    isRead: true,
  });
}

export async function markAllNotificationsAsRead(userId) {
  const snap = await getDocs(query(notificationsCol(userId), where("isRead", "==", false)));
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  let changed = 0;

  snap.docs.forEach((d) => {
    const type = d.data()?.type || "";
    if (type !== "chat") {
      batch.update(d.ref, { isRead: true });
      changed++;
    }
  });

  if (changed > 0) await batch.commit();
  return changed;
}

export async function deleteNotification(userId, docId) {
  await deleteDoc(doc(db, "NotificationWp", userId, "notification", docId));
}

export async function createNotification({
  recipientId,
  title,
  body,
  sellerId = "",
  type = "general",
  postId = "",
  commentId = "",
  extra = {},
}) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    id,
    title: title || "Notification",
    body: body || "",
    sellerId,
    postId,
    commentId,
    type,
    isRead: false,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  await setDoc(doc(db, "NotificationWp", recipientId, "notification", id), payload);
  return id;
}
