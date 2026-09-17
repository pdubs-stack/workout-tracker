// Pixel-art character rendering, built from CSS grid "pixels" rather than image assets,
// so armor tiers and weapons can recolor/appear live without needing hand-drawn sprites.
window.WT = window.WT || {};

WT.character = (function () {
  // Rough per-weapon color + size, drawn as a simple bar/blade near the right hand.
  const WEAPON_STYLE = {
    'Dagger': { color: '#b7bfc6', h: 3 },
    'Arming Sword': { color: '#c9d2da', h: 5 },
    'Spear': { color: '#8a6a4a', h: 7, tip: '#c9d2da' },
    'Longsword': { color: '#d7dee4', h: 7 },
    'Longbow': { color: '#8a6a4a', h: 6, bow: true },
    'Crossbow': { color: '#6b5138', h: 5, bow: true },
    'Mace': { color: '#8a8a8a', h: 5, head: true },
    'War Hammer': { color: '#7a7a7a', h: 5, head: true },
    'Halberd': { color: '#8a6a4a', h: 8, tip: '#c9d2da' },
  };

  function render(mood) {
    const armor = WT.storage.getArmor();
    const tired = mood === 'tired';
    const colorFor = (piece) => WT.gamification.ARMOR_COLORS[armor[piece].tier] || null;

    const helmetColor = colorFor('helmet');
    const chestColor = colorFor('chestplate');
    const gauntletColor = colorFor('gauntlets');
    const bootColor = colorFor('boots');
    const capeColor = colorFor('cape');

    const capeHtml = capeColor
      ? `<div class="wt-px wt-cape" style="background:${capeColor}"></div>`
      : '';

    const eyeState = tired ? 'wt-eyes-tired' : 'wt-eyes-normal';
    const weaponHtml = weaponMarkup();

    return `
      <div class="wt-sprite ${tired ? 'wt-tired' : ''}">
        ${capeHtml}
        <div class="wt-px wt-hair-back"></div>
        <div class="wt-px wt-hair" style="${helmetColor ? `background:${helmetColor}` : ''}"></div>
        <div class="wt-px wt-face"></div>
        <div class="wt-px wt-brow-l"></div>
        <div class="wt-px wt-brow-r"></div>
        <div class="wt-px ${eyeState}"></div>
        <div class="wt-px wt-mouth"></div>
        <div class="wt-px wt-neck"></div>
        <div class="wt-px wt-torso" style="${chestColor ? `background:${chestColor}` : ''}"></div>
        <div class="wt-px wt-emblem"></div>
        <div class="wt-px wt-belt"></div>
        <div class="wt-px wt-arm-left" style="${gauntletColor ? `background:${gauntletColor}` : ''}"></div>
        <div class="wt-px wt-arm-right" style="${gauntletColor ? `background:${gauntletColor}` : ''}"></div>
        <div class="wt-px wt-hand-left"></div>
        <div class="wt-px wt-hand-right"></div>
        <div class="wt-px wt-leg-left"></div>
        <div class="wt-px wt-leg-right"></div>
        <div class="wt-px wt-knee-l"></div>
        <div class="wt-px wt-knee-r"></div>
        <div class="wt-px wt-foot-left" style="${bootColor ? `background:${bootColor}` : ''}"></div>
        <div class="wt-px wt-foot-right" style="${bootColor ? `background:${bootColor}` : ''}"></div>
        <div class="wt-px wt-boot-shine-l"></div>
        <div class="wt-px wt-boot-shine-r"></div>
        ${weaponHtml}
      </div>
    `;
  }

  function weaponMarkup() {
    const name = WT.weapons ? WT.weapons.currentWeapon() : null;
    if (!name) return '';
    const style = WEAPON_STYLE[name] || { color: '#c9d2da', h: 5 };
    const bottom = 13;
    const top = bottom - style.h;
    const extra = style.bow
      ? `border-radius: 8px; border: 2px solid ${style.color}; background: transparent;`
      : `background:${style.color}; border-radius: 1px;`;
    return `<div class="wt-px wt-weapon" style="${extra} grid-column: 12 / 13; grid-row: ${top} / ${bottom};" title="${name}"></div>`;
  }

  return { render, WEAPON_STYLE };
})();
