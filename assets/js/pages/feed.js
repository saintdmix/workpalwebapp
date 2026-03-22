import {
  renderCta,
  renderFeedSection,
  renderPageHero,
  renderSplitSection,
  renderStorySection,
  renderTimelineSection
} from '../components/sections.js';

export function renderFeedPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Work Feed',
        title: 'A web-native operations feed for real-time visibility',
        description:
          'WorkPal feed intent from Flutter is preserved, but redesigned as a desktop-friendly stream with richer metadata, filtering, and list-detail rhythm.'
      })}
      ${renderFeedSection({
        eyebrow: 'Live Stream',
        title: 'Operational events from customers and vendors',
        description: 'Every important update is searchable, filterable, and linkable to the owning ticket.',
        items: [
          {
            title: 'High-priority plumbing request escalated',
            body: 'Customer changed urgency after water leakage worsened. Assignment rerouted to nearest certified vendor.',
            meta: ['Priority: High', 'Escalated', '5m ago']
          },
          {
            title: 'Vendor uploaded completion checklist',
            body: 'Checklist includes material logs, completion photos, and signoff request sent to customer.',
            meta: ['Delivery Proof', '12m ago', 'Ticket #WP-1482']
          },
          {
            title: 'Subscription plan upgraded to Growth',
            body: 'Operations team unlocked advanced routing rules and notification workflows for faster dispatch.',
            meta: ['Billing', '26m ago', 'Growth Plan']
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'Web Redesign',
        title: 'Feed patterns tuned for larger screens',
        description: 'The feed now supports command-center behavior instead of endless mobile-style scrolling.',
        leftTitle: 'New Web Patterns',
        leftItems: [
          'Saved feed views by team and region',
          'Side panel detail on item click',
          'Bulk actions for operational triage'
        ],
        rightTitle: 'Old Intent Preserved',
        rightItems: [
          'Status updates remain central',
          'Media proofs remain attached to events',
          'Alert urgency still drives action priority'
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Data Flow',
        title: 'How feed events are structured',
        description: 'Each event stays legible and auditable for customers, vendors, and admin users.',
        steps: [
          {
            title: 'Event published from source module',
            body: 'Customer, vendor, profile, chat, and subscription modules can emit feed events.'
          },
          {
            title: 'Tagging and classification',
            body: 'Events are grouped by category, urgency, region, and ownership role.'
          },
          {
            title: 'Actionable follow-up',
            body: 'Feed cards provide links to ticket detail, assignee updates, and messaging threads.'
          }
        ]
      })}
      ${renderStorySection({
        eyebrow: 'Why It Matters',
        title: 'Feed as your shared operational memory',
        description: 'Teams gain traceability without chasing separate app sections.',
        stories: [
          {
            title: 'Audit-ready logs',
            body: 'Events are chronologically ordered with ownership metadata for accountability.'
          },
          {
            title: 'Faster incident response',
            body: 'Priority tags and grouped notifications reduce triage lag during service incidents.'
          },
          {
            title: 'Cleaner cross-team coordination',
            body: 'Customer support, vendor ops, and billing can act from the same source of truth.'
          }
        ]
      })}
      ${renderCta({
        title: 'See profiles and trust layers that power each feed event',
        body: 'Next, review how profile modules surface credibility for vendors and customers.',
        primaryLabel: 'Explore Profiles',
        primaryHref: '/pages/profiles.html',
        secondaryLabel: 'Back Home',
        secondaryHref: '/index.html'
      })}
    </main>
  `;
}
