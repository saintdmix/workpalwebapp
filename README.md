# WorkPal Web Architecture (HTML/CSS/JS)

This repository rebuilds the existing WorkPal product context into a web-first architecture using plain HTML, CSS, and JavaScript with composable, reusable components.

## 1) Project Structure

```text
workpalweb/
├─ index.html
├─ pages/
│  ├─ customers.html
│  ├─ vendors.html
│  ├─ feed.html
│  ├─ profiles.html
│  ├─ communication.html
│  ├─ subscriptions.html
│  ├─ nri-store.html
│  └─ start.html
├─ assets/
│  ├─ css/
│  │  ├─ main.css
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  ├─ layout.css
│  │  ├─ components/
│  │  │  ├─ navbar.css
│  │  │  ├─ sections.css
│  │  │  ├─ pricing.css
│  │  │  └─ footer.css
│  │  └─ pages/
│  │     └─ page-overrides.css
│  ├─ js/
│  │  ├─ main.js
│  │  ├─ data/
│  │  │  └─ navigation.js
│  │  ├─ components/
│  │  │  ├─ chrome.js
│  │  │  └─ sections.js
│  │  └─ pages/
│  │     ├─ home.js
│  │     ├─ customers.js
│  │     ├─ vendors.js
│  │     ├─ feed.js
│  │     ├─ profiles.js
│  │     ├─ communication.js
│  │     ├─ subscriptions.js
│  │     ├─ nri-store.js
│  │     └─ start.js
│  └─ img/
└─ README.md
```

### Structure principles
- Shared page shell: `main.js` injects reusable navbar/footer and page body.
- Reusable section components: section rendering functions in `sections.js` prevent duplication.
- Design tokens first: colors, typography, spacing, shadows, radius are centralized.
- Scalable page ownership: each product context gets a dedicated page module.

## 2) Design System

### Colors
- `--color-bg`: warm neutral canvas
- `--color-surface`: card/base white
- `--color-ink`: primary text
- `--color-ink-soft`: secondary text
- `--color-brand`: WorkPal teal
- `--color-accent`: warm orange accent
- `--color-line`: consistent stroke/border
- Semantic helpers: success and warning tones

### Typography
- Display font: `Fraunces` for premium headings
- UI/body font: `Plus Jakarta Sans`
- Fluid type scale using CSS clamp tokens (`--size-step-*`)

### Spacing
- 11-step spacing scale (`--space-1` to `--space-11`)
- Container token `--container` with responsive gutters

### Buttons
- Shared `.btn` base
- `.btn-primary` for primary action
- `.btn-secondary` for alternate action
- Pill radius and subtle lift-on-hover

### Cards
- Shared `.card` primitive for all modules
- Unified border, radius, and shadow rules
- Variant styling via contextual classes (`feature-card`, `pricing-card`, etc.)

### Forms
- Reusable `.field`, `.form-grid`, and `.field--full` primitives
- Accessible labels and semantic input types
- Inline feedback area with `aria-live`

### Navbar
- Sticky blur header with active-link state
- Mobile menu toggle with `aria-expanded`
- Shared navigation dataset in `navigation.js`

### Section layouts
- Reusable patterns:
  - Hero
  - Section header
  - Feature card grid
  - Timeline steps
  - Feed stream
  - Split comparison panel
  - Profile cards
  - Pricing cards
  - Store cards
  - CTA banner

## 3) Sitemap and Page List

- `/index.html` - Home and architecture overview
- `/pages/customers.html` - Customer flow journey
- `/pages/vendors.html` - Vendor operation journey
- `/pages/feed.html` - Work feed model
- `/pages/profiles.html` - Profile/trust system
- `/pages/communication.html` - Chat + notifications hub
- `/pages/subscriptions.html` - Plans/billing model
- `/pages/nri-store.html` - NRI + storefront experience
- `/pages/start.html` - Rollout/start page with contact form

## 4) Component Composition Approach

- HTML pages provide minimal shell + `data-page` key.
- `main.js` maps page keys to page renderer modules.
- Page modules compose reusable section functions from `sections.js`.
- Shared chrome (`navbar/footer`) comes from `chrome.js`.
- Same section components are reused across contexts with different content payloads.

## 5) Mapping to Old WorkPal Product Context

- Customer flows -> `customers.js` timeline + discovery/request/tracking/rebook modules.
- Vendor flows -> `vendors.js` onboarding/assignment/performance lifecycle modules.
- Work feeds -> `feed.js` event stream, tags, and actionability.
- Profiles -> `profiles.js` role-aware trust cards and media/proof structure.
- Chat/notifications -> `communication.js` inbox + notification center patterns.
- Subscriptions -> `subscriptions.js` plan cards + billing governance modules.
- NRI/store -> `nri-store.js` remote family operations + bundle catalog sections.

## 6) Web-Appropriate Redesign Decisions

Instead of copying mobile app behaviors, the new website uses web-native patterns:
- App stack navigation -> page ownership with clear information hierarchy
- Endless feed-only interaction -> filterable list/detail operational stream
- Hidden billing/settings pages -> explicit, auditable subscription workspace
- Chat-only entry points -> communication center with thread + alert context
- Compact profile cards -> richer profile hubs with trust, proof, and analytics blocks

## 7) Production-Friendly Qualities

- Semantic HTML and clear heading hierarchy
- Tokenized visual system and modular CSS
- Reusable JS composition for faster expansion
- Mobile-responsive grids and sticky navigation
- Progressive enhancement for animations and interactions
- Low-complexity stack (no framework lock-in)

## Run locally

Serve from the repository root with any static server.

Example:

```powershell
# Python 3
python -m http.server 8080
```

Then open `http://localhost:8080`.
