import {
  DEFAULT_LOCATION,
  addComment,
  getBrowserLocation,
  getUserDataById,
  streamCommentReplies,
  streamPostComments,
  toggleCommentLike,
  streamWorkfeeds,
  togglePostLike,
  waitForAuthUser,
} from "./workfeeds-service.js";
import { renderWorkfeedsSkeleton } from "./loading-skeletons.js";
import { onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";

const LOGIN_PAGE = "../index.html";
const JOB_APPLY_PAGE = "../pages/job-apply.html";
const WORKFEEDS_CACHE_KEY = "workpalWorkfeedsSnapshotV1";
const LOCATION_CACHE_KEY = "workpalLocationV1";
const REPORTED_POSTS_KEY = "workpalReportedPostsV1";

const el = {
  list: document.getElementById("workfeedsList"),
  error: document.getElementById("workfeedsError"),
  notifBadge: document.getElementById("feedNotifBadge"),
  avatarImg: document.getElementById("feedAvatarImg"),
  searchInput: document.getElementById("feedSearchInput"),
  commentModal: document.getElementById("commentModal"),
  commentModalClose: document.getElementById("commentModalClose"),
  commentModalPost: document.getElementById("commentModalPost"),
  commentThreadList: document.getElementById("commentThreadList"),
  commentComposerForm: document.getElementById("commentComposerForm"),
  commentComposerInput: document.getElementById("commentComposerInput"),
  commentComposerSubmit: document.getElementById("commentComposerSubmit"),
  commentReplyMeta: document.getElementById("commentReplyMeta"),
  commentReplyLabel: document.getElementById("commentReplyLabel"),
  commentReplyCancel: document.getElementById("commentReplyCancel"),
  commentModalError: document.getElementById("commentModalError"),
};

// Media viewer state
const mediaViewer = {
  modal: document.getElementById("mediaViewerModal"),
  img: document.getElementById("mediaViewerImg"),
  dots: document.getElementById("mediaViewerDots"),
  prev: document.getElementById("mediaViewerPrev"),
  next: document.getElementById("mediaViewerNext"),
  close: document.getElementById("mediaViewerClose"),
  urls: [],
  idx: 0,
};

function openMediaViewer(urls, startIdx = 0) {
  mediaViewer.urls = urls;
  mediaViewer.idx = startIdx;
  renderMediaViewer();
  mediaViewer.modal.classList.remove("hidden");
  mediaViewer.modal.classList.add("flex");
}

function closeMediaViewer() {
  mediaViewer.modal.classList.add("hidden");
  mediaViewer.modal.classList.remove("flex");
}

function renderMediaViewer() {
  const { urls, idx } = mediaViewer;
  mediaViewer.img.src = urls[idx];
  mediaViewer.prev.style.display = urls.length > 1 ? "flex" : "none";
  mediaViewer.next.style.display = urls.length > 1 ? "flex" : "none";
  if (mediaViewer.dots) {
    mediaViewer.dots.innerHTML = urls.map((_, i) =>
      `<button class="h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}" data-viewer-dot="${i}"></button>`
    ).join("");
  }
}

mediaViewer.close?.addEventListener("click", closeMediaViewer);
mediaViewer.modal?.addEventListener("click", (e) => {
  if (e.target === mediaViewer.modal) closeMediaViewer();
});
mediaViewer.prev?.addEventListener("click", () => {
  mediaViewer.idx = (mediaViewer.idx - 1 + mediaViewer.urls.length) % mediaViewer.urls.length;
  renderMediaViewer();
});
mediaViewer.next?.addEventListener("click", () => {
  mediaViewer.idx = (mediaViewer.idx + 1) % mediaViewer.urls.length;
  renderMediaViewer();
});
mediaViewer.dots?.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-viewer-dot]");
  if (!dot) return;
  mediaViewer.idx = Number(dot.dataset.viewerDot);
  renderMediaViewer();
});
document.addEventListener("keydown", (e) => {
  if (mediaViewer.modal?.classList.contains("hidden")) return;
  if (e.key === "ArrowLeft") { mediaViewer.prev?.click(); }
  else if (e.key === "ArrowRight") { mediaViewer.next?.click(); }
  else if (e.key === "Escape") closeMediaViewer();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el.commentModal?.classList.contains("hidden")) {
    closeCommentModal();
  }
});

let unsubFeed = null;
let allPosts = [];
let searchQuery = "";
let currentUserId = "";
const profileCache = new Map();
const profileRequests = new Map();
const commentState = {
  postId: "",
  post: null,
  comments: [],
  repliesByParent: new Map(),
  unsubComments: null,
  replyUnsubs: new Map(),
  replyTo: null,
  submitting: false,
};

function readReportedPosts() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(REPORTED_POSTS_KEY) || "[]");
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeReportedPosts(ids) {
  try {
    sessionStorage.setItem(REPORTED_POSTS_KEY, JSON.stringify([...ids]));
  } catch {}
}

let reportedPostIds = readReportedPosts();

function readCache() {
  try { return JSON.parse(sessionStorage.getItem(WORKFEEDS_CACHE_KEY) || "null"); } catch { return null; }
}

function writeCache(feed) {
  try { sessionStorage.setItem(WORKFEEDS_CACHE_KEY, JSON.stringify(feed)); } catch {}
}

function readLocCache() {
  try { return JSON.parse(sessionStorage.getItem(LOCATION_CACHE_KEY) || "null"); } catch { return null; }
}

function writeLocCache(loc) {
  try { sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc)); } catch {}
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapFeedError(err) {
  const code = err?.code || "";
  if (code.includes("permission-denied")) return "Permission denied while loading workfeeds. Check Firestore rules.";
  if (code.includes("failed-precondition")) return "A Firestore index is required for one of your workfeed queries.";
  if (code.includes("unauthenticated")) return "Session expired. Please sign in again.";
  if (code.includes("unavailable") || code.includes("network-request-failed")) return "Network error while loading workfeeds.";
  return err?.message || "Unable to load workfeeds.";
}

function showError(message) {
  if (!el.error) return;
  el.error.textContent = message;
  el.error.classList.remove("hidden");
}

function clearError() {
  if (!el.error) return;
  el.error.textContent = "";
  el.error.classList.add("hidden");
}

function formatTime(valueMs) {
  if (!valueMs) return "Just now";
  const ms = Number(valueMs);
  if (!ms) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function valueToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatDetailTime(value) {
  const ms = valueToMillis(value);
  if (!ms) return "Just now";
  return new Date(ms).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const FALLBACK_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%232d1b4d'/%3E%3Ccircle cx='20' cy='15' r='8' fill='%237f13ec'/%3E%3Crect x='8' y='26' width='24' height='10' rx='5' fill='%237f13ec'/%3E%3C/svg%3E";

function getProfileIdentity(profile = {}, fallbackUserId = "") {
  const displayName = profile?.name || profile?.userName || profile?.username || "WorkPal User";
  const rawHandle = profile?.username || profile?.name || fallbackUserId || "workpal";
  const handle = `@${String(rawHandle).replace(/^@/, "").replace(/\s+/g, "").toLowerCase()}`;
  const avatar = profile?.profileImage || profile?.imageUrl || FALLBACK_AVATAR;
  return { displayName, handle, avatar };
}

function getCommentIdentity(comment = {}) {
  const cachedProfile = profileCache.get(String(comment.userId || "")) || {};
  return getProfileIdentity(
    {
      name: comment.userName || comment.name || cachedProfile?.name,
      username: comment.username || cachedProfile?.username,
      profileImage: comment.profileImage || cachedProfile?.profileImage,
      imageUrl: cachedProfile?.imageUrl,
    },
    comment.userId
  );
}

function ensureProfileLoaded(userId) {
  const id = String(userId || "");
  if (!id || profileCache.has(id) || profileRequests.has(id)) return;
  const request = getUserDataById(id)
    .then((profile) => {
      profileCache.set(id, profile || {});
      renderCommentThread();
      renderCommentPost();
    })
    .catch(() => {
      profileCache.set(id, {});
    })
    .finally(() => {
      profileRequests.delete(id);
    });
  profileRequests.set(id, request);
}

function warmCommentProfiles(comments = []) {
  comments.forEach((comment) => {
    ensureProfileLoaded(comment.userId);
    const replies = commentState.repliesByParent.get(comment.id) || [];
    replies.forEach((reply) => ensureProfileLoaded(reply.userId));
  });
}

function showCommentError(message) {
  if (!el.commentModalError) return;
  el.commentModalError.textContent = message;
  el.commentModalError.classList.remove("hidden");
}

function clearCommentError() {
  if (!el.commentModalError) return;
  el.commentModalError.textContent = "";
  el.commentModalError.classList.add("hidden");
}

function resetReplyTarget() {
  commentState.replyTo = null;
  if (el.commentReplyMeta) el.commentReplyMeta.classList.add("hidden");
  if (el.commentReplyLabel) el.commentReplyLabel.textContent = "";
}

function setReplyTarget(commentId) {
  const target = findCommentById(commentId);
  if (!target) return;
  const identity = getCommentIdentity(target);
  commentState.replyTo = { id: target.id, handle: identity.handle };
  if (el.commentReplyMeta) el.commentReplyMeta.classList.remove("hidden");
  if (el.commentReplyLabel) el.commentReplyLabel.textContent = `Replying to ${identity.handle}`;
  el.commentComposerInput?.focus();
}

function updateComposerState() {
  if (!el.commentComposerSubmit || !el.commentComposerInput) return;
  const disabled = commentState.submitting || !String(el.commentComposerInput.value || "").trim();
  el.commentComposerSubmit.disabled = disabled;
}

function cleanupReplyStreams() {
  commentState.replyUnsubs.forEach((unsub) => unsub?.());
  commentState.replyUnsubs.clear();
  commentState.repliesByParent.clear();
}

function cleanupCommentStreams() {
  commentState.unsubComments?.();
  commentState.unsubComments = null;
  cleanupReplyStreams();
  commentState.comments = [];
}

function syncReplyStreams() {
  const activeParentIds = new Set(commentState.comments.map((comment) => String(comment.id)));

  commentState.replyUnsubs.forEach((unsub, parentId) => {
    if (!activeParentIds.has(String(parentId))) {
      unsub?.();
      commentState.replyUnsubs.delete(parentId);
      commentState.repliesByParent.delete(parentId);
    }
  });

  commentState.comments.forEach((comment) => {
    const parentId = String(comment.id);
    if (!comment.replyCount) {
      const existing = commentState.replyUnsubs.get(parentId);
      if (existing) existing();
      commentState.replyUnsubs.delete(parentId);
      commentState.repliesByParent.delete(parentId);
      return;
    }

    if (commentState.replyUnsubs.has(parentId)) return;

    const unsub = streamCommentReplies(commentState.postId, parentId, {
      onData: (rows) => {
        commentState.repliesByParent.set(parentId, rows);
        warmCommentProfiles(rows);
        renderCommentThread();
      },
      onError: (err) => {
        console.error("Comment replies stream failed:", err);
      },
    });

    commentState.replyUnsubs.set(parentId, unsub);
  });
}

function findCommentById(commentId) {
  const id = String(commentId || "");
  for (const comment of commentState.comments) {
    if (String(comment.id) === id) return comment;
    const replies = commentState.repliesByParent.get(comment.id) || [];
    const reply = replies.find((row) => String(row.id) === id);
    if (reply) return reply;
  }
  return null;
}

function renderCommentRow(comment, { isReply = false } = {}) {
  const identity = getCommentIdentity(comment);
  const likedByMe = currentUserId ? Array.isArray(comment.likes) && comment.likes.includes(currentUserId) : false;
  const replies = isReply ? [] : (commentState.repliesByParent.get(comment.id) || []);

  return `
    <article class="${isReply ? "ml-12 border-l border-white/10 pl-4" : ""} border-b border-white/10 py-4">
      <div class="flex gap-3">
        <img class="h-10 w-10 rounded-full border border-white/10 object-cover" src="${esc(identity.avatar)}" alt="${esc(identity.displayName)}" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-bold text-white">${esc(identity.displayName)}</span>
            <span class="text-slate-500">${esc(identity.handle)}</span>
            <span class="text-slate-500">&middot; ${formatTime(valueToMillis(comment.timestamp || comment.timestampMs))}</span>
          </div>
          <p class="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-slate-100">${esc(comment.text || "")}</p>
          <div class="mt-3 flex flex-wrap items-center gap-5 text-xs font-bold text-slate-400">
            <button class="inline-flex items-center gap-1 transition-colors hover:text-white" data-reply-comment="${esc(comment.id)}" type="button">
              <span class="material-symbols-outlined text-[18px]">chat_bubble</span>
              <span>Reply</span>
            </button>
            <button class="inline-flex items-center gap-1 transition-colors ${likedByMe ? "text-primary" : "hover:text-white"}" data-like-comment="${esc(comment.id)}" type="button">
              <span class="material-symbols-outlined text-[18px]"${likedByMe ? ' style="font-variation-settings: \'FILL\' 1;"' : ""}>favorite</span>
              <span>${Number(comment.likeCount || 0)}</span>
            </button>
            ${!isReply && Number(comment.replyCount || 0) > 0 ? `<span class="text-slate-500">${Number(comment.replyCount)} repl${Number(comment.replyCount) === 1 ? "y" : "ies"}</span>` : ""}
          </div>
          ${replies.length ? `<div class="mt-3 space-y-0">${replies.map((reply) => renderCommentRow(reply, { isReply: true })).join("")}</div>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderCommentThread() {
  if (!el.commentThreadList) return;
  warmCommentProfiles(commentState.comments);
  if (!commentState.comments.length) {
    el.commentThreadList.innerHTML = `
      <div class="rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-center text-slate-400">
        No comments yet. Start the conversation.
      </div>
    `;
    return;
  }

  el.commentThreadList.innerHTML = commentState.comments
    .map((comment) => renderCommentRow(comment))
    .join("");
}

function renderCommentPost() {
  if (!el.commentModalPost) return;
  const post = commentState.post;
  if (!post) {
    el.commentModalPost.innerHTML = "";
    return;
  }

  const identity = getProfileIdentity(
    {
      name: post.name || post.username || post.artisanName || post.authorName,
      username: post.username || post.artisanUsername,
      profileImage: post.profileImage || post.artisanImage || post.authorImage,
    },
    post.artisanId || post.userId
  );
  const likeCount = Number(post.likeCount || 0);
  const commentCount = Number(post.commentCount || 0);
  const likedByMe = currentUserId ? Array.isArray(post.likes) && post.likes.includes(currentUserId) : false;
  const body = post.body || post.caption || post.text || post.description || post.content || "";
  const postTitle = post.postTitle || "";

  el.commentModalPost.innerHTML = `
    <div class="flex gap-3">
      <img class="h-12 w-12 rounded-full border border-white/10 object-cover" src="${esc(identity.avatar)}" alt="${esc(identity.displayName)}" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-lg font-black text-white">${esc(identity.displayName)}</span>
          <span class="text-sm text-slate-500">${esc(identity.handle)}</span>
        </div>
        ${postTitle ? `<h3 class="mt-3 text-2xl font-black leading-tight text-white">${esc(postTitle)}</h3>` : ""}
        ${body ? `<p class="mt-3 whitespace-pre-wrap text-[18px] leading-8 text-slate-100">${esc(body)}</p>` : ""}
        ${Array.isArray(post.mediaUrls) && post.mediaUrls.length ? `<div class="mt-4">${renderMediaGrid(post.mediaUrls, post.id)}</div>` : ""}
        <div class="mt-4 text-sm text-slate-500">${formatDetailTime(post.timestampMs || post.timestamp)}</div>
        <div class="mt-4 flex flex-wrap items-center gap-4 border-y border-white/10 py-3 text-sm">
          <button class="inline-flex items-center gap-2 ${likedByMe ? "text-primary" : "text-slate-300 hover:text-white"} transition-colors" data-like-post="${esc(post.id)}" type="button">
            <span class="material-symbols-outlined"${likedByMe ? ' style="font-variation-settings: \'FILL\' 1;"' : ""}>favorite</span>
            <span>${likeCount}</span>
          </button>
          <span class="inline-flex items-center gap-2 text-slate-300">
            <span class="material-symbols-outlined">chat_bubble</span>
            <span>${commentCount}</span>
          </span>
          <button class="inline-flex items-center gap-2 text-slate-300 transition-colors hover:text-white" data-share-post="${esc(post.id)}" type="button">
            <span class="material-symbols-outlined">share</span>
            <span>Share</span>
          </button>
          <button class="inline-flex items-center gap-2 text-red-300 transition-colors hover:text-red-200" data-report-post="${esc(post.id)}" type="button">
            <span class="material-symbols-outlined">flag</span>
            <span>Report</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCommentModal() {
  renderCommentPost();
  renderCommentThread();
  updateComposerState();
}

function openCommentModal(postId) {
  const post = allPosts.find((item) => String(item.id) === String(postId));
  if (!post) return;

  cleanupCommentStreams();
  clearCommentError();
  resetReplyTarget();

  commentState.postId = String(postId);
  commentState.post = post;
  renderCommentModal();

  el.commentModal?.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  commentState.unsubComments = streamPostComments(postId, {
    onData: (rows) => {
      commentState.comments = rows;
      warmCommentProfiles(rows);
      syncReplyStreams();
      renderCommentThread();
    },
    onError: (err) => {
      console.error("Comments stream failed:", err);
      showCommentError(mapFeedError(err));
    },
  });
}

function closeCommentModal() {
  cleanupCommentStreams();
  clearCommentError();
  resetReplyTarget();
  commentState.postId = "";
  commentState.post = null;
  commentState.submitting = false;
  if (el.commentComposerInput) el.commentComposerInput.value = "";
  updateComposerState();
  el.commentModal?.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function renderMediaGrid(mediaUrls, postId) {
  if (!mediaUrls.length) return "";
  const count = mediaUrls.length;
  const single = count === 1;
  const thumbs = mediaUrls.slice(0, 4).map((url, i) => {
    const isExtra = count > 4 && i === 3;
    return `<button class="relative overflow-hidden rounded-xl bg-[#120c1c] ${single ? "aspect-[4/3]" : "aspect-[4/3]"} border border-white/5" data-media-open="${esc(postId)}" data-media-idx="${i}">
      <img class="w-full h-full object-contain bg-[#120c1c]" src="${esc(url)}" alt="Media ${i + 1}" loading="lazy"/>
      ${isExtra ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">+${count - 3}</div>` : ""}
    </button>`;
  }).join("");
  const cols = count === 1 ? "grid-cols-1" : "grid-cols-2";
  return `<div class="grid ${cols} gap-2 px-4 pb-3">${thumbs}</div>`;
}

function renderNormalPost(post) {
  const name = post.name || post.username || post.artisanName || post.authorName || post.artisanUsername || "WorkPal User";
  const role = post.title || post.role || post.artisanTitle || "Artisan";
  const postTitle = post.postTitle || "";
  const body = post.body || post.caption || post.text || post.description || post.content || "";
  const avatar = post.profileImage || post.artisanImage || post.authorImage || FALLBACK_AVATAR;
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const likeCount = Number(post.likeCount || 0);
  const commentCount = Number(post.commentCount || 0);
  const allowComments = post.allowComments !== false;
  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 4) : [];
  const likedByMe = currentUserId ? Array.isArray(post.likes) && post.likes.includes(currentUserId) : false;
  const distance =
    typeof post.distanceKm === "number" && Number.isFinite(post.distanceKm) && post.distanceKm > 0
      ? `<span class="text-[10px] text-slate-500">${post.distanceKm.toFixed(1)} km away</span>`
      : "";
  const badge = post.isAdminPost
    ? '<span class="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Admin</span>'
    : post.type === "promotedPost"
      ? '<span class="text-[10px] font-bold uppercase tracking-widest text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">Promoted</span>'
      : "";

  return `
    <article class="bg-[#2d1b4d] rounded-xl overflow-hidden shadow-md border border-white/5">
      <div class="p-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <img class="w-9 h-9 rounded-full object-cover border border-primary/30 shrink-0" src="${esc(avatar)}" alt="${esc(name)}" />
          <div class="min-w-0">
            <h4 class="text-sm font-bold text-white truncate">${esc(name)}</h4>
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-[10px] text-slate-400">${esc(role)} &middot; ${formatTime(post.timestampMs || 0)}</p>
              ${distance}
            </div>
          </div>
        </div>
        ${badge}
      </div>
      ${renderMediaGrid(mediaUrls, post.id)}
      <div class="px-4 pb-4">
        ${postTitle ? `<h5 class="mb-1 text-base font-bold text-white">${esc(postTitle)}</h5>` : ""}
        ${body ? `<p class="text-sm text-on-surface mb-3 leading-relaxed">${esc(body)}</p>` : ""}
        ${
          tags.length
            ? `<div class="mb-3 flex flex-wrap gap-1.5">${tags
                .map((tag) => `<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">${esc(tag)}</span>`)
                .join("")}</div>`
            : ""
        }
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#191022]/45 p-2 border border-white/5">
          <div class="flex flex-wrap items-center gap-2">
            <button class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-all ${
              likedByMe
                ? "border-primary/40 bg-primary/20 text-primary"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-primary/30 hover:text-primary"
            }" data-like-post="${esc(post.id)}">
              <span class="material-symbols-outlined text-[18px]"${likedByMe ? ' style="font-variation-settings: \'FILL\' 1;"' : ""}>favorite</span>
              <span>Like</span>
              <span class="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">${likeCount}</span>
            </button>
            ${
              allowComments
                ? `<button class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-primary/30 hover:text-primary" data-comment-post="${esc(post.id)}">
                    <span class="material-symbols-outlined text-[18px]">chat_bubble</span>
                    <span>Comment</span>
                    <span class="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">${commentCount}</span>
                  </button>`
                : `<span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-500">
                    <span class="material-symbols-outlined text-[18px]">comments_disabled</span>
                    <span>Comments Off</span>
                    <span class="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">${commentCount}</span>
                  </span>`
            }
            <button class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-primary/30 hover:text-primary" data-share-post="${esc(post.id)}">
              <span class="material-symbols-outlined text-[18px]">share</span>
              <span>Share</span>
            </button>
          </div>
          <button class="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition-all hover:bg-red-500/15" data-report-post="${esc(post.id)}">
            <span class="material-symbols-outlined text-[18px]">flag</span>
            <span>Report</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderJobPost(post) {
  const title = post.title || "Open Job";
  const desc = post.description || post.body || post.text || "Job details not provided.";
  const budget = post.budget || post.price || "Negotiable";
  const location = post.location || post.address || "Remote";

  return `
    <article class="bg-surface-container-low rounded-xl p-5 border border-primary/10 shadow-md cursor-pointer hover:border-primary/30 transition-all" data-job-post="${esc(post.id)}" data-job-title="${esc(title)}" data-job-location="${esc(location)}" data-job-budget="${esc(budget)}">
      <div class="flex justify-between items-start mb-3">
        <div>
          <span class="text-[10px] font-bold text-tertiary uppercase tracking-widest bg-tertiary/10 px-2 py-1 rounded">Open Gig</span>
          <h3 class="text-base font-bold text-white mt-2">${esc(title)}</h3>
          <p class="text-slate-400 text-sm">${esc(location)}</p>
        </div>
        <div class="text-right">
          <span class="text-lg font-bold text-primary">${esc(budget)}</span>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Budget</p>
        </div>
      </div>
      <p class="text-sm text-slate-300 mb-3 line-clamp-2">${esc(desc)}</p>
      <div class="flex items-center justify-between">
        <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500">${formatTime(post.timestampMs || 0)}</div>
        <span class="text-xs font-bold text-primary flex items-center gap-1">Apply <span class="material-symbols-outlined text-sm">arrow_forward</span></span>
      </div>
    </article>
  `;
}

function filterPosts(posts) {
  const visiblePosts = posts.filter((p) => !reportedPostIds.has(String(p.id)));
  if (!searchQuery) return visiblePosts;
  const q = searchQuery.toLowerCase();
  return visiblePosts.filter((p) => {
    const name = (p.name || p.username || p.artisanName || p.authorName || "").toLowerCase();
    const title = (p.title || p.role || p.artisanTitle || "").toLowerCase();
    const body = (p.body || p.caption || p.text || p.description || "").toLowerCase();
    const postTitle = (p.postTitle || "").toLowerCase();
    return name.includes(q) || title.includes(q) || body.includes(q) || postTitle.includes(q);
  });
}

// Order: admin → promoted → job posts → regular
function renderFeed({ adminPosts = [], promotedPosts = [], jobPosts = [], regularPosts = [] }) {
  if (!el.list) return;
  const ordered = [...adminPosts, ...promotedPosts, ...jobPosts, ...regularPosts];
  allPosts = ordered;
  if (commentState.postId) {
    const selectedPost = ordered.find((post) => String(post.id) === String(commentState.postId));
    if (selectedPost) {
      commentState.post = selectedPost;
      renderCommentPost();
    } else {
      closeCommentModal();
    }
  }
  const filtered = filterPosts(ordered);
  if (!filtered.length) {
    el.list.innerHTML = searchQuery
      ? '<div class="bg-surface-container-low rounded-xl p-6 text-slate-300">No artisans or posts match your search.</div>'
      : reportedPostIds.size
        ? '<div class="bg-surface-container-low rounded-xl p-6 text-slate-300">No visible feed items right now. Reported posts stay hidden for this session.</div>'
        : '<div class="bg-surface-container-low rounded-xl p-6 text-slate-300">No feed items yet.</div>';
    return;
  }
  el.list.innerHTML = filtered.map((post) =>
    post.type === "job_post" ? renderJobPost(post) : renderNormalPost(post)
  ).join("");
}

function renderFeedLoading() {
  if (!el.list) return;
  el.list.innerHTML = renderWorkfeedsSkeleton(3);
}

// Media open via delegation
document.addEventListener("click", (e) => {
  const mediaBtn = e.target.closest("[data-media-open]");
  if (mediaBtn) {
    const postId = mediaBtn.getAttribute("data-media-open");
    const startIdx = Number(mediaBtn.getAttribute("data-media-idx") || 0);
    // Find the post to get all its media
    const post = allPosts.find((p) => p.id === postId);
    const urls = post && Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
    if (urls.length) openMediaViewer(urls, startIdx);
    return;
  }

  // Job post click → apply page
  const jobArticle = e.target.closest("[data-job-post]");
  if (jobArticle) {
    const postId = jobArticle.getAttribute("data-job-post");
    const title = jobArticle.getAttribute("data-job-title");
    const location = jobArticle.getAttribute("data-job-location");
    const budget = jobArticle.getAttribute("data-job-budget");
    const params = new URLSearchParams({ postId, title, location, budget });
    window.location.href = `${JOB_APPLY_PAGE}?${params.toString()}`;
    return;
  }
});

async function startFeed() {
  clearError();

  const cachedFeed = readCache();
  if (Array.isArray(cachedFeed) && cachedFeed.length) {
    renderFeed({ regularPosts: cachedFeed });
  } else {
    renderFeedLoading();
  }

  const user = await waitForAuthUser();
  if (!user) { window.location.href = LOGIN_PAGE; return; }
  currentUserId = user.uid;

  getUserDataById(user.uid).then((profile) => {
    if (el.avatarImg && (profile?.profileImage || profile?.imageUrl)) {
      el.avatarImg.src = profile.profileImage || profile.imageUrl;
    }
  });

  // Live notification badge — handled by app-shell, but also update feedNotifBadge
  onSnapshot(
    query(collection(db, "notifications"), where("userId", "==", user.uid), where("isRead", "==", false)),
    (snap) => {
      if (!el.notifBadge) return;
      const count = snap.size;
      if (count > 0) {
        el.notifBadge.textContent = count > 99 ? "99+" : String(count);
        el.notifBadge.classList.remove("hidden");
        el.notifBadge.classList.add("flex");
      } else {
        el.notifBadge.classList.add("hidden");
        el.notifBadge.classList.remove("flex");
      }
    }
  );

  let loc = readLocCache();
  if (!loc) {
    loc = (await getBrowserLocation()) || DEFAULT_LOCATION;
    writeLocCache(loc);
  }

  unsubFeed?.();

  unsubFeed = streamWorkfeeds({
    showGlobalPosts: true,
    userLocation: loc,
    radiusKm: 10,
    includeJobPosts: true,
    onData: ({ feed, adminPosts, promotedPosts, regularPosts }) => {
      const jobPosts = feed.filter((p) => p.type === "job_post");
      renderFeed({ adminPosts, promotedPosts, jobPosts, regularPosts });
      writeCache(feed);
    },
    onError: (err) => {
      console.error("Workfeed stream error:", err);
      showError(mapFeedError(err));
    },
  });
}

// Search
el.searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderFeed({ regularPosts: allPosts });
});

async function handlePostActionClick(event) {
  const likeBtn = event.target.closest("[data-like-post]");
  if (likeBtn) {
    const postId = likeBtn.getAttribute("data-like-post");
    if (!postId) return;
    try { await togglePostLike(postId); clearError(); } catch (err) { showError(mapFeedError(err)); }
    return;
  }

  const commentBtn = event.target.closest("[data-comment-post]");
  if (commentBtn) {
    const postId = commentBtn.getAttribute("data-comment-post");
    if (!postId) return;
    openCommentModal(postId);
    return;
  }

  const shareBtn = event.target.closest("[data-share-post]");
  if (shareBtn) {
    const postId = shareBtn.getAttribute("data-share-post");
    const post = allPosts.find((item) => String(item.id) === String(postId));
    if (!post) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?postId=${encodeURIComponent(postId)}`;
    const shareTitle = post.postTitle || "WorkPal post";
    const shareText = post.body || post.caption || "Check out this WorkPal post.";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showError("Post link copied to clipboard.");
        setTimeout(clearError, 1800);
      } else {
        window.prompt("Copy this post link:", shareUrl);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        showError("Unable to share this post right now.");
      }
    }
    return;
  }

  const reportBtn = event.target.closest("[data-report-post]");
  if (reportBtn) {
    const postId = reportBtn.getAttribute("data-report-post");
    if (!postId) return;
    const shouldReport = window.confirm("Report this post and hide it from your feed for this session?");
    if (!shouldReport) return;
    reportedPostIds.add(String(postId));
    writeReportedPosts(reportedPostIds);
    if (String(commentState.postId) === String(postId)) {
      closeCommentModal();
    }
    renderFeed({ regularPosts: allPosts });
    showError("Post reported and hidden from your current feed.");
    setTimeout(clearError, 1800);
  }
}

el.list?.addEventListener("click", async (event) => {
  await handlePostActionClick(event);
});

el.commentModalClose?.addEventListener("click", closeCommentModal);

el.commentModal?.addEventListener("click", (event) => {
  if (event.target === el.commentModal) {
    closeCommentModal();
  }
});

el.commentReplyCancel?.addEventListener("click", () => {
  resetReplyTarget();
});

el.commentComposerInput?.addEventListener("input", () => {
  clearCommentError();
  updateComposerState();
});

el.commentComposerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!commentState.postId || !el.commentComposerInput) return;

  const text = String(el.commentComposerInput.value || "").trim();
  if (!text) return;

  commentState.submitting = true;
  updateComposerState();
  clearCommentError();

  try {
    await addComment(commentState.postId, text, commentState.replyTo?.id || null);
    el.commentComposerInput.value = "";
    resetReplyTarget();
    clearError();
  } catch (err) {
    showCommentError(mapFeedError(err));
  } finally {
    commentState.submitting = false;
    updateComposerState();
  }
});

el.commentModal?.addEventListener("click", async (event) => {
  const replyBtn = event.target.closest("[data-reply-comment]");
  if (replyBtn) {
    const commentId = replyBtn.getAttribute("data-reply-comment");
    if (commentId) setReplyTarget(commentId);
    return;
  }

  const likeCommentBtn = event.target.closest("[data-like-comment]");
  if (likeCommentBtn) {
    const commentId = likeCommentBtn.getAttribute("data-like-comment");
    if (!commentId || !commentState.postId) return;
    try {
      await toggleCommentLike(commentState.postId, commentId);
      clearCommentError();
    } catch (err) {
      showCommentError(mapFeedError(err));
    }
    return;
  }

  await handlePostActionClick(event);
});

window.addEventListener("beforeunload", () => {
  unsubFeed?.();
  cleanupCommentStreams();
});

startFeed().catch((err) => {
  console.error("Workfeed init failed:", err);
  showError(mapFeedError(err));
});
