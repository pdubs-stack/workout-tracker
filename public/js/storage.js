// Storage layer: backed by /api/state (Vercel Blob) instead of localStorage.
//
// The rest of the app (gamification.js, workout.js, weight.js, calendar.js) calls
// WT.storage.getX()/setX() synchronously, exactly like the old localStorage version did.
// To keep that surface unchanged, the whole state document is fetched once on init() and
// kept in memory; get() reads from memory (sync), set() writes to memory (sync) and kicks
// off a debounced PUT back to the server (async, in the background).
window.WT = window.WT || {};

WT.storage = (function () {
  const KEYS = [
    'workoutLog',
    'currentWorkout',
    'rotation',
    'characterStats',
    'armor',
    'weightLog',
    'exerciseBests',
    'prHistory',
    'meta',
  ];

  let state = null;
  let dirty = false;
  let saveTimer = null;
  let statusListener = null;

  function defaults() {
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
    };
  }

  function setStatus(s) {
    if (statusListener) statusListener(s);
  }

  async function init() {
    setStatus('loading');
    let loaded = null;
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok) loaded = await res.json();
    } catch (e) {
      console.warn('WT.storage: failed to load state, starting from defaults', e);
    }

    const d = defaults();
    state = loaded && typeof loaded === 'object' ? loaded : d;
    // Fill in any keys missing from an older/partial saved document.
    KEYS.forEach((k) => {
      if (state[k] === undefined) state[k] = d[k];
    });
    setStatus('idle');
  }

  function scheduleSave() {
    dirty = true;
    setStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 600);
  }

  async function flush() {
    if (!dirty || !state) return;
    dirty = false;
    try {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        keepalive: true,
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Save failed: ' + res.status);
      setStatus('saved');
    } catch (e) {
      console.warn('WT.storage: save failed, will retry on next change', e);
      dirty = true;
      setStatus('error');
    }
  }

  function read(key) {
    return state ? state[key] : undefined;
  }

  function write(key, value) {
    if (!state) return;
    state[key] = value;
    scheduleSave();
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const api = { KEYS };
  KEYS.forEach((k) => {
    api['get' + capitalize(k)] = () => read(k);
    api['set' + capitalize(k)] = (v) => write(k, v);
  });

  api.init = init;
  api.flushNow = flush;
  api.onStatusChange = (fn) => {
    statusListener = fn;
  };
  api.isReady = () => state !== null;

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (dirty) flush();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && dirty) flush();
    });
  }

  return api;
})();
