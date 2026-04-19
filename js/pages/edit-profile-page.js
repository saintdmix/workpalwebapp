import { auth } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../services/profile-service.js";

const LOGIN_URL = "../index.html";

const $ = (id) => document.getElementById(id);

const els = {
  form: $("profileForm"),
  name: $("nameInput"),
  phone: $("phoneInput"),
  address: $("addressInput"),
  title: $("titleInput"),
  bio: $("bioInput"),
  skills: $("skillsInput"),
  location: $("locationInput"),
  profileFile: $("profileImageInput"),
  coverFile: $("coverImageInput"),
  profilePreview: $("profileImagePreview"),
  coverPreview: $("coverImagePreview"),
  saveBtn: $("saveProfileBtn"),
  status: $("saveProfileStatus"),
};

let currentRole = "customer";

function setStatus(msg, isError = false) {
  if (!els.status) return;
  els.status.textContent = msg;
  els.status.style.color = isError ? "#b42318" : "#16a34a";
}

function preview(inputEl, imgEl) {
  if (!inputEl || !imgEl || !inputEl.files?.[0]) return;
  imgEl.src = URL.createObjectURL(inputEl.files[0]);
}

if (els.profileFile && els.profilePreview) {
  els.profileFile.addEventListener("change", () => preview(els.profileFile, els.profilePreview));
}
if (els.coverFile && els.coverPreview) {
  els.coverFile.addEventListener("change", () => preview(els.coverFile, els.coverPreview));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = LOGIN_URL;
    return;
  }

  try {
    const profile = await getCurrentUserProfile();
    currentRole = profile.role;

    if (els.name) els.name.value = profile.name || "";
    if (els.phone) els.phone.value = profile.phone || "";
    if (els.address) els.address.value = profile.address || "";
    if (els.title) els.title.value = profile.title || "";
    if (els.bio) els.bio.value = profile.bio || "";
    if (els.skills) els.skills.value = (profile.skills || []).join(", ");
    if (els.location) els.location.value = profile.locationText || "";
    if (els.profilePreview && profile.profileImage) els.profilePreview.src = profile.profileImage;
    if (els.coverPreview && profile.coverImage) els.coverPreview.src = profile.coverImage;

    if (els.title) els.title.closest(".field")?.classList.toggle("hidden", currentRole !== "artisan");
    if (els.skills) els.skills.closest(".field")?.classList.toggle("hidden", currentRole !== "artisan");
    if (els.bio) els.bio.closest(".field")?.classList.toggle("hidden", currentRole !== "artisan");
  } catch (e) {
    setStatus(e?.message || "Failed to load profile.", true);
  }
});

if (els.form) {
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (els.saveBtn) els.saveBtn.disabled = true;
    setStatus("Saving...");

    try {
      await updateCurrentUserProfile({
        name: els.name?.value ?? "",
        phone: els.phone?.value ?? "",
        address: els.address?.value ?? "",
        title: els.title?.value ?? "",
        bio: els.bio?.value ?? "",
        skills: els.skills?.value ?? "",
        locationText: els.location?.value ?? "",
        profileImageFile: els.profileFile?.files?.[0] || null,
        coverImageFile: els.coverFile?.files?.[0] || null,
      });

      setStatus("Profile updated successfully.");
    } catch (err) {
      setStatus(err?.message || "Failed to update profile.", true);
    } finally {
      if (els.saveBtn) els.saveBtn.disabled = false;
    }
  });
}
