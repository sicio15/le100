'use strict';
// ===== STORE: estado S + persistencia + resets diarios =====
const KEY = 'le100_cache_v4';
const DEF = { name: '', gold: 0, adn: 0, stage: 1, best: 1, kills: 0, ks: 0, prestiges: 0, prBase: 1,
  ups: { dmg: 0, vit: 0, regen: 0, venom: 0, fortune: 0 }, ach: {}, last: Date.now(),
  gear: { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] },
  tickets: 3, ticketDate: '', tower: 1, towerBest: 1, rlTickets: 2, rlDate: '',
  arenaPts: 0, arenaTickets: 5, arenaDate: '', colony: '', colonyLevel: 1, bossTicketDate: '',
  mDate: '', mBase: { kills: 0, tower: 1, prestiges: 0 }, mClaimed: {},
  shop: { lv: {}, skins: [], skin: '' },
  stageRanks: {}, weekTower: 1, weekClaimedKey: 0, milestones: {},
  essence: 0, amulets: 0, bagSize: 30, autoSalvage: -1,
  flashType: '', flashEnd: 0, flashNext: 0,
  season: 1, seasonXp: 0, seasonLevel: 1, hasPremiumPass: false, seasonClaimed: {}, seasonStart: Date.now() };
let S = loadCache();
let authed = false;

function normGear(g) {
  const def = JSON.parse(JSON.stringify(DEF.gear));
  if (!g || typeof g !== 'object') return def;
  const cleanItem = it => {
    if (!it || typeof it !== 'object') return null;
    return { id: String(it.id || ''), slot: Object.prototype.hasOwnProperty.call(def.equipped, it.slot) ? it.slot : 'fang',
      rarity: Math.max(0, Math.min(4, +it.rarity || 0)), lvl: Math.max(0, Math.min(99, +it.lvl || 0)),
      stat: String(it.stat || 'atk'), val: Math.max(0, Math.min(999, +it.val || 0)), locked: !!it.locked,
      subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk'), val: Math.max(0, Math.min(999, +x.val || 0)) })) : [] };
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
  return { lv, skins: Array.isArray(sh.skins) ? sh.skins.map(x => String(x).slice(0, 12)) : [], skin: String(sh.skin || '').slice(0, 12) };
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
      out.flashType = String(s.flashType || '');
      out.flashEnd = Math.max(0, +s.flashEnd || 0);
      out.flashNext = Math.max(0, +s.flashNext || 0);
      out.season = Math.max(1, +s.season || 1);
      out.seasonXp = Math.max(0, +s.seasonXp || 0);
      out.seasonLevel = Math.max(1, Math.min(SEASON_MAX_LEVEL, +s.seasonLevel || 1));
      out.hasPremiumPass = !!s.hasPremiumPass;
      out.seasonClaimed = (s.seasonClaimed && typeof s.seasonClaimed === 'object') ? s.seasonClaimed : {};
      out.seasonStart = +s.seasonStart || Date.now();
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
// ===== Resets diarios (usa dayHas de events.js en tiempo de llamada) =====
function checkDailyResets() {
  const d = new Date().toISOString().slice(0, 10);
  if (S.ticketDate !== d) { S.ticketDate = d; S.tickets = 3 + (dayHas('daily') ? 1 : 0); }
  if (S.arenaDate !== d) { S.arenaDate = d; S.arenaTickets = 5; }
  if (S.rlDate !== d) { S.rlDate = d; S.rlTickets = 2 + (dayHas('soto') ? 1 : 0); }
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