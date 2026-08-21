'use strict';
// ===== GEAR: equipo 2.0 (esencia, forja, rotura, mochila) =====
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
const enhanceCost = enhanceGold;
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
  if ((S.essence || 0) < es) return toast('❌ Falta esencia');
  if (protect && (S.amulets || 0) < 1) return toast('❌ Sin amuletos');
  S.gold -= g; S.essence -= es;
  if (Math.random() * 100 < enhanceChance(it.lvl)) {
    it.lvl++; toast('✅ ¡+' + it.lvl + '!'); Audio.SFX.buy();
  } else if (protect) {
    S.amulets--; toast('🧿 Protegido'); Audio.SFX.click();
  } else if (it.lvl >= 10 && Math.random() < 0.3) {
    removeFromEverywhere(it); toast('💀 ¡ROMPIÓ!'); Audio.SFX.death();
  } else {
    it.lvl = Math.max(0, it.lvl - 1); toast('❌ −1 nivel'); Audio.SFX.death();
  }
  persist();
}
function fuseItems(items, targetSlot) {
  if (items.length !== 3) return toast('⚗️ Seleccioná 3 items');
  const r = items[0].rarity;
  if (r >= 4) return toast('⚠️ Mítico no fusionable');
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
  S.gear.inv.push({ id: Date.now() + '' + Math.floor(Math.random() * 999), slot, rarity: r + 1, lvl: 0, stat: SLOT_DEFS[slot].stat, val, locked: false, subs });
  toast('⚗️ ¡Forja exitosa!'); Audio.SFX.levelup(); persist();
}
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
  if ((S.autoSalvage != null ? S.autoSalvage : -1) >= 0 && it.rarity <= S.autoSalvage) {
    S.essence = (S.essence || 0) + salvageEssence(it);
    if (typeof toast !== 'undefined') toast('♻️ Auto-fundido: +' + salvageEssence(it) + ' 💎');
    return;
  }
  if (S.gear.inv.length >= bagMax()) {
    S.essence = (S.essence || 0) + salvageEssence(it);
    if (typeof toast !== 'undefined') toast('🎒 Llena → ♻️ +' + salvageEssence(it) + ' 💎');
    return;
  }
  S.gear.inv.push(it);
  if (typeof toast !== 'undefined') toast(SLOT_DEFS[it.slot].icon + ' ¡' + RAR_NAMES[it.rarity] + '!');
}