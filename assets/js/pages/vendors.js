import {
  renderCta,
  renderFeatureSection,
  renderPageHero,
  renderSplitSection,
  renderTimelineSection,
  renderStorySection
} from '../components/sections.js';

export function renderVendorsPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Vendor Operations',
        title: 'Vendor flows built for productivity, accountability, and growth',
        description:
          'The web redesign maps existing vendor intent into dashboards, assignment queues, and performance modules that suit desktop decision-making.'
      })}
      ${renderFeatureSection({
        eyebrow: 'Core Modules',
        title: 'Vendor-side architecture',
        description: 'Reusable cards and split panels keep operations fast while preserving WorkPal terminology and process intent.',
        items: [
          {
            tag: 'Onboarding',
            title: 'Verification Pipeline',
            body: 'KYC status, service categories, location coverage, and document renewals live in one controlled module.'
          },
          {
            tag: 'Execution',
            title: 'Assignment Queue',
            body: 'Priority-scored jobs, SLA timers, and workload balancing replace mobile-style single queue screens.'
          },
          {
            tag: 'Growth',
            title: 'Performance Insights',
            body: 'Ratings, repeat-rate, completion speed, and payout analytics support coaching and scaling.'
          }
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Journey Mapping',
        title: 'Vendor lifecycle in the web model',
        description: 'Each state aligns with old app workflows while using web-native controls.',
        steps: [
          {
            title: 'Profile and compliance setup',
            body: 'Vendors complete services, legal docs, and portfolio cards via progressive web forms.'
          },
          {
            title: 'Lead acceptance and scheduling',
            body: 'Lead board supports sorting, batching, and planned availability windows.'
          },
          {
            title: 'Delivery and proof submission',
            body: 'Task checklist, media evidence uploads, and customer signoff sit in one detail pane.'
          },
          {
            title: 'Payout and feedback cycle',
            body: 'Revenue summary and quality feedback are tied directly to completed assignments.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'Web-first Redesign',
        title: 'Replacing app-only constraints with operations-grade layouts',
        description: 'Vendors can process more jobs accurately because the UI supports breadth and context.',
        leftTitle: 'From Flutter Pattern',
        leftItems: [
          'Single card stack with limited context',
          'Deep navigation for related details',
          'Small-screen biased summary states'
        ],
        rightTitle: 'To Web Pattern',
        rightItems: [
          'Multi-column queue + detail workspace',
          'Inline expandable metadata and checklist panels',
          'Persistent SLA and payout context in side rail'
        ]
      })}
      ${renderStorySection({
        eyebrow: 'Operational Outcomes',
        title: 'What teams gain',
        description: 'The component system scales to new services and cities while keeping vendor experiences consistent.',
        stories: [
          {
            title: 'Lower missed SLAs',
            body: 'Visible timers and status rules reduce delayed responses across active leads.'
          },
          {
            title: 'Higher profile quality',
            body: 'Structured profile sections make proof assets and certifications easier to maintain.'
          },
          {
            title: 'Faster dispatching',
            body: 'Filters and workload views help assign the right vendor quickly.'
          }
        ]
      })}
      ${renderCta({
        title: 'Connect vendor execution directly to WorkPal feed and communication systems',
        body: 'Continue into the work feed page to see how operations updates become visible and actionable.',
        primaryLabel: 'Open Work Feed',
        primaryHref: '/pages/feed.html',
        secondaryLabel: 'Start Rollout',
        secondaryHref: '/pages/start.html'
      })}
    </main>
  `;
}
