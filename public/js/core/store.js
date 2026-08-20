'use strict';
// ===== STORE: estado S + fórmulas + persistencia =====
// LOTE 14: Equipo 2.0 (esencia, amuletos, forja, rotura, mochila ampliable, auto-fundir)
const KEY = 'le100_cache_v4';
const DEF = { name: '', gold: 0, adn: 0, stage: 1, best: 1, kills: 0, ks: 0, prestiges: 0, prBase: 1,
  ups: { dmg: 0, vit: 0, regen: 0, venom: 0, fortune: 0 }, ach: {}, last: Date.now(),
  gear: { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] },
  tickets: 3, ticketDate: '', tower: 1, towerBest: 1, rlTickets: 2, rlDate: '',
  arenaPts: 0, arenaTickets: 5, arenaDate: '', colony: '', colonyLevel: 1, bossTicketDate: '',
  mDate: '', mBase: { kills: 0, tower: 1, prestiges: 0 }, mClaimed: {},
  shop: { lv: {}, skins: [], skin: '' },
  stageRanks: {}, weekTower: 1, weekClaimedKey: 0, milestones: {},
  essence: 0, amulets: 0, bagSize: 30, autoSalvage: -1 };
let S = loadCache();
let authed = false;
function normGear(g) {
  const def = JSON.parse(JSON.stringify(DEF.gear));
  if (!g || typeof g !== 'object') return def;
  const cleanItem = it => {
    if (!it || typeof it !== 'object') return null;
    return {
      id: String(it.id || ''),
      slot: Object.prototype.hasOwnProperty.call(def.equipped, it.slot) ? it.slot : 'fang',
      rarity: Math.max(0, Math.min(4, +it.rarity || 0)),
      lvl: Math.max(0, Math.min(99, +it.lvl || 0)),
      stat: String(it.stat || 'atk'),
      val: Math.max(0, Math.min(999, +it.val || 0)),
      locked: !!it.locked,
      subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk'), val: Math.max(0, Math.min(999, +x.val || 0)) })) : []
    };
  };
  const out = { equipped: {}, inv: [] };
  Object.keys(def.equipped).forEach(k => { out.equipped[k] = cleanItem((g.equipped || {})[k]); });
  out.inv = Array.isArray(g.inv) ? g.inv.slice(0, 100).map(cleanItem).filter(Boolean) : [];
  return out;
}
function normShop(sh) {
  const def = JSON.parse(JSON.stringify(DEF.shop));
  if (!sh || typeof sh !== 'object') return def;
  const lv = {};
  if (sh.lv && typeof sh.lv === 'object') Object.keys(sh.lv).forEach(k => { lv[k] = Math.max(0, Math.min(99, +sh.lv[k] || 0)); });
  return { lv,
    skins: Array.isArray(sh.skins) ? sh.skins.map(x => String(x).slice(0, 12)) : [],
    skin: String(sh.skin || '').slice(0, 12) };
}
function loadCache() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) {
      const out = Object.assign({}, JSON.parse(JSON.stringify(DEF)), s, { ups: Object.assign({}, DEF.ups, s.ups) });
      out.adn = Math.min(out.adn || 0, 5000);
      out.prBase = Math.max(1, out.prBase || 1);
      out.gear = normGear(s.gear);
      out.mBase = Object.assign({ kills: 0, tower: 1, prestiges: 0 }, s.mBase || {});
      out.mClaimed = (s.mClaimed && typeof s.mClaimed === 'object') ? s.mClaimed : {};
      out.shop = normShop(s.shop);
      out.stageRanks = (s.stageRanks && typeof s.stageRanks === 'object') ? s.stageRanks : {};
      out.milestones = (s.milestones && typeof s.milestones === 'object') ? s.milestones : {};
      out.essence = Math.max(0, +s.essence || 0);
      out.amulets = Math.max(0, +s.amulets || 0);
      out.bagSize = Math.max(30, Math.min(100, +s.bagSize || 30));
      out.autoSalvage = Math.max(-1, Math.min(3, +s.autoSalvage != null ? +s.autoSalvage : -1));
      return out;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEF));
}
function persist() {
  S.last = Date.now();
  localStorage.setItem(KEY, JSON.stringify(S));
  if (authed) netSendSave(S);
}
setInterval(persist, 5000);
window.addEventListener('visibilitychange', () => persist());
window.addEventListener('beforeunload', () => persist());
window.addEventListener('pagehide', () => persist());
function applyServerSave(save) {
  const name = S.name;
  S = Object.assign({}, JSON.parse(JSON.stringify(DEF)), save || {});
  S.ups = Object.assign({}, DEF.ups, (save || {}).ups);
  S.gear = normGear((save || {}).gear);
  S.mBase = Object.assign({ kills: 0, tower: 1, prestiges: 0 }, (save || {}).mBase || {});
  S.mClaimed = ((save || {}).mClaimed && typeof (save || {}).mClaimed === 'object') ? save.mClaimed : {};
  S.shop = normShop((save || {}).shop);
  S.stageRanks = ((save || {}).stageRanks && typeof (save || {}).stageRanks === 'object') ? save.stageRanks : {};
  S.milestones = ((save || {}).milestones && typeof (save || {}).milestones === 'object') ? save.milestones : {};
  S.name = name; S.ks = 0;
}
// ===== EQUIPO 2.0: esencia, amuletos, forja, rotura =====
const ESSENCE_BY_RAR = [1, 3, 8, 20, 50];
const FUSE_COST = [3, 10, 25, 60];            // esencia p/ fusionar rareza r → r+1
const AMULET_DROP_CHANCE = [0, 0, 0.05, 0.15, 0.4];
const bagMax = () => S.bagSize || 30;
const bagExpandCost = () => 25000 * Math.pow(4, ((S.bagSize || 30) - 30) / 10);
function expandBag() {
  if (bagMax() >= 100) return toast('🎒 Mochila al máximo');
  const c = bagExpandCost();
  if (S.gold < c) return toast('❌ Necesitás ' + fmt(c) + ' 🪙');
  S.gold -= c; S.bagSize = bagMax() + 10;
  toast('🎒 Mochila ampliada a ' + S.bagSize);
  Audio.SFX.buy(); persist();
}
const salvageEssence = it => ESSENCE_BY_RAR[it.rarity] * (1 + Math.floor((it.lvl || 0) / 10));
function destroyItem(it) {
  if (!it || it.locked) return toast('🔒 Item bloqueado');
  S.gear.inv = S.gear.inv.filter(x => x !== it);
  const es = salvageEssence(it);
  S.essence = (S.essence || 0) + es;
  let msg = '💥 Fundido: +' + es + ' 💎';
  if (Math.random() < AMULET_DROP_CHANCE[it.rarity]) { S.amulets = (S.amulets || 0) + 1; msg += ' +1 🧿'; }
  toast(msg); Audio.SFX.coin(); persist();
}
const enhanceChance = lvl => lvl < 5 ? 100 : lvl < 10 ? 80 : lvl < 15 ? 60 : lvl < 20 ? 45 : 30;
const enhanceGold = it => Math.floor(20 * Math.pow(1.35, it.lvl) * (it.rarity + 1));
const enhanceCost = enhanceGold; // alias retro-compat
const enhanceEssence = it => (it.rarity + 1) * (1 + Math.floor(it.lvl / 5));
function removeFromEverywhere(it) {
  Object.keys(S.gear.equipped).forEach(k => { if (S.gear.equipped[k] === it) S.gear.equipped[k] = null; });
  S.gear.inv = S.gear.inv.filter(x => x !== it);
}
function enhanceItem(it, protect) {
  if (!it) return;
  if (it.lvl >= 99) return toast('⚠️ Nivel máximo');
  const g = enhanceGold(it), es = enhanceEssence(it);
  if (S.gold < g) return toast('❌ Oro insuficiente');
  if ((S.essence || 0) < es) return toast('❌ Falta esencia (fundí items 💥)');
  if (protect && (S.amulets || 0) < 1) return toast('❌ Sin amuletos 🧿');
  S.gold -= g; S.essence -= es;
  if (Math.random() * 100 < enhanceChance(it.lvl)) {
    it.lvl++;
    toast('✅ ¡+' + it.lvl + '!'); Audio.SFX.buy();
  } else if (protect) {
    S.amulets--;
    toast('🧿 Falló, pero el amuleto protegió el item'); Audio.SFX.click();
  } else if (it.lvl >= 10 && Math.random() < 0.3) {
    removeFromEverywhere(it);
    toast('💀 ¡El item se ROMPIÓ!'); Audio.SFX.death();
  } else {
    it.lvl = Math.max(0, it.lvl - 1);
    toast('❌ Falló: −1 nivel'); Audio.SFX.death();
  }
  persist();
}
function fuseItems(items, targetSlot) {
  if (items.length !== 3) return toast('⚗️ Seleccioná 3 items');
  const r = items[0].rarity;
  if (r >= 4) return toast('⚠️ Mítico no se fusiona');
  if (items.some(x => x.rarity !== r || x.locked)) return toast('❌ Misma rareza y sin 🔒');
  const cost = FUSE_COST[r];
  if ((S.essence || 0) < cost) return toast('❌ Necesitás ' + cost + ' 💎');
  S.essence -= cost;
  items.forEach(it => { S.gear.inv = S.gear.inv.filter(x => x !== it); });
  const slotKeys = Object.keys(SLOT_DEFS);
  const slot = slotKeys.includes(targetSlot) ? targetSlot : slotKeys[Math.random() * 4 | 0];
  const val = Math.round((3 + (r + 1) * 3 + Math.random() * 3) * 10) / 10;
  const subs = [];
  const nSub = (r + 1) >= 3 ? 2 : (r + 1) >= 1 ? 1 : 0;
  for (let i = 0; i < nSub; i++) {
    const st = SUB_POOL[Math.random() * SUB_POOL.length | 0];
    subs.push({ stat: st, val: Math.round((1 + (r + 1) * 1.5 + Math.random() * 2) * 10) / 10 });
  }
  const nu = { id: Date.now() + '' + Math.floor(Math.random() * 999), slot, rarity: r + 1, lvl: 0, stat: SLOT_DEFS[slot].stat, val, locked: false, subs };
  S.gear.inv.push(nu);
  toast('⚗️ ¡Forja: ' + RAR_NAMES[nu.rarity] + ' ' + SLOT_DEFS[nu.slot].name + '!');
  Audio.SFX.levelup(); persist();
}
// ===== Equipo clásico =====
function gearBonuses() {
  const b = { atk: 0, hp: 0, crit: 0, critd: 0, regen: 0 };
  Object.values(S.gear.equipped).forEach(it => {
    if (!it) return;
    const mult = 1 + 0.1 * (it.lvl || 0);
    b[it.stat] = (b[it.stat] || 0) + it.val * mult;
    (it.subs || []).forEach(s => { b[s.stat] = (b[s.stat] || 0) + s.val; });
  });
  return b;
}
const itemPower = it => it ? (it.rarity || 0) * 20 + (it.lvl || 0) * 2 + (it.val || 0) + (it.subs || []).reduce((a, s) => a + (s.val || 0), 0) : 0;
const gearPower = () => Object.values(S.gear.equipped).reduce((a, it) => a + itemPower(it), 0);
const hasBetterGear = () => S.gear.inv.some(it => !it.locked && itemPower(it) > itemPower(S.gear.equipped[it.slot]));
function rollItem(luck) {
  const slotKeys = Object.keys(SLOT_DEFS);
  const slot = slotKeys[Math.random() * slotKeys.length | 0];
  const w = [50, 30, 14, 5, 1].map((x, i) => x + (i >= 2 ? luck * 2 : 0));
  const tot = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot, rarity = 4;
  for (let i = 0; i < 5; i++) { if (r < w[i]) { rarity = i; break; } r -= w[i]; }
  const val = Math.round((3 + rarity * 3 + Math.random() * 3) * 10) / 10;
  const subs = [];
  const nSub = rarity >= 3 ? 2 : rarity >= 1 ? 1 : 0;
  for (let i = 0; i < nSub; i++) {
    const st = SUB_POOL[Math.random() * SUB_POOL.length | 0];
    subs.push({ stat: st, val: Math.round((1 + rarity * 1.5 + Math.random() * 2) * 10) / 10 });
  }
  return { id: Date.now() + '' + Math.floor(Math.random() * 999), slot, rarity, lvl: 0, stat: SLOT_DEFS[slot].stat, val, locked: false, subs };
}
function dropItem(luck) {
  const it = rollItem(luck + Math.floor(S.stage / 10));
  // auto-fundir QoL
  if ((S.autoSalvage != null ? S.autoSalvage : -1) >= 0 && it.rarity <= S.autoSalvage) {
    const es = salvageEssence(it);
    S.essence = (S.essence || 0) + es;
    if (typeof toast !== 'undefined') toast('♻️ Auto-fundido: +' + es + ' 💎');
    return;
  }
  if (S.gear.inv.length >= bagMax()) {
    const es = salvageEssence(it);
    S.essence = (S.essence || 0) + es;
    if (typeof toast !== 'undefined') toast('🎒 Llena → ♻️ +' + es + ' 💎');
    return;
  }
  S.gear.inv.push(it);
  if (typeof toast !== 'undefined') toast(SLOT_DEFS[it.slot].icon + ' ¡' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + '!');
}
// ===== Resets / eventos / fórmulas (sin cambios) =====
function checkDailyResets() {
  const d = new Date().toISOString().slice(0, 10);
  if (S.ticketDate !== d) { S.ticketDate = d; S.tickets = 3; }
  if (S.arenaDate !== d) { S.arenaDate = d; S.arenaTickets = 5; }
  if (S.rlDate !== d) { S.rlDate = d; S.rlTickets = 2; }
  if (S.mDate !== d) {
    S.mDate = d;
    S.mBase = { kills: S.kills, tower: S.tower, prestiges: S.prestiges };
    S.mClaimed = {};
  }
}
const checkTickets = checkDailyResets;
const weekNow = () => Math.floor(Date.now() / 604800000);
function checkWeekReset() {
  if ((S.weekTower || 1) < 1) S.weekTower = 1;
}
const TOWER_MILESTONES = [
  { id: 't10',  f: 10,  g: 2000, a: 0,  t: '🥾 Escalador Novato' },
  { id: 't25',  f: 25,  g: 0,    a: 2,  t: '🧗 Alpinista' },
  { id: 't50',  f: 50,  g: 0,    a: 10, t: '🏔️ Maestro de la Torre' },
  { id: 't100', f: 100, g: 0,    a: 25, t: '👑 Conquistador de la Torre' }
];
function checkMilestones() {
  TOWER_MILESTONES.forEach(m => {
    if (S.towerBest >= m.f && !S.milestones[m.id]) {
      S.milestones[m.id] = 1;
      if (m.g) S.gold += m.g;
      if (m.a) S.adn += m.a;
      toast('🏆 HITO: ' + m.t + (m.g ? ' +' + fmt(m.g) + '🪙' : '') + (m.a ? ' +' + m.a + '🧬' : ''));
      Audio.SFX.levelup();
      persist();
    }
  });
}
const EVENTS = [
  { id: 'fiebre',    n: '🪙 Fiebre del Oro',       d: 'Todo el oro x2' },
  { id: 'precision', n: '🎯 Precisión Total',      d: '+25% crítico' },
  { id: 'furia',     n: '🗡️ Furia Ancestral',      d: '+30% daño' },
  { id: 'vital',     n: '❤️ Vitalidad Floreciente', d: '+30% vida y regeneración' },
  { id: 'toxico',    n: '☠️ Marea Tóxica',         d: 'Veneno +50% y cooldown -2s' },
  { id: 'racha',     n: '🛒 Semana de Ofertas',    d: 'Mejoras 20% más baratas' }
];
let _evW = -1, _ev = EVENTS[0];
function weekEvent() {
  const w = Math.floor(Date.now() / 604800000);
  if (w !== _evW) { _evW = w; _ev = EVENTS[w % EVENTS.length]; }
  return _ev;
}
const evHas = id => weekEvent().id === id;
const shopLv = k => (S.shop && S.shop.lv && S.shop.lv[k]) || 0;
const adnMult   = () => 1 + 0.1 * S.adn;
const dps       = () => 5 * Math.pow(1.3, S.ups.dmg) * adnMult() * (1 + gearBonuses().atk / 100) * (1 + 0.02 * ((S.colonyLevel || 1) - 1)) * (1 + 0.05 * shopLv('fury')) * (evHas('furia') ? 1.3 : 1);
const maxHP     = () => 100 * Math.pow(1.22, S.ups.vit) * (1 + gearBonuses().hp / 100) * (1 + 0.05 * shopLv('vita')) * (evHas('vital') ? 1.3 : 1);
const regenPs   = () => maxHP() * (0.02 + 0.01 * S.ups.regen) * (1 + gearBonuses().regen / 100) * (1 + 0.08 * shopLv('regen')) * (evHas('vital') ? 1.3 : 1);
const critChance= () => Math.min(0.75, 0.2 + gearBonuses().crit / 100 + 0.02 * shopLv('crit') + (evHas('precision') ? 0.25 : 0));
const critMult  = () => 2.2 + gearBonuses().critd / 100;
const venomCd   = () => Math.max(2, (Math.max(3, 7 - 0.3 * S.ups.venom)) - (evHas('toxico') ? 2 : 0));
const venomDm   = () => dps() * (2 + 0.5 * S.ups.venom) * (evHas('toxico') ? 1.5 : 1);
const goldKill  = st => Math.ceil(3 * Math.pow(1.18, st) * (1 + 0.25 * S.ups.fortune) * adnMult() * (1 + 0.05 * shopLv('fort')) * (evHas('fiebre') ? 2 : 1));
const eHP       = st => 10 * Math.pow(1.27, st);
const eDmg      = st => 4 * Math.pow(1.22, st);
const cost      = k => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], S.ups[k]) * (evHas('racha') ? 0.8 : 1));
const isBossStage = () => S.stage % 5 === 0;
const killsNeed = () => isBossStage() ? 1 : 8;
const prTotal = x => Math.floor(3 * Math.sqrt(Math.max(0, x - 8)));
const prGain  = () => Math.max(0, prTotal(S.best) - prTotal(S.prBase || 1));
function getStageRank(timeSeconds, hadDeaths, isBoss) {
  if (isBoss) return timeSeconds < 20 ? 'S' : 'R';
  if (timeSeconds < 15 && !hadDeaths) return 'S';
  if (timeSeconds < 30) return 'A';
  if (timeSeconds < 60) return 'B';
  return 'C';
}
const RANK_COLORS = { S: '#ffd700', A: '#7bed9f', B: '#7efcff', C: '#cfcfcf', R: '#ff4757' };
function travelToStage(targetStage) {
  if (targetStage < 1 || targetStage > S.best) return toast('❌ Etapa no disponible');
  if (targetStage === S.stage) return toast('Ya estás en esa etapa');
  S.stage = targetStage;
  S.ks = 0;
  resetSquad();
  reEnter();
  enemies = [];
  persist();
  toast('🗺️ Viajaste a la Etapa ' + targetStage);
  Audio.SFX.click();
}
function getChapterStats(chapterIndex) {
  const startStage = chapterIndex * 10 + 1;
  const endStage = chapterIndex * 10 + 10;
  const ranks = { S: 0, A: 0, B: 0, C: 0, R: 0, locked: 0 };
  for (let st = startStage; st <= endStage; st++) {
    if (st > S.best) { ranks.locked++; continue; }
    const rank = S.stageRanks[st] || 'C';
    ranks[rank] = (ranks[rank] || 0) + 1;
  }
  return { ranks, total: endStage - startStage + 1 };
}
function getTotalRankBonus() {
  let sCount = 0, aCount = 0;
  Object.values(S.stageRanks).forEach(r => {
    if (r === 'S') sCount++;
    else if (r === 'A') aCount++;
  });
  return { damage: (sCount * 0.5 + aCount * 0.2) / 100, sCount, aCount };
}
function skipToRecord() {
  if (S.stage >= S.best) return toast('Ya estás en tu récord');
  S.stage = S.best;
  S.ks = 0;
  resetSquad();
  reEnter();
  enemies = [];
  persist();
  toast('⚡ Saltaste a tu récord: Etapa ' + S.best);
  Audio.SFX.levelup();
}