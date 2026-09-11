'use strict';
// ===== ENEMIES: spawns, daño, muertes, jefe (con fases) =====
const KIND_STATS = {
  beetle:   { hp: 1.25, spd: 70 },
  spider:   { hp: 1.0,  spd: 95 },
  wasp:     { hp: 0.7,  spd: 130 },
  scorpion: { hp: 1.6,  spd: 55 }
};
function chapterKinds() {
  const all = ['beetle', 'spider', 'wasp', 'scorpion'];
  const ok = typeof ANIM_KINDS !== 'undefined' ? ANIM_KINDS : all;
  const ch = Math.floor((S.stage - 1) / 10);
  let pool = ch <= 0 ? ['beetle', 'spider']
    : ch === 1 ? ['wasp', 'spider']
    : ch === 2 ? ['scorpion', 'wasp']
    : all;
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
  const e = { hp, max: hp, slot, x: W + 60 + (o.dx || 0), atkT: 1, boss: false, elite, kind, dying: null,
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
  if (e.elite) notify('✨ ¡Élite ' + (affixLabel(e) || '') + ' en camino!');
  else if (e.affix) notify(affixLabel(e) + ' se acerca');
}
function spawnBoss() {
  const hp = eHP(S.stage) * 10;
  enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, elite: false, kind: 'boss', dying: null,
    spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0,
    sprite: null, fx: false, affix: null });
  bossT = BOSS_TIMER; bossRage = 0; bossPhase = 0; shake = 10;
  if (HOOKS.bossShow) HOOKS.bossShow();
  bossRoar();
  Audio.SFX.boss();
  notify('👑 ¡JEFE en la etapa ' + S.stage + '!');
}
// L27: el jefe invoca esbirros al cambiar de fase
function spawnBossAdds(n) {
  const slots = freeSlots();
  for (let i = 0; i < Math.min(n, slots.length); i++) {
    enemies.push(makeEnemy(slots[i], { hpMul: 0.5, affix: null, dx: i * 70 }));
  }
}
// L27: fases de jefe — a 60% y 30% de vida enfurece, invoca y acelera
function checkBossPhase(e) {
  if (!e.boss || e.dying !== null) return;
  const frac = e.hp / e.max;
  while (bossPhase < BOSS_PHASES.length && frac <= BOSS_PHASES[bossPhase]) {
    bossPhase++;
    e.spd *= 1.15;
    shake = Math.max(shake, 12);
    bossRoar();
    if (HOOKS.bossPhase) HOOKS.bossPhase(bossPhase);
    Audio.SFX.boss();
    spawnBossAdds(BOSS_PHASE_ADDS);
    notify('👑 ¡FASE ' + (bossPhase + 1) + '! El jefe invoca esbirros');
  }
}
const bossPhaseDmg = () => 1 + bossPhase * BOSS_PHASE_DMG;
const bossPhaseSpd = () => 1 / (1 + bossPhase * BOSS_PHASE_SPD);

function hitEnemy(t, d, color, big) {
  if (!t || t.dying !== null) return;
  t.hp -= d; t.flash = 0.2; t.kb = 10;
  trackDmg(d);
  const gy = groundY();
  float(t.x, gy - 80 * t.size, fmt(d), color, big);
  burst(t.x, gy - 40 * t.size, color, big ? 12 : 8);
  if (t.boss) checkBossPhase(t);
  if (t.hp <= 0) killEnemy(t);
}
function killEnemy(e) {
  if (e.dying !== null) return;
  e.dying = 0.45;
  puff(e.x, groundY() + 2);
  addCombo(); // L26: cada kill encadenada sube el multiplicador de daño
  const g = Math.ceil(goldKill(S.stage) * (e.boss ? 8 : e.elite ? ELITE_GOLD : 1) * affixGold(e));
  S.gold += g; S.kills++; S.ks++;
  trackGold(g);
  if (!S.stats) S.stats = {};
  S.stats.goldEarned = (S.stats.goldEarned || 0) + g;
  if (e.boss) S.stats.bossKills = (S.stats.bossKills || 0) + 1;
  if (e.elite) S.stats.elites = (S.stats.elites || 0) + 1;
  float(e.x, groundY() - 60, '+' + fmt(g), e.elite ? '#ffec8b' : '#ffd700', !!e.elite);
  burst(e.x, groundY() - 30, e.elite ? '#ffd700' : 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : e.elite ? 26 : 14);
  if (HOOKS.kill) HOOKS.kill(e);
  affixOnDeath(e); // 💣 el Volátil estalla acá
  const dropChance = (e.boss ? 1 : e.elite ? ELITE_DROP : 0.08)
    * (typeof flashMult === 'function' ? flashMult('drop') : 1)
    * (typeof dayHas === 'function' && dayHas('drops') ? 2 : 1);
  if (Math.random() < dropChance) dropItem(e.boss ? 2 : e.elite ? 1 : 0);
  spawnCoins(e.x, groundY() - 40, e.boss ? 8 : e.elite ? 6 : 3);
  Audio.SFX.coin();
  addSeasonXp(e.boss ? 50 : e.elite ? 5 : 1);
  if (e.elite) notify('✨ Élite derrotado · +' + fmt(g) + ' 🪙');
  // FIX L27: en etapa de jefe killsNeed()===1, así que matar un esbirro invocado
  // hacía avanzar de etapa con el jefe todavía vivo. Sólo el jefe cierra su etapa.
  if (e.boss) { shake = 14; if (HOOKS.bossHide) HOOKS.bossHide(); nextStage(); }
  else if (!isBossStage() && S.ks >= killsNeed()) nextStage();
}
