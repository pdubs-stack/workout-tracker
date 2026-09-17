// Weekly weigh-ins, trend rate, trend state, and goal projection.
window.WT = window.WT || {};

WT.weight = (function () {
  const GOAL_WEIGHT = 160;

  function addEntry(date, weight) {
    const log = WT.storage.getWeightLog();
    log.push({ date, weight: Number(weight) });
    log.sort((a, b) => new Date(a.date) - new Date(b.date));
    WT.storage.setWeightLog(log);
    return log;
  }

  function deleteEntry(index) {
    const log = WT.storage.getWeightLog();
    log.splice(index, 1);
    WT.storage.setWeightLog(log);
    return log;
  }

  function sortedLog() {
    return WT.storage.getWeightLog().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Average lbs/week over the last 3-4 entries.
  function ratePerWeek() {
    const log = sortedLog();
    if (log.length < 2) return null;
    const recent = log.slice(-4);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const days = (new Date(last.date) - new Date(first.date)) / 86400000;
    if (days <= 0) return null;
    const weeks = days / 7;
    return (last.weight - first.weight) / weeks;
  }

  function trendState(rate) {
    if (rate === null || rate === undefined) return { key: 'unknown', label: 'Not enough data yet', color: '#4A3620' };
    if (rate < -0.1) return { key: 'off-course', label: 'Off Course', color: '#D64545' };
    if (rate <= 0.25) return { key: 'plateaued', label: 'Plateaued', color: '#E8A93C' };
    if (rate <= 1.5) return { key: 'questing', label: 'Questing', color: '#4C9A5B' };
    return { key: 'overshooting', label: 'Overshooting', color: '#D97B29' };
  }

  function currentWeight() {
    const log = sortedLog();
    return log.length ? log[log.length - 1].weight : null;
  }

  function projectedGoalDate() {
    const rate = ratePerWeek();
    const current = currentWeight();
    if (rate === null || current === null || rate <= 0) return null;
    if (current >= GOAL_WEIGHT) return new Date();
    const weeksNeeded = (GOAL_WEIGHT - current) / rate;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(weeksNeeded * 7));
    return d;
  }

  return { GOAL_WEIGHT, addEntry, deleteEntry, sortedLog, ratePerWeek, trendState, currentWeight, projectedGoalDate };
})();
