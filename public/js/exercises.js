// Exercise library, tagged by muscle group and split day.
window.WT = window.WT || {};

WT.exercises = (function () {
  const LIBRARY = {
    push: [
      { name: 'Flat DB Bench Press', tags: ['Chest', 'Triceps'] },
      { name: 'Incline DB Bench Press', tags: ['Upper Chest', 'Shoulders', 'Triceps'] },
      { name: 'DB Floor Press', tags: ['Chest', 'Triceps'] },
      { name: 'DB Shoulder Press', tags: ['Shoulders', 'Triceps'] },
      { name: 'Cable Chest Fly', tags: ['Chest'] },
      { name: 'DB Lateral Raise', tags: ['Side Delts'] },
      { name: 'Cable Front Raise', tags: ['Front Delts'] },
    ],
    pull: [
      { name: 'Cable Lat Pulldown', tags: ['Lats', 'Biceps'] },
      { name: 'Cable Seated Row', tags: ['Mid Back', 'Lats'] },
      { name: 'Single-Arm Cable Row', tags: ['Mid Back', 'Lats'] },
      { name: 'DB Bent-Over Row', tags: ['Back', 'Core'] },
      { name: 'Cable Face Pull', tags: ['Rear Delts', 'Upper Back'] },
      { name: 'DB Bicep Curl', tags: ['Biceps'] },
      { name: 'Cable Bicep Curl', tags: ['Biceps'] },
    ],
    legs: [
      { name: 'DB Goblet Squat', tags: ['Quads', 'Glutes'] },
      { name: 'DB Bulgarian Split Squat', tags: ['Quads', 'Glutes'] },
      { name: 'DB Romanian Deadlift', tags: ['Hamstrings', 'Glutes', 'Lower Back'] },
      { name: 'DB Walking Lunge', tags: ['Quads', 'Glutes'] },
      { name: 'DB Step-Up', tags: ['Quads', 'Glutes'] },
      { name: 'Single-Leg RDL', tags: ['Hamstrings', 'Glutes'] },
      { name: 'DB Calf Raise', tags: ['Calves'] },
    ],
  };

  const TYPE_LABELS = { push: 'Push', pull: 'Pull', legs: 'Legs' };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickFive(type, exclude) {
    const pool = LIBRARY[type].filter((e) => !(exclude || []).includes(e.name));
    const shuffled = shuffle(pool.length >= 5 ? pool : LIBRARY[type]);
    return shuffled.slice(0, 5).map(toExerciseInstance);
  }

  function rerollOne(type, currentNames) {
    const pool = LIBRARY[type].filter((e) => !currentNames.includes(e.name));
    if (pool.length === 0) {
      // Everything is already in use; just pick a fresh random one from the full list.
      return toExerciseInstance(shuffle(LIBRARY[type])[0]);
    }
    return toExerciseInstance(shuffle(pool)[0]);
  }

  function toExerciseInstance(def) {
    return {
      name: def.name,
      tags: def.tags.slice(),
      targetSets: 3,
      repsMin: 8,
      repsMax: 12,
      sets: [], // filled in during logging: [{weight, reps}, ...]
    };
  }

  function muscleSummary(exercisesArr) {
    const seen = [];
    exercisesArr.forEach((ex) => {
      ex.tags.forEach((t) => {
        if (!seen.includes(t)) seen.push(t);
      });
    });
    return seen;
  }

  return { LIBRARY, TYPE_LABELS, pickFive, rerollOne, muscleSummary };
})();
