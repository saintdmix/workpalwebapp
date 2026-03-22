import { auth } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getStoriesForVendor,
  markStoryViewed,
  subscribeStoryVendors,
} from "../services/stories-service.js";

const $ = (id) => document.getElementById(id);

const els = {
  row: $("storiesRow"),
  loading: $("storiesLoading"),
  empty: $("storiesEmpty"),
  error: $("storiesError"),
  modal: $("storyViewerModal"),
  media: $("storyViewerMedia"),
  name: $("storyViewerName"),
  caption: $("storyViewerCaption"),
  progress: $("storyViewerProgress"),
  prev: $("storyPrevBtn"),
  next: $("storyNextBtn"),
  close: $("storyCloseBtn"),
};

let stopStories = null;
let currentUser = null;
let vendors = [];
let activeVendor = null;
let activeStories = [];
let activeIndex = 0;

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
}

function setError(msg = "") {
  if (!els.error) return;
  els.error.textContent = msg;
  els.error.style.display = msg ? "block" : "none";
}

function renderRow() {
  if (!els.row) return;

  if (!vendors.length) {
    els.row.innerHTML = "";
    if (els.empty) els.empty.style.display = "block";
    return;
  }

  if (els.empty) els.empty.style.display = "none";

  els.row.innerHTML = vendors
    .map(
      (v) => `
      <button class="story-avatar ${v.hasUnseen ? "unseen" : "seen"}" data-vendor-id="${esc(v.artisanId)}" type="button">
        <span class="story-ring">
          ${
            v.profileImage
              ? `<img src="${esc(v.profileImage)}" alt="${esc(v.name)}" onerror="this.style.display='none'; this.parentElement.classList.add('story-fallback-visible')" />`
              : ""
          }
          <span class="story-fallback">${esc((v.name || "A").charAt(0).toUpperCase())}</span>
        </span>
        <span class="name">${esc(v.name)}</span>
      </button>
    `
    )
    .join("");
}

function parseVideo(url) {
  const s = String(url || "").toLowerCase();
  return s.endsWith(".mp4") || s.endsWith(".mov") || s.endsWith(".webm") || s.includes(".mp4?");
}

function openModal() {
  if (els.modal) els.modal.style.display = "flex";
}

function closeModal() {
  if (els.modal) els.modal.style.display = "none";
  activeVendor = null;
  activeStories = [];
  activeIndex = 0;
}

async function markCurrentViewed() {
  const item = activeStories[activeIndex];
  if (!item || !currentUser?.uid) return;
  await markStoryViewed(item.storyKey, currentUser.uid);

  const row = vendors.find((x) => x.artisanId === activeVendor?.artisanId);
  if (row && row.unseenCount > 0 && row.storyKeys.includes(item.storyKey)) {
    row.unseenCount -= 1;
    row.hasUnseen = row.unseenCount > 0;
    renderRow();
  }
}

async function renderActiveStory() {
  const item = activeStories[activeIndex];
  if (!item || !els.media) return;

  if (els.name) els.name.textContent = activeVendor?.name || "Story";
  if (els.caption) els.caption.textContent = item.content || "";
  if (els.progress) els.progress.textContent = `${activeIndex + 1}/${activeStories.length}`;

  if (parseVideo(item.mediaUrl)) {
    els.media.innerHTML = `<video src="${esc(item.mediaUrl)}" controls autoplay playsinline></video>`;
  } else {
    els.media.innerHTML = `<img src="${esc(item.mediaUrl)}" alt="story" />`;
  }

  await markCurrentViewed();
}

async function openVendorStories(vendorId) {
  const vendor = vendors.find((v) => v.artisanId === vendorId);
  if (!vendor || !currentUser?.uid) return;

  const stories = await getStoriesForVendor(vendorId, { viewerId: currentUser.uid });
  if (!stories.length) return;

  activeVendor = vendor;
  activeStories = stories;
  activeIndex = stories.findIndex((x) => !x.isViewed);
  if (activeIndex < 0) activeIndex = 0;

  openModal();
  await renderActiveStory();
}

async function resolveBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function startStoriesStream() {
  if (stopStories) stopStories();
  setError("");
  setLoading(true);

  const location = await resolveBrowserLocation();

  stopStories = subscribeStoryVendors({
    viewerId: currentUser.uid,
    customerLocation: location,
    useLocationFilter: false,
    radiusKm: 10,
    onData: (rows) => {
      vendors = rows;
      renderRow();
      setLoading(false);
    },
    onError: (err) => {
      setLoading(false);
      setError(err?.message || "Failed to load stories.");
    },
  });
}

if (els.row) {
  els.row.addEventListener("click", async (e) => {
    const avatar = e.target.closest(".story-avatar");
    if (!avatar) return;
    const vendorId = avatar.dataset.vendorId;
    await openVendorStories(vendorId);
  });
}

if (els.prev) {
  els.prev.addEventListener("click", async () => {
    if (!activeStories.length) return;
    activeIndex = (activeIndex - 1 + activeStories.length) % activeStories.length;
    await renderActiveStory();
  });
}

if (els.next) {
  els.next.addEventListener("click", async () => {
    if (!activeStories.length) return;
    activeIndex = (activeIndex + 1) % activeStories.length;
    await renderActiveStory();
  });
}

if (els.close) els.close.addEventListener("click", closeModal);
if (els.modal) {
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });
}

onAuthStateChanged(auth, async (user) => {
  if (stopStories) stopStories();
  stopStories = null;
  vendors = [];
  currentUser = user;

  if (!user) {
    if (els.row) els.row.innerHTML = "";
    setLoading(false);
    return;
  }

  await startStoriesStream();
});
