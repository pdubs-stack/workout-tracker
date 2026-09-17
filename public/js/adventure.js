// Adventure mode: a sequential gauntlet of enemies. Each stage's difficulty is pinned to
// the same stat pace the rest of the game already grows at (~10-14 combined STR+END+DISC
// per completed workout), so a stage is roughly winnable by the time a consistent player
// would naturally reach it, and effectively unbeatable if they're well behind schedule --
// no separate "unlock requirement" needed beyond having beaten the stage before it.
window.WT = window.WT || {};

WT.adventure = (function () {
  const ENEMY_NAMES = [
    'Goblin', 'Wolf', 'Bandit', 'Skeleton', 'Orc', 'Giant Rat', 'Dark Cultist', 'Troll',
    'Wraith', 'Ogre', 'Bandit Chief', 'Swamp Hag', 'Orc Warlord', 'Stone Golem',
    'Vampire Bat Swarm', 'Dread Knight', 'Basilisk', 'Elder Troll', 'Lich', 'Dragon',
  ];
  const TIER_PREFIXES = ['', 'Elite ', 'Ancient ', 'Legendary '];

  const POWER_PER_STAGE = 30;

  function requiredPower(stage) {
    return POWER_PER_STAGE * stage;
  }

  function enemyNameFor(stage) {
    const tier = Math.floor((stage - 1) / ENEMY_NAMES.length);
    const base = ENEMY_NAMES[(stage - 1) % ENEMY_NAMES.length];
    const prefix = tier < TIER_PREFIXES.length ? TIER_PREFIXES[tier] : `Tier-${tier + 1} `;
    return prefix + base;
  }

  function playerPower() {
    const s = WT.storage.getCharacterStats();
    return Math.round(s.strength + s.endurance + s.discipline);
  }

  function currentStage() {
    return WT.storage.getAdventure().currentStage || 1;
  }

  function stageInfo(stage) {
    const adv = WT.storage.getAdventure();
    return {
      stage,
      enemyName: enemyNameFor(stage),
      required: requiredPower(stage),
      playerPower: playerPower(),
      cleared: (adv.clearedStages || []).includes(stage),
      unlocked: stage <= (adv.currentStage || 1),
    };
  }

  function listStages(count) {
    const upTo = Math.max(currentStage() + 2, count || 8);
    const stages = [];
    for (let s = 1; s <= upTo; s++) stages.push(stageInfo(s));
    return stages;
  }

  function simulateBattle(stage) {
    const required = requiredPower(stage);
    const power = playerPower();
    const enemyName = enemyNameFor(stage);
    let playerHp = 100 + power * 0.6;
    let enemyHp = 90 + required * 0.7;
    const log = [`A ${enemyName} blocks your path! (this fight needs roughly ${required} power — you have ${power})`];

    let round = 1;
    while (playerHp > 0 && enemyHp > 0 && round <= 25) {
      const playerDmg = Math.max(2, Math.round(power / 6 + (Math.random() * 6 - 3)));
      enemyHp -= playerDmg;
      log.push(`Round ${round}: You strike the ${enemyName} for ${playerDmg}.`);
      if (enemyHp <= 0) break;

      const enemyDmg = Math.max(2, Math.round(required / 6 + (Math.random() * 6 - 3)));
      playerHp -= enemyDmg;
      log.push(`Round ${round}: The ${enemyName} hits you for ${enemyDmg}.`);
      round++;
    }

    const won = enemyHp <= 0 && playerHp > 0;
    log.push(won ? `Victory! The ${enemyName} falls.` : `You are overwhelmed and retreat to fight another day.`);

    return {
      won,
      log,
      enemyName,
      playerPower: power,
      required,
      playerHpLeft: Math.max(0, Math.round(playerHp)),
      enemyHpLeft: Math.max(0, Math.round(enemyHp)),
    };
  }

  function attemptStage(stage) {
    const result = simulateBattle(stage);
    if (result.won) {
      const adv = WT.storage.getAdventure();
      adv.clearedStages = adv.clearedStages || [];
      if (!adv.clearedStages.includes(stage)) adv.clearedStages.push(stage);
      if (stage === (adv.currentStage || 1)) adv.currentStage = stage + 1;
      WT.storage.setAdventure(adv);
      WT.gamification.addXp(25);
    }
    return result;
  }

  return { requiredPower, enemyNameFor, playerPower, currentStage, stageInfo, listStages, attemptStage };
})();
