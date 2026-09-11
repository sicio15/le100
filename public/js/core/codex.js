'use strict';
// ===== CÓDICE (LOTE 28): descubrimiento, bestiario y reliquias =====
// Matar bichos ya no es sólo oro: cada especie y cada jefe tienen una ficha que
// se completa por etapas y da daño permanente. Así el lore no es decorado —
// leerlo es progresar. Umbrales en core/data.js.

const DEF_CODEX = { kills: {}, bosses: {}, zones: {}, lore: {}, relics: {} };

function normCodex(c) {
  const src = (c && typeof c === 'object') ? c : {};
  const out = { kills: {}, bosses: {}, zones: {}, lore: {}, relics: {} };
  const num = (v, max) => Math.max(0, Math.min(max, Math.floor(+v || 0)));
  BESTIARY.forEach(b => { out.kills[b.id] = num((src.kills || {})[b.id], 1e9); });
  BOSSES.forEach(b => {
    out.bosses[b.id] = num((src.bosses || {})[b.id], 1e6);
    if ((src.relics || {})[b.relic.id]) out.relics[b.relic.id] = 1;
  });
  ZONES.forEach(z => { if ((src.zones || {})[z.id]) out.zones[z.id] = 1; });
  Object.keys(src.lore || {}).forEach(k => { if (src.lore[k]) out.lore[String(k).slice(0, 32)] = 1; });
  return out;
}
// FIX L28: un save nuevo (o uno viejo, o uno de una versión con menos jefes) llega
// con `codex` vacío o incompleto. Como el registro comprueba `id in c.bosses`, sin
// las claves NADA se registraba: ni bestiario, ni jefes, ni reliquias. Acá se
// autorepara, así que agregar zonas o jefes más adelante tampoco rompe saves.
function codex() {
  const c = S.codex;
  if (!c || !c.bosses || !c.kills || !c.relics ||
      Object.keys(c.bosses).length !== BOSSES.length ||
      Object.keys(c.kills).length !== BESTIARY.length) {
    S.codex = normCodex(c);
    invalidateCodex(); invalidateRelics();
  }
  return S.codex;
}

// ----- Estrellas de una ficha (0-3) -----
function bestiaryStars(id) {
  const n = codex().kills[id] || 0;
  let s = 0;
  for (const t of CODEX_TIERS) if (n >= t) s++;
  return s;
}
function bossStars(id) {
  const n = codex().bosses[id] || 0;
  let s = 0;
  for (const t of CODEX_BOSS_TIERS) if (n >= t) s++;
  return s;
}
const bestiaryNext = id => CODEX_TIERS.find(t => (codex().kills[id] || 0) < t) || null;
const bossNext = id => CODEX_BOSS_TIERS.find(t => (codex().bosses[id] || 0) < t) || null;

// ----- Bonus del códice (cacheado: dps() lo consulta decenas de veces por frame) -----
let _codexCache = null;
const invalidateCodex = () => { _codexCache = null; };
function codexStars() {
  if (_codexCache) return _codexCache;
  let stars = 0, maxStars = (BESTIARY.length + BOSSES.length) * 3;
  BESTIARY.forEach(b => { stars += bestiaryStars(b.id); });
  BOSSES.forEach(b => { stars += bossStars(b.id); });
  _codexCache = { stars, maxStars, damage: stars * CODEX_STAR_DMG };
  return _codexCache;
}
const codexMult = () => 1 + codexStars().damage;
const codexProgress = () => { const c = codexStars(); return c.maxStars ? c.stars / c.maxStars : 0; };

// ----- Registro -----
function codexKill(kind) {
  const c = codex();
  if (!(kind in c.kills)) return;
  const before = bestiaryStars(kind);
  c.kills[kind]++;
  if (bestiaryStars(kind) > before) {
    invalidateCodex();
    const b = bestiaryOf(kind);
    toast('📖 ' + b.ico + ' ' + b.n + ' · ' + '★'.repeat(bestiaryStars(kind)), 'epic');
  }
}
function codexBoss(id) {
  const c = codex();
  if (!(id in c.bosses)) return;
  const before = bossStars(id);
  c.bosses[id]++;
  const b = bossDef(id);
  if (bossStars(id) > before) {
    invalidateCodex();
    toast('📖 ' + b.ico + ' ' + b.name + ' · ' + '★'.repeat(bossStars(id)), 'epic');
  }
  // La reliquia se entrega la PRIMERA vez, garantizada: es la recompensa de la zona.
  if (!c.relics[b.relic.id]) {
    c.relics[b.relic.id] = 1;
    invalidateRelics();
    toast('🏺 ¡RELIQUIA! ' + b.relic.ico + ' ' + b.relic.n + ' — ' + b.relic.d, 'epic');
  }
}
function codexZone(idx) {
  const z = ZONES[Math.min(ZONES.length - 1, Math.max(0, idx))];
  if (!z) return;
  const c = codex();
  if (c.zones[z.id]) return false;
  c.zones[z.id] = 1;
  return true;
}
const loreSeen = key => !!codex().lore[key];
const markLore = key => { codex().lore[key] = 1; persist(); };
const countBossesBeaten = () => BOSSES.filter(b => (codex().bosses[b.id] || 0) > 0).length;
const countRelics = () => Object.keys(codex().relics || {}).length;
const hasRelic = id => !!codex().relics[id];

// ----- Reliquias: bonus pasivos que sobreviven al prestigio -----
// Cacheado igual que el códice; se invalida al conseguir una nueva.
let _relicCache = null;
const invalidateRelics = () => { _relicCache = null; };
function relicBonus() {
  if (_relicCache) return _relicCache;
  const b = { dmg: 0, hp: 0, gold: 0, venom: 0, crit: 0, critd: 0 };
  BOSSES.forEach(bo => {
    const r = bo.relic;
    if (!hasRelic(r.id)) return;
    switch (r.stat) {
      case 'dmg':   b.dmg += r.val; break;
      case 'hp':    b.hp += r.val; break;
      case 'gold':  b.gold += r.val; break;
      case 'venom': b.venom += r.val; break;
      case 'crit':  b.crit += r.val; break;
      case 'critd': b.critd += r.val; break;
      case 'dual':  b.dmg += r.val; b.gold += 0.10; break;   // 🔥 Brasa Eterna
      case 'dual2': b.dmg += r.val; b.hp += r.val; break;    // 🗺️ Borde del Mapa
    }
  });
  _relicCache = b;
  return b;
}
const relicDmg   = () => 1 + relicBonus().dmg;
const relicHp    = () => 1 + relicBonus().hp;
const relicGold  = () => 1 + relicBonus().gold;
const relicVenom = () => 1 + relicBonus().venom;
const relicCrit  = () => relicBonus().crit / 100;
const relicCritD = () => relicBonus().critd / 100;
