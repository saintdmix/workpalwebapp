import {
  getBrowserLocation,
  subscribeCategoryArtisans,
} from "../services/categories-service.js";

const $ = (id) => document.getElementById(id);

const els = {
  title: $("categoryTitle"),
  search: $("categorySearch"),
  list: $("categoryArtisansList"),
  loading: $("categoryLoading"),
  empty: $("categoryEmpty"),
  error: $("categoryError"),
  within10km: $("filterWithin10km"),
  openToWork: $("filterOpenToWork"),
  sortBy: $("filterSortBy"),
  refreshLocation: $("refreshLocationBtn"),
};

const state = {
  category: "",
  customerLocation: null,
  search: "",
  within10km: false,
  openToWork: false,
  sortBy: "top_rated",
};

let stopStream = null;
let searchTimer = null;

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

function render(rows) {
  if (!els.list) return;

  if (!rows.length) {
    if (els.empty) els.empty.style.display = "block";
    els.list.innerHTML = "";
    return;
  }

  if (els.empty) els.empty.style.display = "none";

  els.list.innerHTML = rows
    .map((v) => {
      const distance = v.distanceKm == null ? "N/A" : `${v.distanceKm.toFixed(1)} km`;
      return `
        <article class="artisan-card">
          <img src="${esc(v.profileImage || "")}" alt="${esc(v.name)}" onerror="this.style.display='none'" />
          <div class="meta">
            <h3>${esc(v.name)}</h3>
            <p>${esc(v.title || "Professional")}</p>
            <p>Rating: ${Number(v.rating || 0).toFixed(1)} - Distance: ${distance}</p>
            <p>${(v.skills || []).slice(0, 4).map(esc).join(" - ")}</p>
          </div>
          <button class="view-artisan-btn" data-vendor-id="${esc(v.userId || v.id)}">View</button>
        </article>
      `;
    })
    .join("");
}

function restartStream() {
  if (stopStream) {
    stopStream();
    stopStream = null;
  }

  setLoading(true);
  setError("");

  stopStream = subscribeCategoryArtisans({
    category: state.category,
    customerLocation: state.customerLocation,
    search: state.search,
    within10km: state.within10km,
    openToWork: state.openToWork,
    sortBy: state.sortBy,
    onData: (rows) => {
      render(rows);
      setLoading(false);
    },
    onError: (e) => {
      setLoading(false);
      setError(e?.message || "Failed to load artisans.");
    },
  });
}

async function resolveLocation() {
  try {
    const loc = await getBrowserLocation();
    state.customerLocation = loc;
  } catch {
    state.customerLocation = null;
  }
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  state.category = params.get("name") || params.get("category") || "";

  if (!state.category) {
    setError("Category not found in URL.");
    return;
  }

  if (els.title) els.title.textContent = `${state.category} Artisans`;

  await resolveLocation();
  restartStream();

  if (els.search) {
    els.search.addEventListener("input", (e) => {
      const value = e.target.value || "";
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = value;
        restartStream();
      }, 250);
    });
  }

  if (els.within10km) {
    els.within10km.addEventListener("change", (e) => {
      state.within10km = !!e.target.checked;
      restartStream();
    });
  }

  if (els.openToWork) {
    els.openToWork.addEventListener("change", (e) => {
      state.openToWork = !!e.target.checked;
      restartStream();
    });
  }

  if (els.sortBy) {
    els.sortBy.addEventListener("change", (e) => {
      state.sortBy = e.target.value || "top_rated";
      restartStream();
    });
  }

  if (els.refreshLocation) {
    els.refreshLocation.addEventListener("click", async () => {
      await resolveLocation();
      restartStream();
    });
  }

  if (els.list) {
    els.list.addEventListener("click", (e) => {
      const btn = e.target.closest(".view-artisan-btn");
      if (!btn) return;

      const vendorId = btn.dataset.vendorId;
      const profilePage = els.list.dataset.profilePage || "./profiles.html";
      window.location.href = `${profilePage}?vendorId=${encodeURIComponent(vendorId)}`;
    });
  }
}

window.addEventListener("beforeunload", () => {
  if (stopStream) stopStream();
});

document.addEventListener("DOMContentLoaded", init);
