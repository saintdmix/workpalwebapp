import { footerColumns, navLinks } from '../data/navigation.js';

export function renderNavbar(activeKey = 'home') {
  const navItems = navLinks
    .map((item) => {
      const current = item.key === activeKey ? " aria-current='page'" : '';
      return `<a href='${item.href}'${current}>${item.label}</a>`;
    })
    .join('');

  return `
    <header class='site-header'>
      <div class='container nav' data-open='false'>
        <a class='nav__brand' href='/index.html' aria-label='WorkPal home'>
          <span class='nav__mark' aria-hidden='true'>W</span>
          <span>WorkPal</span>
        </a>
        <button class='mobile-nav-toggle' type='button' aria-label='Toggle navigation' aria-expanded='false' data-nav-toggle>
          Menu
        </button>
        <nav class='nav__links' aria-label='Main navigation'>
          ${navItems}
        </nav>
        <div class='nav__actions'>
          <a class='btn btn-secondary' href='/pages/start.html'>Book Demo</a>
        </div>
      </div>
    </header>
  `;
}

export function renderFooter() {
  const columns = footerColumns
    .map(
      (column) => `
        <section>
          <h3>${column.title}</h3>
          <ul>
            ${column.links.map((link) => `<li><a href='${link.href}'>${link.label}</a></li>`).join('')}
          </ul>
        </section>
      `
    )
    .join('');

  return `
    <footer class='site-footer'>
      <div class='container'>
        <div class='footer-grid'>
          <section>
            <h3>WorkPal</h3>
            <p>Web-first operating system for trusted customer-vendor workflows, work feeds, subscriptions, and NRI commerce operations.</p>
          </section>
          ${columns}
        </div>
        <div class='footer-bottom'>
          <span>© ${new Date().getFullYear()} WorkPal. All rights reserved.</span>
          <span>Built for scalable multi-journey service operations.</span>
        </div>
      </div>
    </footer>
  `;
}

export function initChromeInteractions() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('.nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.dataset.open === 'true';
      nav.dataset.open = String(!isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }
}
