// App bootstrap: load state from the backend, wire up tab navigation + logout, render.
(function () {
  const RENDERERS = {
    home: WT.ui.renderHome,
    calendar: WT.ui.renderCalendar,
    quests: WT.ui.renderQuests,
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

    WT.calendar.init();

    document.querySelectorAll('.wt-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => showTab(btn.dataset.tab));
    });
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    WT.ui.hideLoading();
    showTab('home');
  }

  // This script is injected client-side (see app/page.js) strictly after React's hydration
  // commit, specifically so DOMContentLoaded has already long since fired -- call directly.
  init();
})();
