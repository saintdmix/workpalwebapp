import {
  renderCta,
  renderFeatureSection,
  renderPageHero,
  renderPricingSection,
  renderSplitSection,
  renderStorySection
} from '../components/sections.js';

export function renderSubscriptionsPage() {
  return `
    <main id='main-content'>
      ${renderPageHero({
        eyebrow: 'Subscriptions',
        title: 'Subscription architecture designed for recurring growth',
        description:
          'The old subscription intent is carried forward as web pricing systems, billing controls, and plan-based feature gates for customer and vendor workflows.'
      })}
      ${renderPricingSection({
        eyebrow: 'Plan Tiers',
        title: 'Choose a plan that matches operational complexity',
        description: 'Each tier can be reused as a card block in marketing pages and in-product upgrade prompts.',
        plans: [
          {
            name: 'Core',
            description: 'For early teams with focused categories and lighter operations.',
            price: '$39',
            featured: false,
            features: ['Request management', 'Vendor directory', 'Basic reporting']
          },
          {
            name: 'Pro Operations',
            description: 'For teams needing robust coordination and communication automation.',
            price: '$119',
            featured: true,
            features: ['Advanced feed filtering', 'Communication center rules', 'Multi-role profile governance']
          },
          {
            name: 'Enterprise Network',
            description: 'For large-scale, multi-region service networks including NRI workflows.',
            price: '$329',
            featured: false,
            features: ['Store and remittance workflows', 'Custom policy controls', 'Dedicated onboarding support']
          }
        ]
      })}
      ${renderFeatureSection({
        eyebrow: 'Billing UX',
        title: 'Web-appropriate subscription controls',
        description: 'Billing management is no longer hidden in app settings. It becomes a clear, auditable admin surface.',
        items: [
          {
            tag: 'Control',
            title: 'Invoice and Renewal Center',
            body: 'Administrators can review invoices, due dates, and history with export-ready records.'
          },
          {
            tag: 'Governance',
            title: 'Role-Based Billing Access',
            body: 'Only authorized users can change plans, payment methods, or renewal policies.'
          },
          {
            tag: 'Growth',
            title: 'Contextual Upsell Surfaces',
            body: 'Upgrade prompts appear in relevant workflow moments without interrupting core tasks.'
          }
        ]
      })}
      ${renderSplitSection({
        eyebrow: 'Mapping',
        title: 'From mobile settings panel to web billing workspace',
        description: 'This redesign keeps monetization intent and makes billing easier for teams to operate.',
        leftTitle: 'Original Intent',
        leftItems: ['Plan visibility', 'Upgrade flow', 'Subscription status indicators'],
        rightTitle: 'Web Upgrade',
        rightItems: ['Dedicated billing pages', 'Invoice and tax-ready documentation', 'Team-level access and approval patterns']
      })}
      ${renderStorySection({
        eyebrow: 'Business Impact',
        title: 'Subscription UX tied to retention',
        description: 'A polished billing experience increases trust and reduces churn from uncertainty.',
        stories: [
          {
            title: 'Lower payment friction',
            body: 'Clear billing states reduce support tickets and failed renewals.'
          },
          {
            title: 'Higher tier adoption',
            body: 'Contextual feature comparisons make upgrade value obvious.'
          },
          {
            title: 'Better finance coordination',
            body: 'Exportable records and role controls align product and finance teams.'
          }
        ]
      })}
      ${renderCta({
        title: 'Extend subscriptions into NRI and storefront experiences',
        body: 'See how WorkPal supports remote family operations and service bundles through the NRI & Store modules.',
        primaryLabel: 'Open NRI & Store',
        primaryHref: '/pages/nri-store.html',
        secondaryLabel: 'Start Implementation',
        secondaryHref: '/pages/start.html'
      })}
    </main>
  `;
}
