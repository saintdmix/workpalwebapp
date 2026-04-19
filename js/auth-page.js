import {
  forgotPassword,
  loginUser,
  logoutUser,
  mapAuthError,
  registerArtisan,
  registerCustomer,
} from "./auth-service.js";

const inPagesDir = window.location.pathname.replace(/\\/g, "/").includes("/pages/");
const rootPrefix = inPagesDir ? "../" : "./";

function redirectToDashboard() {
  window.location.href = `${rootPrefix}dashboard.html`;
}

function showMessage(text, isError = true) {
  const authMessage = document.getElementById("authMessage");
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.classList.toggle("is-error", isError);
  authMessage.classList.toggle("is-success", !isError);
}

function persistRole(role) {
  localStorage.setItem("workpalUserRole", role);
}

function persistSession({ uid, role, profile }) {
  persistRole(role);
  localStorage.setItem(
    "workpalAuthUser",
    JSON.stringify({
      uid,
      role,
      profile: profile || null,
      signedInAt: new Date().toISOString(),
    })
  );
}

async function runLogout() {
  try {
    await logoutUser();
  } catch {
    // noop: still clear local state and redirect
  }
  localStorage.removeItem("workpalAuthUser");
  localStorage.removeItem("workpalUserRole");
  sessionStorage.clear();
  window.location.href = `${rootPrefix}index.html`;
}

// LOGOUT BUTTONS (works on settings/home pages too)
document.querySelectorAll('[data-logout], #logoutBtn').forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to log out?")) return;
    await runLogout();
  });
});

const authForm = document.getElementById("authForm");
if (!authForm) {
  // This page only needed logout handling.
  // Exit early for non-auth pages.
} else {
  const state = {
    role: "customer",
    mode: "login",
    skills: new Set(),
  };

  const skillOptions = [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Hairdresser",
    "Cleaner",
    "Painter",
    "Tailor",
    "Barber",
    "Auto Mechanic",
    "Software Developer",
    "Web Developer",
    "Photographer",
    "Graphics Designer",
    "Makeup Artist",
    "Tutor",
  ];

  const el = {
    roleCustomerBtn: document.getElementById("roleCustomerBtn"),
    roleArtisanBtn: document.getElementById("roleArtisanBtn"),
    modeSwitchBtn: document.getElementById("modeSwitchBtn"),
    formTitle: document.getElementById("formTitle"),
    submitBtn: document.getElementById("submitBtn"),
    forgotWrap: document.getElementById("forgotWrap"),
    forgotPasswordBtn: document.getElementById("forgotPasswordBtn"),
    signupFields: document.getElementById("signupFields"),
    artisanFields: document.getElementById("artisanFields"),
    heroBadge: document.getElementById("heroBadge"),
    heroTitle: document.getElementById("heroTitle"),
    heroText: document.getElementById("heroText"),
    skillsWrap: document.getElementById("skillsWrap"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    fullName: document.getElementById("fullName"),
    phone: document.getElementById("phone"),
    address: document.getElementById("address"),
    title: document.getElementById("title"),
    bio: document.getElementById("bio"),
    referral: document.getElementById("referral"),
  };

  function renderSkills() {
    if (!el.skillsWrap) return;
    el.skillsWrap.innerHTML = "";

    skillOptions.forEach((skill) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `chip${state.skills.has(skill) ? " active" : ""}`;
      chip.textContent = skill;
      chip.addEventListener("click", () => {
        if (state.skills.has(skill)) {
          state.skills.delete(skill);
        } else {
          state.skills.add(skill);
        }
        renderSkills();
      });
      el.skillsWrap.appendChild(chip);
    });
  }

  function render() {
    const isLogin = state.mode === "login";

    el.roleCustomerBtn?.classList.toggle("active", state.role === "customer");
    el.roleArtisanBtn?.classList.toggle("active", state.role === "artisan");

    if (el.formTitle) el.formTitle.textContent = isLogin ? "Welcome Back" : "Create Account";
    if (el.modeSwitchBtn) el.modeSwitchBtn.textContent = isLogin ? "Sign Up" : "Login";
    if (el.submitBtn) el.submitBtn.textContent = isLogin ? "Login" : "Create Account";

    el.forgotWrap?.classList.toggle("hidden", !isLogin);
    el.signupFields?.classList.toggle("hidden", isLogin);
    el.artisanFields?.classList.toggle("hidden", isLogin || state.role !== "artisan");

    if (state.role === "customer") {
      if (el.heroBadge) el.heroBadge.textContent = "Customer Portal";
      if (el.heroTitle) el.heroTitle.textContent = "Find trusted professionals near you";
      if (el.heroText) {
        el.heroText.textContent =
          "Connect with skilled artisans for home, business, and personal services.";
      }
    } else {
      if (el.heroBadge) el.heroBadge.textContent = "Artisan Portal";
      if (el.heroTitle) el.heroTitle.textContent = "Showcase your skills and get hired";
      if (el.heroText) {
        el.heroText.textContent =
          "Create your artisan profile and reach customers in your area.";
      }
    }
  }

  function validateSignupFields() {
    if (!el.fullName?.value.trim()) return "Full name is required.";
    if (!el.phone?.value.trim()) return "Phone number is required.";
    if (!el.address?.value.trim()) return "Address is required.";

    if (state.role === "artisan") {
      if (!el.title?.value.trim()) return "Professional title is required for artisans.";
      if (!el.bio?.value.trim()) return "Bio is required for artisans.";
    }

    return "";
  }

  function setLoading(on) {
    const btn = document.getElementById("submitBtn");
    const label = btn?.querySelector(".btn-label");
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle("loading", on);
    if (label && !on) label.textContent = state.mode === "login" ? "Login" : "Create Account";
  }

  async function handleLogin() {
    const email = el.email?.value?.trim() || "";
    const password = el.password?.value || "";

    if (!email || !password) {
      showMessage("Email and password are required.", true);
      return;
    }

    const result = await loginUser({ email, password, role: state.role });
    persistSession(result);
    showMessage("Login successful.", false);
    setTimeout(() => redirectToDashboard(), 250);
  }

  async function handleSignup() {
    const email = el.email?.value?.trim() || "";
    const password = el.password?.value || "";

    if (!email || !password) {
      showMessage("Email and password are required.", true);
      return;
    }

    const validationError = validateSignupFields();
    if (validationError) {
      showMessage(validationError, true);
      return;
    }

    const payload = {
      email,
      password,
      name: el.fullName?.value?.trim() || "",
      phoneNumber: el.phone?.value?.trim() || "",
      address: el.address?.value?.trim() || "",
      referralCode: el.referral?.value?.trim() || "",
      lat: 0,
      lng: 0,
    };

    let result;
    if (state.role === "artisan") {
      result = await registerArtisan({
        ...payload,
        title: el.title?.value?.trim() || "",
        bio: el.bio?.value?.trim() || "",
        skills: Array.from(state.skills),
      });
    } else {
      result = await registerCustomer(payload);
    }

    persistSession(result);
    showMessage("Signup successful.", false);
    setTimeout(() => redirectToDashboard(), 250);
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("");
    setLoading(true);
    try {
      if (state.mode === "login") {
        await handleLogin();
      } else {
        await handleSignup();
      }
    } catch (error) {
      showMessage(mapAuthError(error), true);
    } finally {
      setLoading(false);
    }
  });

  el.forgotPasswordBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = el.email?.value?.trim() || "";
    if (!email) {
      showMessage("Enter your email first.", true);
      return;
    }

    try {
      await forgotPassword(email);
      showMessage("Password reset email sent.", false);
    } catch (error) {
      showMessage(mapAuthError(error), true);
    }
  });

  el.roleCustomerBtn?.addEventListener("click", () => {
    state.role = "customer";
    persistRole(state.role);
    render();
  });

  el.roleArtisanBtn?.addEventListener("click", () => {
    state.role = "artisan";
    persistRole(state.role);
    render();
  });

  el.modeSwitchBtn?.addEventListener("click", () => {
    state.mode = state.mode === "login" ? "signup" : "login";
    render();
  });

  const params = new URLSearchParams(window.location.search);
  const modeFromQuery = params.get("mode");
  const roleFromQuery = params.get("role");

  if (modeFromQuery === "signup" || modeFromQuery === "login") {
    state.mode = modeFromQuery;
  }

  if (roleFromQuery === "artisan" || roleFromQuery === "customer") {
    state.role = roleFromQuery;
  } else {
    const persistedRole = localStorage.getItem("workpalUserRole");
    if (persistedRole === "artisan" || persistedRole === "customer") {
      state.role = persistedRole;
    }
  }

  persistRole(state.role);
  renderSkills();
  render();
}
