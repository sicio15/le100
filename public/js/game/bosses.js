'use strict';
// ===== JEFES (LOTE 28): roster por zona + mecánicas reales =====
// Antes había UN jefe ("enemy_boss" con más HP) repetido cada 5 etapas durante
// toda la partida. Ahora cada zona tiene su propio Jefe de Zona (etapa %10) con
// nombre, sprite, color, diálogo y 2-5 habilidades activas; y las etapas %5
// traen un mini-jefe: el Guardián de esa misma criatura, más chico y con una
// sola habilidad.
// Balance: ZONE_BOSS_* · MINI_BOSS_* · BOSS_* en core/data.js
// Narrativa y roster: BOSSES en core/lore.js

const BOSS_ABILITIES = {
  shield:  { n: 'Caparazón', ico: '🔆', d: 'Se cubre con un escudo que hay que romper antes de tocarle la vida' },
  summon:  { n: 'Llamada',   ico: '🐛', d: 'Invoca esbirros en cada cambio de fase' },
  slam:    { n: 'Embate',    ico: '💢', d: 'Avisa y golpea a TODO el escuadrón a la vez' },
  drain:   { n: 'Drenaje',   ico: '🩸', d: 'Se cura con el daño que reparte' },
  curse:   { n: 'Maldición', ico: '🌑', d: 'Baja tu daño un 35% durante unos segundos' },
  volley:  { n: 'Andanada',  ico: '✳️', d: 'Dispara proyectiles a héroes al azar' },
  haste:   { n: 'Agonía',    ico: '💨', d: 'Ataca más rápido cuanta menos vida le queda' },
  reflect: { n: 'Espinas',   ico: '🪞', d: 'Te devuelve parte del daño que le hacés' }
};
// ----- Construcción -----
function makeBossEnemy(stage) {
  const zi = zoneIndex(stage);
  const def = zoneBoss(zi);
  const mini = isMiniBossStage(stage);
  const hp = eHP(stage) * (mini ? MINI_BOSS_HP : ZONE_BOSS_HP) * def.hpMul;
  const e = {
    hp, max: hp, slot: 1, x: W + 90, atkT: 1.4,
    boss: true, mini, elite: false, affix: null,
    def, kind: def.sprite, animKind: def.sprite,
    dying: null, spd: 40, hue: 0,
    size: def.size * (mini ? MINI_BOSS_SIZE : 1),
    state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false,
    // estado de habilidades
    shield: 0, shieldMax: 0,
    slamT: BOSS_SLAM_CD, slamTell: 0,
    volleyT: BOSS_VOLLEY_CD,
    curseT: BOSS_CURSE_CD
  };
  // Un mini-jefe se queda con UNA sola habilidad: es un aperitivo, no el plato
  if (mini) e.abilitiesOverride = def.abilities.slice(0, 1);
  if (bossAbility(e, 'shield')) raiseShield(e);
  return e;
}
// `abilities` efectivas (el mini recorta la lista del jefe de zona)
function bossAbilities(e) {
  if (!e || !e.def) return [];
  return e.abilitiesOverride || e.def.abilities;
}
function bossAbility(e, ab) { return bossAbilities(e).indexOf(ab) >= 0; }

const bossName = e => e && e.def ? (e.mini ? 'Guardián · ' + e.def.name : e.def.name) : 'Jefe';
const bossIco  = e => e && e.def ? e.def.ico : '👑';

// ----- 🔆 Escudo -----
function raiseShield(e) {
  e.shieldMax = e.max * BOSS_SHIELD_PCT;
  e.shield = e.shieldMax;
}
// Devuelve el daño que SOBRA tras comerse el escudo
function absorbShield(e, dmg) {
  if (!e.shield || e.shield <= 0) return dmg;
  const used = Math.min(e.shield, dmg);
  e.shield -= used;
  float(e.x, groundY() - 96 * e.size, '🔆 ' + fmt(used), '#7efcff');
  if (e.shield <= 0) {
    e.shield = 0;
    notify('🔆 ¡Escudo roto!');
    Audio.SFX.crit();
    VFX.shockwave(e.x, groundY() - 50, 0x7efcff, 170);
    shake = Math.max(shake, 9);
  }
  return dmg - used;
}

// ----- 💢 Embate: avisa y pega a todo el escuadrón -----
function bossSlam(e) {
  const gy = groundY();
  const d = eDmg(S.stage) * BOSS_SLAM_DMG * e.def.dmgMul * bossRageMult() * bossPhaseDmg() * damageTakenMult();
  VFX.shockwave(e.x, gy - 10, 0xff4757, 420);
  shake = Math.max(shake, 14);
  bossRoar();
  Audio.SFX.boss();
  squad.forEach(m => {
    if (!m.alive) return;
    m.hp -= d; m.flash = 0.25;
    float(m.px, gy - 86, '-' + fmt(d), '#ff7043');
    if (m.hp <= 0) killHero(m);
  });
}

// ----- ✳️ Andanada: proyectiles a héroes al azar -----
function bossVolley(e) {
  const gy = groundY();
  const live = squad.filter(m => m.alive);
  if (!live.length) return;
  const d = eDmg(S.stage) * BOSS_VOLLEY_DMG * e.def.dmgMul * damageTakenMult();
  for (let i = 0; i < BOSS_VOLLEY_N; i++) {
    const m = live[Math.random() * live.length | 0];
    // el proyectil tarda en llegar: se ve venir
    const delay = 120 + i * 150;
    VFX.projectile(e.x, gy - 70 * e.size, m.px, gy - 50, e.def.color, delay);
    setTimeout(() => {
      if (!m.alive) return;
      m.hp -= d; m.flash = 0.2;
      float(m.px, gy - 80, '-' + fmt(d), e.def.color);
      burst(m.px, gy - 50, e.def.color, 8);
      if (m.hp <= 0) killHero(m);
    }, delay + 260);
  }
  Audio.SFX.venom();
}

// ----- 🌑 Maldición -----
function bossCurse(e) {
  curseT = BOSS_CURSE_DUR;
  notify('🌑 ¡Maldición! Tu daño baja un ' + Math.round((1 - BOSS_CURSE_MULT) * 100) + '%');
  VFX.shockwave(heroX() + advance, groundY() - 40, 0x6a3fa0, 200);
  Audio.SFX.death();
}

// ----- Tick por frame de un jefe vivo -----
function bossTickAbilities(e, dt) {
  if (!e || e.dying !== null || e.state === 'walk') return;
  // 💢 Embate
  if (bossAbility(e, 'slam')) {
    if (e.slamTell > 0) {
      e.slamTell -= dt;
      if (e.slamTell <= 0) bossSlam(e);
    } else {
      e.slamT -= dt;
      if (e.slamT <= 0) {
        e.slamT = BOSS_SLAM_CD;
        e.slamTell = BOSS_SLAM_TELL;
        notify('💢 ¡' + bossName(e) + ' prepara un embate!');
      }
    }
  }
  // ✳️ Andanada
  if (bossAbility(e, 'volley')) {
    e.volleyT -= dt;
    if (e.volleyT <= 0) { e.volleyT = BOSS_VOLLEY_CD; bossVolley(e); }
  }
  // 🌑 Maldición
  if (bossAbility(e, 'curse')) {
    e.curseT -= dt;
    if (e.curseT <= 0) { e.curseT = BOSS_CURSE_CD; bossCurse(e); }
  }
}

// ----- Modificadores consultados desde el combate -----
// 💨 Agonía: más rápido cuanta menos vida le queda
function bossHasteMult(e) {
  if (!bossAbility(e, 'haste')) return 1;
  const missing = 1 - Math.max(0, e.hp / e.max);
  return 1 / (1 + BOSS_HASTE_MAX * missing);
}
// 🩸 Drenaje
function bossDrain(e, dmg) {
  if (!bossAbility(e, 'drain')) return;
  const heal = dmg * BOSS_DRAIN;
  e.hp = Math.min(e.max, e.hp + heal);
  float(e.x, groundY() - 104 * e.size, '+' + fmt(heal), '#ff6b81');
}
// 🪞 Espinas — porcentaje de tu daño, pero acotado a un % de la vida del héroe
function bossReflect(e, dmg) {
  if (!bossAbility(e, 'reflect')) return;
  const m = aliveByPriority();
  if (!m) return;
  const back = Math.min(dmg * BOSS_REFLECT, m.maxHp * BOSS_REFLECT_CAP) * damageTakenMult();
  m.hp -= back; m.flash = 0.12;
  if (m.hp <= 0) killHero(m);
}
// 🐛 Llamada (la usa checkBossPhase)
const bossSummons = e => bossAbility(e, 'summon');

// Texto de las mecánicas para el marco del jefe y el códice
function bossAbilityChips(e) {
  return bossAbilities(e).map(a => (BOSS_ABILITIES[a] || {}).ico || '').join(' ');
}
