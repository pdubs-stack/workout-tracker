// App bootstrap: load state from the backend, wire up tab navigation + logout, render.
window.WT = window.WT || {};

(function () {
  const RENDERERS = {
    home: WT.ui.renderHome,
    calendar: WT.ui.renderCalendar,
    quests: WT.ui.renderQuests,
    adventure: WT.ui.renderAdventure,
    weight: WT.ui.renderWeight,
  };

  function showTab(tabName) {
    document.querySelectorAll('.wt-tab').forEach((t) => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelectorAll('.wt-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
    RENDERERS[tabName]();
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      // ignore -- redirect anyway
    }
    window.location.href = '/login';
  }

  async function init() {
    WT.ui.showLoading();
    WT.storage.onStatusChange((status) => WT.ui.setSaveStatus(status));

    await WT.storage.init();
    if (!WT.storage.isReady()) return; // storage.init() already redirected to /login

    WT.theme.applyActive();
    WT.calendar.init();

    document.querySelectorAll('.wt-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => showTab(btn.dataset.tab));
    });
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => WT.ui.openThemePicker());

    WT.ui.hideLoading();
    showTab('home');
  }

  WT.app = { goToTab: showTab };

  // This script is injected client-side (see app/(protected)/page.js) strictly after React's
  // hydration commit, specifically so DOMContentLoaded has already long since fired -- call directly.
  init();
})();
