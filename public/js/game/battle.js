'use strict';
// ===== LÓGICA PURA del combate (sin DOM: deuda #7 cerrada) =====
// LOTE 4: escuadrón rediseñado → principal (dps) + Elara arquera + Kael mago.
let squad = [];
let enemies = [];
let spawnT = 1, bossT = 0, shake = 0, time = 0, stageFlash = 0, dustT = 0, lastChapter = -1;
let healT = 2, venT = 3;
// AVANCE: el escuadrón camina hacia la derecha buscando enemigos
let advance = 0;
const notify = t => { if (typeof toast !== 'undefined') toast(t); };
const VFX = { float(){}, burst(){}, coin(){}, puff(){} };
function float(x, y, txt, color, big) { VFX.float(x, y, txt, color, big); }
function burst(x, y, color, n) { VFX.burst(x, y, color, n); }
function spawnCoins(x, y, n) { for (let i = 0; i < n; i++) VFX.coin(x, y); }
function puff(x, y) { VFX.puff(x, y); }
// HOOKS: bossShow/bossHide/bossTick = barra de jefe · cutin = ultimate (DOM en battle-scene)
const HOOKS = { ult: null, crit: null, kill: null, cutin: null, bossShow: null, bossHide: null, bossTick: null };
const heroX = () => Math.min(230, W * 0.22);
const groundY = () => H - 78;
// Formación: dps al frente · arquera al medio · mago atrás
const slotX = m => heroX() + (m.def.role === 'dps' ? 52 : m.def.role === 'archer' ? -6 : -70);
// ===== Enemigos por capítulo (con fallback si falta la imagen) =====
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
// ===== Escuadrón =====
// Reparto de vida por rol: dps aguanta más · arquera media · mago frágil
function makeHero(def) {
  const share = def.role === 'dps' ? 0.45 : def.role === 'archer' ? 0.3 : 0.25;
  const mh = maxHP() * share;
  return { def, share, maxHp: mh, hp: mh, energy: 0, alive: true,
    flash: 0, lunge: 0, castT: 0, atkT: Math.random() * 0.4, sprite: null, fx: false, su: 1,
    px: -80 - Math.random() * 60, entering: true };
}
function initSquad() {
  const defs = (typeof HEROES !== 'undefined' ? HEROES : []).filter(h => S.best >= h.unlock);
  const old = {}; squad.forEach(m => old[m.def.id] = m);
  const prev = squad.length;
  squad = defs.map(d => old[d.id] || makeHero(d));
  squad.forEach(m => {
    const sh = maxHP() * m.share;
    const r = m.maxHp > 0 ? Math.min(1, m.hp / m.maxHp) : 1;
    m.maxHp = sh; m.hp = sh * r;
  });
  if (squad.length > prev && prev > 0) notify('🐛 ¡Nuevo compañero: ' + squad[squad.length - 1].def.name + '!');
}
function resetSquad() {
  squad.forEach(m => { m.alive = true; m.hp = m.maxHp; m.energy = 0; m.flash = 0; m.lunge = 0; m.castT = 0; });
}
// RE-ENTRADA: en cada etapa (o tras caer) el escuadrón aparece al inicio de la pantalla
function reEnter() {
  advance = 0;
  squad.forEach(m => { m.px = -60 - Math.random() * 90; m.entering = true; });
}
function pickTarget() {
  return enemies.filter(e => e.dying === null && e.x < heroX() + advance + 420).sort((a, b) => a.x - b.x)[0] || null;
}
function aliveByPriority() {
  for (const r of ['dps', 'archer', 'mage']) {
    const m = squad.find(m => m.def.role === r && m.alive);
    if (m) return m;
  }
  return null;
}
// CUT-IN: vía hook (el DOM vive en la capa de render)
function showCutin(m) { if (HOOKS.cutin) HOOKS.cutin(m); }
function gainEnergy(m, n) {
  m.energy = Math.min(100, m.energy + n);
  if (m.energy >= 100) { m.energy = 0; castUlt(m); }
}
function hitEnemy(t, d, color, big) {
  t.hp -= d; t.flash = 0.2; t.kb = 10;
  const gy = groundY();
  float(t.x, gy - 80 * t.size, fmt(d), color, big);
  burst(t.x, gy - 40 * t.size, color, big ? 12 : 8);
  if (t.hp <= 0) killEnemy(t);
}
function castUlt(m) {
  m.castT = 0.9; Audio.SFX.ult(); showCutin(m);
  if (HOOKS.ult) HOOKS.ult(m);
  const gy = groundY();
  if (m.def.role === 'dps') {
    // Tajo Triple: 3 golpes fuertes al objetivo cercano
    for (let i = 0; i < 3; i++) {
      const t = pickTarget(); if (!t) break;
      hitEnemy(t, dps() * 1.5, '#ffeb3b', true);
    }
  } else if (m.def.role === 'archer') {
    // Lluvia de Flechas: daño a TODOS los enemigos vivos
    const aliveE = enemies.filter(e => e.dying === null);
    if (!aliveE.length) return;
    aliveE.forEach(e => hitEnemy(e, dps() * 1.2, '#7efcff', false));
    Audio.SFX.venom();
  } else if (m.def.role === 'mage') {
    // Nova Arcana: AoE grande + cura al escuadrón
    const aliveE = enemies.filter(e => e.dying === null);
    aliveE.forEach(e => hitEnemy(e, dps() * 1.8, '#c86bfa', true));
    squad.forEach(a => {
      if (a.alive) {
        const h = a.maxHp * 0.15;
        a.hp = Math.min(a.maxHp, a.hp + h);
        float(a.px, gy - 110, '+' + fmt(h), '#7efcff');
      }
    });
  }
}
// ===== Enemigos =====
function spawnEnemy() {
  const slots = [0, 1, 2, 3, 4];
  enemies.forEach(e => { if (e.dying === null) { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); } });
  if (!slots.length) return;
  const slot = slots[Math.random() * slots.length | 0];
  const pool = chapterKinds();
  const kind = pool[Math.random() * pool.length | 0];
  const st = KIND_STATS[kind] || { hp: 1, spd: 80 };
  const hp = eHP(S.stage) * st.hp;
  enemies.push({ hp, max: hp, slot, x: W + 60, atkT: 1, boss: false, kind, dying: null,
    spd: st.spd, hue: (S.stage * 25) % 360, size: 1,
    state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
}
function spawnBoss() {
  const hp = eHP(S.stage) * 10;
  enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, kind: 'boss', dying: null,
    spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
  bossT = 30; shake = 10;
  if (HOOKS.bossShow) HOOKS.bossShow();
  Audio.SFX.boss();
  notify('👑 ¡JEFE en la etapa ' + S.stage + '!');
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
  if (Math.random() < (e.boss ? 1 : 0.08)) dropItem(e.boss ? 2 : 0);
  spawnCoins(e.x, groundY() - 40, e.boss ? 8 : 3);
  Audio.SFX.coin();
  if (e.boss) { shake = 14; if (HOOKS.bossHide) HOOKS.bossHide(); nextStage(); }
  else if (S.ks >= killsNeed()) nextStage();
}
function nextStage() {
  S.stage++; S.best = Math.max(S.best, S.stage); S.ks = 0;
  resetSquad(); initSquad();
  reEnter(); // aparece al inicio de la pantalla en cada etapa
  enemies = []; spawnT = 0.6;
  stageFlash = 0.5;
  const ch = Math.floor((S.stage - 1) / 10);
  if (ch !== lastChapter) { lastChapter = ch; Audio.setChapter(ch); Audio.SFX.levelup(); notify('🌄 ' + chapterOf(S.stage).name); }
  else Audio.SFX.levelup();
  persist(); netScore(S.name, S.best);
  notify('⚔️ Etapa ' + S.stage + (isBossStage() ? ' 👑' : ''));
}
// ===== AVANCE por proximidad =====
function updateAdvance(dt) {
  const hx = heroX();
  const cap = Math.max(0, Math.min(260, W - 420 - hx));
  // ante jefe, repliegue a la posición base (formación)
  if (isBossStage()) { advance = Math.max(0, advance - dt * 140); return; }
  const near = enemies.filter(e => e.dying === null).sort((a, b) => a.x - b.x)[0];
  const line = hx + advance + 170; // línea donde se frena el enemigo más cercano
  if (!near) { advance = Math.min(cap, advance + dt * 70); return; } // campo limpio → avanzar
  if (near.x > line + 60) advance = Math.min(cap, advance + dt * 70); // enemigo lejos → ir a buscarlo
}
// ===== Update =====
function update(rawDt) {
  const dt = rawDt * SETTINGS.speed;
  time += dt;
  stageFlash = Math.max(0, stageFlash - dt);
  if (!squad.length) initSquad();
  const hx = heroX(), gy = groundY();
  updateAdvance(dt);
  squad.forEach(m => {
    m.flash = Math.max(0, m.flash - dt);
    m.lunge = Math.max(0, m.lunge - dt * 4);
    m.castT = Math.max(0, m.castT - dt);
    if (!m.alive) return;
    // movimiento: entra desde la izquierda / avanza / se repliega
    const tx = slotX(m) + advance;
    if (m.px < tx - 2) { m.px = Math.min(tx, m.px + 150 * dt); m.entering = true; }
    else { if (m.px > tx + 2) m.px = Math.max(tx, m.px - 150 * dt); m.entering = false; }
    m.atkT -= dt;
    if (m.atkT <= 0 && !m.entering) {
      m.atkT = 0.5;
      const t = pickTarget();
      if (t) {
        m.lunge = 1;
        // daño básico por rol: dps 100% · arquera 85% · mago 55% (el mago vive de su ult)
        const mult = m.def.role === 'dps' ? 1 : m.def.role === 'archer' ? 0.85 : 0.55;
        const isCrit = Math.random() < critChance();
        const d = dps() * 0.5 * mult * (isCrit ? critMult() : 1);
        t.hp -= d; t.flash = 0.15; t.kb = isCrit ? 11 : 7;
        float(t.x, gy - 70 * t.size, fmt(d), isCrit ? '#ffeb3b' : '#fff', isCrit);
        burst(t.x, gy - 45 * t.size, isCrit ? '#ffeb3b' : '#ffffff', isCrit ? 10 : 6);
        if (isCrit) { shake = Math.max(shake, 3); Audio.SFX.crit(); } else Audio.SFX.hit();
        if (isCrit && HOOKS.crit) HOOKS.crit(t.x, gy - 45 * t.size);
        gainEnergy(m, 8);
        if (t.hp <= 0) killEnemy(t);
      }
    }
  });
  healT -= dt;
  if (healT <= 0) {
    healT = 2;
    // regen pasiva global: cura al miembro más herido (antes era rol support)
    const target = squad.filter(m => m.alive && m.hp < m.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    if (target) {
      const h = regenPs() * 2;
      target.hp = Math.min(target.maxHp, target.hp + h);
      float(target.px, gy - 110, '+' + fmt(h), '#7bed9f');
    }
  }
  venT -= dt;
  if (venT <= 0) {
    venT = venomCd();
    const aliveE = enemies.filter(e => e.dying === null);
    if (aliveE.length) {
      const d = venomDm();
      float(hx + advance + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0', true);
      Audio.SFX.venom();
      aliveE.forEach(e => {
        e.hp -= d; e.flash = 0.15; e.kb = 5;
        burst(e.x, gy - 30, '#a020f0', 8);
        squad.forEach(m => { if (m.alive) gainEnergy(m, 3); });
        if (e.hp <= 0) killEnemy(e);
      });
    }
  }
  if (!isBossStage()) {
    spawnT -= dt;
    if (spawnT <= 0 && enemies.filter(e => e.dying === null).length < 4) { spawnT = 1.6; spawnEnemy(); }
  } else if (!enemies.length && S.ks === 0) spawnBoss();
  enemies.forEach(e => {
    e.flash = Math.max(0, e.flash - dt);
    e.kb = Math.max(0, e.kb - dt * 40);
    e.pop = Math.min(1, e.pop + dt * 3);
    if (e.dying !== null) { e.dying -= dt; return; }
    const ex = hx + advance + 150 + e.slot * 46;
    let lungeT = 0;
    if (e.x > ex) {
      e.x -= e.spd * dt; e.state = 'walk';
      dustT -= dt;
      if (dustT <= 0) { dustT = 0.22; puff(e.x + 20, gy + 4); }
    } else {
      if (e.state === 'walk') e.state = 'idle';
      const m = aliveByPriority();
      if (m) {
        e.atkT -= dt;
        if (e.atkT <= 0.3 && e.atkT > 0.12) { e.state = 'windup'; lungeT = 10 * e.size; }
        else if (e.atkT <= 0.12) { e.state = 'strike'; lungeT = -18 * e.size; }
        if (e.atkT <= 0) {
          e.atkT = 1 + Math.random() * 0.4;
          e.state = 'idle';
          const d = eDmg(S.stage) * (e.boss ? 3 : 1);
          m.hp -= d; m.flash = 0.15;
          float(m.px, gy - 80, '-' + fmt(d), '#ff4757');
          shake = Math.max(shake, 4);
          Audio.SFX.hit();
          gainEnergy(m, 6);
          if (m.hp <= 0) {
            m.alive = false;
            notify('💀 ' + m.def.name + ' cayó');
            Audio.SFX.death();
            if (!aliveByPriority()) {
              if (S.stage > 1) S.stage--;
              S.ks = 0;
              enemies.forEach(x => { if (x.dying === null) { x.dying = 0.45; puff(x.x, gy + 2); } });
              if (HOOKS.bossHide) HOOKS.bossHide();
              spawnT = 0.8;
              reEnter(); // tras caer, volvés a entrar desde el inicio
              persist(); netScore(S.name, S.best);
              notify('💀 Caíste → Etapa ' + S.stage + '. ¡Farmeá y volvé!');
              resetSquad();
            }
          }
        }
      }
    }
    e.lungeX += (lungeT - e.lungeX) * Math.min(1, dt * 18);
  });
  enemies = enemies.filter(e => e.dying === null || e.dying > 0);
  if (isBossStage() && enemies.length) {
    bossT -= dt;
    if (HOOKS.bossTick) HOOKS.bossTick(Math.max(0, bossT / 30) * 100, Math.max(0, Math.ceil(bossT)) + 's');
    if (bossT <= 0) { bossT = 30; notify('⏰ El jefe se recuperó... ¡otra vez!'); }
  }
  if (shake > 0) shake -= dt * 20;
}