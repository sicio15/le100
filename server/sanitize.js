'use strict';
// ===== SAVE SANITIZER: el cliente NUNCA decide sus números =====
const DEF_SAVE = { gold: 0, adn: 0, stage: 1, best: 1, kills: 0, prestiges: 0, prBase: 1,
  ups: { dmg: 0, vit: 0, regen: 0, venom: 0, fortune: 0 }, ach: {}, last: Date.now(),
  gear: { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] },
  tickets: 3, ticketDate: '', tower: 1, towerBest: 1, rlTickets: 2, rlDate: '',
  arenaPts: 0, arenaTickets: 5, arenaDate: '', colony: '', colonyLevel: 1, bossTicketDate: '' };

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
        subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk').slice(0, 8), val: Math.max(0, Math.min(999, +x.val || 0)) })) : [] };
    };
    const g = { equipped: { fang: null, shell: null, antenna: null, charm: null }, inv: [] };
    Object.keys(g.equipped).forEach(k => { g.equipped[k] = cleanItem((s.gear.equipped || {})[k]); });
    g.inv = Array.isArray(s.gear.inv) ? s.gear.inv.slice(0, 30).map(cleanItem).filter(Boolean) : [];
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
  o.last = Number(s.last) || Date.now();
  return o;
}

module.exports = { sanitizeSave, DEF_SAVE };