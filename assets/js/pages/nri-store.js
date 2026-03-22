import {
  renderCta,
  renderFeatureSection,
  renderPageHero,
  renderStoreSection,
  renderSplitSection,
  renderTimelineSection
} from '../components/sections.js';

export function renderNriStorePage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'NRI & Store',
        title: 'Remote-first service coordination and curated storefront journeys',
        description:
          'The NRI/store intent from the Flutter app is redesigned as clear web pathways for remote households, service bundles, and cross-border confidence.'
      })}
      ${renderFeatureSection({
        eyebrow: 'NRI Context',
        title: 'Web flows for distance-managed service operations',
        description: 'NRI users need trust, proof, and transparent progress. The web experience emphasizes all three.',
        items: [
          {
            tag: 'Trust',
            title: 'Family and Property Profiles',
            body: 'Manage addresses, contact permissions, and recurring service needs from one profile workspace.'
          },
          {
            tag: 'Visibility',
            title: 'Proof-Driven Updates',
            body: 'Photo, checklist, and timeline evidence reduce uncertainty for remote decision-makers.'
          },
          {
            tag: 'Control',
            title: 'Bundle and Schedule Planning',
            body: 'Predefined service bundles streamline upkeep for families and property managers.'
          }
        ]
      })}
      ${renderStoreSection({
        eyebrow: 'Store Modules',
        title: 'Composable storefront blocks for WorkPal services',
        description: 'Store cards turn operational capabilities into clear, purchasable offerings.',
        items: [
          {
            title: 'Home Care Essentials Bundle',
            body: 'Scheduled checks for plumbing, electrical, and safety systems with monthly summaries.',
            tag: 'Subscription Bundle'
          },
          {
            title: 'Move-In Readiness Package',
            body: 'Inspection, cleaning, and fixture checks delivered with visual proof milestones.',
            tag: 'One-Time Package'
          },
          {
            title: 'Parent Support Priority Plan',
            body: 'Urgent help desk routing, recurring assistance, and dedicated communication channels.',
            tag: 'Premium Care'
          }
        ]
      })}
      ${renderTimelineSection({
        eyebrow: 'Journey',
        title: 'NRI/store flow in the web model',
        description: 'Each stage is traceable and optimized for asynchronous collaboration across time zones.',
        steps: [
          {
            title: 'Select package and define service scope',
            body: 'Web catalog supports package comparison and scheduling constraints.'
          },
          {
            title: 'Assign vendors and track progress',
            body: 'Assignments and timeline updates are visible to all approved stakeholders.'
          },
          {
            title: 'Review proof and manage renewals',
            body: 'Completion evidence and next-cycle recommendations feed directly into subscription decisions.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'Mapping Back',
        title: 'Preserving NRI/store intent while modernizing UX',
        description: 'The web redesign keeps empathy for remote coordination and improves decision speed.',
        leftTitle: 'Original Product Intent',
        leftItems: ['Support long-distance families', 'Offer organized service bundles', 'Provide trust through updates'],
        rightTitle: 'Web-first Enhancement',
        rightItems: ['Dashboard-like visibility', 'Catalog and package comparison', 'Shared timeline and communication rails']
      })}
      ${renderCta({
        title: 'Finalize your WorkPal web blueprint',
        body: 'Use the start page to share your priorities and phase rollout across customer, vendor, and NRI journeys.',
        primaryLabel: 'Start Planning Session',
        primaryHref: '/pages/start.html',
        secondaryLabel: 'Back to Home',
        secondaryHref: '/index.html'
      })}
    </main>
  `;
}
