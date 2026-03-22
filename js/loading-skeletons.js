function lines(count, widths) {
  return Array.from({ length: count }, (_, index) => {
    const width = widths[index] || widths[widths.length - 1] || "w-full";
    return `<div class="shimmer-line h-3 ${width} rounded-full"></div>`;
  }).join("");
}

export function renderNewsSkeleton(count = 1) {
  return Array.from(
    { length: count },
    () => `
      <div class="min-w-full rounded-2xl overflow-hidden border border-white/5 bg-surface-container-low">
        <div class="shimmer-line h-64 w-full rounded-none"></div>
      </div>
    `
  ).join("");
}

export function renderArtisansSkeleton(count = 3, viewMode = "grid") {
  if (viewMode === "list") {
    return Array.from(
      { length: count },
      () => `
        <article class="bg-secondary rounded-xl border border-primary/10 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="shimmer-line h-14 w-14 rounded-full shrink-0"></div>
            <div class="flex-1 space-y-3">
              ${lines(3, ["w-40", "w-32", "w-28"])}
            </div>
          </div>
          <div class="shimmer-line h-10 w-28 rounded-lg shrink-0"></div>
        </article>
      `
    ).join("");
  }

  return Array.from(
    { length: count },
    () => `
      <article class="bg-secondary rounded-xl overflow-hidden border border-primary/10">
        <div class="shimmer-line h-48 w-full rounded-none"></div>
        <div class="p-6 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-3 flex-1">
              ${lines(2, ["w-36", "w-24"])}
            </div>
            <div class="shimmer-line h-5 w-12 rounded-full shrink-0"></div>
          </div>
          ${lines(2, ["w-full", "w-3/4"])}
          <div class="pt-4 border-t border-primary/10 flex items-center justify-between gap-4">
            <div class="shimmer-line h-3 w-24 rounded-full"></div>
            <div class="shimmer-line h-3 w-20 rounded-full"></div>
          </div>
        </div>
      </article>
    `
  ).join("");
}

export function renderChatRoomsSkeleton(count = 6) {
  return Array.from(
    { length: count },
    () => `
      <div class="flex items-center gap-4 p-3 rounded-2xl border border-white/5 bg-white/5">
        <div class="shimmer-line h-12 w-12 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div class="shimmer-line h-3 w-28 rounded-full"></div>
            <div class="shimmer-line h-3 w-10 rounded-full"></div>
          </div>
          <div class="shimmer-line h-3 w-4/5 rounded-full"></div>
        </div>
      </div>
    `
  ).join("");
}

export function renderChatMessagesSkeleton() {
  return `
    <div class="flex justify-center">
      <div class="shimmer-line h-6 w-36 rounded-full"></div>
    </div>
    <div class="flex gap-4 max-w-2xl">
      <div class="shimmer-line h-8 w-8 rounded-full shrink-0"></div>
      <div class="space-y-2 flex-1">
        <div class="shimmer-line h-24 w-full rounded-2xl"></div>
        <div class="shimmer-line h-3 w-14 rounded-full"></div>
      </div>
    </div>
    <div class="flex gap-4 max-w-2xl ml-auto flex-row-reverse">
      <div class="space-y-2 flex-1 max-w-xl">
        <div class="shimmer-line h-20 w-full rounded-2xl"></div>
        <div class="shimmer-line h-3 w-16 rounded-full ml-auto"></div>
      </div>
    </div>
    <div class="flex gap-4 max-w-2xl">
      <div class="shimmer-line h-8 w-8 rounded-full shrink-0"></div>
      <div class="space-y-2 flex-1">
        <div class="shimmer-line h-16 w-3/4 rounded-2xl"></div>
        <div class="shimmer-line h-3 w-12 rounded-full"></div>
      </div>
    </div>
  `;
}

export function renderNotificationsSkeleton(count = 4) {
  return Array.from(
    { length: count },
    () => `
      <article class="bg-surface-bright p-5 rounded-xl border border-primary/10 shadow-md flex items-start gap-4">
        <div class="shimmer-line h-12 w-12 rounded-xl shrink-0"></div>
        <div class="flex-1 space-y-3">
          ${lines(3, ["w-36", "w-full", "w-24"])}
        </div>
      </article>
    `
  ).join("");
}

export function renderProfileCardsSkeleton(count = 3) {
  return Array.from(
    { length: count },
    (_, index) => `
      <article class="post-card ${index === 0 ? "md:col-span-2" : ""}">
        <div class="shimmer-line h-[180px] w-full rounded-none"></div>
        <div class="post-body space-y-3">
          ${lines(2, ["w-full", "w-24"])}
        </div>
      </article>
    `
  ).join("");
}

export function renderWorkfeedsSkeleton(count = 3) {
  return Array.from(
    { length: count },
    () => `
      <article class="bg-[#2d1b4d] rounded-xl overflow-hidden border border-white/5">
        <div class="p-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="shimmer-line h-10 w-10 rounded-full shrink-0"></div>
            <div class="space-y-2 flex-1">
              ${lines(2, ["w-32", "w-24"])}
            </div>
          </div>
          <div class="shimmer-line h-6 w-24 rounded-full shrink-0"></div>
        </div>
        <div class="shimmer-line h-64 w-full rounded-none"></div>
        <div class="p-5 space-y-4">
          ${lines(2, ["w-full", "w-4/5"])}
          <div class="flex items-center gap-4 pt-4 border-t border-primary/10">
            <div class="shimmer-line h-4 w-16 rounded-full"></div>
            <div class="shimmer-line h-4 w-20 rounded-full"></div>
          </div>
        </div>
      </article>
    `
  ).join("");
}
