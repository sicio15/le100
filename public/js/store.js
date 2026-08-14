'use strict';
const KEY = 'le100_cache_v4';
const DEF = { name:'', gold:0, adn:0, stage:1, best:1, kills:0, ks:0, prestiges:0, prBase:1,
    ups:{ dmg:0, vit:0, regen:0, venom:0, fortune:0 }, ach:{}, last:Date.now() };
let S = loadCache();
let authed = false;

function loadCache() {
    try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s) {
            const out = Object.assign({}, JSON.parse(JSON.stringify(DEF)), s, { ups: Object.assign({}, DEF.ups, s.ups) });
            out.adn = Math.min(out.adn || 0, 5000);
            out.prBase = Math.max(1, out.prBase || 1);
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
    S.name = name; S.ks = 0;
}

/* ===== fórmulas de balance ===== */
const adnMult = () => 1 + 0.1 * S.adn;
const dps     = () => 5 * Math.pow(1.3, S.ups.dmg) * adnMult();
const maxHP   = () => 100 * Math.pow(1.22, S.ups.vit);
const regenPs = () => maxHP() * (0.02 + 0.01 * S.ups.regen);
const venomCd = () => Math.max(3, 7 - 0.3 * S.ups.venom);
const venomDm = () => dps() * (2 + 0.5 * S.ups.venom);
const goldKill= st => Math.ceil(3 * Math.pow(1.18, st) * (1 + 0.25 * S.ups.fortune) * adnMult());
const eHP     = st => 10 * Math.pow(1.27, st);
const eDmg    = st => 4 * Math.pow(1.22, st);
const cost    = k => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], S.ups[k]));
const isBossStage = () => S.stage % 5 === 0;
const killsNeed = () => isBossStage() ? 1 : 8;
const prTotal = x => Math.floor(3 * Math.sqrt(Math.max(0, x - 8)));
const prGain  = () => Math.max(0, prTotal(S.best) - prTotal(S.prBase || 1));