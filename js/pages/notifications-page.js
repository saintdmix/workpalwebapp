import { auth } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { renderNotificationsSkeleton } from "../loading-skeletons.js";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeNotifications,
  subscribeUnreadNotificationCount,
} from "../services/notifications-service.js";

const LOGIN_URL = "../index.html";
const NOTIFICATIONS_CACHE_KEY = "workpalNotificationsSnapshotV1";

const els = {
  list: document.getElementById("notificationsList"),
  loading: document.getElementById("notificationsLoading"),
  empty: document.getElementById("notificationsEmpty"),
  error: document.getElementById("notificationsError"),
  badge: document.getElementById("notifBadge"),
  markAllBtn: document.getElementById("markAllReadBtn"),
};

let stopList = null;
let stopBadge = null;
let uid = null;
let markedOnOpen = false;

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(NOTIFICATIONS_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCache(items) {
  try {
    sessionStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors.
  }
}

function fmtDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setLoading(v) {
  if (els.loading) els.loading.style.display = v ? "block" : "none";
  if (v && els.list) {
    els.list.innerHTML = renderNotificationsSkeleton(4);
  }
}

function setError(msg = "") {
  if (!els.error) return;
  els.error.textContent = msg;
  els.error.style.display = msg ? "block" : "none";
}

function render(items) {
  if (!els.list) return;
  if (els.empty) els.empty.style.display = items.length ? "none" : "block";
  writeCache(items);

  els.list.innerHTML = items
    .map(
      (n) => `
      <article class="notif-item ${n.isRead ? "read" : "unread"} bg-surface-bright p-5 rounded-xl border border-primary/10 shadow-md flex items-start gap-4 hover:border-primary/30 transition-all group cursor-pointer"
        data-doc-id="${esc(n.docId)}"
        data-title="${esc(n.title)}"
        data-type="${esc(n.type)}"
        data-seller-id="${esc(n.sellerId)}"
        data-post-id="${esc(n.postId)}">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">notifications</span>
        </div>
        <div class="flex-1">
          <h4 class="text-on-surface font-semibold leading-snug">${esc(n.title)}</h4>
          <p class="text-sm text-gray-400 mt-1">${esc(n.body)}</p>
          <small class="text-[10px] uppercase tracking-widest text-slate-500 mt-3 inline-block">${esc(
            fmtDate(n.timestamp)
          )}</small>
        </div>
      </article>
    `
    )
    .join("");
}

function goToTarget(n) {
  const title = (n.title || "").toLowerCase();
  const type = (n.type || "").toLowerCase();

  if (
    n.postId &&
    (title.includes("like") ||
      title.includes("comment") ||
      title.includes("reply") ||
      title.includes("new post") ||
      ["like", "comment", "reply", "admin_post"].includes(type))
  ) {
    window.location.href = `./feed.html?postId=${encodeURIComponent(n.postId)}`;
    return;
  }

  if (title.includes("subscription expired") || type === "subscription") {
    window.location.href = "./subscriptions.html";
    return;
  }

  if (title.includes("message notification") || type.includes("chat")) {
    if (n.sellerId) {
      window.location.href = `./communication.html?userId=${encodeURIComponent(n.sellerId)}`;
    } else {
      window.location.href = "./communication.html";
    }
  }
}

document.addEventListener("click", async (e) => {
  const card = e.target.closest(".notif-item");
  if (!card || !uid) return;

  const n = {
    docId: card.dataset.docId,
    title: card.dataset.title || "",
    type: card.dataset.type || "",
    sellerId: card.dataset.sellerId || "",
    postId: card.dataset.postId || "",
  };

  try {
    await markNotificationAsRead(uid, n.docId);
  } catch {
    // non-blocking
  }

  goToTarget(n);
});

if (els.markAllBtn) {
  els.markAllBtn.addEventListener("click", async () => {
    if (!uid) return;
    try {
      await markAllNotificationsAsRead(uid);
    } catch {
      setError("Could not mark all as read.");
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (stopList) stopList();
  if (stopBadge) stopBadge();
  stopList = null;
  stopBadge = null;
  markedOnOpen = false;
  setError("");

  if (!user) {
    window.location.href = LOGIN_URL;
    return;
  }

  uid = user.uid;
  const cached = readCache();
  if (Array.isArray(cached) && cached.length) {
    render(cached);
    setLoading(false);
  } else {
    setLoading(true);
  }

  stopList = subscribeNotifications(
    uid,
    async (items) => {
      render(items);
      setLoading(false);

      if (!markedOnOpen) {
        markedOnOpen = true;
        try {
          await markAllNotificationsAsRead(uid);
        } catch {
          // non-blocking
        }
      }
    },
    (err) => {
      setLoading(false);
      setError(err?.message || "Failed to load notifications.");
    }
  );

  stopBadge = subscribeUnreadNotificationCount(uid, (count) => {
    if (!els.badge) return;
    els.badge.textContent = String(count);
    els.badge.style.display = count > 0 ? "inline-flex" : "none";
  });
});

if (els.list) {
  const cached = readCache();
  if (Array.isArray(cached) && cached.length) {
    render(cached);
  } else {
    els.list.innerHTML = renderNotificationsSkeleton(4);
  }
}
