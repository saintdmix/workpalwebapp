import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from "./firebase-init.js";
import {
  MAX_POST_MEDIA_FILES,
  getCreatePostContext,
  publishArtisanPost,
} from "./create-post-service.js";
import { ALL_CATEGORIES } from "./services/categories-config.js";

const LOGIN_URL = "../signin.html?mode=login";
const POST_JOB_URL = "./post-job.html";

const $ = (id) => document.getElementById(id);

const els = {
  form: $("createPostForm"),
  banner: $("createPostBanner"),
  draftState: $("draftState"),
  discardBtn: $("discardBtn"),
  previewBtn: $("previewBtn"),
  publishBtn: $("publishBtn"),
  title: $("postTitleInput"),
  body: $("postBodyInput"),
  category: $("categoryInput"),
  visibility: $("visibilitySelect"),
  tagInput: $("tagInput"),
  addTagBtn: $("addTagBtn"),
  tagsList: $("tagsList"),
  mediaInput: $("mediaInput"),
  mediaGrid: $("mediaGrid"),
  mediaHint: $("mediaHint"),
  formatTabs: [...document.querySelectorAll("[data-post-format]")],
  commentsToggle: $("commentsToggle"),
  portfolioToggle: $("portfolioToggle"),
  storyToggle: $("storyToggle"),
  composerName: $("composerName"),
  composerRole: $("composerRole"),
  categoryOptions: $("categoryOptions"),
  liveTitle: $("liveTitle"),
  liveBody: $("liveBody"),
  liveTags: $("liveTags"),
  liveMeta: $("liveMeta"),
  liveMediaCount: $("liveMediaCount"),
  liveFormatBadge: $("liveFormatBadge"),
  previewModal: $("previewModal"),
  previewCloseBtn: $("previewCloseBtn"),
  previewPublishBtn: $("previewPublishBtn"),
  previewTitle: $("previewTitle"),
  previewBody: $("previewBody"),
  previewTags: $("previewTags"),
  previewMedia: $("previewMedia"),
  previewAuthorName: $("previewAuthorName"),
  previewAuthorRole: $("previewAuthorRole"),
  previewFormat: $("previewFormat"),
  previewVisibility: $("previewVisibility"),
  previewCategory: $("previewCategory"),
  previewComments: $("previewComments"),
  previewPortfolio: $("previewPortfolio"),
  previewStory: $("previewStory"),
};

const state = {
  profile: null,
  tags: [],
  media: [],
  postFormat: "status",
  allowComments: true,
  showcaseInPortfolio: true,
  shareToStory: false,
  draftKey: "",
  isPublishing: false,
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqueList(values) {
  return [...new Set((values || []).map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function getFormatLabel(format = state.postFormat) {
  if (format === "portfolio") return "Portfolio Project";
  if (format === "availability") return "Open For Work";
  return "Status Update";
}

function getDraftPayload() {
  return {
    title: els.title?.value || "",
    body: els.body?.value || "",
    category: els.category?.value || "",
    visibility: els.visibility?.value || "public",
    tags: state.tags,
    postFormat: state.postFormat,
    allowComments: state.allowComments,
    showcaseInPortfolio: state.showcaseInPortfolio,
    shareToStory: state.shareToStory,
  };
}

function setBanner(message = "", tone = "info") {
  if (!els.banner) return;
  if (!message) {
    els.banner.className = "hidden rounded-2xl border px-4 py-3 text-sm";
    els.banner.textContent = "";
    return;
  }

  const toneClass =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-primary/25 bg-primary/10 text-violet-100";

  els.banner.className = `rounded-2xl border px-4 py-3 text-sm ${toneClass}`;
  els.banner.textContent = message;
}

function setDraftState(message) {
  if (els.draftState) els.draftState.textContent = message;
}

function updatePublishButtons() {
  if (els.publishBtn) {
    els.publishBtn.disabled = state.isPublishing;
    els.publishBtn.textContent = state.isPublishing ? "Publishing..." : "Publish Post";
  }
  if (els.previewPublishBtn) {
    els.previewPublishBtn.disabled = state.isPublishing;
    els.previewPublishBtn.textContent = state.isPublishing ? "Publishing..." : "Publish Now";
  }
}

function renderToggle(button, enabled) {
  if (!button) return;
  button.setAttribute("aria-pressed", String(enabled));
  button.className = `group relative h-7 w-12 rounded-full transition-colors ${
    enabled ? "bg-violet-500/90" : "bg-slate-700"
  }`;
  const knob = button.querySelector("[data-toggle-knob]");
  if (knob) {
    knob.className = `pointer-events-none absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
      enabled ? "left-1 translate-x-5" : "left-1 translate-x-0"
    }`;
  }
}

function renderFormats() {
  els.formatTabs.forEach((button) => {
    const active = button.dataset.postFormat === state.postFormat;
    button.className = `rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
      active
        ? "border-violet-300/40 bg-violet-500/20 text-white shadow-[0_10px_25px_rgba(127,19,236,0.25)]"
        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
    }`;
  });
  if (els.liveFormatBadge) els.liveFormatBadge.textContent = getFormatLabel();
}

function renderTags() {
  if (!els.tagsList) return;
  if (!state.tags.length) {
    els.tagsList.innerHTML = '<p class="text-xs text-slate-500">No tags added yet.</p>';
  } else {
    els.tagsList.innerHTML = state.tags
      .map(
        (tag) => `
          <button class="chip-btn" data-remove-tag="${esc(tag)}" type="button">
            ${esc(tag)}
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        `
      )
      .join("");
  }

  if (els.liveTags) {
    els.liveTags.innerHTML = state.tags.length
      ? state.tags.map((tag) => `<span class="chip-btn">${esc(tag)}</span>`).join("")
      : '<span class="text-xs text-slate-500">No tags yet.</span>';
  }
}

function renderMedia() {
  if (!els.mediaGrid || !els.mediaHint) return;

  if (!state.media.length) {
    els.mediaGrid.innerHTML = "";
    els.mediaHint.textContent = `No media selected yet. You can upload up to ${MAX_POST_MEDIA_FILES} images.`;
  } else {
    els.mediaHint.textContent = `${state.media.length}/${MAX_POST_MEDIA_FILES} image${state.media.length === 1 ? "" : "s"} selected.`;
    els.mediaGrid.innerHTML = state.media
      .map(
        (item, index) => `
          <article class="overflow-hidden rounded-[1.25rem] border border-primary/15 bg-[#120c1c]">
            <div class="aspect-[1.05] overflow-hidden bg-surface-container-lowest">
              <img alt="Selected upload ${index + 1}" class="h-full w-full object-cover" src="${esc(item.previewUrl)}" />
            </div>
            <div class="flex items-center justify-between gap-3 p-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-white">${esc(item.file.name)}</p>
                <p class="text-xs text-slate-500">${Math.max(1, Math.round(item.file.size / 1024))} KB</p>
              </div>
              <button class="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15" data-remove-media="${esc(item.id)}" type="button">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  if (els.liveMediaCount) {
    els.liveMediaCount.textContent = `${state.media.length} image${state.media.length === 1 ? "" : "s"} selected`;
  }
}

function renderLivePreview() {
  const title = String(els.title?.value || "").trim();
  const body = String(els.body?.value || "").trim();
  const visibilityLabel = els.visibility?.selectedOptions?.[0]?.textContent || "Public";
  const category = String(els.category?.value || "").trim();

  if (els.liveTitle) els.liveTitle.textContent = title || "Your post title will appear here.";
  if (els.liveBody) {
    els.liveBody.textContent =
      body || "Write something meaningful so clients and collaborators can see what you do.";
  }
  if (els.liveMeta) {
    els.liveMeta.textContent = `${visibilityLabel}${category ? ` | ${category}` : ""}`;
  }
}

function renderRightPanel() {
  renderFormats();
  renderTags();
  renderMedia();
  renderLivePreview();
  renderToggle(els.commentsToggle, state.allowComments);
  renderToggle(els.portfolioToggle, state.showcaseInPortfolio);
  renderToggle(els.storyToggle, state.shareToStory);
}

function revokeMediaUrls() {
  state.media.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

function clearMedia() {
  revokeMediaUrls();
  state.media = [];
}

function draftHasContent(payload) {
  return Boolean(
    payload.title ||
      payload.body ||
      payload.category ||
      payload.tags.length ||
      payload.postFormat !== "status" ||
      payload.visibility !== "public" ||
      payload.allowComments === false ||
      payload.showcaseInPortfolio === false ||
      payload.shareToStory === true
  );
}

function persistDraft() {
  if (!state.draftKey) return;
  const payload = getDraftPayload();
  if (!draftHasContent(payload)) {
    localStorage.removeItem(state.draftKey);
    setDraftState("Draft not saved yet.");
    return;
  }

  localStorage.setItem(state.draftKey, JSON.stringify(payload));
  setDraftState("Draft saved locally on this device.");
}

function restoreDraft() {
  if (!state.draftKey) return false;

  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(state.draftKey) || "null");
  } catch {
    parsed = null;
  }
  if (!parsed) return false;

  if (els.title) els.title.value = parsed.title || "";
  if (els.body) els.body.value = parsed.body || "";
  if (els.category) els.category.value = parsed.category || "";
  if (els.visibility) els.visibility.value = parsed.visibility || "public";

  state.tags = uniqueList(parsed.tags).slice(0, 10);
  state.postFormat = parsed.postFormat || "status";
  state.allowComments = parsed.allowComments !== false;
  state.showcaseInPortfolio = parsed.showcaseInPortfolio !== false;
  state.shareToStory = parsed.shareToStory === true;

  setBanner("Draft restored. Re-add images if you had any before.", "info");
  setDraftState("Draft restored from local storage.");
  return true;
}

function addTag(rawValue) {
  const value = String(rawValue || "").replaceAll(",", "").trim();
  if (!value) return;
  state.tags = uniqueList([...state.tags, value]).slice(0, 10);
  if (els.tagInput) els.tagInput.value = "";
  persistDraft();
  renderRightPanel();
}

function removeTag(tag) {
  state.tags = state.tags.filter((item) => item !== tag);
  persistDraft();
  renderRightPanel();
}

function makeMediaId(file) {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

function addMediaFiles(fileList) {
  const incoming = Array.from(fileList || []).filter((file) => String(file.type || "").startsWith("image/"));
  if (!incoming.length) return;

  const existingIds = new Set(state.media.map((item) => item.id));
  for (const file of incoming) {
    if (state.media.length >= MAX_POST_MEDIA_FILES) break;
    const id = makeMediaId(file);
    if (existingIds.has(id)) continue;
    existingIds.add(id);
    state.media.push({
      id,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  if (incoming.length && state.media.length >= MAX_POST_MEDIA_FILES) {
    setBanner(`You can upload up to ${MAX_POST_MEDIA_FILES} images on one post.`, "info");
  }

  renderRightPanel();
}

function removeMedia(id) {
  const target = state.media.find((item) => item.id === id);
  if (target) URL.revokeObjectURL(target.previewUrl);
  state.media = state.media.filter((item) => item.id !== id);
  renderRightPanel();
}

function fillPreviewModal() {
  const title = String(els.title?.value || "").trim() || "Untitled post";
  const body = String(els.body?.value || "").trim() || "Your preview will appear here.";
  const visibilityLabel = els.visibility?.selectedOptions?.[0]?.textContent || "Public";
  const category = String(els.category?.value || "").trim() || "Not set";

  if (els.previewTitle) els.previewTitle.textContent = title;
  if (els.previewBody) els.previewBody.textContent = body;
  if (els.previewAuthorName) els.previewAuthorName.textContent = state.profile?.name || "Artisan";
  if (els.previewAuthorRole) {
    els.previewAuthorRole.textContent = state.profile?.title || "Artisan workspace";
  }
  if (els.previewFormat) els.previewFormat.textContent = `Format: ${getFormatLabel()}`;
  if (els.previewVisibility) els.previewVisibility.textContent = `Visibility: ${visibilityLabel}`;
  if (els.previewCategory) els.previewCategory.textContent = `Category: ${category}`;
  if (els.previewComments) els.previewComments.textContent = `Comments: ${state.allowComments ? "Enabled" : "Disabled"}`;
  if (els.previewPortfolio) {
    els.previewPortfolio.textContent = `Portfolio: ${state.showcaseInPortfolio ? "Enabled" : "Disabled"}`;
  }
  if (els.previewStory) els.previewStory.textContent = `Stories: ${state.shareToStory ? "Enabled" : "Disabled"}`;

  if (els.previewTags) {
    els.previewTags.innerHTML = state.tags.length
      ? state.tags.map((tag) => `<span class="chip-btn">${esc(tag)}</span>`).join("")
      : '<span class="text-xs text-slate-500">No tags added.</span>';
  }

  if (els.previewMedia) {
    els.previewMedia.innerHTML = state.media.length
      ? state.media
          .map(
            (item, index) => `
              <div class="overflow-hidden rounded-[1rem] border border-white/5 bg-black/20">
                <img alt="Preview media ${index + 1}" class="aspect-[1.05] h-full w-full object-cover" src="${esc(item.previewUrl)}" />
              </div>
            `
          )
          .join("")
      : '<p class="text-sm text-slate-500">No images attached.</p>';
  }
}

function openPreviewModal() {
  fillPreviewModal();
  els.previewModal?.classList.remove("hidden");
  els.previewModal?.classList.add("flex");
}

function closePreviewModal() {
  els.previewModal?.classList.add("hidden");
  els.previewModal?.classList.remove("flex");
}

async function publishPost() {
  if (state.isPublishing) return;
  setBanner("");

  state.isPublishing = true;
  updatePublishButtons();

  try {
    const result = await publishArtisanPost({
      title: els.title?.value || "",
      body: els.body?.value || "",
      category: els.category?.value || "",
      visibility: els.visibility?.value || "public",
      tags: state.tags,
      postFormat: state.postFormat,
      allowComments: state.allowComments,
      showcaseInPortfolio: state.showcaseInPortfolio,
      shareToStory: state.shareToStory,
      mediaFiles: state.media.map((item) => item.file),
    });

    localStorage.removeItem(state.draftKey);
    setDraftState("Draft cleared after publish.");
    setBanner(
      state.shareToStory
        ? "Post published and first image shared to stories."
        : "Post published successfully.",
      "success"
    );
    closePreviewModal();

    setTimeout(() => {
      window.location.href = `./feed.html?postId=${encodeURIComponent(result.id)}`;
    }, 900);
  } catch (error) {
    setBanner(error?.message || "Unable to publish this post.", "error");
  } finally {
    state.isPublishing = false;
    updatePublishButtons();
  }
}

function seedFromProfile() {
  if (!state.profile) return;
  if (els.category && !els.category.value) {
    els.category.value = state.profile.title || "";
  }
  if (!state.tags.length && Array.isArray(state.profile.skills) && state.profile.skills.length) {
    state.tags = uniqueList(state.profile.skills).slice(0, 4);
  }
}

function resetComposer() {
  els.form?.reset();
  state.tags = [];
  state.postFormat = "status";
  state.allowComments = true;
  state.showcaseInPortfolio = true;
  state.shareToStory = false;
  clearMedia();
  if (state.profile?.title && els.category) {
    els.category.value = state.profile.title;
  }
  if (els.visibility) els.visibility.value = "public";
  persistDraft();
  renderRightPanel();
}

function bindEvents() {
  els.form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await publishPost();
  });

  els.title?.addEventListener("input", () => {
    persistDraft();
    renderLivePreview();
  });
  els.body?.addEventListener("input", () => {
    persistDraft();
    renderLivePreview();
  });
  els.category?.addEventListener("input", () => {
    persistDraft();
    renderLivePreview();
  });
  els.visibility?.addEventListener("change", () => {
    persistDraft();
    renderLivePreview();
  });

  els.addTagBtn?.addEventListener("click", () => addTag(els.tagInput?.value || ""));
  els.tagInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(els.tagInput?.value || "");
    }
  });
  els.tagInput?.addEventListener("blur", () => {
    if (els.tagInput?.value.trim()) addTag(els.tagInput.value);
  });

  els.tagsList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-tag]");
    if (!button) return;
    removeTag(button.getAttribute("data-remove-tag") || "");
  });

  els.mediaInput?.addEventListener("change", () => {
    addMediaFiles(els.mediaInput?.files || []);
    if (els.mediaInput) els.mediaInput.value = "";
  });

  els.mediaGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-media]");
    if (!button) return;
    removeMedia(button.getAttribute("data-remove-media") || "");
  });

  els.formatTabs.forEach((button) => {
    button.addEventListener("click", () => {
      state.postFormat = button.dataset.postFormat || "status";
      persistDraft();
      renderRightPanel();
    });
  });

  els.commentsToggle?.addEventListener("click", () => {
    state.allowComments = !state.allowComments;
    persistDraft();
    renderRightPanel();
  });
  els.portfolioToggle?.addEventListener("click", () => {
    state.showcaseInPortfolio = !state.showcaseInPortfolio;
    persistDraft();
    renderRightPanel();
  });
  els.storyToggle?.addEventListener("click", () => {
    state.shareToStory = !state.shareToStory;
    persistDraft();
    renderRightPanel();
  });

  els.discardBtn?.addEventListener("click", () => {
    if (!window.confirm("Discard this draft and clear the form?")) return;
    localStorage.removeItem(state.draftKey);
    setBanner("");
    resetComposer();
  });

  els.previewBtn?.addEventListener("click", openPreviewModal);
  els.previewCloseBtn?.addEventListener("click", closePreviewModal);
  els.previewModal?.addEventListener("click", (event) => {
    if (event.target === els.previewModal) closePreviewModal();
  });
  els.previewPublishBtn?.addEventListener("click", publishPost);

  window.addEventListener("beforeunload", () => {
    revokeMediaUrls();
  });
}

function populateCategoryList() {
  if (!els.categoryOptions) return;
  els.categoryOptions.innerHTML = ALL_CATEGORIES.map((item) => `<option value="${esc(item)}"></option>`).join("");
}

async function initForUser() {
  const { profile } = await getCreatePostContext();
  if (profile.role !== "artisan") {
    window.location.href = POST_JOB_URL;
    return;
  }

  state.profile = profile;
  state.draftKey = `workpalCreatePostDraftV1:${profile.uid}`;

  if (els.composerName) els.composerName.textContent = profile.name || "WorkPal Artisan";
  if (els.composerRole) els.composerRole.textContent = profile.title || "Artisan workspace";

  if (restoreDraft()) {
    renderRightPanel();
    return;
  }

  seedFromProfile();
  renderRightPanel();
}

function boot() {
  populateCategoryList();
  bindEvents();
  renderRightPanel();
  updatePublishButtons();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = LOGIN_URL;
      return;
    }

    try {
      await initForUser();
    } catch (error) {
      setBanner(error?.message || "Unable to load the create-post workspace.", "error");
    }
  });
}

boot();
