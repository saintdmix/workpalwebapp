import {
  renderCta,
  renderFeatureSection,
  renderPageHero,
  renderProfileSection,
  renderSplitSection,
  renderStorySection
} from '../components/sections.js';

export function renderProfilesPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Profile Center',
        title: 'Rich profiles that turn activity into trust',
        description:
          'WorkPal profile intent is maintained, but redesigned for web with clear trust signals, portfolio depth, and role-based context.'
      })}
      ${renderProfileSection({
        eyebrow: 'Role-Aware Profiles',
        title: 'Reusable profile templates for each user type',
        description: 'Customer and vendor cards share a design language while exposing different operational metadata.',
        profiles: [
          {
            type: 'Vendor Profile',
            name: 'Prime HomeFix Team',
            summary: 'Specialized in electrical and plumbing with high repeat-rate across Lagos Mainland.',
            highlights: ['Verified business documents', '96% completion score', '120+ completed jobs']
          },
          {
            type: 'Customer Profile',
            name: 'Family Account - O. Balogun',
            summary: 'Active service history with recurring maintenance requests and approved vendor list.',
            highlights: ['Saved addresses and preferences', 'Centralized invoice history', 'Preferred service windows']
          },
          {
            type: 'Admin Profile',
            name: 'Operations Supervisor',
            summary: 'Monitors SLA compliance, escalations, and lifecycle health by region and category.',
            highlights: ['Role-based controls', 'Escalation oversight', 'Assignment governance']
          }
        ]
      })}
      ${renderFeatureSection({
        eyebrow: 'Profile Building Blocks',
        title: 'Composable modules we can reuse across the platform',
        description: 'Profiles are assembled from independent sections so expansion stays low-risk and consistent.',
        items: [
          {
            tag: 'Identity',
            title: 'Verification and Badges',
            body: 'Display KYC, compliance validity, and reliability badges as reusable trust components.'
          },
          {
            tag: 'Proof',
            title: 'Portfolio and Media Gallery',
            body: 'Project assets are grouped by service type with before/after context and quality notes.'
          },
          {
            tag: 'Performance',
            title: 'Ratings and Response Analytics',
            body: 'Transparent metrics support better customer matching and operational coaching.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'Web Adaptation',
        title: 'From app profile cards to rich web profile hubs',
        description: 'Large-screen layouts increase confidence by exposing depth without overwhelming users.',
        leftTitle: 'What We Keep',
        leftItems: ['Ratings and reviews', 'Service history records', 'Verification status indicators'],
        rightTitle: 'What We Improve',
        rightItems: ['Tabbed sections for deep content', 'Quick comparison profile snapshots', 'Linked feed events and chat context']
      })}
      ${renderStorySection({
        eyebrow: 'Trust Outcomes',
        title: 'Why profiles matter to conversion and retention',
        description: 'Better profile clarity improves both first-time selection and long-term platform loyalty.',
        stories: [
          {
            title: 'Faster vendor selection',
            body: 'Customers compare proof and performance at a glance.'
          },
          {
            title: 'Improved quality loops',
            body: 'Ops teams can spot recurring issues by profile signal trends.'
          },
          {
            title: 'Stronger premium positioning',
            body: 'Rich profiles elevate the perceived quality of WorkPal services.'
          }
        ]
      })}
      ${renderCta({
        title: 'Connect profile trust with communication workflows',
        body: 'Proceed to chat and notifications to see how conversation context ties into profile identity.',
        primaryLabel: 'Open Chat & Notify',
        primaryHref: '/pages/communication.html',
        secondaryLabel: 'View Subscriptions',
        secondaryHref: '/pages/subscriptions.html'
      })}
    </main>
  `;
}
