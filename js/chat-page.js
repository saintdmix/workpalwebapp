import {
  blockUser,
  isUserBlocked,
  markChatAsRead,
  reportUser,
  sendChatMessage,
  setMyPresence,
  streamChatRooms,
  streamMessages,
  unblockUser,
  waitForAuthUser,
} from "./chat-service.js";
import { renderChatMessagesSkeleton, renderChatRoomsSkeleton } from "./loading-skeletons.js";

const LOGIN_PAGE = "../signin.html?mode=login";

const el = {
  roomsList: document.getElementById("chatRoomsList"),
  roomsSearch: document.getElementById("chatRoomsSearch"),
  roomsStatus: document.getElementById("chatRoomsStatus"),
  roomsError: document.getElementById("chatRoomsError"),
  activeName: document.getElementById("activeChatName"),
  activeStatus: document.getElementById("activeChatStatus"),
  activeAvatar: document.getElementById("activeChatAvatar"),
  messagesList: document.getElementById("chatMessagesList"),
  composerError: document.getElementById("chatComposerError"),
  messageInput: document.getElementById("chatMessageInput"),
  sendBtn: document.getElementById("chatSendBtn"),
  callBtn: document.getElementById("chatCallBtn"),
  moreBtn: document.getElementById("chatMoreBtn"),
  moreMenu: document.getElementById("chatMoreMenu"),
  blockBtn: document.getElementById("chatBlockBtn"),
  reportBtn: document.getElementById("chatReportBtn"),
  drawer: document.getElementById("projectContextDrawer"),
  drawerContent: document.getElementById("quoteDrawerContent"),
  drawerClose: document.getElementById("contextClose"),
  backdrop: document.getElementById("contextBackdrop"),
};

const state = {
  user: null,
  role: localStorage.getItem("workpalUserRole") || "artisan",
  rooms: [],
  selectedRoomId: "",
  unsubRooms: null,
  unsubMessages: null,
};

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapChatError(err) {
  const code = err?.code || "";
  if (code.includes("permission-denied")) return "Permission denied for chat data.";
  if (code.includes("failed-precondition")) return "A required chat index is missing in Firestore.";
  if (code.includes("unauthenticated")) return "Session expired. Please sign in again.";
  if (code.includes("unavailable") || code.includes("network-request-failed")) {
    return "Network error while loading chat.";
  }
  return err?.message || "Chat operation failed.";
}

function setRoomsError(message = "") {
  if (!el.roomsError) return;
  el.roomsError.textContent = message;
  el.roomsError.classList.toggle("hidden", !message);
}

function setComposerError(message = "") {
  if (!el.composerError) return;
  el.composerError.textContent = message;
  el.composerError.classList.toggle("hidden", !message);
}

function toMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function timeLabel(value) {
  const ms = toMs(value);
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function roomTimeLabel(value) {
  const ms = toMs(value);
  if (!ms) return "";
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function selectedRoom() {
  return state.rooms.find((r) => r.id === state.selectedRoomId) || null;
}

function renderRoomsLoading() {
  if (!el.roomsList) return;
  el.roomsList.innerHTML = renderChatRoomsSkeleton(6);
}

function renderMessagesLoading() {
  if (!el.messagesList) return;
  el.messagesList.innerHTML = renderChatMessagesSkeleton();
}

function setActiveLoadingState() {
  if (el.activeName) el.activeName.textContent = "Loading conversation...";
  if (el.activeStatus) el.activeStatus.textContent = "Syncing messages";
}

function renderRooms() {
  if (!el.roomsList) return;

  const q = (el.roomsSearch?.value || "").trim().toLowerCase();
  const rows = q
    ? state.rooms.filter((r) => String(r.otherUserName || "").toLowerCase().includes(q))
    : state.rooms;

  if (!rows.length) {
    el.roomsList.innerHTML =
      '<div class="text-xs text-slate-500 px-3 py-4">No conversations found.</div>';
    return;
  }

  el.roomsList.innerHTML = rows
    .map((room) => {
      const active = room.id === state.selectedRoomId;
      const unread = Number(room.unreadCount || 0);
      return `
        <button type="button" data-room-id="${esc(
          room.id
        )}" class="w-full text-left flex items-center gap-4 p-3 rounded-2xl transition-all group ${
          active
            ? "bg-primary/5 border border-primary/20 active-glow"
            : "hover:bg-white/5 border border-transparent"
        }">
          <div class="relative shrink-0">
            <img class="w-12 h-12 rounded-full object-cover border border-white/10" src="${esc(
              room.otherUserImage ||
                "https://via.placeholder.com/64x64.png?text=U"
            )}" alt="${esc(room.otherUserName || "User")}" />
            <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-surface-container-lowest"></div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex justify-between items-start mb-0.5">
              <h3 class="font-bold text-sm ${active ? "text-white" : "text-on-surface"} truncate">${esc(
                room.otherUserName || "Unknown"
              )}</h3>
              <span class="text-[10px] ${active ? "text-primary" : "text-slate-500"} font-medium">${esc(
                roomTimeLabel(room.lastMessageTimestamp)
              )}</span>
            </div>
            <p class="text-xs ${active ? "text-slate-400" : "text-slate-500"} truncate">${esc(
              room.lastMessage || "No messages yet"
            )}</p>
          </div>
          ${
            unread > 0
              ? `<span class="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">${unread}</span>`
              : ""
          }
        </button>
      `;
    })
    .join("");
}

// ── Quote Drawer ──────────────────────────────────────────────
function openQuoteDrawer(quoteData) {
  if (!el.drawer || !el.drawerContent) return;
  const q = quoteData || {};
  el.drawerContent.innerHTML = `
    <div class="bg-surface-container/50 border border-white/5 rounded-2xl p-5 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary">request_quote</span>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-white truncate">${esc(q.title || "Quote")}</p>
          <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">${esc(q.status || "Pending")}</p>
        </div>
      </div>
      <div class="space-y-3">
        ${q.amount != null ? `<div class="flex justify-between items-center">
          <span class="text-[10px] uppercase tracking-widest font-bold text-slate-500">Amount</span>
          <span class="text-sm font-black text-primary">₦${esc(Number(q.amount).toLocaleString())}</span>
        </div>` : ""}
        ${q.duration ? `<div class="flex justify-between items-center">
          <span class="text-[10px] uppercase tracking-widest font-bold text-slate-500">Duration</span>
          <span class="text-xs font-bold text-white">${esc(q.duration)}</span>
        </div>` : ""}
        ${q.note ? `<div class="pt-3 border-t border-white/5">
          <p class="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Note</p>
          <p class="text-xs text-slate-300 leading-relaxed">${esc(q.note)}</p>
        </div>` : ""}
      </div>
    </div>
    ${q.jobTitle ? `<div class="mb-4">
      <p class="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Job</p>
      <p class="text-sm font-bold text-white">${esc(q.jobTitle)}</p>
    </div>` : ""}
  `;
  el.drawer.classList.remove("translate-x-full");
  el.backdrop?.classList.remove("hidden");
}

function closeDrawer() {
  el.drawer?.classList.add("translate-x-full");
  el.backdrop?.classList.add("hidden");
}

el.drawerClose?.addEventListener("click", closeDrawer);
el.backdrop?.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeMoreMenu(); } });

// ── More-vert menu ────────────────────────────────────────────
function closeMoreMenu() {
  el.moreMenu?.classList.add("hidden");
}

document.addEventListener("click", (e) => {
  if (!el.moreMenu?.contains(e.target) && e.target !== el.moreBtn) closeMoreMenu();
});

// ── Block/Unblock toggle ─────────────────────────────────────
async function refreshBlockLabel(otherUserId) {
  if (!el.blockBtn) return;
  const blocked = await isUserBlocked(otherUserId).catch(() => false);
  el.blockBtn.dataset.blocked = blocked ? "1" : "0";
  el.blockBtn.innerHTML = `<span class="material-symbols-outlined text-base">${blocked ? "person_add" : "block"}</span>${blocked ? "Unblock user" : "Block user"}`;
}

el.moreBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  const isHidden = el.moreMenu?.classList.contains("hidden");
  el.moreMenu?.classList.toggle("hidden");
  if (isHidden) {
    const room = selectedRoom();
    if (room) await refreshBlockLabel(room.otherUserId);
  }
});

el.blockBtn?.addEventListener("click", async () => {
  closeMoreMenu();
  const room = selectedRoom();
  if (!room) return;
  const isBlocked = el.blockBtn.dataset.blocked === "1";
  if (isBlocked) {
    if (!confirm(`Unblock ${room.otherUserName || "this user"}?`)) return;
    try { await unblockUser(room.otherUserId); alert("User unblocked."); } catch (err) { setComposerError(mapChatError(err)); }
  } else {
    if (!confirm(`Block ${room.otherUserName || "this user"}? They won't be able to message you.`)) return;
    try { await blockUser(room.otherUserId); alert("User blocked."); } catch (err) { setComposerError(mapChatError(err)); }
  }
});

el.reportBtn?.addEventListener("click", async () => {
  closeMoreMenu();
  const room = selectedRoom();
  if (!room) return;
  const reason = prompt("Reason for reporting (e.g. spam, harassment, fraud):");
  if (!reason?.trim()) return;
  try {
    await reportUser(room.otherUserId, reason.trim());
    alert("Report submitted. Our team will review it.");
  } catch (err) {
    setComposerError(mapChatError(err));
  }
});

// ── Call button (artisan-only) ────────────────────────────────
function updateCallButton(room) {
  if (!el.callBtn) return;
  const isArtisan = state.role === "artisan";
  const phone = room?.otherUserPhone || "";
  if (isArtisan && phone) {
    el.callBtn.href = `tel:${phone}`;
    el.callBtn.classList.remove("hidden");
    el.callBtn.classList.add("flex");
  } else if (isArtisan) {
    // Show but disabled — no phone on file
    el.callBtn.href = "#";
    el.callBtn.classList.remove("hidden");
    el.callBtn.classList.add("flex");
    el.callBtn.title = "No phone number on file";
  } else {
    el.callBtn.classList.add("hidden");
    el.callBtn.classList.remove("flex");
  }
}

function renderMessages(messages) {
  if (!el.messagesList || !state.user) return;

  if (!messages.length) {
    el.messagesList.innerHTML =
      '<div class="text-xs text-slate-500 text-center py-8">No messages yet. Say hello.</div>';
    return;
  }

  el.messagesList.innerHTML = messages
    .map((m) => {
      const mine = m.senderId === state.user.uid;
      const text = m.isDeleted ? "This message was deleted" : m.text || "";
      const images = Array.isArray(m.imageUrls) ? m.imageUrls : [];
      const videos = Array.isArray(m.videoUrls) ? m.videoUrls : [];
      const audio = m.audioUrl || "";
      const quote = m.quote || null;

      const quoteHtml = quote
        ? `<button type="button" class="mt-2 w-full text-left bg-white/5 border border-primary/30 rounded-xl px-3 py-2.5 hover:bg-primary/10 transition-all" data-quote='${esc(JSON.stringify(quote))}'>
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-primary text-sm">request_quote</span>
              <span class="text-[10px] font-black uppercase tracking-widest text-primary">Quote</span>
            </div>
            <p class="text-xs font-bold text-white">${esc(quote.title || "View Quote")}</p>
            ${quote.amount != null ? `<p class="text-[10px] text-slate-400 mt-0.5">₦${esc(Number(quote.amount).toLocaleString())}</p>` : ""}
          </button>`
        : "";

      const mediaHtml = [
        ...images.map(
          (url) =>
            `<img class="mt-2 rounded-lg max-h-52 object-cover border border-white/10" src="${esc(
              url
            )}" alt="image" loading="lazy" />`
        ),
        ...videos.map(
          (url) =>
            `<video class="mt-2 rounded-lg max-h-52 border border-white/10" controls src="${esc(
              url
            )}"></video>`
        ),
        audio
          ? `<audio class="mt-2 w-full" controls src="${esc(audio)}"></audio>`
          : "",
      ].join("");

      if (mine) {
        return `
          <div class="flex gap-4 max-w-2xl ml-auto flex-row-reverse">
            <div class="space-y-1.5 text-right">
              <div class="bg-primary text-white px-5 py-3.5 rounded-2xl rounded-tr-none shadow-[0_4px_20px_rgba(127,19,236,0.3)]">
                ${text ? `<p class="text-sm leading-relaxed">${esc(text)}</p>` : ""}
                ${mediaHtml}
                ${quoteHtml}
              </div>
              <p class="text-[10px] text-slate-500 font-medium mr-1">${esc(timeLabel(m.timestamp))}</p>
            </div>
          </div>
        `;
      }

      return `
        <div class="flex gap-4 max-w-2xl">
          <img alt="User" class="w-8 h-8 rounded-full shrink-0 border border-white/10" src="${esc(
            selectedRoom()?.otherUserImage || "https://via.placeholder.com/32x32.png?text=U"
          )}"/>
          <div class="space-y-1.5">
            <div class="bg-surface-container text-on-surface px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/5 shadow-lg">
              ${text ? `<p class="text-sm leading-relaxed">${esc(text)}</p>` : ""}
              ${mediaHtml}
              ${quoteHtml}
            </div>
            <p class="text-[10px] text-slate-500 font-medium ml-1">${esc(timeLabel(m.timestamp))}</p>
          </div>
        </div>
      `;
    })
    .join("");

  el.messagesList.scrollTop = el.messagesList.scrollHeight;
}

async function openRoom(roomId) {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return;

  state.selectedRoomId = roomId;
  renderRooms();
  setComposerError("");
  setRoomsError("");

  if (el.activeName) el.activeName.textContent = room.otherUserName || "Conversation";
  if (el.activeStatus) {
    el.activeStatus.textContent = room.unreadCount > 0 ? "Unread activity" : "Conversation open";
  }
  if (el.activeAvatar) {
    el.activeAvatar.src = room.otherUserImage || "https://via.placeholder.com/64x64.png?text=U";
  }
  updateCallButton(room);
  renderMessagesLoading();

  state.unsubMessages?.();
  state.unsubMessages = streamMessages({
    chatRoomId: room.id,
    onData: (messages) => renderMessages(messages),
    onError: (err) => setComposerError(mapChatError(err)),
  });

  try {
    await markChatAsRead({ chatRoomId: room.id, otherUserId: room.otherUserId });
  } catch (err) {
    setComposerError(mapChatError(err));
  }
}

async function sendCurrentMessage() {
  const room = selectedRoom();
  if (!room) {
    setComposerError("Select a conversation first.");
    return;
  }

  const text = (el.messageInput?.value || "").trim();
  if (!text) return;

  if (el.sendBtn) el.sendBtn.disabled = true;
  setComposerError("");

  try {
    await sendChatMessage({ otherUserId: room.otherUserId, text });
    if (el.messageInput) el.messageInput.value = "";
  } catch (err) {
    setComposerError(mapChatError(err));
  } finally {
    if (el.sendBtn) el.sendBtn.disabled = false;
  }
}

async function initChat() {
  renderRoomsLoading();
  renderMessagesLoading();
  setActiveLoadingState();

  if (el.roomsStatus) el.roomsStatus.textContent = "Checking session...";

  const user = await waitForAuthUser();
  if (!user) {
    window.location.href = LOGIN_PAGE;
    return;
  }
  state.user = user;
  // Capture role for call-button gating
  const storedRole = localStorage.getItem("workpalUserRole");
  if (storedRole) state.role = storedRole;

  try {
    await setMyPresence({ isOnline: true });
  } catch {
    // Presence is best-effort.
  }

  if (el.roomsStatus) el.roomsStatus.textContent = "Syncing conversations...";
  state.unsubRooms = streamChatRooms({
    onData: (rooms) => {
      state.rooms = rooms;
      renderRooms();

      if (!state.selectedRoomId && rooms.length) {
        openRoom(rooms[0].id);
      } else if (state.selectedRoomId && !rooms.some((r) => r.id === state.selectedRoomId)) {
        state.selectedRoomId = "";
        state.unsubMessages?.();
        if (rooms.length) openRoom(rooms[0].id);
      }

      if (el.roomsStatus) el.roomsStatus.textContent = `${rooms.length} conversation(s)`;
    },
    onError: (err) => {
      setRoomsError(mapChatError(err));
      if (el.roomsStatus) el.roomsStatus.textContent = "Unable to sync conversations";
    },
  });
}

el.roomsList?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-room-id]");
  if (!btn) return;
  const roomId = btn.getAttribute("data-room-id");
  if (!roomId) return;
  openRoom(roomId);
});

el.messagesList?.addEventListener("click", (event) => {
  const quoteBtn = event.target.closest("[data-quote]");
  if (!quoteBtn) return;
  try {
    const quoteData = JSON.parse(quoteBtn.getAttribute("data-quote") || "{}");
    openQuoteDrawer(quoteData);
  } catch {}
});

el.roomsSearch?.addEventListener("input", () => renderRooms());

el.sendBtn?.addEventListener("click", () => {
  sendCurrentMessage();
});

el.messageInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendCurrentMessage();
  }
});

window.addEventListener("beforeunload", () => {
  state.unsubMessages?.();
  state.unsubRooms?.();
  setMyPresence({ isOnline: false }).catch(() => {});
});

initChat().catch((err) => {
  setRoomsError(mapChatError(err));
  if (el.roomsStatus) el.roomsStatus.textContent = "Chat failed to initialize";
});
