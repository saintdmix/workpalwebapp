import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase-init.js";
import {
  DEFAULT_LOCATION,
  getBrowserLocation,
  getGreetingByTime,
  getLocationFromProfile,
  getNewsSlides,
  getTopArtisansNear,
  getUserProfile,
  updateHomepagePresence,
  waitForAuthUser,
} from "./home-service.js";
import { getAllCategories } from "./services/categories-service.js";
import { renderArtisansSkeleton, renderNewsSkeleton } from "./loading-skeletons.js";

const LOGIN_PAGE = "./index.html";
const ONBOARDING_PAGE = "./index.html";
const VENDOR_PROFILE_PAGE = "./pages/profiles.html";
const CATEGORY_PAGE = "./pages/woodworkers.html";
const HOME_CACHE_KEY = "workpalHomeSnapshotV1";
const FALLBACK_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='100%25' height='100%25' fill='%232d1b4d'/%3E%3Ccircle cx='60' cy='44' r='20' fill='%237f13ec'/%3E%3Crect x='28' y='70' width='64' height='28' rx='14' fill='%237f13ec'/%3E%3C/svg%3E";
const CATEGORY_ICON_MAP = {
  Accountant: "calculate",
  Architect: "architecture",
  AutoMechanic: "directions_car",
  Baker: "bakery_dining",
  Barber: "content_cut",
  Beautician: "face_retouching_natural",
  Builder: "construction",
  Carpenter: "handyman",
  Caterer: "restaurant",
  Chef: "skillet",
  Cleaner: "cleaning_services",
  ComputerTechnician: "computer",
  DataAnalyst: "query_stats",
  Designer: "draw",
  Driver: "local_taxi",
  Electrician: "electric_bolt",
  EventPlanner: "celebration",
  FitnessTrainer: "fitness_center",
  Florist: "local_florist",
  Gardener: "yard",
  GraphicsDesigner: "palette",
  Hairdresser: "cut",
  Handyman: "build",
  InteriorDecorator: "chair",
  LaptopRepairer: "laptop_mac",
  LaundryService: "local_laundry_service",
  Locksmith: "lock",
  MakeupArtist: "brush",
  MobileAppDeveloper: "smartphone",
  MotorMechanic: "settings",
  Painter: "format_paint",
  PetGroomer: "pets",
  PhoneRepairer: "phone_iphone",
  Photographer: "photo_camera",
  Plumber: "plumbing",
  Roofer: "roofing",
  SocialMediaManager: "campaign",
  SoftwareDeveloper: "code",
  SolarTechnician: "solar_power",
  Tailor: "styler",
  Tutor: "school",
  Videographer: "videocam",
  Waiter: "room_service",
  WebDeveloper: "language",
  Welder: "precision_manufacturing",
  Writer: "edit_note",
};

const el = {
  greetingName: document.getElementById("homeGreetingName"),
  greetingText: document.getElementById("homeGreetingText"),
  locationText: document.getElementById("homeLocationText"),
  sortText: document.getElementById("homeSortText"),
  newsWrap: document.getElementById("newsSlider"),
  newsDots: document.getElementById("newsDots"),
  quoteEl: document.getElementById("homeQuote"),
  categoriesWrap: document.getElementById("homeCategoriesList"),
  artisanWrap: document.getElementById("topArtisansList"),
  filterBtn: document.getElementById("homeFilterBtn"),
  gridBtn: document.getElementById("homeGridBtn"),
  listBtn: document.getElementById("homeListBtn"),
  hireBtn: document.getElementById("homeHireBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  errorBox: document.getElementById("homeError"),
};

const state = {
  artisans: [],
  viewMode: "grid",
  sortMode: "nearest",
};

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(HOME_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapHomeError(error) {
  const code = error?.code || "";

  if (code.includes("permission-denied")) {
    return "Permission denied while loading homepage data. Check Firestore security rules.";
  }

  if (code.includes("failed-precondition")) {
    return "A Firestore index is required for this query. Open the Firebase console link in the browser error details to create it.";
  }

  if (code.includes("unauthenticated")) {
    return "Your session expired. Please sign in again.";
  }

  if (code.includes("unavailable") || code.includes("network-request-failed")) {
    return "Network issue while loading homepage data. Please check your connection and retry.";
  }

  return error?.message || "Failed to load homepage data.";
}

function showHomeError(message) {
  if (!el.errorBox) return;
  el.errorBox.textContent = message;
  el.errorBox.classList.remove("hidden");
}

function clearHomeError() {
  if (!el.errorBox) return;
  el.errorBox.textContent = "";
  el.errorBox.classList.add("hidden");
}

const QUOTES = [
  "Excellence is not a skill — it's an attitude.",
  "Your craft is your signature. Make it unforgettable.",
  "Hard work beats talent when talent doesn't work hard.",
  "Every expert was once a beginner. Keep going.",
  "Professionalism is doing your best even when no one is watching.",
  "The quality of your work is the loudest thing you'll ever say.",
  "Show up. Do the work. Repeat.",
  "Discipline is the bridge between goals and accomplishment.",
  "Your reputation is built one job at a time.",
  "Great work is never an accident — it's always the result of intention.",
];

function startQuoteRotator() {
  if (!el.quoteEl) return;
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % QUOTES.length;
    el.quoteEl.style.opacity = "0";
    setTimeout(() => {
      el.quoteEl.textContent = QUOTES[idx];
      el.quoteEl.style.opacity = "1";
    }, 500);
  }, 5000);
}

let _carouselTimer = null;

function normalizeCategoryKey(name) {
  return String(name || "").replace(/[^a-z0-9]/gi, "");
}

function iconForCategory(name) {
  return CATEGORY_ICON_MAP[normalizeCategoryKey(name)] || "category";
}

function renderNews(slides) {
  if (!el.newsWrap) return;
  if (!slides.length) {
    el.newsWrap.innerHTML =
      '<div class="min-w-full glass-card rounded-2xl p-6 text-center text-slate-300">Welcome to WorkPal!</div>';
    if (el.newsDots) el.newsDots.innerHTML = "";
    return;
  }

  if (_carouselTimer) { clearInterval(_carouselTimer); _carouselTimer = null; }

  el.newsWrap.innerHTML = slides
    .map(
      (s) =>
        `<div class="min-w-full rounded-2xl overflow-hidden border border-primary/10 shrink-0">
          <img class="w-full h-64 object-cover" src="${esc(s.url)}" alt="News slide" loading="lazy" />
        </div>`
    )
    .join("");

  if (el.newsDots) {
    el.newsDots.innerHTML = slides
      .map(
        (_, i) =>
          `<button data-i="${i}" class="h-2 rounded-full transition-all duration-300 ${
            i === 0 ? "w-4 bg-primary" : "w-2 bg-slate-600"
          }"></button>`
      )
      .join("");
    el.newsDots.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => goToSlide(Number(btn.dataset.i)));
    });
  }

  let current = 0;

  function goToSlide(n) {
    current = (n + slides.length) % slides.length;
    el.newsWrap.style.transform = `translateX(-${current * 100}%)`;
    el.newsDots?.querySelectorAll("button").forEach((b, i) => {
      b.className = `h-2 rounded-full transition-all duration-300 ${
        i === current ? "w-4 bg-primary" : "w-2 bg-slate-600"
      }`;
    });
  }

  _carouselTimer = setInterval(() => goToSlide(current + 1), 4000);
}

function renderNewsLoading() {
  if (!el.newsWrap) return;
  el.newsWrap.innerHTML = renderNewsSkeleton(1);
  if (el.newsDots) el.newsDots.innerHTML = "";
}

function renderCategoriesLoading() {
  if (!el.categoriesWrap) return;
  el.categoriesWrap.innerHTML = Array.from(
    { length: 6 },
    () => `
      <div class="glass-card p-6 rounded-xl border border-primary/10">
        <div class="w-12 h-12 rounded-lg bg-primary/10 mb-4 shimmer-line"></div>
        <div class="h-4 w-24 rounded-full shimmer-line mb-3"></div>
        <div class="h-3 w-20 rounded-full shimmer-line"></div>
      </div>
    `
  ).join("");
}

function renderCategories(rows) {
  if (!el.categoriesWrap) return;

  if (!rows.length) {
    el.categoriesWrap.innerHTML =
      '<p class="col-span-full text-sm text-slate-400">No categories available yet.</p>';
    return;
  }

  el.categoriesWrap.innerHTML = rows
    .map(
      (row) => `
        <a class="glass-card p-6 rounded-xl border border-primary/10 hover:border-primary/40 transition-all cursor-pointer group block" href="${CATEGORY_PAGE}?name=${encodeURIComponent(
          row.name
        )}">
          <div class="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-primary">${iconForCategory(row.name)}</span>
          </div>
          <span class="block font-bold text-sm text-white">${esc(row.name)}</span>
          <span class="text-[10px] text-slate-500 font-bold uppercase">${Number(row.count || 0)} artisan${
            Number(row.count || 0) === 1 ? "" : "s"
          }</span>
        </a>
      `
    )
    .join("");
}

function sortArtisans(rows) {
  const items = [...rows];

  if (state.sortMode === "top-rated") {
    items.sort((a, b) => {
      const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return Number(a.distanceKm || 0) - Number(b.distanceKm || 0);
    });
    return items;
  }

  items.sort((a, b) => Number(a.distanceKm || 0) - Number(b.distanceKm || 0));
  return items;
}

function updateArtisanToolbar() {
  if (el.artisanWrap) {
    el.artisanWrap.className =
      state.viewMode === "list"
        ? "grid grid-cols-1 gap-4"
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
  }

  if (el.gridBtn) {
    el.gridBtn.className =
      state.viewMode === "grid"
        ? "p-2 rounded-lg bg-primary/10 text-primary"
        : "p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-slate-400";
  }

  if (el.listBtn) {
    el.listBtn.className =
      state.viewMode === "list"
        ? "p-2 rounded-lg bg-primary/10 text-primary"
        : "p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-slate-400";
  }

  if (el.filterBtn) {
    el.filterBtn.className =
      state.sortMode === "top-rated"
        ? "p-2 rounded-lg bg-primary/10 text-primary"
        : "p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-slate-400";
    el.filterBtn.title =
      state.sortMode === "top-rated" ? "Sorted by top rating" : "Sorted by nearest";
  }

  if (el.sortText) {
    el.sortText.textContent =
      state.sortMode === "top-rated"
        ? "Showing highest-rated artisans first"
        : "Showing nearest artisans first";
  }
}

function renderArtisans(rows = state.artisans) {
  if (!el.artisanWrap) return;
  const items = sortArtisans(rows);

  updateArtisanToolbar();

  if (!items.length) {
    el.artisanWrap.innerHTML =
      '<p class="text-slate-400 text-sm">No artisans found within 10km.</p>';
    return;
  }

  if (state.viewMode === "list") {
    el.artisanWrap.innerHTML = items
      .map(
        (a) => `
        <article class="bg-secondary rounded-xl border border-primary/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <img class="w-14 h-14 rounded-full object-cover border border-primary/30 shrink-0" src="${esc(
              a.profileImage || FALLBACK_AVATAR
            )}" alt="${esc(a.name)}" />
            <div class="min-w-0">
              <h4 class="font-bold text-white truncate">${esc(a.name)}</h4>
              <p class="text-sm text-slate-300 truncate">${esc(a.title)}</p>
              <small class="text-xs text-primary">${a.rating.toFixed(1)} stars • ${a.distanceKm.toFixed(
                1
              )} km away</small>
            </div>
          </div>
          <a class="bg-primary/15 hover:bg-primary/25 text-primary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shrink-0 text-center" href="${VENDOR_PROFILE_PAGE}?vendorId=${encodeURIComponent(
            a.userId
          )}">View Profile</a>
        </article>
      `
      )
      .join("");
    return;
  }

  el.artisanWrap.innerHTML = items
    .map(
      (a) => `
      <article class="bg-secondary rounded-xl overflow-hidden shadow-md group border border-transparent hover:border-primary/20 transition-all">
        <div class="relative h-48 bg-surface-container-high flex items-center justify-center">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${esc(
            a.profileImage || FALLBACK_AVATAR
          )}" alt="${esc(a.name)}" />
          <div class="absolute top-4 right-4 bg-primary text-white text-[10px] font-black uppercase px-2 py-1 rounded">Nearby</div>
        </div>
        <div class="p-6">
          <div class="flex justify-between items-start mb-4 gap-3">
            <div class="min-w-0">
              <h4 class="font-bold text-white text-base truncate">${esc(a.name)}</h4>
              <span class="text-[10px] font-bold text-primary uppercase">${esc(a.title)}</span>
            </div>
            <div class="flex items-center text-tertiary shrink-0">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="text-xs font-bold ml-1">${a.rating.toFixed(1)}</span>
            </div>
          </div>
          <p class="text-sm text-on-surface-variant line-clamp-2 mb-6">Available on WorkPal right now and active within your current location radius.</p>
          <div class="flex justify-between items-center pt-4 border-t border-primary/10 gap-4">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">${a.distanceKm.toFixed(
              1
            )} km away</span>
            <a class="text-xs font-bold text-primary hover:text-white transition-colors shrink-0" href="${VENDOR_PROFILE_PAGE}?vendorId=${encodeURIComponent(
              a.userId
            )}">View Profile</a>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function renderArtisansLoading() {
  if (!el.artisanWrap) return;
  updateArtisanToolbar();
  el.artisanWrap.innerHTML = renderArtisansSkeleton(3, state.viewMode);
}

function applyHireButton(role) {
  if (!el.hireBtn) return;
  const isCustomer = role === "customer";
  el.hireBtn.hidden = !isCustomer;
  el.hireBtn.classList.toggle("hidden", !isCustomer);
}

function restoreCachedHome() {
  const cached = readCache();
  if (!cached) return false;

  if (Array.isArray(cached.slides) && cached.slides.length) {
    renderNews(cached.slides);
  }

  if (Array.isArray(cached.artisans)) {
    state.artisans = cached.artisans;
    renderArtisans();
  }

  return Boolean(
    (Array.isArray(cached.slides) && cached.slides.length) ||
      (Array.isArray(cached.artisans) && cached.artisans.length)
  );
}

async function bootstrapHome() {
  clearHomeError();

  if (el.greetingText) el.greetingText.textContent = getGreetingByTime();
  startQuoteRotator();

  const cached = readCache();
  if (cached) {
    if (el.greetingName) el.greetingName.textContent = cached.name || "User";
    if (el.locationText) el.locationText.textContent = cached.locationLabel || "";
    if (cached.slides?.length) renderNews(cached.slides);
    else renderNewsLoading();
    if (cached.artisans?.length) {
      state.artisans = cached.artisans;
      renderArtisans();
    } else {
      renderArtisansLoading();
    }
    if (cached.categories?.length) renderCategories(cached.categories);
    else renderCategoriesLoading();
  } else {
    renderNewsLoading();
    renderArtisansLoading();
    renderCategoriesLoading();
  }

  const user = await waitForAuthUser();
  if (!user) { window.location.href = LOGIN_PAGE; return; }

  const profile = await getUserProfile(user.uid);
  updateHomepagePresence(user.uid, profile.role); // fire-and-forget
  applyHireButton(profile.role);

  if (el.greetingName) el.greetingName.textContent = profile.name || "User";

  let loc = await getBrowserLocation();
  if (!loc) loc = getLocationFromProfile(profile);
  if (!loc) loc = DEFAULT_LOCATION;

  const locationLabel = `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}`;
  if (el.locationText) el.locationText.textContent = locationLabel;

  const [slidesResult, artisansResult, categoriesResult] = await Promise.allSettled([
    getNewsSlides(10),
    getTopArtisansNear({ lat: loc.lat, lng: loc.lng, maxDistanceKm: 10, limitTo: 20 }),
    getAllCategories({ includeCounts: true }),
  ]);

  const slides = slidesResult.status === "fulfilled" ? slidesResult.value : [];
  const artisans = artisansResult.status === "fulfilled" ? artisansResult.value : [];
  const categories =
    categoriesResult.status === "fulfilled"
      ? [...categoriesResult.value]
          .sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || a.name.localeCompare(b.name))
          .slice(0, 6)
      : [];

  if (slides.length) renderNews(slides);
  else showHomeError(`News feed: ${mapHomeError(slidesResult.reason)}`);

  state.artisans = artisans;
  renderArtisans();
  if (!artisans.length && artisansResult.status === "rejected") {
    showHomeError(`Top artisans: ${mapHomeError(artisansResult.reason)}`);
  }

  if (categories.length) {
    renderCategories(categories);
  } else {
    renderCategories([]);
    if (categoriesResult.status === "rejected") {
      showHomeError(`Categories: ${mapHomeError(categoriesResult.reason)}`);
    }
  }

  writeCache({ name: profile.name || "User", locationLabel, slides, artisans, categories });
}

el.filterBtn?.addEventListener("click", () => {
  state.sortMode = state.sortMode === "nearest" ? "top-rated" : "nearest";
  renderArtisans();
});

el.gridBtn?.addEventListener("click", () => {
  state.viewMode = "grid";
  renderArtisans();
});

el.listBtn?.addEventListener("click", () => {
  state.viewMode = "list";
  renderArtisans();
});

el.hireBtn?.addEventListener("click", () => {
  window.location.href = "./pages/directory.html";
});

el.logoutBtn?.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to log out?")) return;
  try {
    await signOut(auth);
  } catch (error) {
    showHomeError(`Logout failed: ${mapHomeError(error)}`);
    return;
  }
  sessionStorage.removeItem(HOME_CACHE_KEY);
  localStorage.removeItem("workpalAuthUser");
  localStorage.removeItem("workpalUserRole");
  window.location.href = ONBOARDING_PAGE;
});

bootstrapHome().catch((error) => {
  console.error("Homepage load failed:", error);
  showHomeError(mapHomeError(error));
});

