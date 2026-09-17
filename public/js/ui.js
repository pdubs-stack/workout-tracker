// All DOM rendering for the tabs, plus toasts, modals, celebration overlay, theme picker,
// loading overlay, and save status.
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

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
      savedClearTimer = setTimeout(() => { badge.textContent = ''; }, 2500);
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

  // ---------------- Modal ----------------
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function wireModalChrome() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  // ---------------- Quest-complete celebration ----------------
  function celebrateQuestComplete(result) {
    const modalRoot = document.getElementById('modal-root');
    const colors = ['var(--gold)', 'var(--green)', 'var(--blue)', 'var(--red)', 'var(--orange)'];
    const confetti = Array.from({ length: 44 }, () => {
      const left = Math.random() * 100;
      const delay = (Math.random() * 0.5).toFixed(2);
      const dur = (2 + Math.random() * 1.6).toFixed(2);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rot = Math.round(Math.random() * 360);
      const drift = Math.round(Math.random() * 60 - 30);
      return `<span class="wt-confetti-piece" style="left:${left}%; animation-delay:${delay}s; animation-duration:${dur}s; background:${color}; --rot:${rot}deg; --drift:${drift}px;"></span>`;
    }).join('');

    const parts = [`+${result.xpGained} XP`];
    if (result.leveledUp) parts.push(`🎉 Level up! Now Level ${result.newLevel}`);
    if (result.prs && result.prs.length) parts.push(`💪 ${result.prs.length} new PR${result.prs.length > 1 ? 's' : ''}`);
    if (result.armorUps && result.armorUps.length) parts.push(`🛡 ${result.armorUps.length} armor tier-up${result.armorUps.length > 1 ? 's' : ''}`);
    if (result.weaponUnlocked) parts.push(`⚔ Unlocked: ${result.weaponUnlocked}!`);

    modalRoot.innerHTML = `
      <div class="wt-celebrate-overlay" id="celebrate-overlay">
        <div class="wt-confetti-layer">${confetti}</div>
        <div class="wt-trumpet wt-trumpet-left">🎺</div>
        <div class="wt-trumpet wt-trumpet-right">🎺</div>
        <div class="wt-celebrate-card">
          <h2 class="wt-celebrate-title">⚔ Quest Complete!</h2>
          <p class="wt-celebrate-summary">${parts.join(' &bull; ')}</p>
          <div class="wt-celebrate-actions">
            <button class="wt-btn wt-btn-primary" id="cel-continue">Continue Adventure</button>
            <button class="wt-btn wt-btn-ghost" id="cel-quests">Check Side Quests</button>
            <button class="wt-btn wt-btn-ghost" id="cel-quit">Quit</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('cel-continue').addEventListener('click', () => { closeModal(); WT.app.goToTab('adventure'); });
    document.getElementById('cel-quests').addEventListener('click', () => { closeModal(); WT.app.goToTab('quests'); });
    document.getElementById('cel-quit').addEventListener('click', () => { closeModal(); WT.app.goToTab('home'); });
  }

  // ---------------- HOME ----------------
  function characterCardHtml(tired) {
    const stats = WT.storage.getCharacterStats();
    const level = WT.gamification.levelFromXp(stats.xp);
    const xpInto = WT.gamification.xpIntoLevel(stats.xp);
    const streak = WT.gamification.attendanceStreak();
    const weapon = WT.weapons.currentWeapon();

    return `
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
        ${weapon ? `<div class="wt-weapon-equipped">${WT.weapons.currentIcon()} Wielding: ${weapon}</div>` : ''}
        <div class="wt-streak">${streak > 0 ? `🔥 ${streak}-week streak` : (tired ? 'Your hero looks a little tired...' : 'No active streak yet — get after it!')}</div>
      </div>
    `;
  }

  function renderHome() {
    const root = document.getElementById('tab-home');
    const staleDays = WT.workout.daysSinceDraftCreated();
    const tired = staleDays >= 4;
    const current = WT.workout.ensureCurrentWorkout();

    if (!current) {
      root.innerHTML = `
        <div class="wt-grid-home">
          ${characterCardHtml(tired)}
          <div class="wt-card wt-quest-card">
            <h2>Bonus Day</h2>
            <p class="wt-quest-summary">No fixed workout today — pick a muscle group to train. Finishing it unlocks your next weapon!</p>
            <div class="wt-picker-row">
              <button class="wt-btn wt-btn-primary wt-picker-btn" data-type="push">💪 Push</button>
              <button class="wt-btn wt-btn-primary wt-picker-btn" data-type="pull">🏋 Pull</button>
              <button class="wt-btn wt-btn-primary wt-picker-btn" data-type="legs">🦵 Legs</button>
            </div>
          </div>
        </div>
      `;
      root.querySelectorAll('.wt-picker-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          WT.workout.startBonusWorkout(btn.dataset.type);
          renderHome();
        });
      });
      return;
    }

    const typeLabel = WT.exercises.TYPE_LABELS[current.type];
    const dayTitle = current.bonus ? `Bonus Quest: ${typeLabel} Day` : `Today's Quest: ${typeLabel} Day`;

    root.innerHTML = `
      <div class="wt-grid-home">
        ${characterCardHtml(tired)}
        <div class="wt-card wt-quest-card" id="workout-card">
          <div class="wt-quest-header">
            <h2>${dayTitle}</h2>
            <button class="wt-btn wt-btn-ghost" id="btn-regenerate">🎲 Reroll All</button>
          </div>
          ${current.bonus ? '<p class="wt-bonus-note">⚔ Finishing this unlocks your next weapon.</p>' : ''}
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
      celebrateQuestComplete(result);
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
          <button class="wt-btn wt-btn-ghost" id="cal-next">▶</button>
          <button class="wt-btn wt-btn-primary wt-add-workout-btn" id="cal-add-workout">+ Add Workout</button>
        </div>
        <div class="wt-calendar-grid wt-calendar-weekdays">
          ${weekdayNames.map((w) => `<div class="wt-weekday">${w}</div>`).join('')}
        </div>
        <div class="wt-calendar-grid">
          ${cells.map((c) => {
            if (!c) return `<div class="wt-cal-cell wt-cal-empty"></div>`;
            const hasWorkouts = c.workouts.length > 0;
            const dots = c.workouts.map((w) => `<span class="wt-cal-dot ${typeClass[w.type]} ${w.bonus ? 'wt-cal-dot-bonus' : ''}"></span>`).join('');
            const scheduledDot = (!hasWorkouts && c.scheduled) ? `<span class="wt-cal-dot wt-cal-dot-scheduled ${typeClass[c.scheduled.type]}"></span>` : '';
            const isScheduledOnly = !!c.scheduled && !hasWorkouts;
            return `<div class="wt-cal-cell ${hasWorkouts ? 'wt-cal-has-workout' : ''} ${isScheduledOnly ? 'wt-cal-scheduled' : ''}" data-day="${c.day}">
              <span class="wt-cal-daynum">${c.day}</span>
              <div class="wt-cal-dots">${dots}${scheduledDot}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="wt-legend">
          <span><span class="wt-cal-dot wt-day-push"></span> Push</span>
          <span><span class="wt-cal-dot wt-day-pull"></span> Pull</span>
          <span><span class="wt-cal-dot wt-day-legs"></span> Legs</span>
          <span><span class="wt-cal-dot wt-cal-dot-scheduled wt-day-push"></span> Scheduled</span>
        </div>
      </div>
    `;

    root.querySelector('#cal-prev').addEventListener('click', () => { WT.calendar.goPrev(); drawCalendar(root); });
    root.querySelector('#cal-next').addEventListener('click', () => { WT.calendar.goNext(); drawCalendar(root); });
    root.querySelector('#cal-add-workout').addEventListener('click', openAddWorkoutModal);
    root.querySelectorAll('.wt-cal-has-workout').forEach((cellEl) => {
      cellEl.addEventListener('click', () => {
        const day = Number(cellEl.dataset.day);
        const cell = cells.find((c) => c && c.day === day);
        openDayModal(cell.workouts);
      });
    });
    root.querySelectorAll('.wt-cal-scheduled').forEach((cellEl) => {
      cellEl.addEventListener('click', () => {
        const day = Number(cellEl.dataset.day);
        const cell = cells.find((c) => c && c.day === day);
        if (!cell || !cell.scheduled) return;
        const label = WT.exercises.TYPE_LABELS[cell.scheduled.type];
        if (window.confirm(`Cancel this scheduled ${label} workout for ${fmtDate(cell.dateStr)}?`)) {
          WT.workout.removeScheduledWorkout(cell.dateStr);
          drawCalendar(root);
        }
      });
    });
  }

  function openDayModal(workouts) {
    const modalRoot = document.getElementById('modal-root');
    const body = workouts.map((w) => `
      <div class="wt-modal-workout">
        <h3>${capitalize(w.type)} Day${w.bonus ? ' (Bonus)' : ''} — ${fmtDate(w.date)}</h3>
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
    wireModalChrome();
  }

  function openAddWorkoutModal() {
    const modalRoot = document.getElementById('modal-root');
    const todayStr = WT.workout.dateKey(new Date());
    modalRoot.innerHTML = `
      <div class="wt-modal-overlay" id="modal-overlay">
        <div class="wt-modal">
          <button class="wt-modal-close" id="modal-close">✕</button>
          <h3>📅 Add a Bonus Workout</h3>
          <p class="wt-modal-hint">Pick a future Tuesday, Thursday, Friday, or Sunday to pre-schedule a workout. It counts as a bonus day and unlocks your next weapon when completed.</p>
          <form id="add-workout-form" class="wt-weight-form">
            <label>Date <input type="date" id="aw-date" min="${todayStr}" required></label>
            <label>Muscle Group
              <select id="aw-type">
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
              </select>
            </label>
            <p class="wt-login-error" id="aw-error" style="display:none;"></p>
            <button type="submit" class="wt-btn wt-btn-primary">Schedule It</button>
          </form>
        </div>
      </div>
    `;
    wireModalChrome();
    document.getElementById('add-workout-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const dateVal = document.getElementById('aw-date').value;
      const type = document.getElementById('aw-type').value;
      const errorEl = document.getElementById('aw-error');
      if (!dateVal) return;
      const [y, m, d] = dateVal.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const fixed = WT.rotation.fixedTypeFor(dObj);
      if (fixed) {
        errorEl.textContent = `That day already has a fixed ${WT.exercises.TYPE_LABELS[fixed]} workout.`;
        errorEl.style.display = 'block';
        return;
      }
      if (dateVal < todayStr) {
        errorEl.textContent = 'Pick a date today or in the future.';
        errorEl.style.display = 'block';
        return;
      }
      WT.workout.scheduleWorkout(dateVal, type);
      closeModal();
      renderCalendar();
      toast(`Scheduled a ${WT.exercises.TYPE_LABELS[type]} bonus workout for ${fmtDate(dateVal)}`, 'success');
    });
  }

  // ---------------- QUESTS & ARMOR ----------------
  function renderQuests() {
    const root = document.getElementById('tab-quests');
    const sideQuests = WT.gamification.sideQuestStatus();
    const armor = WT.gamification.allArmorStatus();
    const weapons = WT.weapons.allStatus();

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

      <div class="wt-section">
        <h2 class="wt-section-title">⚔ Armory</h2>
        <p class="wt-weapon-hint">Complete a bonus workout (Tue/Thu/Fri/Sun) to unlock the next weapon.</p>
        <div class="wt-weapon-row">
          ${weapons.map((w) => `
            <div class="wt-weapon-chip ${w.unlocked ? 'wt-weapon-unlocked' : ''}">
              <span class="wt-weapon-icon">${w.unlocked ? w.icon : '🔒'}</span>
              <span>${w.name}</span>
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

  // ---------------- ADVENTURE ----------------
  function renderAdventure() {
    const root = document.getElementById('tab-adventure');
    const stages = WT.adventure.listStages(10);
    const power = WT.adventure.playerPower();

    root.innerHTML = `
      <div class="wt-section">
        <h2 class="wt-section-title">⚔ Adventure</h2>
        <p class="wt-adventure-power">Your power: <strong>${power}</strong> <span class="wt-adventure-power-hint">(Strength + Endurance + Discipline)</span></p>
        <div class="wt-stage-list">
          ${stages.map((s) => `
            <div class="wt-card wt-stage-card ${s.cleared ? 'wt-stage-cleared' : ''} ${!s.unlocked ? 'wt-stage-locked' : ''}">
              <div class="wt-stage-num">Stage ${s.stage}</div>
              <div class="wt-stage-enemy">${s.enemyName}</div>
              <div class="wt-stage-power">Needs ~${s.required} power</div>
              ${s.cleared
                ? '<div class="wt-stage-status wt-stage-status-cleared">✅ Cleared</div>'
                : s.unlocked
                  ? `<button class="wt-btn wt-btn-primary wt-stage-fight-btn" data-stage="${s.stage}">⚔ Fight</button>`
                  : '<div class="wt-stage-status">🔒 Locked</div>'
              }
            </div>
          `).join('')}
        </div>
      </div>
    `;

    root.querySelectorAll('.wt-stage-fight-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stage = Number(btn.dataset.stage);
        const result = WT.adventure.attemptStage(stage);
        showBattleResult(result);
      });
    });
  }

  function showBattleResult(result) {
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
      <div class="wt-modal-overlay" id="modal-overlay">
        <div class="wt-modal wt-battle-modal">
          <button class="wt-modal-close" id="modal-close">✕</button>
          <h3>${result.won ? '🏆 Victory!' : '💀 Defeated'}</h3>
          <div class="wt-battle-log">
            ${result.log.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
          </div>
          ${result.won ? '<p class="wt-battle-reward">+25 XP earned!</p>' : '<p class="wt-battle-hint">Train more and try again.</p>'}
        </div>
      </div>
    `;
    document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') { closeModal(); renderAdventure(); } });
    document.getElementById('modal-close').addEventListener('click', () => { closeModal(); renderAdventure(); });
  }

  // ---------------- THEME PICKER ----------------
  function openThemePicker() {
    const modalRoot = document.getElementById('modal-root');
    const t = WT.storage.getTheme();
    const customPresets = t.customPresets || [];

    modalRoot.innerHTML = `
      <div class="wt-modal-overlay" id="modal-overlay">
        <div class="wt-modal wt-theme-modal">
          <button class="wt-modal-close" id="modal-close">✕</button>
          <h3>🎨 Choose a Theme</h3>
          <div class="wt-theme-grid">
            ${WT.theme.PRESET_ORDER.map((id) => {
              const p = WT.theme.PRESETS[id];
              const active = t.presetId === id;
              return `<button class="wt-theme-swatch-btn ${active ? 'wt-theme-active' : ''}" data-preset="${id}">
                <span class="wt-theme-swatch" style="background:linear-gradient(135deg, ${p.colors.parchment}, ${p.colors.gold})"></span>
                <span>${p.name}</span>
              </button>`;
            }).join('')}
          </div>

          <h4 class="wt-subheading">Your Custom Themes</h4>
          <div class="wt-theme-grid">
            ${customPresets.map((c) => {
              const pal = WT.theme.paletteFromHue(c.hue);
              const active = t.presetId === 'custom' && t.activeCustomId === c.id;
              return `<button class="wt-theme-swatch-btn ${active ? 'wt-theme-active' : ''}" data-custom="${c.id}">
                <span class="wt-theme-swatch" style="background:linear-gradient(135deg, ${pal.parchment}, ${pal.gold})"></span>
                <span>${escapeHtml(c.name)}</span>
                <span class="wt-theme-delete" data-delete-custom="${c.id}" title="Delete">✕</span>
              </button>`;
            }).join('') || '<p class="wt-empty">None yet — make one below!</p>'}
          </div>

          <h4 class="wt-subheading">Make a Custom Theme</h4>
          <div class="wt-hue-picker-row">
            <div class="wt-hue-wheel" id="hue-wheel">
              <div class="wt-hue-pointer" id="hue-pointer"></div>
            </div>
            <div class="wt-hue-preview-card" id="hue-preview"></div>
          </div>
          <div class="wt-hue-save-row">
            <input type="text" id="hue-name" placeholder="Name this theme..." maxlength="24">
            <button class="wt-btn wt-btn-primary" id="hue-save-btn">Save Preset</button>
          </div>
        </div>
      </div>
    `;
    wireModalChrome();

    let selectedHue = 40;
    const wheel = document.getElementById('hue-wheel');
    const pointer = document.getElementById('hue-pointer');
    const preview = document.getElementById('hue-preview');

    function updatePreview(hue) {
      const pal = WT.theme.paletteFromHue(hue);
      preview.style.background = pal.parchment;
      preview.style.borderColor = pal['card-border'];
      preview.innerHTML = `
        <span class="wt-hue-preview-swatch" style="background:${pal.gold}"></span>
        <span class="wt-hue-preview-swatch" style="background:${pal.green}"></span>
        <span class="wt-hue-preview-swatch" style="background:${pal.blue}"></span>
        <span class="wt-hue-preview-swatch" style="background:${pal.red}"></span>
      `;
      const rad = (hue * Math.PI) / 180;
      const r = 42;
      pointer.style.left = 50 + r * Math.sin(rad) + '%';
      pointer.style.top = 50 - r * Math.cos(rad) + '%';
    }

    function pickFromEvent(e) {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      let theta = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (theta < 0) theta += 360;
      selectedHue = theta;
      updatePreview(selectedHue);
    }

    wheel.addEventListener('click', pickFromEvent);
    updatePreview(selectedHue);

    document.getElementById('hue-save-btn').addEventListener('click', () => {
      const name = document.getElementById('hue-name').value.trim() || 'Custom';
      WT.theme.saveCustomPreset(name, selectedHue);
      toast(`Saved "${name}" theme`, 'success');
      openThemePicker();
    });

    modalRoot.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-custom]')) return;
        WT.theme.selectPreset(btn.dataset.preset);
        openThemePicker();
      });
    });
    modalRoot.querySelectorAll('[data-custom]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-custom]')) return;
        WT.theme.selectCustom(btn.dataset.custom);
        openThemePicker();
      });
    });
    modalRoot.querySelectorAll('[data-delete-custom]').forEach((el2) => {
      el2.addEventListener('click', (e) => {
        e.stopPropagation();
        WT.theme.deleteCustomPreset(el2.dataset.deleteCustom);
        openThemePicker();
      });
    });
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
    renderHome, renderCalendar, renderQuests, renderAdventure, renderWeight,
    toast, closeModal, showLoading, hideLoading, setSaveStatus,
    celebrateQuestComplete, openThemePicker, openAddWorkoutModal,
  };
})();
