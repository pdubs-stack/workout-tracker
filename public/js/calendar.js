// Month calendar: shows completed workout history AND, now that Mon/Wed/Sat are a fixed
// schedule instead of a rolling sequence, lets you look forward too -- both the fixed days
// and any bonus-day workouts you've pre-scheduled via "+ Add Workout".
window.WT = window.WT || {};

WT.calendar = (function () {
  let viewYear, viewMonth; // 0-indexed month

  function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
  }

  function goPrev() {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
  }

  function goNext() {
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

  function scheduledByDay() {
    const map = {};
    WT.storage.getScheduledWorkouts().forEach((s) => {
      const [y, m, d] = s.date.split('-').map(Number);
      const key = y + '-' + (m - 1) + '-' + d;
      map[key] = s;
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
    const scheduled = scheduledByDay();
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = viewYear + '-' + viewMonth + '-' + day;
      const dateObj = new Date(viewYear, viewMonth, day);
      cells.push({
        day,
        dateStr: WT.workout.dateKey(dateObj),
        weekday: dateObj.getDay(),
        fixedType: WT.rotation.fixedTypeFor(dateObj),
        workouts: byDay[key] || [],
        scheduled: scheduled[key] || null,
      });
    }
    return cells;
  }

  function getViewYear() { return viewYear; }
  function getViewMonth() { return viewMonth; }

  return { init, goPrev, goNext, monthLabel, buildGrid, getViewYear, getViewMonth };
})();
