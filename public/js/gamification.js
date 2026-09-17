// XP/leveling, stats, PR detection, armor tier formulas, side quests, attendance streak.
window.WT = window.WT || {};

WT.gamification = (function () {
  const XP_PER_WORKOUT = 50;
  const XP_PER_LEVEL = 100;

  const ARMOR_COLORS = [
    null, // tier 0 = unequipped
    '#a9865a', // 1 Leather
    '#8a97a3', // 2 Chainmail
    '#c8c8d0', // 3 Iron
    '#e8a93c', // 4 Gold
    '#7fe0e8', // 5 Diamond
    '#4a3a6a', // 6 Obsidian
  ];
  const TIER_NAMES = ['', 'Leather', 'Chainmail', 'Iron', 'Gold', 'Diamond', 'Obsidian'];
  const HELMET_WORKOUT_THRESHOLDS = [1, 10, 25, 50, 100, 200];

  const SIDE_QUEST_FLAVOR = {
    helmet: { key: 'starter', title: 'Starter Quest', questChallenge: 'Complete your first workout' },
    gauntlets: { key: 'strength', title: 'Strength Quest', questChallenge: 'Hit a new PR' },
    boots: { key: 'endurance', title: 'Endurance Quest', questChallenge: 'Workout with 25+ total volume' },
    chestplate: { key: 'discipline', title: 'Discipline Quest', questChallenge: '2 weeks full attendance, no misses' },
    cape: { key: 'capstone', title: 'Capstone Quest', questChallenge: 'PR on Push, Pull & Leg day, same week' },
  };

  // ---- level / XP ----
  function levelFromXp(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
  }
  function xpIntoLevel(xp) {
    return xp % XP_PER_LEVEL;
  }

  function addXp(amount) {
    const stats = WT.storage.getCharacterStats();
    const prevLevel = levelFromXp(stats.xp);
    stats.xp += amount;
    WT.storage.setCharacterStats(stats);
    const newLevel = levelFromXp(stats.xp);
    return { leveledUp: newLevel > prevLevel, newLevel };
  }

  function addStats(delta) {
    const stats = WT.storage.getCharacterStats();
    ['strength', 'endurance', 'discipline'].forEach((k) => {
      if (delta[k]) stats[k] = Math.round((stats[k] + delta[k]) * 10) / 10;
    });
    WT.storage.setCharacterStats(stats);
  }

  // ---- PR / volume helpers ----
  function estOneRepMax(weight, reps) {
    return weight * (1 + reps / 30);
  }

  function bestSetOf(exercise) {
    let best = null;
    (exercise.sets || []).forEach((s) => {
      if (!s.weight || !s.reps) return;
      const e1 = estOneRepMax(s.weight, s.reps);
      if (!best || e1 > best.est) best = { est: e1, weight: s.weight, reps: s.reps };
    });
    return best;
  }

  function workoutVolume(workout) {
    let total = 0;
    (workout.exercises || []).forEach((ex) => {
      (ex.sets || []).forEach((s) => {
        if (s.weight && s.reps) total += s.weight * s.reps;
      });
    });
    return total;
  }

  // Detect PRs in a workout against exerciseBests, updating bests + prHistory as a side effect.
  function detectAndRecordPRs(workout) {
    const bests = WT.storage.getExerciseBests();
    const history = WT.storage.getPrHistory();
    const newPRs = [];
    (workout.exercises || []).forEach((ex) => {
      const best = bestSetOf(ex);
      if (!best) return;
      const prevBest = bests[ex.name];
      if (!prevBest || best.est > prevBest.est) {
        bests[ex.name] = { est: best.est, weight: best.weight, reps: best.reps, date: workout.date };
        const entry = { date: workout.date, exercise: ex.name, est: best.est, workoutType: workout.type };
        history.push(entry);
        newPRs.push(entry);
      }
    });
    WT.storage.setExerciseBests(bests);
    WT.storage.setPrHistory(history);
    return newPRs;
  }

  function rollingAverageVolume(excludeWorkoutId) {
    const log = WT.storage.getWorkoutLog().filter((w) => w.id !== excludeWorkoutId);
    const recent = log.slice(-5);
    if (recent.length === 0) return null;
    const sum = recent.reduce((s, w) => s + (w.volume || 0), 0);
    return sum / recent.length;
  }

  function isoWeekKey(dateStr) {
    const d = new Date(dateStr);
    const target = new Date(d.valueOf());
    target.setHours(0, 0, 0, 0);
    // Shift to Monday-start week key using year + week number.
    const dayNum = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    return target.getFullYear() + '-W' + weekNum;
  }

  function weeksAgoKey(n) {
    const d = new Date();
    d.setDate(d.getDate() - n * 7);
    return isoWeekKey(d.toISOString());
  }

  function workoutsByWeek() {
    const log = WT.storage.getWorkoutLog();
    const map = {};
    log.forEach((w) => {
      const key = isoWeekKey(w.date);
      (map[key] = map[key] || []).push(w);
    });
    return map;
  }

  // Consecutive weeks (ending at the most recent week containing a workout) with >=3 completed workouts.
  function attendanceStreak() {
    const byWeek = workoutsByWeek();
    const currentKey = isoWeekKey(new Date().toISOString());
    let streak = 0;
    // Start from the current week; if it doesn't yet have 3, check from last week backward instead,
    // so an in-progress week doesn't unfairly break an otherwise intact streak.
    let startOffset = (byWeek[currentKey] || []).length >= 3 ? 0 : 1;
    for (let i = startOffset; i < 520; i++) {
      const key = weeksAgoKey(i);
      const count = (byWeek[key] || []).length;
      if (count >= 3) streak++;
      else break;
    }
    return streak;
  }

  function monthlyPrCount(monthOffset) {
    const now = new Date();
    const targetMonth = now.getMonth() - (monthOffset || 0);
    const d = new Date(now.getFullYear(), targetMonth, 1);
    const history = WT.storage.getPrHistory();
    return history.filter((p) => {
      const pd = new Date(p.date);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    }).length;
  }

  function maxHistoricalVolume() {
    const log = WT.storage.getWorkoutLog();
    return log.reduce((m, w) => Math.max(m, w.volume || 0), 0);
  }

  function everTriplePRWeek() {
    const history = WT.storage.getPrHistory();
    const byWeek = {};
    history.forEach((p) => {
      const key = isoWeekKey(p.date);
      byWeek[key] = byWeek[key] || new Set();
      byWeek[key].add(p.workoutType);
    });
    return Object.values(byWeek).some((s) => s.has('push') && s.has('pull') && s.has('legs'));
  }

  function totalWorkouts() {
    return WT.storage.getWorkoutLog().length;
  }

  // ---- Armor tier configuration (formula-driven, 6 tiers x 5 pieces) ----
  const PIECES = {
    gauntlets: {
      stat: 'strength',
      unlock: (T) => 20 * T,
      challengeLabel: (T) => `Hit ${T} new PR${T > 1 ? 's' : ''} in a month`,
      challengeCheck: (T) => monthlyPrCount(0) >= T,
      bonus: (T) => ({ strength: 5 * T }),
    },
    boots: {
      stat: 'endurance',
      unlock: (T) => 20 * T,
      challengeLabel: (T) => `Complete a workout with volume ≥ ${20 + 5 * T}`,
      challengeCheck: (T) => maxHistoricalVolume() >= 20 + 5 * T,
      bonus: (T) => ({ endurance: 5 * T }),
    },
    chestplate: {
      stat: 'discipline',
      unlock: (T) => 20 * T,
      challengeLabel: (T) => `Full attendance streak of ${1 + T} week${1 + T > 1 ? 's' : ''}`,
      challengeCheck: (T) => attendanceStreak() >= 1 + T,
      bonus: (T) => ({ discipline: 5 * T }),
    },
    helmet: {
      stat: null,
      unlock: (T) => HELMET_WORKOUT_THRESHOLDS[T - 1],
      challengeLabel: (T) => `Log ${HELMET_WORKOUT_THRESHOLDS[T - 1]} total workouts`,
      challengeCheck: (T) => totalWorkouts() >= HELMET_WORKOUT_THRESHOLDS[T - 1],
      bonus: (T) => ({ strength: 2 * T, endurance: 2 * T, discipline: 2 * T }),
    },
    cape: {
      stat: 'all',
      unlock: (T) => 20 * (T + 1),
      challengeLabel: () => 'Hit a PR on a Push, Pull, and Leg day within the same week',
      challengeCheck: () => everTriplePRWeek(),
      bonus: (T) => ({ strength: 10 * T, endurance: 10 * T, discipline: 10 * T }),
    },
  };

  function statMeetsUnlock(piece, T) {
    const stats = WT.storage.getCharacterStats();
    const cfg = PIECES[piece];
    const threshold = cfg.unlock(T);
    if (cfg.stat === 'all') {
      return stats.strength >= threshold && stats.endurance >= threshold && stats.discipline >= threshold;
    }
    if (cfg.stat === null) return true; // helmet's "unlock" IS the workout-count challenge
    return stats[cfg.stat] >= threshold;
  }

  // Recomputes achievable tier for every piece; applies bonuses + persists any newly-crossed tiers.
  // Returns list of { piece, tier } for tiers newly reached this call (for notifications).
  function recomputeArmor() {
    const armor = WT.storage.getArmor();
    const newlyReached = [];
    Object.keys(PIECES).forEach((piece) => {
      const cfg = PIECES[piece];
      let current = armor[piece].tier;
      for (let T = current + 1; T <= 6; T++) {
        if (statMeetsUnlock(piece, T) && cfg.challengeCheck(T)) {
          addStats(cfg.bonus(T));
          current = T;
          newlyReached.push({ piece, tier: T });
        } else {
          break;
        }
      }
      armor[piece].tier = current;
    });
    WT.storage.setArmor(armor);
    return newlyReached;
  }

  function armorPieceStatus(piece) {
    const armor = WT.storage.getArmor();
    const cfg = PIECES[piece];
    const tier = armor[piece].tier;
    const nextTier = Math.min(tier + 1, 6);
    const maxed = tier >= 6;
    return {
      piece,
      tier,
      tierName: TIER_NAMES[tier] || 'Unequipped',
      color: ARMOR_COLORS[tier],
      maxed,
      next: maxed
        ? null
        : {
            tier: nextTier,
            tierName: TIER_NAMES[nextTier],
            unlockLabel: describeUnlock(piece, nextTier),
            challengeLabel: cfg.challengeLabel(nextTier),
            unlockMet: statMeetsUnlock(piece, nextTier),
            challengeMet: cfg.challengeCheck(nextTier),
            bonus: cfg.bonus(nextTier),
          },
    };
  }

  function describeUnlock(piece, T) {
    const cfg = PIECES[piece];
    if (cfg.stat === 'all') return `All stats ≥ ${cfg.unlock(T)}`;
    if (cfg.stat === null) return `Total workouts ≥ ${cfg.unlock(T)}`;
    return `${capitalize(cfg.stat)} ≥ ${cfg.unlock(T)}`;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function allArmorStatus() {
    return Object.keys(PIECES).map(armorPieceStatus);
  }

  function sideQuestStatus() {
    return Object.keys(SIDE_QUEST_FLAVOR).map((piece) => {
      const flavor = SIDE_QUEST_FLAVOR[piece];
      const armor = WT.storage.getArmor();
      const cfg = PIECES[piece];
      const complete = armor[piece].tier >= 1;
      return {
        piece,
        key: flavor.key,
        title: flavor.title,
        challenge: flavor.questChallenge,
        reward: capitalize(piece),
        bonus: cfg.bonus(1),
        complete,
      };
    });
  }

  // Applies per-workout stat/XP gains for a just-completed workout. Returns a summary for UI feedback.
  function applyWorkoutCompletion(workout) {
    const prs = detectAndRecordPRs(workout);
    workout.volume = workoutVolume(workout);
    const avgVol = rollingAverageVolume(workout.id);
    const highVolume = avgVol === null ? workout.volume >= 20 : workout.volume >= avgVol;

    const disciplineGain = 4;
    const strengthGain = prs.length > 0 ? 6 : 2;
    const enduranceGain = highVolume ? 6 : 2;
    addStats({ strength: strengthGain, endurance: enduranceGain, discipline: disciplineGain });

    const xpResult = addXp(XP_PER_WORKOUT);
    const armorUps = recomputeArmor();

    return {
      xpGained: XP_PER_WORKOUT,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      prs,
      highVolume,
      statGains: { strength: strengthGain, endurance: enduranceGain, discipline: disciplineGain },
      armorUps,
    };
  }

  return {
    XP_PER_WORKOUT,
    XP_PER_LEVEL,
    ARMOR_COLORS,
    TIER_NAMES,
    levelFromXp,
    xpIntoLevel,
    addXp,
    addStats,
    workoutVolume,
    detectAndRecordPRs,
    attendanceStreak,
    totalWorkouts,
    allArmorStatus,
    sideQuestStatus,
    recomputeArmor,
    applyWorkoutCompletion,
    isoWeekKey,
  };
})();
