import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getDownloadURL, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { auth, db, storage } from "./firebase-init.js";
import { getCurrentUserProfile } from "./services/profile-service.js";
import { createStoryFromMediaUrls } from "./services/stories-service.js";

export const MAX_POST_MEDIA_FILES = 6;

function asString(value) {
  return String(value ?? "").trim();
}

function uniqueList(values) {
  return [...new Set((values || []).map((item) => asString(item)).filter(Boolean))];
}

function cleanVisibility(value) {
  if (value === "private" || value === "network") return value;
  return "public";
}

function cleanPostFormat(value) {
  if (value === "portfolio" || value === "availability") return value;
  return "status";
}

function ensureImageFiles(files) {
  const items = Array.from(files || []).filter(Boolean);
  if (items.length > MAX_POST_MEDIA_FILES) {
    throw new Error(`You can upload up to ${MAX_POST_MEDIA_FILES} images per post.`);
  }

  for (const file of items) {
    if (!String(file.type || "").startsWith("image/")) {
      throw new Error("Only image uploads are supported for posts right now.");
    }
  }

  return items;
}

function buildUploadPath(userId, file, index) {
  const extRaw = (String(file.name || "").split(".").pop() || "jpg").toLowerCase();
  const ext = extRaw.replace(/[^a-z0-9]/g, "") || "jpg";
  return `posts/${userId}/${Date.now()}_${index}.${ext}`;
}

async function uploadPostMedia(userId, files) {
  const media = ensureImageFiles(files);
  const urls = [];

  for (let index = 0; index < media.length; index += 1) {
    const file = media[index];
    const storageRef = ref(storage, buildUploadPath(userId, file, index));
    await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
    urls.push(await getDownloadURL(storageRef));
  }

  return urls;
}

export function validateCreatePostInput(input = {}) {
  const title = asString(input.title);
  const body = asString(input.body);
  const category = asString(input.category);
  const tags = uniqueList(input.tags).slice(0, 10);
  const mediaFiles = ensureImageFiles(input.mediaFiles);
  const visibility = cleanVisibility(input.visibility);
  const postFormat = cleanPostFormat(input.postFormat);
  const allowComments = input.allowComments !== false;
  const showcaseInPortfolio = input.showcaseInPortfolio !== false;
  const shareToStory = input.shareToStory === true;

  if (!title) throw new Error("Add a title before publishing.");
  if (!body) throw new Error("Add some post details before publishing.");
  if (body.length < 12) throw new Error("Make the post body a little more descriptive.");
  if (shareToStory && !mediaFiles.length) {
    throw new Error("Add at least one image if you want to share this post to stories.");
  }

  return {
    title,
    body,
    category,
    tags,
    mediaFiles,
    visibility,
    postFormat,
    allowComments,
    showcaseInPortfolio,
    shareToStory,
  };
}

export async function getCreatePostContext() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not signed in.");

  const profile = await getCurrentUserProfile();
  return { user, profile };
}

export async function publishArtisanPost(input = {}) {
  const { user, profile } = await getCreatePostContext();
  if (profile.role !== "artisan") {
    throw new Error("Only artisan accounts can create posts here.");
  }

  const clean = validateCreatePostInput(input);
  const mediaUrls = await uploadPostMedia(user.uid, clean.mediaFiles);
  const latitude = Number.isFinite(profile.lat) ? profile.lat : null;
  const longitude = Number.isFinite(profile.lng) ? profile.lng : null;
  const displayName = profile.name || auth.currentUser?.displayName || auth.currentUser?.email || "WorkPal Artisan";
  const professionalTitle = profile.title || clean.category || "Artisan";

  const payload = {
    artisanId: user.uid,
    authorId: user.uid,
    name: displayName,
    username: displayName,
    artisanName: displayName,
    title: professionalTitle,
    artisanTitle: professionalTitle,
    postTitle: clean.title,
    body: clean.body,
    caption: clean.body,
    content: clean.body,
    category: clean.category,
    tags: clean.tags,
    postFormat: clean.postFormat,
    visibility: clean.visibility,
    allowComments: clean.allowComments,
    showcaseInPortfolio: clean.showcaseInPortfolio,
    isPortfolioPost: clean.postFormat === "portfolio" || clean.showcaseInPortfolio,
    mediaUrls,
    imageUrl: mediaUrls,
    profileImage: profile.profileImage || "",
    artisanImage: profile.profileImage || "",
    address: profile.address || "",
    latitude,
    longitude,
    likes: [],
    likeCount: 0,
    commentCount: 0,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const createdRef = await addDoc(collection(db, "posts"), payload);

  if (clean.shareToStory && mediaUrls.length) {
    await createStoryFromMediaUrls({
      mediaUrls: [mediaUrls[0]],
      content: clean.title,
      postId: createdRef.id,
      latitude,
      longitude,
    });
  }

  return {
    id: createdRef.id,
    mediaUrls,
    payload,
  };
}
