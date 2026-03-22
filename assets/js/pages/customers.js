import {
  renderCta,
  renderFeatureSection,
  renderPageHero,
  renderTimelineSection,
  renderSplitSection,
  renderFeedSection
} from '../components/sections.js';

export function renderCustomersPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Customer Journey',
        title: 'Customer flows redesigned for clarity, trust, and repeat usage',
        description:
          'The old Flutter customer intent is preserved, but the web version uses rich comparison cards, timeline checkpoints, and detailed progress visibility.'
      })}
      ${renderTimelineSection({
        eyebrow: 'Journey Steps',
        title: 'From request to completion with transparent checkpoints',
        description: 'Each stage gives customers the right amount of context without app-like screen hopping.',
        steps: [
          {
            title: 'Discover and compare',
            body: 'Customers filter categories, regions, ratings, and response speeds in one page with side-by-side cards.'
          },
          {
            title: 'Request with scope details',
            body: 'Request forms gather timeline, budget, photos, and urgency in structured web fields with validation.'
          },
          {
            title: 'Track fulfillment status',
            body: 'A progress timeline shows accepted, scheduled, in-progress, and delivered stages with timestamps.'
          },
          {
            title: 'Review and rebook',
            body: 'Completion states surface quality checks, reusable templates, and quick rebooking controls.'
          }
        ]
      })}
      ${renderFeatureSection({
        eyebrow: 'Key Web Modules',
        title: 'Why this is better than forcing a mobile pattern on desktop',
        description: 'Instead of deep stacked screens, customers get overview + detail patterns that reduce friction and improve trust.',
        items: [
          {
            tag: 'Planning',
            title: 'Request Workspace',
            body: 'A single page combines requirements form, service recommendations, and ETA guidance.'
          },
          {
            tag: 'Transparency',
            title: 'Status Timeline',
            body: 'Each service ticket has visible state transitions and chat context directly beside updates.'
          },
          {
            tag: 'Confidence',
            title: 'Profile Proof Cards',
            body: 'Vendor verification, past projects, and customer feedback are shown upfront before confirmation.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'UI Composition',
        title: 'Reusable customer UI building blocks',
        description: 'These blocks let us launch new service categories without redesigning the flow architecture.',
        leftTitle: 'Reusable Section Blocks',
        leftItems: [
          'Comparison card grids with trust badges',
          'Timeline components for service phases',
          'Contextual callouts for SLA and pricing clarity'
        ],
        rightTitle: 'Behavioral Improvements',
        rightItems: [
          'Lower abandonment from consolidated form steps',
          'Faster decisions from side-by-side vendor cards',
          'Higher repeat usage via saved service templates'
        ]
      })}
      ${renderFeedSection({
        eyebrow: 'Real-time View',
        title: 'Customer activity feed on web',
        description: 'The feed transitions from app-like cards to a list-detail stream that supports quick scans and deeper drill-downs.',
        items: [
          {
            title: 'Service request accepted by Premium Electricians',
            body: 'Assigned team confirmed arrival window and required materials. Customer can approve adjustments inline.',
            meta: ['Accepted', '2m ago', 'Lagos Mainland']
          },
          {
            title: 'Inspection photo batch uploaded',
            body: 'Before/after evidence attached to the active ticket, with notes linked to checklist milestones.',
            meta: ['Proof Update', '11m ago', '3 images']
          }
        ]
      })}
      ${renderCta({
        title: 'Build trust-heavy customer flows with reusable web sections',
        body: 'Move from rigid app screens to scalable web journeys without losing WorkPal domain context.',
        primaryLabel: 'Continue to Vendor Flows',
        primaryHref: '/pages/vendors.html',
        secondaryLabel: 'Back to Home',
        secondaryHref: '/index.html'
      })}
    </main>
  `;
}
