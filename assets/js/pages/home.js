import {
  renderCta,
  renderFeatureSection,
  renderHero,
  renderPricingSection,
  renderStats,
  renderStorySection,
  renderTimelineSection
} from '../components/sections.js';

export function renderHomePage() {
  return `
    <main id='main-content'>
      ${renderHero({
        eyebrow: 'WorkPal Platform',
        title: 'One web operating system for customer jobs, vendor execution, and trusted follow-through',
        description:
          'WorkPal rebuilds your Flutter-era service journeys into a polished, scalable web platform with composable modules for feed, communication, subscriptions, and NRI commerce.',
        actions: [
          { label: 'Start Rollout', href: '/pages/start.html', variant: 'btn-primary' },
          { label: 'See Customer Flow', href: '/pages/customers.html', variant: 'btn-secondary' }
        ],
        chips: ['Customer Journeys', 'Vendor Operations', 'Live Feed', 'Chat + Notifications', 'NRI + Store'],
        panelTitle: 'Web-first architecture for the same WorkPal intent',
        panelBody:
          'The experience keeps your existing domain language and feature purpose, but redesigns interactions for desktop and mobile web behaviors.',
        panelList: [
          'Composable sections and page-level composition modules',
          'Responsive layouts optimized for multi-column workflows',
          'Accessible semantics and scalable design tokens'
        ]
      })}
      ${renderStats([
        { value: '8', label: 'Core Product Contexts Unified' },
        { value: '100%', label: 'Reusable Component-Driven Sections' },
        { value: '<2s', label: 'Target Initial Render on Typical 4G' },
        { value: 'WCAG', label: 'Accessibility-Friendly Markup Patterns' }
      ])}
      ${renderFeatureSection({
        eyebrow: 'Sitemap Snapshot',
        title: 'Every high-value WorkPal journey has a dedicated web surface',
        description:
          'Instead of a single app-like stream, the website uses clear page ownership with shared components to support discovery, operations, and conversion.',
        items: [
          {
            tag: 'Customer',
            title: 'Customer Flows',
            body: 'Plan, request, confirm, monitor, and review services through transparent web checkpoints.'
          },
          {
            tag: 'Vendor',
            title: 'Vendor Flows',
            body: 'Manage leads, assignments, SLAs, and earnings with desktop-optimized productivity patterns.'
          },
          {
            tag: 'Ops',
            title: 'Chat & Notifications',
            body: 'Central communication hub with status alerts and digest-friendly updates.'
          }
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Migration Logic',
        title: 'How Flutter intent maps into modern web structure',
        description:
          'Each journey keeps its purpose while moving from mobile-first widgets to web-first page systems, filters, side panels, and contextual detail views.',
        steps: [
          {
            title: 'Preserve language and user intent',
            body: 'Terms such as customer, vendor, feed, subscriptions, and NRI/store remain intact to reduce relearning.'
          },
          {
            title: 'Reframe interaction models for web',
            body: 'Single-screen app steps become modular sections, tab-ready layouts, and list-detail structures fit for larger screens.'
          },
          {
            title: 'Compose with reusable blocks',
            body: 'Hero, cards, feed items, profile modules, pricing, and CTA sections are reused across pages to keep expansion predictable.'
          }
        ]
      })}
      ${renderStorySection({
        eyebrow: 'Proof of Fit',
        title: 'Designed for product, ops, and growth teams',
        description: 'The same foundation supports onboarding funnels, execution dashboards, and conversion pages without architectural rewrites.',
        stories: [
          {
            title: 'Operations leads gain visibility',
            body: 'Work feed and notification patterns help track active jobs, blockers, and turnaround metrics in one web workspace.'
          },
          {
            title: 'Vendors get better throughput',
            body: 'Vendor pages prioritize assignment clarity, capacity controls, and trust signals for faster response cycles.'
          },
          {
            title: 'Customers feel confidence',
            body: 'Customer flows foreground progress states, profile proof, and transparent communication touchpoints.'
          },
          {
            title: 'NRI families can coordinate remotely',
            body: 'Store and remote-management sections turn distance into a structured, trackable service lifecycle.'
          }
        ]
      })}
      ${renderPricingSection({
        eyebrow: 'Monetization',
        title: 'Subscription-ready architecture from day one',
        description: 'Pricing cards and plan messaging are reusable across marketing pages and logged-in upsell surfaces.',
        plans: [
          {
            name: 'Starter',
            description: 'For teams validating a single city or category.',
            price: '$49',
            featured: false,
            features: ['Customer request workflows', 'Basic vendor roster', 'Email support']
          },
          {
            name: 'Growth',
            description: 'For active operations teams managing multiple journeys.',
            price: '$129',
            featured: true,
            features: ['Advanced feed and filters', 'Chat and notification center', 'Subscription and billing controls']
          },
          {
            name: 'Scale',
            description: 'For multi-region operations with custom governance.',
            price: '$349',
            featured: false,
            features: ['NRI and storefront modules', 'Role-based access controls', 'Priority success manager']
          }
        ]
      })}
      ${renderCta({
        title: 'Ready to evolve WorkPal from app screens into a modern web platform?',
        body: 'Start with the rollout blueprint and prioritize the customer-vendor journeys that drive the most revenue and retention.',
        primaryLabel: 'Start With WorkPal',
        primaryHref: '/pages/start.html',
        secondaryLabel: 'View Vendor Flows',
        secondaryHref: '/pages/vendors.html'
      })}
    </main>
  `;
}
