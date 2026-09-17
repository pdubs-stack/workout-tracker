// Rolling Push -> Pull -> Legs sequence, advanced by completed workouts (not calendar days).
window.WT = window.WT || {};

WT.rotation = (function () {
  const ORDER = ['push', 'pull', 'legs'];

  function nextAfter(type) {
    const idx = ORDER.indexOf(type);
    return ORDER[(idx + 1) % ORDER.length];
  }

  function getNextType() {
    return WT.storage.getRotation().nextType;
  }

  function advance(completedType) {
    WT.storage.setRotation({ nextType: nextAfter(completedType) });
  }

  return { ORDER, getNextType, advance, nextAfter };
})();
