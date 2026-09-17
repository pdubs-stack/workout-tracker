// Fixed weekly split: Monday = Push, Wednesday = Pull, Saturday = Legs.
// Tuesday/Thursday/Friday/Sunday have no auto-assigned type -- the home page offers a
// muscle-group picker instead, and completing one of those counts as a "bonus" workout
// (tracked separately for weapon unlocks).
window.WT = window.WT || {};

WT.rotation = (function () {
  // JS Date#getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const FIXED_DAYS = { 1: 'push', 3: 'pull', 6: 'legs' };
  const BONUS_WEEKDAYS = [0, 2, 4, 5]; // Sun, Tue, Thu, Fri

  function fixedTypeFor(date) {
    const d = date || new Date();
    return FIXED_DAYS[d.getDay()] || null;
  }

  function isBonusWeekday(date) {
    const d = date || new Date();
    return BONUS_WEEKDAYS.includes(d.getDay());
  }

  function weekdayName(dayNum) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum];
  }

  return { FIXED_DAYS, BONUS_WEEKDAYS, fixedTypeFor, isBonusWeekday, weekdayName };
})();
