// Weapon unlocks: completing a "bonus" workout (Tue/Thu/Fri/Sun, picked manually rather than
// on the fixed Mon/Wed/Sat split) unlocks the next weapon in this fixed order.
window.WT = window.WT || {};

WT.weapons = (function () {
  const ORDER = [
    'Dagger', 'Arming Sword', 'Spear', 'Longsword', 'Longbow',
    'Crossbow', 'Mace', 'War Hammer', 'Halberd',
  ];

  // Rough silhouette per weapon, rendered next to the character's hand.
  const ICONS = {
    'Dagger': '🗡',
    'Arming Sword': '⚔',
    'Spear': '➶',
    'Longsword': '🗡',
    'Longbow': '🏹',
    'Crossbow': '🏹',
    'Mace': '🔨',
    'War Hammer': '🔨',
    'Halberd': '⚔',
  };

  function unlockedCount() {
    return WT.storage.getWeapons().unlockedCount || 0;
  }

  function currentWeapon() {
    const n = unlockedCount();
    return n > 0 ? ORDER[n - 1] : null;
  }

  function currentIcon() {
    const w = currentWeapon();
    return w ? ICONS[w] : null;
  }

  function unlockNext() {
    const w = WT.storage.getWeapons();
    if (w.unlockedCount >= ORDER.length) return null;
    w.unlockedCount += 1;
    WT.storage.setWeapons(w);
    return ORDER[w.unlockedCount - 1];
  }

  function allStatus() {
    const n = unlockedCount();
    return ORDER.map((name, i) => ({ name, icon: ICONS[name], unlocked: i < n }));
  }

  return { ORDER, ICONS, unlockedCount, currentWeapon, currentIcon, unlockNext, allStatus };
})();
