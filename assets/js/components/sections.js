function sectionHeader({ eyebrow, title, description }) {
  return `
    <div class='section__head reveal'>
      ${eyebrow ? `<p class='eyebrow'>${eyebrow}</p>` : ''}
      <h2 class='section__title'>${title}</h2>
      ${description ? `<p class='section__body'>${description}</p>` : ''}
    </div>
  `;
}

export function renderHero({ eyebrow, title, description, actions = [], chips = [], panelTitle, panelBody, panelList = [] }) {
  return `
    <section class='hero'>
      <div class='container hero__grid'>
        <div class='reveal'>
          <p class='eyebrow'>${eyebrow}</p>
          <h1 class='hero__title'>${title}</h1>
          <p class='lead'>${description}</p>
          <div class='btn-row'>
            ${actions
              .map((action) => `<a class='btn ${action.variant}' href='${action.href}'>${action.label}</a>`)
              .join('')}
          </div>
          <ul class='hero__chips'>
            ${chips.map((chip) => `<li>${chip}</li>`).join('')}
          </ul>
        </div>
        <aside class='card hero__panel reveal'>
          <h2>${panelTitle}</h2>
          <p class='section__body'>${panelBody}</p>
          <ul class='list-clean' style='margin-top: var(--space-4);'>
            ${panelList.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </aside>
      </div>
    </section>
  `;
}

export function renderPageHero({ eyebrow, title, description }) {
  return `
    <section class='hero page-hero--compact'>
      <div class='container'>
        <div class='section__head reveal'>
          <p class='eyebrow'>${eyebrow}</p>
          <h1 class='hero__title'>${title}</h1>
          <p class='lead'>${description}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderStats(stats = []) {
  return `
    <section class='section section--tight'>
      <div class='container'>
        <div class='kpi-strip'>
          ${stats
            .map(
              (stat) => `
                <article class='kpi reveal'>
                  <strong>${stat.value}</strong>
                  <span>${stat.label}</span>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderFeatureSection({ eyebrow, title, description, items = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='grid grid-3'>
          ${items
            .map(
              (item) => `
                <article class='card feature-card reveal'>
                  <p class='badge'>${item.tag}</p>
                  <h3>${item.title}</h3>
                  <p>${item.body}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderTimelineSection({ eyebrow, title, description, steps = [] }) {
  return `
    <section class='section page-alt'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <ol class='timeline'>
          ${steps
            .map(
              (step, index) => `
                <li class='reveal'>
                  <p class='badge'>Step ${index + 1}</p>
                  <strong>${step.title}</strong>
                  <p>${step.body}</p>
                </li>
              `
            )
            .join('')}
        </ol>
      </div>
    </section>
  `;
}

export function renderStorySection({ eyebrow, title, description, stories = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='story-grid'>
          ${stories
            .map(
              (story) => `
                <article class='card story-card reveal'>
                  <h3>${story.title}</h3>
                  <p>${story.body}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderFeedSection({ eyebrow, title, description, items = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='feed'>
          ${items
            .map(
              (item) => `
                <article class='feed-item reveal'>
                  <h3>${item.title}</h3>
                  <p>${item.body}</p>
                  <div class='feed-item__meta'>
                    ${item.meta.map((meta) => `<span>${meta}</span>`).join('')}
                  </div>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderSplitSection({ eyebrow, title, description, leftTitle, leftItems = [], rightTitle, rightItems = [] }) {
  return `
    <section class='section page-alt'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='split'>
          <article class='card reveal'>
            <h3>${leftTitle}</h3>
            <ul class='list-clean' style='margin-top: var(--space-4);'>
              ${leftItems.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </article>
          <article class='card reveal'>
            <h3>${rightTitle}</h3>
            <ul class='list-clean' style='margin-top: var(--space-4);'>
              ${rightItems.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </article>
        </div>
      </div>
    </section>
  `;
}

export function renderProfileSection({ eyebrow, title, description, profiles = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='grid grid-3'>
          ${profiles
            .map(
              (profile) => `
                <article class='card profile-card reveal'>
                  <p class='badge'>${profile.type}</p>
                  <h3>${profile.name}</h3>
                  <p>${profile.summary}</p>
                  <ul class='list-clean' style='margin-top: var(--space-4);'>
                    ${profile.highlights.map((highlight) => `<li>${highlight}</li>`).join('')}
                  </ul>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderPricingSection({ eyebrow, title, description, plans = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='pricing-grid'>
          ${plans
            .map(
              (plan) => `
                <article class='pricing-card ${plan.featured ? 'pricing-card--featured' : ''} reveal'>
                  ${plan.featured ? "<span class='badge pricing-card__label'>Most Popular</span>" : ''}
                  <h3>${plan.name}</h3>
                  <p class='section__body'>${plan.description}</p>
                  <p class='price'>${plan.price}<span> /month</span></p>
                  <ul class='pricing-list'>
                    ${plan.features.map((feature) => `<li>${feature}</li>`).join('')}
                  </ul>
                  <div class='btn-row'>
                    <a class='btn btn-primary' href='/pages/start.html'>Choose ${plan.name}</a>
                  </div>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderStoreSection({ eyebrow, title, description, items = [] }) {
  return `
    <section class='section'>
      <div class='container'>
        ${sectionHeader({ eyebrow, title, description })}
        <div class='grid grid-3'>
          ${items
            .map(
              (item) => `
                <article class='card store-card reveal'>
                  <h3>${item.title}</h3>
                  <p>${item.body}</p>
                  <p class='badge' style='margin-top: var(--space-3);'>${item.tag}</p>
                </article>
              `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;
}

export function renderContactSection() {
  return `
    <section class='section page-alt'>
      <div class='container'>
        ${sectionHeader({
          eyebrow: 'Launch With Confidence',
          title: 'Get a tailored WorkPal rollout plan',
          description:
            'Tell us what your current operation looks like and we will map your customer, vendor, and communication flows into a web-ready setup.'
        })}
        <form class='card accent-panel reveal' data-demo-form>
          <div class='form-grid'>
            <label class='field'>
              <span>Full Name</span>
              <input type='text' name='name' required autocomplete='name' />
            </label>
            <label class='field'>
              <span>Work Email</span>
              <input type='email' name='email' required autocomplete='email' />
            </label>
            <label class='field'>
              <span>Primary Role</span>
              <select name='role' required>
                <option value=''>Select one</option>
                <option value='operations'>Operations Lead</option>
                <option value='product'>Product Owner</option>
                <option value='vendor-manager'>Vendor Manager</option>
                <option value='founder'>Founder</option>
              </select>
            </label>
            <label class='field'>
              <span>Priority Area</span>
              <select name='priority' required>
                <option value=''>Select one</option>
                <option value='customer-flow'>Customer Journey</option>
                <option value='vendor-flow'>Vendor Management</option>
                <option value='communication'>Chat and Notification Hub</option>
                <option value='commerce'>NRI and Store</option>
              </select>
            </label>
            <label class='field field--full'>
              <span>Current challenge</span>
              <textarea name='message' required></textarea>
            </label>
          </div>
          <div class='btn-row'>
            <button class='btn btn-primary' type='submit'>Request Planning Session</button>
            <p data-form-feedback aria-live='polite'></p>
          </div>
        </form>
      </div>
    </section>
  `;
}

export function renderCta({ title, body, primaryLabel, primaryHref, secondaryLabel, secondaryHref }) {
  return `
    <section class='section section--tight'>
      <div class='container'>
        <div class='card accent-panel reveal'>
          <h2>${title}</h2>
          <p class='section__body' style='margin-top: var(--space-3);'>${body}</p>
          <div class='btn-row'>
            <a class='btn btn-primary' href='${primaryHref}'>${primaryLabel}</a>
            <a class='btn btn-secondary' href='${secondaryHref}'>${secondaryLabel}</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function initPageInteractions() {
  const form = document.querySelector('[data-demo-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const feedback = form.querySelector('[data-form-feedback]');
      if (feedback) {
        feedback.textContent = 'Thanks. Your planning request has been captured. Our team will contact you shortly.';
      }
      form.reset();
    });
  }

  const revealItems = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
}
