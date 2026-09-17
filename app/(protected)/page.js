'use client';

import { useEffect } from 'react';

// The vanilla-JS game logic (public/js/*) manipulates this page's DOM directly (innerHTML,
// classList) rather than through React. Loading those scripts from useEffect -- instead of
// as plain <script defer> tags in the JSX -- guarantees they only ever run *after* React's
// hydration commit finishes, so there's no race where a script mutates a container before
// React finishes comparing server/client markup for it (which otherwise triggers a fatal
// hydration mismatch and wipes the mutation out).
const SCRIPTS = [
  '/js/storage.js',
  '/js/exercises.js',
  '/js/rotation.js',
  '/js/gamification.js',
  '/js/workout.js',
  '/js/weight.js',
  '/js/calendar.js',
  '/js/character.js',
  '/js/ui.js',
  '/js/app.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(el);
  });
}

export default function HomePage() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of SCRIPTS) {
        if (cancelled) return;
        await loadScript(src);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div id="loading-overlay" className="wt-loading-overlay">
        <div className="wt-loading-text">⚔ Loading your quest log...</div>
      </div>

      <div id="toast-container" className="wt-toast-container"></div>

      <header className="wt-header">
        <div className="wt-header-inner">
          <h1 className="wt-title">⚔ Questlog: Iron &amp; Ink</h1>
          <div className="wt-header-right">
            <span id="save-status" className="wt-save-status"></span>
            <nav className="wt-nav">
              <button className="wt-nav-btn active" data-tab="home">Home</button>
              <button className="wt-nav-btn" data-tab="calendar">Calendar</button>
              <button className="wt-nav-btn" data-tab="quests">Quests &amp; Armor</button>
              <button className="wt-nav-btn" data-tab="weight">Weight</button>
            </nav>
            <button id="logout-btn" className="wt-btn wt-btn-ghost wt-logout-btn" type="button">
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="wt-main">
        <section id="tab-home" className="wt-tab active"></section>
        <section id="tab-calendar" className="wt-tab"></section>
        <section id="tab-quests" className="wt-tab"></section>
        <section id="tab-weight" className="wt-tab"></section>
      </main>

      <div id="modal-root"></div>
    </>
  );
}
