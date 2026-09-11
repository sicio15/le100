'use strict';
// ===== AFIJOS DE ENEMIGO (LOTE 27) =====
// Antes todos los enemigos eran el mismo saco de HP con otro sprite: la única
// variedad era "élite sí / élite no". Un afijo cambia CÓMO se pelea al bicho
// (aguanta, corre, se cura, explota) y paga más oro a cambio.
// Datos de balance: AFFIXES · AFFIX_STAGE · AFFIX_CHANCE en core/data.js

const affixDef = id => AFFIXES.find(a => a.id === id) || null;

// Decide el afijo de un spawn. Los élites SIEMPRE llevan uno (son el objetivo
// prioritario del golpe manual y así se nota de lejos por qué conviene matarlos).
function rollAffix(isElite) {
  if (S.stage < AFFIX_STAGE) return null;
  if (!isElite && Math.random() >= AFFIX_CHANCE) return null;
  return AFFIXES[Math.random() * AFFIXES.length | 0].id;
}

// Aplica los modificadores del afijo al enemigo recién creado (in-place).
function applyAffix(e) {
  const a = affixDef(e.affix);
  if (!a) return e;
  if (a.hp) { e.hp *= a.hp; e.max = e.hp; }
  if (a.spd) e.spd *= a.spd;
  return e;
}

// Multiplicadores consultados desde el resto del combate
const affixDmgTaken = e => { const a = affixDef(e && e.affix); return (a && a.dmgTaken) || 1; };
const affixGold     = e => { const a = affixDef(e && e.affix); return (a && a.gold) || 1; };
const affixAtkSpd   = e => { const a = affixDef(e && e.affix); return (a && a.atkSpd) || 1; };

// 🩸 Vampírico: se cura con el daño que reparte
function affixOnDealDamage(e, dmg) {
  const a = affixDef(e && e.affix);
  if (!a || !a.leech) return;
  const heal = dmg * a.leech;
  e.hp = Math.min(e.max, e.hp + heal);
  float(e.x, groundY() - 100 * e.size, '+' + fmt(heal), a.css);
}

// 💣 Volátil: al morir estalla y castiga al escuadrón. Si lo matás de lejos con
// una habilidad no te llega — premia jugar con la posición en mente.
function affixOnDeath(e) {
  const a = affixDef(e && e.affix);
  if (!a) return;
  if (!S.stats) S.stats = {};
  S.stats.affixKills = (S.stats.affixKills || 0) + 1;
  if (!a.boom) return;
  const gy = groundY();
  const d = eDmg(S.stage) * a.boom;
  burst(e.x, gy - 40, a.css, 26);
  VFX.shockwave(e.x, gy - 30, 0xffa726, 90);
  shake = Math.max(shake, 7);
  Audio.SFX.boss();
  squad.forEach(m => {
    if (!m.alive) return;
    if (Math.abs(m.px - e.x) > 220) return;   // fuera del radio → sin daño
    const dmg = d * damageTakenMult();
    m.hp -= dmg; m.flash = 0.2;
    float(m.px, gy - 84, '-' + fmt(dmg), '#ffa726');
    if (m.hp <= 0) killHero(m);
  });
  notify('💣 ¡El Volátil explotó!');
}

// Etiqueta corta para las barras de vida y los tooltips
function affixLabel(e) {
  const a = affixDef(e && e.affix);
  return a ? a.ico + ' ' + a.n : '';
}
