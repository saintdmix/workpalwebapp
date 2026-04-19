import { auth } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { renderProfileCardsSkeleton } from "../loading-skeletons.js";
import {
  subscribeCurrentUserProfile,
  subscribeProfileById,
  subscribeArtisanPosts,
  subscribeCustomerSavedPosts,
  getVendorProfileStats,
  getCustomerProfileStats,
} from "../services/profile-service.js";

const LOGIN_URL = "../index.html";

const $ = (id) => document.getElementById(id);

const els = {
  loading: $("profileLoading"),
  error: $("profileError"),
  name: $("profileName"),
  role: $("profileRole"),
  phone: $("profilePhone"),
  email: $("profileEmail"),
  address: $("profileAddress"),
  title: $("profileTitle"),
  bio: $("profileBio"),
  location: $("profileLocation"),
  profileImage: $("profileImage"),
  coverImage: $("coverImage"),
  skills: $("skillsWrap"),
  verified: $("verifiedBadge"),
  subscription: $("subscriptionStatus"),
  rating: $("profileRating"),
  ratingCount: $("profileRatingCount"),
  postsCount: $("postsCount"),
  likesCount: $("likesCount"),
  savedCount: $("savedCount"),
  jobsCount: $("jobsCount"),
  postsList: $("profilePostsList"),
  savedList: $("profileSavedList"),
  artisanSection: $("artisanSection"),
  customerSection: $("customerSection"),
  signOutBtn: $("signOutBtn"),
  editBtn: $("editProfileBtn"),
  analyticsLink: $("profileAnalyticsTab"),
};

let unsubProfile = null;
let unsubRoleFeed = null;
let currentRole = "";
let activeProfileId = "";
const EMPTY_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23231b2e'/%3E%3C/svg%3E";

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showLoading(v) {
  if (els.loading) els.loading.style.display = v ? "block" : "none";
}

function showError(msg = "") {
  if (!els.error) return;
  els.error.textContent = msg;
  els.error.style.display = msg ? "block" : "none";
}

function setText(el, value) {
  if (el) el.textContent = value ?? "";
}

function setImage(el, url) {
  if (!el) return;
  if (url) el.src = url;
}

function getRequestedProfileId(currentUser) {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("vendorId") || params.get("userId") || "";
  return requestedId || currentUser?.uid || "";
}

function updateProfileActions(isOwnProfile) {
  if (els.editBtn) {
    els.editBtn.style.display = isOwnProfile ? "inline-flex" : "none";
  }

  // Analytics tab: only own artisan profile
  if (els.analyticsLink) {
    const show = isOwnProfile && currentRole === "artisan";
    els.analyticsLink.style.display = show ? "inline-flex" : "none";
  }

  if (els.signOutBtn) {
    els.signOutBtn.style.display = isOwnProfile ? "flex" : "none";
  }

  const headerSignOutBtn = document.getElementById("headerSignOutBtn");
  if (headerSignOutBtn) {
    headerSignOutBtn.style.display = isOwnProfile ? "inline-flex" : "none";
  }
}

function renderSkills(skills) {
  if (!els.skills) return;
  if (!skills?.length) {
    els.skills.innerHTML = '<span class="chip">No skills yet</span>';
    return;
  }
  els.skills.innerHTML = skills.map((x) => `<span class="chip">${esc(x)}</span>`).join("");
}

function renderPosts(items, target, emptyLabel = "No posts yet.") {
  if (!target) return;
  if (!items.length) {
    target.innerHTML = `<p class="empty">${esc(emptyLabel)}</p>`;
    return;
  }

  target.innerHTML = items
    .map((p) => {
      const media = Array.isArray(p.imageUrl) ? p.imageUrl : [];
      const image = media[0] ? `<img src="${esc(media[0])}" alt="post media" />` : "";
      const title = p.postTitle ? `<h4>${esc(p.postTitle)}</h4>` : "";
      const body = p.body || p.caption || p.content || p.text || p.description || "";
      return `
        <article class="post-card">
          ${image}
          <div class="post-body">
            ${title}
            <p>${esc(body)}</p>
            <small>${(p.likes || []).length} likes</small>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProfileSkeleton() {
  if (els.name) els.name.innerHTML = '<span class="shimmer-line block h-8 w-56 rounded-full"></span>';
  if (els.title) els.title.innerHTML = '<span class="shimmer-line block h-4 w-48 rounded-full"></span>';
  if (els.role) els.role.innerHTML = '<span class="shimmer-line block h-3 w-24 rounded-full"></span>';
  if (els.location) els.location.innerHTML = '<span class="shimmer-line block h-4 w-32 rounded-full"></span>';
  if (els.phone) els.phone.innerHTML = '<span class="shimmer-line block h-4 w-28 rounded-full"></span>';
  if (els.email) els.email.innerHTML = '<span class="shimmer-line block h-4 w-40 rounded-full"></span>';
  if (els.address) els.address.innerHTML = '<span class="shimmer-line block h-4 w-36 rounded-full"></span>';
  if (els.bio) {
    els.bio.innerHTML =
      '<span class="shimmer-line block h-4 w-full rounded-full mb-3"></span><span class="shimmer-line block h-4 w-11/12 rounded-full mb-3"></span><span class="shimmer-line block h-4 w-2/3 rounded-full"></span>';
  }
  if (els.subscription) els.subscription.innerHTML = '<span class="shimmer-line block h-4 w-16 rounded-full"></span>';
  if (els.rating) els.rating.innerHTML = '<span class="shimmer-line block h-6 w-14 rounded-full"></span>';
  if (els.ratingCount) els.ratingCount.innerHTML = '<span class="shimmer-line block h-4 w-20 rounded-full"></span>';
  if (els.postsCount) els.postsCount.innerHTML = '<span class="shimmer-line block h-4 w-8 rounded-full"></span>';
  if (els.likesCount) els.likesCount.innerHTML = '<span class="shimmer-line block h-4 w-8 rounded-full"></span>';
  if (els.savedCount) els.savedCount.innerHTML = '<span class="shimmer-line block h-4 w-8 rounded-full"></span>';
  if (els.jobsCount) els.jobsCount.innerHTML = '<span class="shimmer-line block h-4 w-8 rounded-full"></span>';
  if (els.skills) els.skills.innerHTML = '<span class="shimmer-line block h-7 w-24 rounded-full"></span><span class="shimmer-line block h-7 w-32 rounded-full"></span>';
  if (els.postsList) els.postsList.innerHTML = renderProfileCardsSkeleton(3);
  if (els.savedList) els.savedList.innerHTML = renderProfileCardsSkeleton(2);
  if (els.profileImage) els.profileImage.src = EMPTY_IMAGE;
  if (els.coverImage) els.coverImage.src = EMPTY_IMAGE;
}

async function attachRoleFeed(profile) {
  if (unsubRoleFeed) {
    unsubRoleFeed();
    unsubRoleFeed = null;
  }

  if (profile.role === "artisan") {
    if (els.artisanSection) els.artisanSection.style.display = "block";
    if (els.customerSection) els.customerSection.style.display = "none";

    const stats = await getVendorProfileStats(profile.uid);
    setText(els.postsCount, String(stats.postsCount));
    setText(els.likesCount, String(stats.totalLikes));

    unsubRoleFeed = subscribeArtisanPosts(
      profile.uid,
      (posts) => {
        renderPosts(posts, els.postsList);
      },
      (e) => showError(e?.message || "Failed loading posts.")
    );
  } else {
    if (els.artisanSection) els.artisanSection.style.display = "none";
    if (els.customerSection) els.customerSection.style.display = "block";

    const stats = await getCustomerProfileStats(profile.uid);
    setText(els.savedCount, String(stats.savedPosts));
    setText(els.jobsCount, String(stats.jobsPosted));

    unsubRoleFeed = subscribeCustomerSavedPosts(
      profile.uid,
      (posts) => {
        renderPosts(posts, els.savedList, "No saved posts yet.");
      },
      (e) => showError(e?.message || "Failed loading saved posts.")
    );
  }
}

function renderProfile(profile) {
  currentRole = profile.role; // set before updateProfileActions so analytics tab visibility is correct
  setText(els.name, profile.name || "User");
  setText(els.role, profile.role === "artisan" ? "Artisan" : "Customer");
  setText(els.phone, profile.phone || "Not set");
  setText(els.email, profile.email || "Not set");
  setText(els.address, profile.address || "Not set");
  setText(els.title, profile.title || "Not set");
  setText(els.bio, profile.bio || "No bio yet.");
  setText(els.location, profile.locationText || "Not set");
  setText(els.subscription, profile.subscriptionStatus || "Free");
  setText(els.rating, profile.rating ? profile.rating.toFixed(1) : "New");
  setText(
    els.ratingCount,
    profile.ratingCount ? `${profile.ratingCount} review${profile.ratingCount === 1 ? "" : "s"}` : "No reviews yet"
  );
  if (els.verified) els.verified.style.display = profile.isVerified ? "inline-flex" : "none";
  setImage(els.profileImage, profile.profileImage);
  setImage(els.coverImage, profile.coverImage);
  renderSkills(profile.skills || []);
  updateProfileActions(activeProfileId === auth.currentUser?.uid);
}

if (els.editBtn) {
  els.editBtn.addEventListener("click", () => {
    window.location.href = els.editBtn.dataset.href || "./edit-profile.html";
  });
}

onAuthStateChanged(auth, async (user) => {
  if (unsubProfile) {
    unsubProfile();
    unsubProfile = null;
  }
  if (unsubRoleFeed) {
    unsubRoleFeed();
    unsubRoleFeed = null;
  }
  currentRole = "";
  showError("");

  if (!user) {
    window.location.href = LOGIN_URL;
    return;
  }

  activeProfileId = getRequestedProfileId(user);
  const isOwnProfile = activeProfileId === user.uid;
  updateProfileActions(isOwnProfile);
  showLoading(true);
  renderProfileSkeleton();

  try {
    const handleProfile = async (profile) => {
      const prevRole = currentRole;
      renderProfile(profile);
      showLoading(false);

      if (prevRole !== profile.role) {
        await attachRoleFeed(profile);
      }
    };

    const handleError = (err) => {
      showLoading(false);
      showError(err?.message || "Failed loading profile.");
    };

    unsubProfile = isOwnProfile
      ? await subscribeCurrentUserProfile(handleProfile, handleError)
      : await subscribeProfileById(activeProfileId, handleProfile, handleError);
  } catch (e) {
    showLoading(false);
    showError(e?.message || "Failed loading profile.");
  }
});
