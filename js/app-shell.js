import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { getCurrentUserProfile } from "./services/profile-service.js";
import { subscribeUnreadNotificationCount } from "./services/notifications-service.js";

const SIDEBAR_STATE_KEY = "workpalSidebarCollapsed";
const inPagesDir = window.location.pathname.replace(/\\/g, "/").includes("/pages/");
const rootPrefix = inPagesDir ? "../" : "./";
const routes = {
  home: `${rootPrefix}index.html`,
  feed: `${rootPrefix}pages/feed.html`,
  communication: `${rootPrefix}pages/communication.html`,
  notifications: `${rootPrefix}pages/notifications.html`,
  profiles: `${rootPrefix}pages/profiles.html`,
  createPost: `${rootPrefix}pages/create-post.html`,
  postJob: `${rootPrefix}pages/post-job.html`,
  editProfile: `${rootPrefix}pages/edit-profile.html`,
  signin: `${rootPrefix}signin.html?mode=login`,
};

const shellState = {
  role: localStorage.getItem("workpalUserRole") || "artisan",
  stopUnread: null,
};

function getActivePage() {
  const path = window.location.pathname.replace(/\\/g, "/");
  if (path.endsWith("/pages/feed.html")) return "feed";
  if (path.endsWith("/pages/communication.html")) return "communication";
  if (path.endsWith("/pages/notifications.html")) return "notifications";
  if (path.endsWith("/pages/profiles.html") || path.endsWith("/pages/edit-profile.html")) return "profiles";
  return "home";
}

function sidebarHostMode(host) {
  return host.dataset.sidebarMode === "flow" ? "flow" : "fixed";
}

function injectStyles() {
  if (document.getElementById("workpal-shell-styles")) return;
  const style = document.createElement("style");
  style.id = "workpal-shell-styles";
  style.textContent = `
    :root { --workpal-sidebar-width: 16rem; }

    /* ── Sidebar (desktop only) ── */
    [data-app-sidebar] {
      width: var(--workpal-sidebar-width) !important;
      transition: width 220ms ease;
      overflow: hidden;
    }
    [data-app-sidebar].collapsed { width: 5rem !important; }
    [data-app-sidebar].collapsed .nav-label,
    [data-app-sidebar].collapsed .brand-text,
    [data-app-sidebar].collapsed .profile-meta,
    [data-app-sidebar].collapsed .cta-label,
    [data-app-sidebar].collapsed .badge-label { display: none !important; }
    [data-app-sidebar].collapsed .nav-item,
    [data-app-sidebar].collapsed .shell-action,
    [data-app-sidebar].collapsed .brand-wrap { justify-content: center; }
    [data-app-sidebar].collapsed .nav-item,
    [data-app-sidebar].collapsed .shell-action { padding-left: .75rem; padding-right: .75rem; }
    [data-app-sidebar].collapsed .brand-wrap { gap: 0 !important; }
    [data-app-sidebar].collapsed .profile-card { justify-content: center; }
    [data-app-sidebar].collapsed .toggle-chevron { transform: rotate(180deg); }
    [data-app-sidebar].collapsed .shell-badge { position: absolute; top: .55rem; right: .55rem; margin: 0; }
    .shell-badge[hidden] { display: none !important; }
    .shell-action { border: 1px solid rgba(255,255,255,.06); }
    [data-shell-avatar] { width: 100%; height: 100%; object-fit: cover; display: block; }
    [data-app-sidebar] .nav-item[aria-current="page"] {
      color: #fff;
      background: rgba(127,19,236,.12);
      border: 1px solid rgba(127,19,236,.28);
      box-shadow: 0 0 20px rgba(127,19,236,.18);
    }
    [data-app-sidebar] .nav-item { position: relative; }
    [data-app-sidebar].collapsed [data-shell-create-link] { padding-left: .75rem; padding-right: .75rem; justify-content: center; }
    [data-app-sidebar].collapsed [data-shell-create-link] .material-symbols-outlined { margin-right: 0; }
    .toggle-chevron { transition: transform 220ms ease; }

    /* ── Main content shift ── */
    /* Desktop: shift by sidebar width */
    @media (min-width: 768px) {
      [data-app-shell-shift] { margin-left: var(--workpal-sidebar-width) !important; }
    }
    /* Mobile: no left margin, add bottom padding for bottom nav */
    @media (max-width: 767px) {
      [data-app-shell-shift] { margin-left: 0 !important; padding-bottom: 5rem !important; }
    }

    /* ── Bottom nav (mobile only) ── */
    #workpal-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 4rem;
      background: rgba(25,16,34,.97);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid rgba(127,19,236,.12);
      z-index: 60;
      align-items: center;
      justify-content: space-around;
    }
    @media (max-width: 767px) {
      #workpal-bottom-nav { display: flex; }
      [data-app-sidebar] { display: none !important; }
    }
    .bnav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: .4rem .6rem;
      border-radius: .5rem;
      color: #94a3b8;
      text-decoration: none;
      transition: color 150ms ease;
      position: relative;
      min-width: 3rem;
    }
    .bnav-item.active { color: #7f13ec; }
    .bnav-item span.material-symbols-outlined { font-size: 1.35rem; line-height: 1; }
    .bnav-item .bnav-label { font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .bnav-fab {
      width: 3rem; height: 3rem;
      background: #7f13ec;
      border-radius: 9999px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      box-shadow: 0 0 18px rgba(127,19,236,.45);
      margin-bottom: .75rem;
      transition: background 150ms ease;
    }
    .bnav-fab:hover { background: #6200bc; }
    .bnav-badge {
      position: absolute; top: .2rem; right: .2rem;
      min-width: 1rem; height: 1rem;
      background: #ef4444;
      border-radius: 9999px;
      font-size: .6rem; font-weight: 900;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      padding: 0 .2rem;
    }
    .bnav-badge[hidden] { display: none !important; }

    /* ── Shimmer ── */
    .shimmer-line {
      position: relative; overflow: hidden;
      background: linear-gradient(90deg,rgba(76,67,85,.45) 0%,rgba(127,19,236,.14) 50%,rgba(76,67,85,.45) 100%);
      background-size: 220% 100%;
      animation: shimmerPulse 1.35s linear infinite;
    }
    @keyframes shimmerPulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function renderSidebar(host) {
  const activePage = getActivePage();
  const isFlow = sidebarHostMode(host) === "flow";
  const baseClasses = isFlow
    ? "flex flex-col h-full py-6 px-3 bg-surface-container-lowest border-r border-white/5 shrink-0"
    : "fixed left-0 top-16 h-[calc(100vh-64px)] hidden md:flex flex-col py-6 px-3 bg-surface-container-lowest border-r border-white/5 z-40";

  host.className = `${baseClasses} custom-scrollbar`;
  host.innerHTML = `
    <button class="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-white hover:bg-white/5 transition-all brand-wrap" id="sidebarToggle" type="button">
      <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(127,19,236,0.4)] shrink-0">
        <span class="material-symbols-outlined text-white" style="font-variation-settings:'FILL' 1;">work</span>
      </div>
      <div class="brand-text text-left min-w-0 flex-1">
        <p class="text-sm font-black tracking-tight">WorkPal</p>
      </div>
      <span class="material-symbols-outlined text-slate-400 text-lg shrink-0 toggle-chevron">chevron_left</span>
    </button>
    <nav class="flex-1 flex flex-col gap-2 mt-6">
      ${renderNavItem("home", "home", "Home", activePage)}
      ${renderNavItem("feed", "grid_view", "Workfeeds", activePage)}
      ${renderNavItem("communication", "chat_bubble", "Chat", activePage)}
      ${renderNavItem("notifications", "notifications", "Notifications", activePage, true)}
      ${renderNavItem("profiles", "person", "Profile", activePage)}
    </nav>
    <div class="mt-auto flex flex-col gap-6">
      <button
        class="shell-action w-full py-3 px-3 bg-primary text-white rounded-xl shadow-lg font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 justify-center"
        data-shell-link="create" data-shell-create-link
        data-artisan-label="Create Post" data-customer-label="Post a Job"
        type="button"
      >
        <span class="material-symbols-outlined text-lg">add</span>
        <span class="cta-label text-sm">Create Post</span>
      </button>
      <button class="w-full flex items-center gap-3 brand-wrap profile-card text-left px-3 py-3 rounded-xl bg-surface-container border border-white/5 hover:bg-white/5 transition-all" data-shell-link="profiles" type="button">
        <img alt="Profile" class="w-10 h-10 rounded-full border border-white/10 shrink-0" data-shell-avatar src="https://via.placeholder.com/72x72.png?text=W"/>
        <div class="profile-meta min-w-0">
          <p class="text-xs font-bold text-white truncate" data-shell-user-name>WorkPal User</p>
          <p class="text-[10px] text-slate-500 uppercase tracking-wider truncate" data-shell-user-role>Workspace</p>
        </div>
      </button>
      <button class="shell-action w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 transition-all" data-shell-signout id="signOutBtn" type="button">
        <span class="material-symbols-outlined">logout</span>
        <span class="nav-label text-sm font-medium">Sign Out</span>
      </button>
    </div>
  `;
}

function renderNavItem(key, icon, label, activePage, withBadge = false, extraAttrs = "") {
  const active = key === activePage;
  return `
    <a class="nav-item flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
      active ? "text-primary bg-primary/10 border border-primary/20" : "text-slate-400 hover:text-primary hover:bg-primary/5"
    }" ${active ? 'aria-current="page"' : ""} ${extraAttrs} href="${routes[key]}">
      <span class="material-symbols-outlined"${active ? ' style="font-variation-settings:\'FILL\' 1;"' : ""}>${icon}</span>
      <span class="nav-label text-sm ${active ? "font-semibold" : "font-medium"}">${label}</span>
      ${withBadge ? '<span class="shell-badge ml-auto min-w-[1.1rem] h-5 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center" data-shell-notification-badge hidden>0</span>' : ""}
    </a>
  `;
}

function injectBottomNav() {
  if (document.getElementById("workpal-bottom-nav")) return;
  const activePage = getActivePage();

  const navItems = [
    { key: "home", icon: "home", label: "Home" },
    { key: "feed", icon: "grid_view", label: "Feeds" },
    { key: "communication", icon: "chat_bubble", label: "Chat" },
    { key: "notifications", icon: "notifications", label: "Alerts", badge: true },
    { key: "profiles", icon: "person", label: "Profile" },
  ];

  const nav = document.createElement("nav");
  nav.id = "workpal-bottom-nav";
  nav.setAttribute("aria-label", "Bottom navigation");

  nav.innerHTML = navItems.map((item) => {
    const active = item.key === activePage;
    if (item.key === "feed") {
      return `
        <a href="${routes[item.key]}" class="bnav-item ${active ? "active" : ""}" aria-label="${item.label}">
          <span class="material-symbols-outlined" style="${active ? "font-variation-settings:'FILL' 1;" : ""}">${item.icon}</span>
          <span class="bnav-label">${item.label}</span>
        </a>`;
    }
    return `
      <a href="${routes[item.key]}" class="bnav-item ${active ? "active" : ""}" aria-label="${item.label}">
        <span class="material-symbols-outlined" style="${active ? "font-variation-settings:'FILL' 1;" : ""}">${item.icon}</span>
        <span class="bnav-label">${item.label}</span>
        ${item.badge ? '<span class="bnav-badge" data-shell-notification-badge hidden>0</span>' : ""}
      </a>`;
  }).join("");

  document.body.appendChild(nav);
}

function applySidebarState(collapsed) {
  const width = collapsed ? "5rem" : "16rem";
  document.documentElement.style.setProperty("--workpal-sidebar-width", width);
  document.querySelectorAll("[data-app-sidebar]").forEach((h) => h.classList.toggle("collapsed", collapsed));
  // Only apply JS margin on desktop; CSS handles mobile via media query
  if (window.innerWidth >= 768) {
    document.querySelectorAll("[data-app-shell-shift]").forEach((el) => { el.style.marginLeft = width; });
    document.querySelectorAll("[data-app-shell-fixed-header]").forEach((el) => {
      el.style.left = width;
      el.style.width = `calc(100% - ${width})`;
      el.style.maxWidth = "none";
    });
  }
}

function initSidebar() {
  injectStyles();
  const hosts = [...document.querySelectorAll("[data-app-sidebar]")];
  if (!hosts.length) return;
  hosts.forEach((host) => renderSidebar(host));
  const collapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  applySidebarState(collapsed);
  hosts.forEach((host) => {
    host.querySelector("#sidebarToggle")?.addEventListener("click", () => {
      const next = !host.classList.contains("collapsed");
      localStorage.setItem(SIDEBAR_STATE_KEY, String(next));
      applySidebarState(next);
    });
  });
}

function resolveLinkTarget(key) {
  if (key === "create") return shellState.role === "customer" ? routes.postJob : routes.createPost;
  return routes[key] || routes.home;
}

function bindLinks() {
  document.addEventListener("click", async (event) => {
    const linkTarget = event.target.closest("[data-shell-link]");
    if (linkTarget) {
      event.preventDefault();
      window.location.href = resolveLinkTarget(linkTarget.dataset.shellLink || "home");
      return;
    }
    const signOutTarget = event.target.closest("[data-shell-signout]");
    if (!signOutTarget) return;
    event.preventDefault();
    try { await signOut(auth); } catch {}
    shellState.stopUnread?.();
    localStorage.removeItem("workpalAuthUser");
    localStorage.removeItem("workpalUserRole");
    window.location.href = routes.signin;
  });
}

function updateCreateActions(role) {
  shellState.role = role || shellState.role || "artisan";
  localStorage.setItem("workpalUserRole", shellState.role);
  document.querySelectorAll("[data-shell-create-link]").forEach((el) => {
    const href = resolveLinkTarget("create");
    const label = shellState.role === "customer"
      ? el.dataset.customerLabel || "Post a Job"
      : el.dataset.artisanLabel || "Create Post";
    el.setAttribute("aria-label", label);
    if ("href" in el) el.setAttribute("href", href);
    else el.dataset.shellLink = "create";
    const labelNode = el.querySelector(".cta-label");
    if (labelNode) labelNode.textContent = label;
    else el.textContent = label;
  });
}

function updateNotificationBadges(count) {
  document.querySelectorAll("[data-shell-notification-badge], #notifBadge").forEach((badge) => {
    badge.textContent = String(count);
    if (count > 0) {
      badge.hidden = false;
      badge.classList.remove("hidden");
      if (badge.classList.contains("items-center")) badge.classList.add("inline-flex");
    } else {
      badge.hidden = true;
      badge.classList.add("hidden");
      badge.classList.remove("inline-flex");
    }
  });
}

function updateUserSurface(profile) {
  const name = profile?.name || auth.currentUser?.displayName || auth.currentUser?.email || "WorkPal User";
  const roleLabel = profile?.role === "customer" ? "Customer Workspace"
    : profile?.role === "artisan" ? profile.title || "Artisan Workspace"
    : "Workspace";
  const image = profile?.profileImage || auth.currentUser?.photoURL || "https://via.placeholder.com/72x72.png?text=W";
  document.querySelectorAll("[data-shell-user-name]").forEach((n) => { n.textContent = name; });
  document.querySelectorAll("[data-shell-user-role]").forEach((n) => { n.textContent = roleLabel; });
  document.querySelectorAll("[data-shell-avatar]").forEach((img) => { img.src = image; img.alt = `${name} avatar`; });
}

function initTopActions() {
  updateCreateActions(shellState.role);
  updateNotificationBadges(0);
}

function hydrateShell() {
  onAuthStateChanged(auth, async (user) => {
    shellState.stopUnread?.();
    shellState.stopUnread = null;
    if (!user) { updateUserSurface(null); updateNotificationBadges(0); return; }
    let profile = null;
    try { profile = await getCurrentUserProfile(); } catch {}
    if (profile?.role) updateCreateActions(profile.role);
    updateUserSurface(profile);
    try {
      shellState.stopUnread = subscribeUnreadNotificationCount(user.uid, (count) => {
        updateNotificationBadges(count);
      });
    } catch { updateNotificationBadges(0); }
  });
}

initSidebar();
injectBottomNav();
bindLinks();
initTopActions();
hydrateShell();
