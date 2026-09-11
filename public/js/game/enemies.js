'use strict';
// ===== ENEMIES: spawns, daño, muertes, jefes de zona y mini-jefes =====
const KIND_STATS = {
  beetle:   { hp: 1.25, spd: 70 },
  spider:   { hp: 1.0,  spd: 95 },
  wasp:     { hp: 0.7,  spd: 130 },
  scorpion: { hp: 1.6,  spd: 55 }
};
// L28: cada zona tiene su propia mezcla de bichos (antes se repetían los 4 a
// partir del capítulo 3 y el bestiario no significaba nada).
const ZONE_POOLS = [
  ['beetle', 'spider'],
  ['wasp', 'spider'],
  ['scorpion', 'wasp'],
  ['beetle', 'scorpion', 'spider'],
  ['spider', 'wasp', 'scorpion'],
  ['beetle', 'wasp', 'scorpion'],
  ['spider', 'scorpion'],
  ['beetle', 'spider', 'wasp', 'scorpion']
];
function chapterKinds() {
  const all = ['beetle', 'spider', 'wasp', 'scorpion'];
  const ok = typeof ANIM_KINDS !== 'undefined' ? ANIM_KINDS : all;
  let pool = ZONE_POOLS[zoneIndex(S.stage)] || all;
  pool = pool.filter(k => ok.includes(k));
  if (!pool.length) pool = ok.filter(k => k !== 'boss' && k !== 'hero');
  if (!pool.length) pool = ['beetle'];
  return pool;
}
function freeSlots() {
  const slots = [0, 1, 2, 3, 4];
  enemies.forEach(e => { if (e.dying === null) { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); } });
  return slots;
}
// Enemigo base: un solo constructor para spawns normales, élites y esbirros de jefe
function makeEnemy(slot, opts) {
  const o = opts || {};
  const pool = chapterKinds();
  const kind = o.kind || pool[Math.random() * pool.length | 0];
  const st = KIND_STATS[kind] || { hp: 1, spd: 80 };
  const elite = !!o.elite;
  const hp = eHP(S.stage) * st.hp * (elite ? ELITE_HP : 1) * (o.hpMul || 1);
  const e = { hp, max: hp, slot, x: W + 60 + (o.dx || 0), atkT: 1, boss: false, mini: false,
    elite, kind, animKind: kind, dying: null,
    spd: st.spd * (elite ? 0.85 : 1), hue: elite ? 45 : (S.stage * 25) % 360,
    size: elite ? ELITE_SIZE : 1, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0,
    sprite: null, fx: false, affix: o.affix !== undefined ? o.affix : rollAffix(elite) };
  return applyAffix(e);
}
function spawnEnemy() {
  const slots = freeSlots();
  if (!slots.length) return;
  const e = makeEnemy(slots[Math.random() * slots.length | 0], { elite: S.stage >= 3 && Math.random() < ELITE_CHANCE });
  enemies.push(e);
  if (HOOKS.portal) HOOKS.portal(e);
  if (e.elite) notify('✨ ¡Élite ' + (affixLabel(e) || '') + ' en camino!');
  else if (e.affix) notify(affixLabel(e) + ' se acerca');
}

// ----- Jefes -----
function spawnBoss() {
  const e = makeBossEnemy(S.stage);
  enemies.push(e);
  bossT = BOSS_TIMER; bossRage = 0; bossPhase = 0; shake = 10;
  if (HOOKS.bossShow) HOOKS.bossShow(e);
  bossRoar();
  Audio.SFX.boss();
  Audio.setBossMode(true);
  // La charla del Jefe de Zona se dispara una vez por partida y sólo en la etapa %10
  if (!e.mini && HOOKS.bossIntro) HOOKS.bossIntro(e);
  notify((e.mini ? '🛡️ ¡GUARDIÁN: ' : '👑 ¡JEFE DE ZONA: ') + bossName(e) + '!');
}
// L27: el jefe invoca esbirros al cambiar de fase
function spawnBossAdds(n) {
  const slots = freeSlots();
  for (let i = 0; i < Math.min(n, slots.length); i++) {
    const a = makeEnemy(slots[i], { hpMul: 0.5, affix: null, dx: i * 70 });
    enemies.push(a);
    if (HOOKS.portal) HOOKS.portal(a);
  }
}
// L27/L28: fases de jefe — a 60% y 30% de vida enfurece; invoca y rearma el
// escudo sólo si tiene esas habilidades.
function checkBossPhase(e) {
  if (!e.boss || e.dying !== null) return;
  const frac = e.hp / e.max;
  while (bossPhase < BOSS_PHASES.length && frac <= BOSS_PHASES[bossPhase]) {
    bossPhase++;
    e.spd *= 1.15;
    shake = Math.max(shake, 12);
    bossRoar();
    if (HOOKS.bossPhase) HOOKS.bossPhase(bossPhase, e);
    Audio.SFX.boss();
    let extra = '';
    if (bossSummons(e)) { spawnBossAdds(BOSS_PHASE_ADDS); extra = ' e invoca esbirros'; }
    if (bossAbility(e, 'shield')) { raiseShield(e); extra += (extra ? ' y' : '') + ' rearma su escudo'; }
    notify(bossIco(e) + ' ¡FASE ' + (bossPhase + 1) + '! ' + bossName(e) + extra);
  }
}
const bossPhaseDmg = () => 1 + bossPhase * BOSS_PHASE_DMG;
const bossPhaseSpd = () => 1 / (1 + bossPhase * BOSS_PHASE_SPD);

// ----- Daño -----
// L28: TODO el daño a un enemigo pasa por acá, así el escudo y las espinas valen
// igual para el escuadrón, el veneno, el golpe manual y las habilidades.
function damageEnemy(t, d) {
  if (!t || t.dying !== null) return 0;
  let dmg = d;
  if (t.boss) {
    dmg = absorbShield(t, dmg);
    bossReflect(t, d);
  }
  t.hp -= dmg;
  trackDmg(dmg);
  if (t.boss) checkBossPhase(t);
  if (t.hp <= 0) killEnemy(t);
  return dmg;
}
function hitEnemy(t, d, color, big) {
  if (!t || t.dying !== null) return;
  t.flash = 0.2; t.kb = 10;
  const gy = groundY();
  const dealt = damageEnemy(t, d);
  float(t.x, gy - 80 * t.size, fmt(dealt), color, big);
  burst(t.x, gy - 40 * t.size, color, big ? 12 : 8);
}
function killEnemy(e) {
  if (e.dying !== null) return;
  e.dying = 0.45;
  puff(e.x, groundY() + 2);
  addCombo(); // L26: cada kill encadenada sube el multiplicador de daño
  const bossGold = e.boss ? (e.mini ? MINI_BOSS_GOLD : ZONE_BOSS_GOLD) : 1;
  const g = Math.ceil(goldKill(S.stage) * bossGold * (e.elite ? ELITE_GOLD : 1) * affixGold(e));
  S.gold += g; S.kills++; S.ks++;
  trackGold(g);
  if (!S.stats) S.stats = {};
  S.stats.goldEarned = (S.stats.goldEarned || 0) + g;
  if (e.boss) S.stats.bossKills = (S.stats.bossKills || 0) + 1;
  if (e.elite) S.stats.elites = (S.stats.elites || 0) + 1;
  // L28: el códice registra la especie o el jefe (sólo el Jefe de Zona cuenta)
  if (!e.boss) codexKill(e.kind);
  else if (!e.mini) codexBoss(e.def.id);
  float(e.x, groundY() - 60, '+' + fmt(g), e.elite ? '#ffec8b' : '#ffd700', !!e.elite);
  burst(e.x, groundY() - 30, e.elite ? '#ffd700' : 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : e.elite ? 26 : 14);
  if (HOOKS.kill) HOOKS.kill(e);
  affixOnDeath(e); // 💣 el Volátil estalla acá
  const dropChance = (e.boss ? 1 : e.elite ? ELITE_DROP : 0.08)
    * (typeof flashMult === 'function' ? flashMult('drop') : 1)
    * (typeof dayHas === 'function' && dayHas('drops') ? 2 : 1);
  if (Math.random() < dropChance) dropItem(e.boss ? (e.mini ? 1 : 3) : e.elite ? 1 : 0);
  spawnCoins(e.x, groundY() - 40, e.boss ? 10 : e.elite ? 6 : 3);
  Audio.SFX.coin();
  addSeasonXp(e.boss ? (e.mini ? 25 : 80) : e.elite ? 5 : 1);
  if (e.elite) notify('✨ Élite derrotado · +' + fmt(g) + ' 🪙');
  // FIX L27: en etapa de jefe killsNeed()===1, así que matar un esbirro invocado
  // hacía avanzar de etapa con el jefe todavía vivo. Sólo el jefe cierra su etapa.
  if (e.boss) {
    shake = 14;
    if (HOOKS.bossHide) HOOKS.bossHide();
    Audio.setBossMode(false);
    curseT = 0;
    if (!e.mini && HOOKS.bossDefeat) HOOKS.bossDefeat(e);
    nextStage();
  } else if (!isBossStage() && S.ks >= killsNeed()) nextStage();
}
