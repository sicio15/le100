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
  const kind = chapterKinds()[Math.random() * chapterKinds().length | 0];
  const st = KIND_STATS[kind] || { hp: 1, spd: 80 };
  enemies.push({ hp: eHP(S.stage) * st.hp, max: eHP(S.stage) * st.hp, slot, x: W + 60, atkT: 1, boss: false, kind, dying: null,
    spd: st.spd, hue: (S.stage * 25) % 360, size: 1, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
}
function spawnBoss() {
  const hp = eHP(S.stage) * 10;
  enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, kind: 'boss', dying: null,
    spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
  bossT = 30; shake = 10;
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
  const g = goldKill(S.stage) * (e.boss ? 8 : 1);
  S.gold += g; S.kills++; S.ks++;
  float(e.x, groundY() - 60, '+' + fmt(g), '#ffd700');
  burst(e.x, groundY() - 30, 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : 14);
  if (HOOKS.kill) HOOKS.kill(e);
  const dropChance = (e.boss ? 1 : 0.08)
    * (typeof flashMult === 'function' ? flashMult('drop') : 1)
    * (typeof dayHas === 'function' && dayHas('drops') ? 2 : 1);
  if (Math.random() < dropChance) dropItem(e.boss ? 2 : 0);
  spawnCoins(e.x, groundY() - 40, e.boss ? 8 : 3);
  Audio.SFX.coin();
  addSeasonXp(e.boss ? 50 : 1);
  if (e.boss) { shake = 14; if (HOOKS.bossHide) HOOKS.bossHide(); nextStage(); }
  else if (S.ks >= killsNeed()) nextStage();
}