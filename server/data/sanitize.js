'use strict';
// ===== SAVE SANITIZER: el cliente NUNCA decide sus números =====
const DEF_SAVE = { gold: 0, adn: 0, stage: 1, best: 1, kills: 0, prestiges: 0, prBase: 1,
  ups: { dmg: 0, vit: 0, regen: 0, venom: 0, fortune: 0 }, ach: {}, last: Date.now(),
  gear: { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] },
  tickets: 3, ticketDate: '', tower: 1, towerBest: 1, rlTickets: 2, rlDate: '',
  arenaPts: 0, arenaTickets: 5, arenaDate: '', colony: '', colonyLevel: 1, bossTicketDate: '',
  mDate: '', mBase: { kills: 0, tower: 1, prestiges: 0 }, mClaimed: {},
  shop: { lv: {}, skins: [], skin: '' },
  look: { form: 'cienpies', hair: 'a', crown: false },
  stageRanks: {}, weekTower: 1, weekClaimedKey: 0, milestones: {},
  essence: 0, amulets: 0, bagSize: 30, autoSalvage: -1,
  flashType: '', flashEnd: 0, flashNext: 0, season: 1, seasonXp: 0, seasonLevel: 1, hasPremiumPass: false, seasonClaimed: {}, seasonStart: Date.now() };
const SHOP_MAX = { fury: 10, vita: 10, fort: 10, regen: 10, crit: 5 };
const SKIN_IDS = ['oro', 'hielo', 'sombra'];
const HAIR_IDS = ['a', 'b', 'c'];
const VALID_RANKS = ['S', 'A', 'B', 'C', 'R'];
const MILESTONE_IDS = ['t10', 't25', 't50', 't100'];
const FLASH_IDS = ['oro', 'drop', 'energia', 'dano'];
function sanitizeSave(s) {
  const o = JSON.parse(JSON.stringify(DEF_SAVE));
  if (!s || typeof s !== 'object') return o;
  const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
  o.gold = num(s.gold, 1e12); o.adn = num(s.adn, 5000);
  o.stage = Math.max(1, num(s.stage, 9999)); o.best = Math.max(1, num(s.best, 9999));
  o.prBase = Math.max(1, num(s.prBase, 9999));
  o.kills = num(s.kills, 1e9); o.prestiges = num(s.prestiges, 1e6);
  if (s.ups) Object.keys(o.ups).forEach(k => o.ups[k] = num(s.ups[k], 999));
  if (s.ach) o.ach = Object.fromEntries(Object.entries(s.ach).filter(([, v]) => v).map(([k]) => [k, 1]));
  if (s.gear && typeof s.gear === 'object') {
    const cleanItem = it => {
      if (!it || typeof it !== 'object') return null;
      return { id: String(it.id || '').slice(0, 24),
        slot: ['fang', 'shell', 'antenna', 'charm'].includes(it.slot) ? it.slot : 'fang',
        rarity: Math.max(0, Math.min(4, +it.rarity || 0)), lvl: Math.max(0, Math.min(99, +it.lvl || 0)),
        stat: String(it.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +it.val || 0)),
        locked: !!it.locked,
        subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +x.val || 0)) })) : [] };
    };
    const g = { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] };
    Object.keys(g.equipped).forEach(k => { g.equipped[k] = cleanItem((s.gear.equipped || {})[k]); });
    g.inv = Array.isArray(s.gear.inv) ? s.gear.inv.slice(0, 100).map(cleanItem).filter(Boolean) : [];
    o.gear = g;
  }
  o.tickets = Number.isFinite(+s.tickets) ? Math.max(0, Math.min(3, +s.tickets)) : 3;
  o.ticketDate = String(s.ticketDate || '').slice(0, 10);
  o.tower = Math.max(1, num(s.tower, 9999)); o.towerBest = Math.max(1, num(s.towerBest, 9999));
  o.rlTickets = Number.isFinite(+s.rlTickets) ? Math.max(0, Math.min(2, +s.rlTickets)) : 2;
  o.rlDate = String(s.rlDate || '').slice(0, 10);
  o.arenaPts = num(s.arenaPts, 1e9);
  o.arenaTickets = Number.isFinite(+s.arenaTickets) ? Math.max(0, Math.min(5, +s.arenaTickets)) : 5;
  o.arenaDate = String(s.arenaDate || '').slice(0, 10);
  o.colony = String(s.colony || '').slice(0, 20);
  o.colonyLevel = Math.max(1, num(s.colonyLevel, 999));
  o.bossTicketDate = String(s.bossTicketDate || '').slice(0, 10);
  o.mDate = String(s.mDate || '').slice(0, 10);
  const mb = s.mBase || {};
  o.mBase = { kills: num(mb.kills, 1e9), tower: Math.max(1, num(mb.tower, 9999)), prestiges: num(mb.prestiges, 1e6) };
  o.mClaimed = (s.mClaimed && typeof s.mClaimed === 'object')
    ? Object.fromEntries(Object.entries(s.mClaimed).filter(([, v]) => v).map(([k]) => [String(k).slice(0, 16), 1]))
    : {};
  if (s.shop && typeof s.shop === 'object') {
    const lv = {};
    Object.keys(SHOP_MAX).forEach(k => { lv[k] = Math.max(0, Math.min(SHOP_MAX[k], num((s.shop.lv || {})[k], SHOP_MAX[k]))); });
    o.shop.lv = lv;
    o.shop.skins = Array.isArray(s.shop.skins) ? s.shop.skins.map(x => String(x).slice(0, 12)).filter(x => SKIN_IDS.includes(x)) : [];
    o.shop.skin = o.shop.skins.includes(String(s.shop.skin || '')) ? String(s.shop.skin) : '';
  }
  if (s.look && typeof s.look === 'object') {
    o.look = {
      form: s.look.form === 'humano' ? 'humano' : 'cienpies',
      hair: HAIR_IDS.includes(String(s.look.hair || '')) ? String(s.look.hair) : 'a',
      crown: !!s.look.crown
    };
  }
  if (s.stageRanks && typeof s.stageRanks === 'object') {
    const ranks = {};
    Object.entries(s.stageRanks).forEach(([k, v]) => {
      const st = parseInt(k, 10);
      if (!isNaN(st) && st >= 1 && st <= 9999 && VALID_RANKS.includes(v)) ranks[st] = v;
    });
    o.stageRanks = ranks;
  }
  o.weekTower = Math.max(1, num(s.weekTower, 9999));
  o.weekClaimedKey = Number.isFinite(+s.weekClaimedKey) ? +s.weekClaimedKey : 0;
  if (s.milestones && typeof s.milestones === 'object') {
    const ms = {};
    Object.entries(s.milestones).forEach(([k, v]) => { if (MILESTONE_IDS.includes(k) && v) ms[k] = 1; });
    o.milestones = ms;
  }
  o.essence = num(s.essence, 1e9);
  o.amulets = num(s.amulets, 9999);
  o.bagSize = Math.max(30, Math.min(100, num(s.bagSize, 100) || 30));
  o.autoSalvage = Math.max(-1, Math.min(3, Number.isFinite(+s.autoSalvage) ? +s.autoSalvage : -1));
  // LOTE 17: eventos relámpago
  o.flashType = FLASH_IDS.includes(String(s.flashType || '')) ? String(s.flashType) : '';
  o.flashEnd = num(s.flashEnd, 1e15);
  o.flashNext = num(s.flashNext, 1e15);
  o.last = Number(s.last) || Date.now();
  o.season = Math.max(1, num(s.season, 999));
o.seasonXp = num(s.seasonXp, 1e9);
o.seasonLevel = Math.max(1, Math.min(SEASON_MAX_LEVEL, num(s.seasonLevel, SEASON_MAX_LEVEL)));
o.hasPremiumPass = !!s.hasPremiumPass;
o.seasonClaimed = (s.seasonClaimed && typeof s.seasonClaimed === 'object')
  ? Object.fromEntries(Object.entries(s.seasonClaimed).filter(([, v]) => v).map(([k]) => [String(k).slice(0, 20), 1]))
  : {};
o.seasonStart = num(s.seasonStart, 1e15) || Date.now();
  return o;
}
module.exports = { sanitizeSave, DEF_SAVE };