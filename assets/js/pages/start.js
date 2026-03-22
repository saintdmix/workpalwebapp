import { renderContactSection, renderCta, renderFeatureSection, renderPageHero, renderTimelineSection } from '../components/sections.js';

export function renderStartPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Start With WorkPal',
        title: 'Plan your rollout with reusable web components from day one',
        description:
          'This implementation path keeps old WorkPal context intact while shipping a premium, maintainable website architecture that scales.'
      })}
      ${renderFeatureSection({
        eyebrow: 'What You Get',
        title: 'Implementation deliverables',
        description: 'The architecture is composable, responsive, accessible, and expansion-ready.',
        items: [
          {
            tag: 'Architecture',
            title: 'Modular Page Composition',
            body: 'Each page is assembled from shared components, minimizing duplicated markup and CSS.'
          },
          {
            tag: 'Design',
            title: 'Premium Design Tokens',
            body: 'Color, typography, spacing, and visual rhythm are standardized for consistent execution.'
          },
          {
            tag: 'Product Mapping',
            title: 'Context-Preserving Journeys',
            body: 'Customer, vendor, feed, communication, subscriptions, and NRI/store intent all map to web-ready surfaces.'
          }
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Rollout Phases',
        title: 'Recommended launch sequence',
        description: 'Phase by business impact while maintaining shared design and component standards.',
        steps: [
          {
            title: 'Phase 1: Trust and discovery surfaces',
            body: 'Launch Home, Customer Flows, and Vendor Flows pages first to establish core positioning.'
          },
          {
            title: 'Phase 2: Operations and communication',
            body: 'Deploy Work Feed, Profiles, and Chat/Notifications for day-to-day coordination.'
          },
          {
            title: 'Phase 3: Monetization and specialty modules',
            body: 'Roll out Subscriptions and NRI/Store to activate recurring revenue and remote household support.'
          }
        ]
      })}
      ${renderContactSection()}
      ${renderCta({
        title: 'Need to review architecture before build-out?',
        body: 'Return to the homepage for the full sitemap, structure, and reusable component strategy overview.',
        primaryLabel: 'Back to Home',
        primaryHref: '/index.html',
        secondaryLabel: 'View Customer Flows',
        secondaryHref: '/pages/customers.html'
      })}
    </main>
  `;
}
