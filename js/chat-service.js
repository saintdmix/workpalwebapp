import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { auth, db, storage } from "./firebase-init.js";

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeText(v) {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function toList(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v == null) return [];
  return [String(v)];
}

function previewFromPayload({ text, audioUrl, imageUrls, videoUrls }) {
  if (text) return text;
  if (audioUrl) return "Audio message";
  if (imageUrls?.length) return "Image";
  if (videoUrls?.length) return "Video";
  return "New message";
}

export function createChatRoomId(a, b) {
  return [a, b].sort().join("_");
}

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

export async function getUserProfile(userId) {
  const vendor = await getDoc(doc(db, "vendors", userId));
  if (vendor.exists()) {
    const d = vendor.data();
    return {
      id: userId,
      role: "artisan",
      name: d.name || d.username || "Vendor",
      image: d.profileImage || d.imageUrl || "",
    };
  }

  const customer = await getDoc(doc(db, "customers", userId));
  if (customer.exists()) {
    const d = customer.data();
    return {
      id: userId,
      role: "customer",
      name: d.username || d.name || "Customer",
      image: d.profileImage || d.imageUrl || "",
    };
  }

  const user = await getDoc(doc(db, "users", userId));
  if (user.exists()) {
    const d = user.data();
    return {
      id: userId,
      role: "unknown",
      name: d.username || d.name || "User",
      image: d.profileImage || d.imageUrl || "",
    };
  }

  return { id: userId, role: "unknown", name: "User", image: "" };
}

function buildChatRoomMeta(sender, receiver, payloadPreview) {
  const senderIsVendor = sender.role === "artisan";
  const receiverIsVendor = receiver.role === "artisan";

  let vendor = senderIsVendor ? sender : receiver;
  let customer = senderIsVendor ? receiver : sender;

  if (!senderIsVendor && !receiverIsVendor) {
    vendor = receiver;
    customer = sender;
  }

  return {
    participants: [sender.id, receiver.id],
    lastMessage: payloadPreview,
    lastMessageTimestamp: serverTimestamp(),
    vendorImage: vendor.image || "",
    customerImage: customer.image || "",
    customerName: customer.name || "Customer",
    vendorName: vendor.name || "Vendor",
    vendorId: vendor.id,
    customerId: customer.id,
    [`unreadCount_${receiver.id}`]: increment(1),
  };
}

export async function sendChatMessage({
  otherUserId,
  text = "",
  replyToId = null,
  replyToText = null,
  replyToSenderId = null,
  audioUrl = null,
  audioDuration = null,
  imageUrls = [],
  videoUrls = [],
  isForwarded = false,
  originalSenderId = null,
}) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  const messageText = safeText(text);
  if (!messageText && !audioUrl && !imageUrls.length && !videoUrls.length) {
    throw new Error("Message is empty.");
  }

  const sender = await getUserProfile(me.uid);
  const receiver = await getUserProfile(otherUserId);
  const chatRoomId = createChatRoomId(me.uid, otherUserId);
  const messageId = uid();

  const messagePayload = {
    messageId,
    senderId: me.uid,
    receiverId: otherUserId,
    text: messageText,
    audioUrl: audioUrl || null,
    audioDuration: audioDuration ?? null,
    imageUrls: imageUrls.length ? imageUrls : null,
    videoUrls: videoUrls.length ? videoUrls : null,
    timestamp: serverTimestamp(),
    isRead: false,
    isDeleted: false,
    replyToId,
    replyToText,
    replyToSenderId,
    isForwarded: !!isForwarded,
    originalSenderId: originalSenderId || null,
  };

  const roomMeta = buildChatRoomMeta(
    sender,
    receiver,
    previewFromPayload({
      text: messageText,
      audioUrl,
      imageUrls,
      videoUrls,
    })
  );

  await setDoc(doc(db, "chatRooms", chatRoomId, "messages", messageId), messagePayload);
  await setDoc(doc(db, "chatRooms", chatRoomId), roomMeta, { merge: true });

  return { chatRoomId, messageId };
}

export async function uploadChatFiles({ chatRoomId, senderId, files }) {
  const imageUrls = [];
  const videoUrls = [];

  for (const file of files) {
    const ext = file.name?.split(".").pop() || "bin";
    const path = `chat_media/${chatRoomId}/${senderId}/${Date.now()}_${uid()}.${ext}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    if ((file.type || "").startsWith("video/")) {
      videoUrls.push(url);
    } else {
      imageUrls.push(url);
    }
  }

  return { imageUrls, videoUrls };
}

export async function sendMediaMessage({ otherUserId, files, text = "" }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  if (!files?.length) throw new Error("No media files selected.");

  const chatRoomId = createChatRoomId(me.uid, otherUserId);
  const { imageUrls, videoUrls } = await uploadChatFiles({
    chatRoomId,
    senderId: me.uid,
    files,
  });

  return sendChatMessage({
    otherUserId,
    text,
    imageUrls,
    videoUrls,
  });
}

export function streamChatRooms({ onData, onError }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  const q = query(
    collection(db, "chatRooms"),
    where("participants", "array-contains", me.uid),
    orderBy("lastMessageTimestamp", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const rooms = snap.docs.map((d) => {
        const x = d.data();
        const currentIsVendor = x.vendorId === me.uid;

        return {
          id: d.id,
          ...x,
          otherUserId: currentIsVendor ? x.customerId : x.vendorId,
          otherUserName: currentIsVendor ? x.customerName : x.vendorName,
          otherUserImage: currentIsVendor ? x.customerImage : x.vendorImage,
          unreadCount: Number(x[`unreadCount_${me.uid}`] || 0),
        };
      });
      onData?.(rooms);
    },
    (e) => onError?.(e)
  );
}

export function streamMessages({ chatRoomId, onData, onError }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  const q = query(collection(db, "chatRooms", chatRoomId, "messages"), orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => !toList(m.deletedFor).includes(me.uid));
      onData?.(messages);
    },
    (e) => onError?.(e)
  );
}

export async function markChatAsRead({ chatRoomId, otherUserId }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  const unreadQ = query(
    collection(db, "chatRooms", chatRoomId, "messages"),
    where("isRead", "==", false),
    where("senderId", "==", otherUserId)
  );

  const unread = await getDocs(unreadQ);
  const batch = writeBatch(db);

  unread.forEach((d) => batch.update(d.ref, { isRead: true }));
  batch.set(doc(db, "chatRooms", chatRoomId), { [`unreadCount_${me.uid}`]: 0 }, { merge: true });

  await batch.commit();
}

export async function addMessageReaction({ chatRoomId, messageId, emoji }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  await updateDoc(doc(db, "chatRooms", chatRoomId, "messages", messageId), {
    [`reactions.${me.uid}`]: emoji,
  });
}

export async function deleteMessageForMe({ chatRoomId, messageId }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  await updateDoc(doc(db, "chatRooms", chatRoomId, "messages", messageId), {
    deletedFor: arrayUnion(me.uid),
  });
}

export async function deleteMessageForEveryone({ chatRoomId, messageId }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  const mRef = doc(db, "chatRooms", chatRoomId, "messages", messageId);
  const snap = await getDoc(mRef);
  if (!snap.exists()) throw new Error("Message not found.");

  const data = snap.data();
  if (data.senderId !== me.uid) throw new Error("Not allowed.");

  await updateDoc(mRef, {
    text: "This message was deleted",
    audioUrl: null,
    imageUrls: null,
    videoUrls: null,
    isDeleted: true,
  });
}

export async function deleteChatRoom(chatRoomId) {
  const msgs = await getDocs(collection(db, "chatRooms", chatRoomId, "messages"));
  const batch = writeBatch(db);
  msgs.forEach((m) => batch.delete(m.ref));
  batch.delete(doc(db, "chatRooms", chatRoomId));
  await batch.commit();
}

export async function setMyPresence({ isOnline, role }) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");

  let col = role;
  if (!col) {
    const vendor = await getDoc(doc(db, "vendors", me.uid));
    col = vendor.exists() ? "vendors" : "customers";
  }

  await updateDoc(doc(db, col, me.uid), {
    isOnline: !!isOnline,
    lastSeen: serverTimestamp(),
  });
}

export async function isUserBlocked(otherUserId) {
  const me = auth.currentUser;
  if (!me) return false;
  const snap = await getDoc(doc(db, "blockedUsers", `${me.uid}_${otherUserId}`));
  return snap.exists();
}

export async function unblockUser(otherUserId) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  await deleteDoc(doc(db, "blockedUsers", `${me.uid}_${otherUserId}`));
}

export async function blockUser(otherUserId) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  await setDoc(doc(db, "blockedUsers", `${me.uid}_${otherUserId}`), {
    blockedBy: me.uid,
    blockedUser: otherUserId,
    timestamp: serverTimestamp(),
  });
}

export async function reportUser(otherUserId, reason) {
  const me = auth.currentUser;
  if (!me) throw new Error("User not logged in.");
  await setDoc(doc(db, "reports", `user_${me.uid}_${otherUserId}_${Date.now()}`), {
    reportedBy: me.uid,
    reportedUser: otherUserId,
    reason,
    type: "user",
    timestamp: serverTimestamp(),
    status: "pending",
  });
}

export async function getTotalUnreadChats() {
  const me = auth.currentUser;
  if (!me) return 0;

  const q = query(collection(db, "chatRooms"), where("participants", "array-contains", me.uid));

  const snap = await getDocs(q);
  let total = 0;
  snap.forEach((d) => {
    const x = d.data();
    total += Number(x[`unreadCount_${me.uid}`] || 0);
  });
  return total;
}
