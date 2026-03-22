import {
  renderCta,
  renderFeatureSection,
  renderFeedSection,
  renderPageHero,
  renderSplitSection,
  renderTimelineSection
} from '../components/sections.js';

export function renderCommunicationPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Communication Layer',
        title: 'Unified chat and notifications for customers, vendors, and ops',
        description:
          'The mobile chat/notification concept evolves into a web communication center with inbox organization, alert priorities, and digest controls.'
      })}
      ${renderFeatureSection({
        eyebrow: 'Communication Hub',
        title: 'Web-first interaction model',
        description: 'Instead of isolated chat screens, users get persistent context beside each conversation thread.',
        items: [
          {
            tag: 'Inbox',
            title: 'Threaded Conversations',
            body: 'Conversations group by ticket and role, with timestamps, assignment context, and quick status actions.'
          },
          {
            tag: 'Alerts',
            title: 'Notification Center',
            body: 'Critical changes, escalations, and reminders appear in one filterable notification feed.'
          },
          {
            tag: 'Control',
            title: 'Digest Preferences',
            body: 'Users choose instant, periodic, or summary notifications by event type and channel.'
          }
        ]
      })}
      ${renderFeedSection({
        eyebrow: 'Sample Notifications',
        title: 'How alerts appear in the web center',
        description: 'Action-focused notifications reduce context switching and help teams close loops faster.',
        items: [
          {
            title: 'Customer message awaiting vendor response',
            body: 'Thread linked to active assignment with SLA countdown visible in the side panel.',
            meta: ['Action Needed', '2m ago', 'Ticket #WP-1529']
          },
          {
            title: 'Escalation triggered for delayed job',
            body: 'Ops lead notified with quick actions: reassign vendor, message customer, or adjust timeline.',
            meta: ['Escalation', '7m ago', 'High Priority']
          },
          {
            title: 'Weekly digest generated',
            body: 'Summary includes completion ratio, unresolved threads, and subscription-impacting events.',
            meta: ['Digest', 'Today', 'Auto Summary']
          }
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Lifecycle',
        title: 'Communication event flow',
        description: 'Messages and alerts maintain traceability from first request to final delivery.',
        steps: [
          {
            title: 'Event created by workflow action',
            body: 'Status changes, comments, uploads, and escalations create structured communication events.'
          },
          {
            title: 'Routed to relevant participants',
            body: 'Customers, vendors, and admins receive role-specific message views and alert priorities.'
          },
          {
            title: 'Resolved and recorded',
            body: 'Response outcomes are linked to ticket history and visible in feed and profile contexts.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'App-to-Web Mapping',
        title: 'Communication patterns modernized',
        description: 'We preserve immediacy while making web interactions easier to manage at scale.',
        leftTitle: 'Legacy Intent',
        leftItems: ['Instant updates', 'Ticket-linked conversations', 'Role-based messaging visibility'],
        rightTitle: 'Web Enhancement',
        rightItems: ['Split-pane inbox layout', 'Notification rule customization', 'Searchable thread history and filters']
      })}
      ${renderCta({
        title: 'Align communication controls with subscription plans',
        body: 'See how plan tiers unlock advanced workflow automations and notification policies.',
        primaryLabel: 'View Subscriptions',
        primaryHref: '/pages/subscriptions.html',
        secondaryLabel: 'Go to NRI & Store',
        secondaryHref: '/pages/nri-store.html'
      })}
    </main>
  `;
}
