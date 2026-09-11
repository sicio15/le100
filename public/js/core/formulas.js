'use strict';
// ===== FORMULAS: dps, vida, oro, costos, prestigio =====
const shopLv = k => (S.shop && S.shop.lv && S.shop.lv[k]) || 0;
const adnMult = () => 1 + 0.1 * S.adn;
// FIX L26: el mapa mostraba "+X% daño por rangos S/A" desde siempre, pero el bonus
// nunca entraba en dps(). Ahora sí (cacheado en progression.js para no costar frames).
const rankMult = () => 1 + (typeof getTotalRankBonus === 'function' ? getTotalRankBonus().damage : 0);
// L28: dos multiplicadores permanentes nuevos — el códice (estrellas del bestiario)
// y las reliquias de los Jefes de Zona. Ambos están cacheados en core/codex.js.
const dps = () => 5 * Math.pow(1.3, S.ups.dmg) * adnMult() * (1 + gearBonuses().atk / 100)
  * (1 + 0.02 * ((S.colonyLevel || 1) - 1)) * (1 + 0.05 * shopLv('fury'))
  * (evHas('furia') ? 1.3 : 1) * flashMult('dano') * rankMult()
  * codexMult() * relicDmg();
// L26: daño REAL en combate = dps() * combo. Los modos idle (torre/arena/sotobosque)
// siguen usando dps() puro, así el combo no infla simulaciones fuera de pantalla.
// L28: …y la maldición de jefe lo recorta mientras dura.
const liveDps = () => dps()
  * (typeof comboMult === 'function' ? comboMult() : 1)
  * (typeof curseMult === 'function' ? curseMult() : 1);
const maxHP = () => 100 * Math.pow(1.22, S.ups.vit) * (1 + gearBonuses().hp / 100)
  * (1 + 0.05 * shopLv('vita')) * (evHas('vital') ? 1.3 : 1) * relicHp();
const regenPs = () => maxHP() * (0.02 + 0.01 * S.ups.regen) * (1 + gearBonuses().regen / 100)
  * (1 + 0.08 * shopLv('regen')) * (evHas('vital') ? 1.3 : 1);
// L27: el Frenesí suma crítico mientras dura (tope 0.85 para que no sea 100% seguro)
const critChance = () => Math.min(0.85, 0.2 + gearBonuses().crit / 100 + 0.02 * shopLv('crit')
  + (evHas('precision') ? 0.25 : 0) + (typeof buffCrit === 'function' ? buffCrit() : 0) + relicCrit());
const critMult = () => 2.2 + gearBonuses().critd / 100 + relicCritD();
const venomCd = () => Math.max(2, (Math.max(3, 7 - 0.3 * S.ups.venom)) - (evHas('toxico') ? 2 : 0));
const venomDm = () => liveDps() * (2 + 0.5 * S.ups.venom) * (evHas('toxico') ? 1.5 : 1) * relicVenom();
const goldKill = st => Math.ceil(3 * Math.pow(1.18, st) * (1 + 0.25 * S.ups.fortune) * adnMult()
  * (1 + 0.05 * shopLv('fort')) * (evHas('fiebre') ? 2 : 1) * (dayHas('oro') ? 2 : 1)
  * flashMult('oro') * relicGold());
const eHP = st => 10 * Math.pow(1.27, st);
const eDmg = st => 4 * Math.pow(1.22, st);
const cost = k => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], S.ups[k]) * (evHas('racha') ? 0.8 : 1));
const isBossStage = () => S.stage % 5 === 0;
const killsNeed = () => isBossStage() ? 1 : 8;
const prTotal = x => Math.floor(3 * Math.sqrt(Math.max(0, x - 8)));
const prGain = () => Math.max(0, prTotal(S.best) - prTotal(S.prBase || 1));
