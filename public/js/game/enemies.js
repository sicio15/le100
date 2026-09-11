'use strict';
// ===== ENEMIES: spawns, daño, muertes, jefe =====
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
function spawnEnemy() {
  const slots = [0, 1, 2, 3, 4];
  enemies.forEach(e => { if (e.dying === null) { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); } });
  if (!slots.length) return;
  const slot = slots[Math.random() * slots.length | 0];
  const pool = chapterKinds();                       // FIX: se llamaba 2 veces por spawn
  const kind = pool[Math.random() * pool.length | 0];
  const st = KIND_STATS[kind] || { hp: 1, spd: 80 };
  // L26: ÉLITES — versión dorada, más dura y mucho más rentable. Rompe la monotonía
  // del farmeo y da un objetivo prioritario al golpe manual.
  const elite = S.stage >= 3 && Math.random() < ELITE_CHANCE;
  const hp = eHP(S.stage) * st.hp * (elite ? ELITE_HP : 1);
  enemies.push({ hp, max: hp, slot, x: W + 60, atkT: 1, boss: false, elite, kind, dying: null,
    spd: st.spd * (elite ? 0.85 : 1), hue: elite ? 45 : (S.stage * 25) % 360,
    size: elite ? ELITE_SIZE : 1, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
  if (elite) notify('✨ ¡Élite en camino!');
}
function spawnBoss() {
  const hp = eHP(S.stage) * 10;
  enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, elite: false, kind: 'boss', dying: null,
    spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
  bossT = BOSS_TIMER; bossRage = 0; shake = 10;
  if (HOOKS.bossShow) HOOKS.bossShow();
  if (HOOKS.bossRoar) HOOKS.bossRoar();
  Audio.SFX.boss();
  notify('👑 ¡JEFE en la etapa ' + S.stage + '!');
}
function hitEnemy(t, d, color, big) {
  t.hp -= d; t.flash = 0.2; t.kb = 10;
  const gy = groundY();
  float(t.x, gy - 80 * t.size, fmt(d), color, big);
  burst(t.x, gy - 40 * t.size, color, big ? 12 : 8);
  if (t.hp <= 0) killEnemy(t);
}
function killEnemy(e) {
  if (e.dying !== null) return;
  e.dying = 0.45;
  puff(e.x, groundY() + 2);
  addCombo(); // L26: cada kill encadenada sube el multiplicador de daño
  const g = goldKill(S.stage) * (e.boss ? 8 : e.elite ? ELITE_GOLD : 1);
  S.gold += g; S.kills++; S.ks++;
  if (!S.stats) S.stats = {};
  S.stats.goldEarned = (S.stats.goldEarned || 0) + g;
  if (e.boss) S.stats.bossKills = (S.stats.bossKills || 0) + 1;
  if (e.elite) S.stats.elites = (S.stats.elites || 0) + 1;
  float(e.x, groundY() - 60, '+' + fmt(g), e.elite ? '#ffec8b' : '#ffd700', !!e.elite);
  burst(e.x, groundY() - 30, e.elite ? '#ffd700' : 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : e.elite ? 26 : 14);
  if (HOOKS.kill) HOOKS.kill(e);
  const dropChance = (e.boss ? 1 : e.elite ? ELITE_DROP : 0.08)
    * (typeof flashMult === 'function' ? flashMult('drop') : 1)
    * (typeof dayHas === 'function' && dayHas('drops') ? 2 : 1);
  if (Math.random() < dropChance) dropItem(e.boss ? 2 : e.elite ? 1 : 0);
  spawnCoins(e.x, groundY() - 40, e.boss ? 8 : e.elite ? 6 : 3);
  Audio.SFX.coin();
  addSeasonXp(e.boss ? 50 : e.elite ? 5 : 1);
  if (e.elite) notify('✨ Élite derrotado · +' + fmt(g) + ' 🪙');
  if (e.boss) { shake = 14; if (HOOKS.bossHide) HOOKS.bossHide(); nextStage(); }
  else if (S.ks >= killsNeed()) nextStage();
}