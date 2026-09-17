// Backward-looking month calendar of completed workout days.
window.WT = window.WT || {};

WT.calendar = (function () {
  let viewYear, viewMonth; // 0-indexed month

  function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
  }

  function canGoForward() {
    const now = new Date();
    return !(viewYear === now.getFullYear() && viewMonth === now.getMonth());
  }

  function goPrev() {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
  }

  function goNext() {
    if (!canGoForward()) return;
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
  }

  function workoutsByDay() {
    const log = WT.storage.getWorkoutLog();
    const map = {};
    log.forEach((w) => {
      const d = new Date(w.date);
      const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      (map[key] = map[key] || []).push(w);
    });
    return map;
  }

  function monthLabel() {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${names[viewMonth]} ${viewYear}`;
  }

  function buildGrid() {
    const byDay = workoutsByDay();
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = viewYear + '-' + viewMonth + '-' + day;
      cells.push({ day, workouts: byDay[key] || [] });
    }
    return cells;
  }

  function getViewYear() { return viewYear; }
  function getViewMonth() { return viewMonth; }

  return { init, goPrev, goNext, canGoForward, monthLabel, buildGrid, getViewYear, getViewMonth };
})();
