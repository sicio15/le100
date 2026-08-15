'use strict';
const KEY = 'le100_cache_v4';
const DEF = { name:'', gold:0, adn:0, stage:1, best:1, kills:0, ks:0, prestiges:0, prBase:1,
    ups:{ dmg:0, vit:0, regen:0, venom:0, fortune:0 }, ach:{}, last:Date.now(),
    gear:{ equipped:{ fang:null, shell:null, antenna:null, charm:null }, inv:[] },
    tickets:3, ticketDate:'', tower:1, towerBest:1, rlTickets:2, rlDate:'',
    arenaPts:0, arenaTickets:5, arenaDate:'', colony:'', colonyLevel:1, bossTicketDate:'' };
let S = loadCache();
let authed = false;

/* ===== Saneado de equipo (fix saves viejos/incompletos) ===== */
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
            subs: Array.isArray(it.subs) ? it.subs.slice(0, 2).map(x => ({ stat: String(x.stat || 'atk'), val: Math.max(0, Math.min(999, +x.val || 0)) })) : []
        };
    };
    const out = { equipped: {}, inv: [] };
    Object.keys(def.equipped).forEach(k => { out.equipped[k] = cleanItem((g.equipped || {})[k]); });
    out.inv = Array.isArray(g.inv) ? g.inv.slice(0, 30).map(cleanItem).filter(Boolean) : [];
    return out;
}

function loadCache() {
    try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s) {
            const out = Object.assign({}, JSON.parse(JSON.stringify(DEF)), s, { ups: Object.assign({}, DEF.ups, s.ups) });
            out.adn = Math.min(out.adn || 0, 5000);
            out.prBase = Math.max(1, out.prBase || 1);
            out.gear = normGear(s.gear);
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
setInterval(() => { if (authed) persist(); }, 5000);
window.addEventListener('visibilitychange', () => { if (authed) persist(); });

function applyServerSave(save) {
    const name = S.name;
    S = Object.assign({}, JSON.parse(JSON.stringify(DEF)), save || {});
    S.ups = Object.assign({}, DEF.ups, (save || {}).ups);
    S.gear = normGear((save || {}).gear);
    S.name = name; S.ks = 0;
}

/* ===== Equipo: bonuses, drops, enhance, poder ===== */
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
const hasBetterGear = () => S.gear.inv.some(it => itemPower(it) > itemPower(S.gear.equipped[it.slot]));

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
    return { id: Date.now() + '' + Math.floor(Math.random() * 999), slot, rarity, lvl: 0, stat: SLOT_DEFS[slot].stat, val, subs };
}
function dropItem(luck) {
    const it = rollItem(luck + Math.floor(S.stage / 10));
    if (S.gear.inv.length >= 30) {
        S.gold += 10 * (it.rarity + 1);
        if (typeof toast !== 'undefined') toast('📦 Mochila llena → +🪙 ' + (10 * (it.rarity + 1)));
        return;
    }
    S.gear.inv.push(it);
    if (typeof toast !== 'undefined') toast(SLOT_DEFS[it.slot].icon + ' ¡' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + '!');
}
const enhanceCost = it => Math.floor(20 * Math.pow(1.35, it.lvl) * (it.rarity + 1));
function checkTickets() {
    const d = new Date().toISOString().slice(0, 10);
    if (S.ticketDate !== d) { S.ticketDate = d; S.tickets = 3; }
}

/* ===== Fórmulas de balance (con gear + colonia) ===== */
const adnMult   = () => 1 + 0.1 * S.adn;
const dps       = () => 5 * Math.pow(1.3, S.ups.dmg) * adnMult() * (1 + gearBonuses().atk / 100) * (1 + 0.02 * ((S.colonyLevel || 1) - 1));
const maxHP     = () => 100 * Math.pow(1.22, S.ups.vit) * (1 + gearBonuses().hp / 100);
const regenPs   = () => maxHP() * (0.02 + 0.01 * S.ups.regen) * (1 + gearBonuses().regen / 100);
const critChance= () => Math.min(0.6, 0.2 + gearBonuses().crit / 100);
const critMult  = () => 2.2 + gearBonuses().critd / 100;
const venomCd   = () => Math.max(3, 7 - 0.3 * S.ups.venom);
const venomDm   = () => dps() * (2 + 0.5 * S.ups.venom);
const goldKill  = st => Math.ceil(3 * Math.pow(1.18, st) * (1 + 0.25 * S.ups.fortune) * adnMult());
const eHP       = st => 10 * Math.pow(1.27, st);
const eDmg      = st => 4 * Math.pow(1.22, st);
const cost      = k => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], S.ups[k]));
const isBossStage = () => S.stage % 5 === 0;
const killsNeed = () => isBossStage() ? 1 : 8;
const prTotal = x => Math.floor(3 * Math.sqrt(Math.max(0, x - 8)));
const prGain  = () => Math.max(0, prTotal(S.best) - prTotal(S.prBase || 1));