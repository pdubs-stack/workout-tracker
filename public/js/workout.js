// Current workout draft generation, editing, and completion.
window.WT = window.WT || {};

WT.workout = (function () {
  function ensureCurrentWorkout() {
    let current = WT.storage.getCurrentWorkout();
    if (!current) {
      current = generateNew();
    }
    return current;
  }

  function generateNew() {
    const type = WT.rotation.getNextType();
    const exercises = WT.exercises.pickFive(type);
    const draft = {
      id: 'w_' + Date.now(),
      type,
      dateCreated: new Date().toISOString(),
      notes: '',
      exercises,
    };
    WT.storage.setCurrentWorkout(draft);
    return draft;
  }

  function regenerate() {
    return generateNew();
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

    const log = WT.storage.getWorkoutLog();
    log.push(current);
    WT.storage.setWorkoutLog(log);

    WT.rotation.advance(current.type);
    WT.storage.setCurrentWorkout(null);

    return { workout: current, result };
  }

  function daysSinceDraftCreated() {
    const current = WT.storage.getCurrentWorkout();
    if (!current) return 0;
    const created = new Date(current.dateCreated);
    return Math.floor((Date.now() - created.getTime()) / 86400000);
  }

  return {
    ensureCurrentWorkout,
    regenerate,
    rerollExercise,
    updateSet,
    setNotes,
    summaryText,
    completeCurrentWorkout,
    daysSinceDraftCreated,
  };
})();
