// Shape of the single JSON document stored in Vercel Blob. Mirrors the old localStorage schema
// exactly, so the client-side game logic (gamification.js, workout.js, etc.) needed no changes.
export function defaultState() {
  return {
    workoutLog: [],
    currentWorkout: null,
    rotation: { nextType: 'push' },
    characterStats: { strength: 0, endurance: 0, discipline: 0, xp: 0 },
    armor: {
      helmet: { tier: 0 },
      gauntlets: { tier: 0 },
      boots: { tier: 0 },
      chestplate: { tier: 0 },
      cape: { tier: 0 },
    },
    weightLog: [],
    exerciseBests: {},
    prHistory: [],
    meta: { createdAt: new Date().toISOString() },
    theme: { presetId: 'parchment', activeCustomId: null, customPresets: [] },
    adventure: { currentStage: 1, clearedStages: [] },
    weapons: { unlockedCount: 0 },
    scheduledWorkouts: [],
  };
}
