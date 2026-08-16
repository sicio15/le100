'use strict';
// ===== SIM: simulación de combate compartida por los modos secundarios =====
// DEUDA #5 cerrada: daily/tower/rogue usaban la misma fórmula duplicada.
// fightChance(): probabilidad de victoria = (nuestro daño en 30s / HP enemigo),
// con "aguante" opcional que reduce la chance si no podés sobrevivir al daño entrante.
// opts: { our: daño propio custom, aguante: false para desactivar, min: piso de chance }
function fightChance(st, hpMul, atkMul, opts) {
  opts = opts || {};
  const our = (opts.our != null) ? opts.our : dps() * 30 * 1.4;
  const hp = eHP(st) * hpMul;
  let p = our / hp;
  if (opts.aguante !== false) {
    const atk = eDmg(st) * atkMul;
    const ag = maxHP() / (atk * 0.5);
    p = p * (ag >= 20 ? 1 : 0.5);
  }
  const min = (opts.min != null) ? opts.min : 0.05;
  return Math.max(min, Math.min(0.95, p));
}
const rollFight = ch => Math.random() < ch;