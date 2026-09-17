// Pixel-art character rendering, built from CSS grid "pixels" rather than image assets,
// so armor tiers can recolor pieces live without needing 30 hand-drawn sprites.
window.WT = window.WT || {};

WT.character = (function () {
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

    return `
      <div class="wt-sprite ${tired ? 'wt-tired' : ''}">
        ${capeHtml}
        <div class="wt-px wt-hair" style="${helmetColor ? `background:${helmetColor}` : ''}"></div>
        <div class="wt-px wt-face"></div>
        <div class="wt-px ${eyeState}"></div>
        <div class="wt-px wt-torso" style="${chestColor ? `background:${chestColor}` : ''}"></div>
        <div class="wt-px wt-arm-left" style="${gauntletColor ? `background:${gauntletColor}` : ''}"></div>
        <div class="wt-px wt-arm-right" style="${gauntletColor ? `background:${gauntletColor}` : ''}"></div>
        <div class="wt-px wt-legs"></div>
        <div class="wt-px wt-foot-left" style="${bootColor ? `background:${bootColor}` : ''}"></div>
        <div class="wt-px wt-foot-right" style="${bootColor ? `background:${bootColor}` : ''}"></div>
      </div>
    `;
  }

  return { render };
})();
