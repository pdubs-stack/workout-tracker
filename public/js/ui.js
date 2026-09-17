// All DOM rendering for the four tabs, plus toasts, modals, loading overlay, and save status.
window.WT = window.WT || {};

WT.ui = (function () {
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function fmtDate(iso) {
    // Date-only strings ("2026-09-17") are parsed as UTC per spec, which shifts the displayed
    // day backward in timezones behind UTC. Parse those manually as local-time instead.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(...iso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))
      : new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ---------------- Loading / Save status ----------------
  function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('show');
  }
  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  const STATUS_LABELS = {
    loading: '⏳ Loading...',
    idle: '',
    saving: '💾 Saving...',
    saved: '✅ Saved',
    error: '⚠ Save failed — retrying',
  };
  let savedClearTimer = null;
  function setSaveStatus(status) {
    const badge = document.getElementById('save-status');
    if (!badge) return;
    badge.textContent = STATUS_LABELS[status] || '';
    badge.className = 'wt-save-status wt-save-status-' + status;
    clearTimeout(savedClearTimer);
    if (status === 'saved') {
      savedClearTimer = setTimeout(() => {
        badge.textContent = '';
      }, 2500);
    }
  }

  // ---------------- Toasts ----------------
  function toast(message, kind) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const node = el(`<div class="wt-toast wt-toast-${kind || 'info'}">${message}</div>`);
    container.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 300);
    }, 4200);
  }

  function announceCompletion(result) {
    toast(`Quest complete! +${result.xpGained} XP`, 'success');
    if (result.leveledUp) toast(`🎉 Level up! You are now Level ${result.newLevel}.`, 'level');
    result.prs.forEach((pr) => toast(`💪 New PR: ${pr.exercise}!`, 'pr'));
    if (result.highVolume) toast(`🔥 Big volume session — Endurance up.`, 'info');
    (result.armorUps || []).forEach((u) => {
      toast(`🛡 ${capitalize(u.piece)} advanced to Tier ${u.tier} (${WT.gamification.TIER_NAMES[u.tier]})!`, 'armor');
    });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------------- HOME ----------------
  function renderHome() {
    const root = document.getElementById('tab-home');
    const stats = WT.storage.getCharacterStats();
    const level = WT.gamification.levelFromXp(stats.xp);
    const xpInto = WT.gamification.xpIntoLevel(stats.xp);
    const staleDays = WT.workout.daysSinceDraftCreated();
    const tired = staleDays >= 4;
    const streak = WT.gamification.attendanceStreak();

    const current = WT.workout.ensureCurrentWorkout();
    const typeLabel = WT.exercises.TYPE_LABELS[current.type];

    root.innerHTML = `
      <div class="wt-grid-home">
        <div class="wt-card wt-character-card">
          ${WT.character.render(tired ? 'tired' : 'normal')}
          <div class="wt-level-badge">Level ${level}</div>
          <div class="wt-xp-bar-track">
            <div class="wt-xp-bar-fill" style="width:${xpInto}%"></div>
          </div>
          <div class="wt-xp-label">${xpInto} / 100 XP</div>
          <div class="wt-stat-row">
            <span class="wt-stat wt-stat-str">STR ${stats.strength}</span>
            <span class="wt-stat wt-stat-end">END ${stats.endurance}</span>
            <span class="wt-stat wt-stat-disc">DISC ${stats.discipline}</span>
          </div>
          <div class="wt-streak">${streak > 0 ? `🔥 ${streak}-week streak` : (tired ? 'Your hero looks a little tired...' : 'No active streak yet — get after it!')}</div>
        </div>

        <div class="wt-card wt-quest-card" id="workout-card">
          <div class="wt-quest-header">
            <h2>Today's Quest: ${typeLabel} Day</h2>
            <button class="wt-btn wt-btn-ghost" id="btn-regenerate">🎲 Reroll All</button>
          </div>
          <p class="wt-quest-summary">${WT.workout.summaryText(current)}</p>
          <div class="wt-exercise-list">
            ${current.exercises.map((ex, i) => renderExerciseRow(ex, i)).join('')}
          </div>
          <label class="wt-notes-label">Session Notes</label>
          <textarea class="wt-notes" id="workout-notes" placeholder="How'd it feel? Anything to remember for next time...">${current.notes || ''}</textarea>
          <button class="wt-btn wt-btn-primary wt-complete-btn" id="btn-complete">✅ Complete Quest</button>
        </div>
      </div>
    `;

    root.querySelector('#btn-regenerate').addEventListener('click', () => {
      WT.workout.regenerate();
      renderHome();
    });
    root.querySelectorAll('.wt-reroll-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        WT.workout.rerollExercise(idx);
        renderHome();
      });
    });
    root.querySelectorAll('.wt-set-input').forEach((input) => {
      input.addEventListener('change', () => {
        const { ex, set, field } = input.dataset;
        WT.workout.updateSet(Number(ex), Number(set), field, input.value);
      });
    });
    root.querySelector('#workout-notes').addEventListener('input', (e) => {
      WT.workout.setNotes(e.target.value);
    });
    root.querySelector('#btn-complete').addEventListener('click', () => {
      const { result } = WT.workout.completeCurrentWorkout();
      announceCompletion(result);
      renderHome();
    });
  }

  function renderExerciseRow(ex, i) {
    const setsHtml = [0, 1, 2].map((s) => {
      const set = ex.sets[s] || {};
      return `
        <div class="wt-set-inputs">
          <span class="wt-set-num">Set ${s + 1}</span>
          <input type="number" min="0" step="2.5" class="wt-set-input" placeholder="lbs" data-ex="${i}" data-set="${s}" data-field="weight" value="${set.weight ?? ''}">
          <span class="wt-x">×</span>
          <input type="number" min="0" class="wt-set-input" placeholder="reps" data-ex="${i}" data-set="${s}" data-field="reps" value="${set.reps ?? ''}">
        </div>
      `;
    }).join('');

    return `
      <div class="wt-exercise-card">
        <div class="wt-exercise-top">
          <div>
            <div class="wt-exercise-name">${ex.name}</div>
            <div class="wt-exercise-tags">${ex.tags.join(' · ')}</div>
          </div>
          <button class="wt-reroll-btn" data-idx="${i}" title="Reroll this exercise">🎲</button>
        </div>
        <div class="wt-exercise-target">Target: ${ex.targetSets} × ${ex.repsMin}-${ex.repsMax}</div>
        <div class="wt-sets">${setsHtml}</div>
      </div>
    `;
  }

  // ---------------- CALENDAR ----------------
  function renderCalendar() {
    const root = document.getElementById('tab-calendar');
    drawCalendar(root);
  }

  function drawCalendar(root) {
    const cells = WT.calendar.buildGrid();
    const typeClass = { push: 'wt-day-push', pull: 'wt-day-pull', legs: 'wt-day-legs' };
    const weekdayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    root.innerHTML = `
      <div class="wt-card">
        <div class="wt-calendar-header">
          <button class="wt-btn wt-btn-ghost" id="cal-prev">◀</button>
          <h2>${WT.calendar.monthLabel()}</h2>
          <button class="wt-btn wt-btn-ghost" id="cal-next" ${WT.calendar.canGoForward() ? '' : 'disabled'}>▶</button>
        </div>
        <div class="wt-calendar-grid wt-calendar-weekdays">
          ${weekdayNames.map((w) => `<div class="wt-weekday">${w}</div>`).join('')}
        </div>
        <div class="wt-calendar-grid">
          ${cells.map((c) => {
            if (!c) return `<div class="wt-cal-cell wt-cal-empty"></div>`;
            const hasWorkouts = c.workouts.length > 0;
            const dots = c.workouts.map((w) => `<span class="wt-cal-dot ${typeClass[w.type]}"></span>`).join('');
            return `<div class="wt-cal-cell ${hasWorkouts ? 'wt-cal-has-workout' : ''}" data-day="${c.day}">
              <span class="wt-cal-daynum">${c.day}</span>
              <div class="wt-cal-dots">${dots}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="wt-legend">
          <span><span class="wt-cal-dot wt-day-push"></span> Push</span>
          <span><span class="wt-cal-dot wt-day-pull"></span> Pull</span>
          <span><span class="wt-cal-dot wt-day-legs"></span> Legs</span>
        </div>
      </div>
    `;

    root.querySelector('#cal-prev').addEventListener('click', () => { WT.calendar.goPrev(); drawCalendar(root); });
    root.querySelector('#cal-next').addEventListener('click', () => { WT.calendar.goNext(); drawCalendar(root); });
    root.querySelectorAll('.wt-cal-has-workout').forEach((cellEl) => {
      cellEl.addEventListener('click', () => {
        const day = Number(cellEl.dataset.day);
        const cell = cells.find((c) => c && c.day === day);
        openDayModal(cell.workouts);
      });
    });
  }

  function openDayModal(workouts) {
    const modalRoot = document.getElementById('modal-root');
    const body = workouts.map((w) => `
      <div class="wt-modal-workout">
        <h3>${capitalize(w.type)} Day — ${fmtDate(w.date)}</h3>
        <ul class="wt-modal-exlist">
          ${w.exercises.map((ex) => `
            <li>
              <strong>${ex.name}</strong>
              ${ex.sets.filter(s => s && (s.weight || s.reps)).map((s) => `${s.weight ?? '-'}lb × ${s.reps ?? '-'}`).join(', ') || '<em>no sets logged</em>'}
            </li>
          `).join('')}
        </ul>
        ${w.notes ? `<p class="wt-modal-notes">"${escapeHtml(w.notes)}"</p>` : ''}
        <p class="wt-modal-volume">Total volume: ${Math.round(w.volume || 0)} lbs</p>
      </div>
    `).join('<hr>');

    modalRoot.innerHTML = `
      <div class="wt-modal-overlay" id="modal-overlay">
        <div class="wt-modal">
          <button class="wt-modal-close" id="modal-close">✕</button>
          ${body}
        </div>
      </div>
    `;
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('modal-close').addEventListener('click', closeModal);
  }

  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ---------------- QUESTS & ARMOR ----------------
  function renderQuests() {
    const root = document.getElementById('tab-quests');
    const sideQuests = WT.gamification.sideQuestStatus();
    const armor = WT.gamification.allArmorStatus();

    root.innerHTML = `
      <div class="wt-section">
        <h2 class="wt-section-title">📜 Side Quests</h2>
        <div class="wt-card-grid">
          ${sideQuests.map((q) => `
            <div class="wt-card wt-sidequest-card ${q.complete ? 'wt-quest-complete' : ''}">
              <div class="wt-sidequest-status">${q.complete ? '✅' : '🔒'}</div>
              <h3>${q.title}</h3>
              <p class="wt-sidequest-challenge">${q.challenge}</p>
              <p class="wt-sidequest-reward">Reward: ${q.reward} <span class="wt-bonus">${describeBonus(q.bonus)}</span></p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="wt-section">
        <h2 class="wt-section-title">🛡 Armor Progression</h2>
        <div class="wt-card-grid">
          ${armor.map((a) => `
            <div class="wt-card wt-armor-card">
              <div class="wt-armor-swatch" style="background:${a.color || '#d8c9a3'}"></div>
              <h3>${capitalize(a.piece)}</h3>
              <p class="wt-armor-tier">${a.tier > 0 ? `Tier ${a.tier} — ${a.tierName}` : 'Unequipped'}</p>
              ${a.maxed
                ? `<p class="wt-armor-maxed">⭐ Maxed out at Obsidian!</p>`
                : `
                  <div class="wt-armor-next">
                    <p class="wt-armor-next-label">Next: Tier ${a.next.tier} — ${a.next.tierName}</p>
                    <p class="wt-armor-cond ${a.next.unlockMet ? 'wt-met' : ''}">${a.next.unlockMet ? '✓' : '•'} ${a.next.unlockLabel}</p>
                    <p class="wt-armor-cond ${a.next.challengeMet ? 'wt-met' : ''}">${a.next.challengeMet ? '✓' : '•'} ${a.next.challengeLabel}</p>
                    <p class="wt-bonus">Reward: ${describeBonus(a.next.bonus)}</p>
                  </div>
                `
              }
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function describeBonus(bonus) {
    const parts = [];
    if (bonus.strength) parts.push(`+${bonus.strength} Strength`);
    if (bonus.endurance) parts.push(`+${bonus.endurance} Endurance`);
    if (bonus.discipline) parts.push(`+${bonus.discipline} Discipline`);
    return parts.join(', ');
  }

  // ---------------- WEIGHT ----------------
  function renderWeight() {
    const root = document.getElementById('tab-weight');
    const log = WT.weight.sortedLog();
    const rate = WT.weight.ratePerWeek();
    const trend = WT.weight.trendState(rate);
    const projected = WT.weight.projectedGoalDate();
    const current = WT.weight.currentWeight();

    root.innerHTML = `
      <div class="wt-grid-weight">
        <div class="wt-card">
          <h2 class="wt-section-title">⚖ Log a Weigh-In</h2>
          <form id="weight-form" class="wt-weight-form">
            <label>Date <input type="date" id="weight-date" value="${new Date().toISOString().slice(0, 10)}" required></label>
            <label>Weight (lbs) <input type="number" id="weight-value" step="0.1" min="0" required></label>
            <button type="submit" class="wt-btn wt-btn-primary">Add Entry</button>
          </form>

          <h3 class="wt-subheading">History</h3>
          <ul class="wt-weight-list">
            ${log.slice().reverse().map((e, idxFromEnd) => {
              const realIdx = log.length - 1 - idxFromEnd;
              return `<li>${fmtDate(e.date)} — <strong>${e.weight} lbs</strong>
                <button class="wt-mini-btn" data-idx="${realIdx}">✕</button></li>`;
            }).join('') || '<li class="wt-empty">No entries yet — add your first weigh-in!</li>'}
          </ul>
        </div>

        <div class="wt-card">
          <h2 class="wt-section-title">📈 Progress to Goal (${WT.weight.GOAL_WEIGHT} lbs)</h2>
          <div class="wt-trend-badge" style="background:${trend.color}">${trend.label}</div>
          <p class="wt-trend-detail">
            ${current !== null ? `Current: <strong>${current} lbs</strong>. ` : ''}
            ${rate !== null ? `Trending <strong>${rate >= 0 ? '+' : ''}${rate.toFixed(2)} lbs/week</strong>.` : 'Log a couple more entries to see your trend.'}
          </p>
          <p class="wt-trend-detail">
            ${projected ? `Projected goal date: <strong>${fmtDate(projected.toISOString())}</strong>` : (rate !== null && rate <= 0 ? 'Not currently trending toward goal.' : '')}
          </p>
          <div class="wt-chart-wrap">${renderChart(log)}</div>
        </div>
      </div>
    `;

    root.querySelector('#weight-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const date = root.querySelector('#weight-date').value;
      const value = root.querySelector('#weight-value').value;
      if (!date || !value) return;
      WT.weight.addEntry(date, value);
      renderWeight();
    });
    root.querySelectorAll('.wt-mini-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        WT.weight.deleteEntry(Number(btn.dataset.idx));
        renderWeight();
      });
    });
  }

  function renderChart(log) {
    if (log.length < 2) {
      return `<div class="wt-chart-empty">Add at least two weigh-ins to see your trend line.</div>`;
    }
    const w = 560, h = 220, pad = 36;
    const weights = log.map((e) => e.weight);
    const minW = Math.min(...weights, WT.weight.GOAL_WEIGHT) - 3;
    const maxW = Math.max(...weights, WT.weight.GOAL_WEIGHT) + 3;
    const dates = log.map((e) => new Date(e.date).getTime());
    const minD = Math.min(...dates), maxD = Math.max(...dates);
    const spanD = Math.max(maxD - minD, 1);

    const x = (d) => pad + ((d - minD) / spanD) * (w - pad * 2);
    const y = (val) => h - pad - ((val - minW) / (maxW - minW)) * (h - pad * 2);

    const points = log.map((e) => `${x(new Date(e.date).getTime())},${y(e.weight)}`).join(' ');
    const goalY = y(WT.weight.GOAL_WEIGHT);

    const dots = log.map((e) => `<circle cx="${x(new Date(e.date).getTime())}" cy="${y(e.weight)}" r="4" fill="#4C9A5B" stroke="#4A3620" stroke-width="1"/>`).join('');

    return `
      <svg viewBox="0 0 ${w} ${h}" class="wt-chart-svg">
        <line x1="${pad}" y1="${goalY}" x2="${w - pad}" y2="${goalY}" stroke="#E8A93C" stroke-width="2" stroke-dasharray="6,4" />
        <text x="${w - pad}" y="${goalY - 6}" text-anchor="end" class="wt-chart-goal-label">Goal: ${WT.weight.GOAL_WEIGHT} lbs</text>
        <polyline points="${points}" fill="none" stroke="#4FA8D8" stroke-width="3" />
        ${dots}
      </svg>
    `;
  }

  return {
    renderHome, renderCalendar, renderQuests, renderWeight,
    toast, closeModal, showLoading, hideLoading, setSaveStatus,
  };
})();
