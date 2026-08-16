'use strict';
// ===== POWER: fórmulas server-side para simulaciones (arena/colonias) =====
function gearB(gear) {
  const b = { atk: 0, hp: 0, crit: 0, critd: 0, regen: 0 };
  if (!gear || !gear.equipped) return b;
  Object.values(gear.equipped).forEach(it => {
    if (!it) return;
    const m = 1 + 0.1 * (it.lvl || 0);
    b[it.stat] = (b[it.stat] || 0) + it.val * m;
    (it.subs || []).forEach(s => { b[s.stat] = (b[s.stat] || 0) + s.val; });
  });
  return b;
}
function powerOf(s) {
  const ups = s.ups || {}, b = gearB(s.gear);
  const adn = 1 + 0.1 * (s.adn || 0);
  const colB = 1 + 0.02 * ((s.colonyLevel || 1) - 1);
  return {
    dps: 5 * Math.pow(1.3, ups.dmg || 0) * adn * (1 + b.atk / 100) * colB,
    hp: 100 * Math.pow(1.22, ups.vit || 0) * (1 + b.hp / 100)
  };
}
const bossMax = c => Math.round(1e6 * (c.level || 1) * Math.max(1, (c.members || []).length));
module.exports = { gearB, powerOf, bossMax };