import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from "../firebase-init.js";
import {
  calculateProfileCompletion,
  filterByPreviousRange,
  filterByRange,
  getCurrentArtisanAnalyticsSnapshot,
} from "../services/analytics-service.js";

const LOGIN_URL = "../signin.html?mode=login";
const PROFILE_URL = "./profiles.html";

const $ = (id) => document.getElementById(id);

const els = {
  loading: $("analyticsLoading"),
  error: $("analyticsError"),
  name: $("analyticsName"),
  role: $("analyticsRole"),
  avatar: $("analyticsAvatar"),
  search: $("analyticsSearch"),
  rangeButtons: [...document.querySelectorAll("[data-range]")],
  exportBtn: $("exportAnalyticsBtn"),
  refreshBtn: $("generateInsightsBtn"),
  metricPostsValue: $("metricPostsValue"),
  metricPostsDelta: $("metricPostsDelta"),
  metricLikesValue: $("metricLikesValue"),
  metricLikesDelta: $("metricLikesDelta"),
  metricStoriesValue: $("metricStoriesValue"),
  metricStoriesDelta: $("metricStoriesDelta"),
  chartTitle: $("chartTitle"),
  chartSummary: $("chartSummary"),
  chartBars: $("activityBars"),
  chartLabels: $("activityLabels"),
  chartEmpty: $("activityEmpty"),
  insightPeak: $("insightPeak"),
  insightFormat: $("insightFormat"),
  insightAlert: $("insightAlert"),
  benchmarkCompletionValue: $("benchmarkCompletionValue"),
  benchmarkCompletionBar: $("benchmarkCompletionBar"),
  benchmarkMediaValue: $("benchmarkMediaValue"),
  benchmarkMediaBar: $("benchmarkMediaBar"),
  benchmarkMomentumValue: $("benchmarkMomentumValue"),
  benchmarkMomentumBar: $("benchmarkMomentumBar"),
  alertsList: $("analyticsAlertsList"),
};

const state = {
  snapshot: null,
  rangeKey: "30d",
};

function formatCompact(value) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value);
}

function formatPercentDelta(current, previous) {
  if (!previous) {
    if (!current) return "0%";
    return "+100%";
  }
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function formatTimeAgo(valueMs) {
  if (!valueMs) return "just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - valueMs) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function setError(message = "") {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.classList.toggle("hidden", !message);
}

function setLoading(show) {
  if (!els.loading) return;
  els.loading.classList.toggle("hidden", !show);
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRangeLabel(rangeKey) {
  if (rangeKey === "90d") return "90 days";
  if (rangeKey === "all") return "all time";
  return "30 days";
}

function renderRangeButtons() {
  els.rangeButtons.forEach((button) => {
    const active = button.dataset.range === state.rangeKey;
    button.className = `px-4 py-2 text-[11px] font-bold uppercase rounded-lg transition-colors ${
      active ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
    }`;
  });
}

function buildSeries(snapshot, rangeKey) {
  const now = new Date();
  const posts = filterByRange(snapshot.posts, rangeKey);
  const stories = filterByRange(snapshot.stories, rangeKey);

  if (rangeKey === "all") {
    const bins = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      bins.push({
        label: month.toLocaleString("en", { month: "short" }),
        key: `${month.getFullYear()}-${month.getMonth()}`,
        value: 0,
      });
    }

    posts.forEach((post) => {
      const date = new Date(post.timestampMs || 0);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bin = bins.find((item) => item.key === key);
      if (bin) bin.value += 3 + post.likesCount + post.commentCount * 2;
    });

    stories.forEach((story) => {
      const date = new Date(story.timestampMs || 0);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bin = bins.find((item) => item.key === key);
      if (bin) bin.value += 2;
    });

    return bins;
  }

  const days = rangeKey === "90d" ? 90 : 30;
  const chunkSize = Math.max(1, Math.floor(days / 12));
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  const bins = Array.from({ length: 12 }, (_, index) => {
    const day = new Date(start.getTime() + index * chunkSize * 24 * 60 * 60 * 1000);
    return {
      label: day.toLocaleString("en", { month: "short", day: "numeric" }),
      startMs: day.getTime(),
      endMs: day.getTime() + chunkSize * 24 * 60 * 60 * 1000,
      value: 0,
    };
  });

  posts.forEach((post) => {
    const ts = post.timestampMs || 0;
    const bin = bins.find((item) => ts >= item.startMs && ts < item.endMs);
    if (bin) bin.value += 3 + post.likesCount + post.commentCount * 2;
  });

  stories.forEach((story) => {
    const ts = story.timestampMs || 0;
    const bin = bins.find((item) => ts >= item.startMs && ts < item.endMs);
    if (bin) bin.value += 2;
  });

  return bins;
}

function renderChart(snapshot) {
  if (!els.chartBars || !els.chartLabels || !els.chartEmpty) return;
  const series = buildSeries(snapshot, state.rangeKey);
  const maxValue = Math.max(...series.map((item) => item.value), 0);

  if (maxValue <= 0) {
    els.chartBars.innerHTML = "";
    els.chartLabels.innerHTML = "";
    els.chartEmpty.classList.remove("hidden");
    setText(els.chartSummary, `No activity recorded in the last ${getRangeLabel(state.rangeKey)} yet.`);
    return;
  }

  els.chartEmpty.classList.add("hidden");
  els.chartBars.innerHTML = series
    .map((item) => {
      const height = Math.max(12, Math.round((item.value / maxValue) * 100));
      return `
        <div class="group relative flex-1 rounded-t-xl bg-primary/10 transition-all hover:bg-primary/30" style="height:${height}%">
          <div class="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white group-hover:block">
            ${item.value}
          </div>
        </div>
      `;
    })
    .join("");

  const labelIndexes = [0, Math.floor(series.length / 2), series.length - 1];
  els.chartLabels.innerHTML = labelIndexes
    .map((index) => `<span>${series[index]?.label || ""}</span>`)
    .join("");

  const totalActivity = series.reduce((sum, item) => sum + item.value, 0);
  setText(els.chartSummary, `${totalActivity} activity points captured across the last ${getRangeLabel(state.rangeKey)}.`);
}

function buildInsights(snapshot) {
  const posts = filterByRange(snapshot.posts, state.rangeKey);
  const notifications = snapshot.notifications;
  const unreadAlerts = notifications.filter((item) => !item.isRead).length;

  if (!posts.length) {
    return {
      peak: "Publish a few posts first and this panel will start spotting your strongest posting window.",
      format: "Once you mix status updates and portfolio posts, WorkPal can compare which format gets more response.",
      alert: unreadAlerts
        ? `${unreadAlerts} unread alerts are waiting. Clearing them will make this workspace easier to track.`
        : "No alert spikes right now. Your notification feed looks calm.",
    };
  }

  const hourMap = new Map();
  const formatMap = new Map();

  posts.forEach((post) => {
    const date = new Date(post.timestampMs || 0);
    const hour = date.getHours();
    const score = post.likesCount + post.commentCount * 2 + 1;

    const hourStats = hourMap.get(hour) || { score: 0, count: 0 };
    hourStats.score += score;
    hourStats.count += 1;
    hourMap.set(hour, hourStats);

    const format = post.postFormat || "status";
    const formatStats = formatMap.get(format) || { score: 0, count: 0 };
    formatStats.score += score;
    formatStats.count += 1;
    formatMap.set(format, formatStats);
  });

  const bestHourEntry = [...hourMap.entries()]
    .sort((a, b) => b[1].score / b[1].count - a[1].score / a[1].count)[0];
  const bestFormatEntry = [...formatMap.entries()]
    .sort((a, b) => b[1].score / b[1].count - a[1].score / a[1].count)[0];

  const hourLabel = bestHourEntry ? new Date(2000, 0, 1, bestHourEntry[0]).toLocaleTimeString("en", { hour: "numeric" }) : null;
  const formatLabel = bestFormatEntry
    ? bestFormatEntry[0] === "portfolio"
      ? "Portfolio posts"
      : bestFormatEntry[0] === "availability"
        ? "Open-for-work posts"
        : "Status updates"
    : null;

  const mediaPosts = posts.filter((post) => post.mediaCount > 0).length;
  const mediaCoverage = posts.length ? Math.round((mediaPosts / posts.length) * 100) : 0;

  return {
    peak: hourLabel
      ? `Your strongest posting window lately is around ${hourLabel}. Posts around that hour are getting the best response.`
      : "Keep posting consistently so WorkPal can learn your best time slot.",
    format: formatLabel
      ? `${formatLabel} are leading your current engagement mix. Media coverage is sitting at ${mediaCoverage}%.`
      : "Add more format variety so WorkPal can compare which content style is carrying your profile.",
    alert: unreadAlerts
      ? `${unreadAlerts} unread alerts are still open. Following up there is your fastest next move today.`
      : "No unread alerts right now. You are fully caught up on your recent feed activity.",
  };
}

function renderAlerts(snapshot) {
  if (!els.alertsList) return;
  const items = snapshot.notifications.slice(0, 4);
  if (!items.length) {
    els.alertsList.innerHTML = '<p class="text-[13px] text-slate-500">No recent alerts yet.</p>';
    return;
  }

  els.alertsList.innerHTML = items
    .map(
      (item) => `
        <div class="flex items-center space-x-3">
          <div class="h-2 w-2 rounded-full ${item.isRead ? "bg-primary/20" : "bg-primary"}"></div>
          <p class="min-w-0 flex-1 text-[13px] text-slate-300">
            <span class="font-bold text-white">${item.title}</span>${item.body ? ` - ${item.body}` : ""}
          </p>
          <span class="text-[10px] font-bold text-slate-500">${formatTimeAgo(item.timestampMs)}</span>
        </div>
      `
    )
    .join("");
}

function renderMetrics(snapshot) {
  const currentPosts = filterByRange(snapshot.posts, state.rangeKey);
  const previousPosts = filterByPreviousRange(snapshot.posts, state.rangeKey);
  const currentStories = filterByRange(snapshot.stories, state.rangeKey);
  const previousStories = filterByPreviousRange(snapshot.stories, state.rangeKey);

  const currentPostCount = currentPosts.length;
  const previousPostCount = previousPosts.length;
  const currentLikes = currentPosts.reduce((sum, post) => sum + post.likesCount, 0);
  const previousLikes = previousPosts.reduce((sum, post) => sum + post.likesCount, 0);
  const currentStoriesCount = currentStories.length;
  const previousStoriesCount = previousStories.length;

  setText(els.metricPostsValue, formatCompact(currentPostCount));
  setText(els.metricPostsDelta, formatPercentDelta(currentPostCount, previousPostCount));
  setText(els.metricLikesValue, formatCompact(currentLikes));
  setText(els.metricLikesDelta, formatPercentDelta(currentLikes, previousLikes));
  setText(els.metricStoriesValue, formatCompact(currentStoriesCount));
  setText(els.metricStoriesDelta, formatPercentDelta(currentStoriesCount, previousStoriesCount));
}

function renderBenchmarks(snapshot) {
  const completion = calculateProfileCompletion(snapshot.profile);
  const mediaCoverage = snapshot.posts.length
    ? Math.round((snapshot.posts.filter((post) => post.mediaCount > 0).length / snapshot.posts.length) * 100)
    : 0;
  const recentPosts = filterByRange(snapshot.posts, "30d").length;
  const momentum = clampPercent((recentPosts / 8) * 100);

  setText(els.benchmarkCompletionValue, `${completion}%`);
  setText(els.benchmarkMediaValue, `${mediaCoverage}%`);
  setText(els.benchmarkMomentumValue, `${momentum}%`);

  if (els.benchmarkCompletionBar) els.benchmarkCompletionBar.style.width = `${completion}%`;
  if (els.benchmarkMediaBar) els.benchmarkMediaBar.style.width = `${mediaCoverage}%`;
  if (els.benchmarkMomentumBar) els.benchmarkMomentumBar.style.width = `${momentum}%`;
}

function renderInsights(snapshot) {
  const insights = buildInsights(snapshot);
  setText(els.insightPeak, insights.peak);
  setText(els.insightFormat, insights.format);
  setText(els.insightAlert, insights.alert);
}

function renderSnapshot() {
  const snapshot = state.snapshot;
  if (!snapshot) return;

  setText(els.name, snapshot.profile.name || "Artisan");
  setText(els.role, snapshot.profile.title || "Artisan Workspace");
  if (els.avatar && snapshot.profile.profileImage) {
    els.avatar.src = snapshot.profile.profileImage;
  }

  renderRangeButtons();
  renderMetrics(snapshot);
  renderChart(snapshot);
  renderInsights(snapshot);
  renderBenchmarks(snapshot);
  renderAlerts(snapshot);
}

function exportSnapshot() {
  if (!state.snapshot) return;
  const payload = {
    exportedAt: new Date().toISOString(),
    artisan: {
      name: state.snapshot.profile.name || "",
      title: state.snapshot.profile.title || "",
      subscriptionStatus: state.snapshot.profile.subscriptionStatus || "",
    },
    metricsRange: state.rangeKey,
    posts: state.snapshot.posts,
    stories: state.snapshot.stories,
    notifications: state.snapshot.notifications,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workpal-analytics-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  els.rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.rangeKey = button.dataset.range || "30d";
      renderSnapshot();
    });
  });

  els.exportBtn?.addEventListener("click", exportSnapshot);
  els.refreshBtn?.addEventListener("click", renderSnapshot);

  els.search?.addEventListener("input", () => {
    const term = String(els.search?.value || "").trim().toLowerCase();
    if (!state.snapshot) return;
    if (!term) {
      renderAlerts(state.snapshot);
      return;
    }

    const filtered = {
      ...state.snapshot,
      notifications: state.snapshot.notifications.filter((item) =>
        `${item.title} ${item.body}`.toLowerCase().includes(term)
      ),
    };
    renderAlerts(filtered);
  });
}

async function hydrate() {
  setLoading(true);
  setError("");

  try {
    state.snapshot = await getCurrentArtisanAnalyticsSnapshot();
    renderSnapshot();
  } catch (error) {
    if (String(error?.message || "").includes("only available to artisan")) {
      window.location.href = PROFILE_URL;
      return;
    }
    setError(error?.message || "Unable to load analytics.");
  } finally {
    setLoading(false);
  }
}

function boot() {
  bindEvents();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = LOGIN_URL;
      return;
    }
    hydrate();
  });
}

boot();
