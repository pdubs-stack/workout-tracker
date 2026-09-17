// Current workout draft generation, editing, and completion.
window.WT = window.WT || {};

WT.workout = (function () {
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Returns the current draft if one exists; otherwise auto-generates one for fixed
  // Mon/Wed/Sat days or a pre-scheduled bonus day. Returns null on an unscheduled bonus
  // day (Tue/Thu/Fri/Sun with nothing picked yet) so the UI can show the muscle-group picker.
  function ensureCurrentWorkout() {
    let current = WT.storage.getCurrentWorkout();
    if (current) return current;

    const fixedType = WT.rotation.fixedTypeFor();
    if (fixedType) return generateNew(fixedType, false);

    const today = dateKey(new Date());
    const scheduled = WT.storage.getScheduledWorkouts();
    const match = scheduled.find((s) => s.date === today);
    if (match) {
      WT.storage.setScheduledWorkouts(scheduled.filter((s) => s !== match));
      return generateNew(match.type, true);
    }

    return null;
  }

  function generateNew(type, bonus) {
    const exercises = WT.exercises.pickFive(type);
    const draft = {
      id: 'w_' + Date.now(),
      type,
      bonus: !!bonus,
      dateCreated: new Date().toISOString(),
      notes: '',
      exercises,
    };
    WT.storage.setCurrentWorkout(draft);
    return draft;
  }

  // Called from the bonus-day muscle-group picker on Tue/Thu/Fri/Sun.
  function startBonusWorkout(type) {
    return generateNew(type, true);
  }

  function regenerate() {
    const current = WT.storage.getCurrentWorkout();
    const type = current ? current.type : WT.rotation.fixedTypeFor();
    const bonus = current ? current.bonus : false;
    return generateNew(type, bonus);
  }

  function rerollExercise(index) {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return null;
    const currentNames = current.exercises.map((e) => e.name);
    current.exercises[index] = WT.exercises.rerollOne(current.type, currentNames);
    WT.storage.setCurrentWorkout(current);
    return current;
  }

  function updateSet(exIndex, setIndex, field, value) {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return null;
    const ex = current.exercises[exIndex];
    ex.sets[setIndex] = ex.sets[setIndex] || { weight: null, reps: null };
    ex.sets[setIndex][field] = value === '' ? null : Number(value);
    WT.storage.setCurrentWorkout(current);
    return current;
  }

  function setNotes(text) {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return null;
    current.notes = text;
    WT.storage.setCurrentWorkout(current);
    return current;
  }

  function summaryText(workout) {
    const muscles = WT.exercises.muscleSummary(workout.exercises);
    return `You'll feel this in: ${muscles.join(', ')}. Aim to complete in ~45 minutes.`;
  }

  function completeCurrentWorkout() {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return null;
    current.date = new Date().toISOString();
    current.completed = true;

    const result = WT.gamification.applyWorkoutCompletion(current);

    if (current.bonus) {
      result.weaponUnlocked = WT.weapons.unlockNext();
    }

    const log = WT.storage.getWorkoutLog();
    log.push(current);
    WT.storage.setWorkoutLog(log);

    WT.storage.setCurrentWorkout(null);

    return { workout: current, result };
  }

  function daysSinceDraftCreated() {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return 0;
    const created = new Date(current.dateCreated);
    return Math.floor((Date.now() - created.getTime()) / 86400000);
  }

  // ---- Scheduling future bonus-day workouts from the calendar ----
  function scheduleWorkout(dateStr, type) {
    const list = WT.storage.getScheduledWorkouts();
    const filtered = list.filter((s) => s.date !== dateStr);
    filtered.push({ date: dateStr, type });
    WT.storage.setScheduledWorkouts(filtered);
  }

  function removeScheduledWorkout(dateStr) {
    const list = WT.storage.getScheduledWorkouts();
    WT.storage.setScheduledWorkouts(list.filter((s) => s.date !== dateStr));
  }

  function getScheduledWorkouts() {
    return WT.storage.getScheduledWorkouts();
  }

  return {
    dateKey,
    ensureCurrentWorkout,
    regenerate,
    startBonusWorkout,
    rerollExercise,
    updateSet,
    setNotes,
    summaryText,
    completeCurrentWorkout,
    daysSinceDraftCreated,
    scheduleWorkout,
    removeScheduledWorkout,
    getScheduledWorkouts,
  };
})();
