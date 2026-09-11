'use strict';
// ===== EQUIPO 2.0 UI =====
// FIX: gearPower formateado (sin coma flotante) + estilos inline de seguridad
// (el layout de filas no depende de que cargue algún CSS en particular).
let fuseSel = [];
let enhTarget = null;
let bagSort = 'rar';
wire('btnGear', 'click', openGear);
wire('gearClose', 'click', closeGear);
wire('gearCloseX', 'click', closeGear);
function openGear() {
  fuseSel = []; enhTarget = null;
  renderGear();
  $('mGear').style.display = 'flex';
  Audio.SFX.click();
  if (typeof fireGearOpen === 'function') fireGearOpen();
}
function closeGear() { $('mGear').style.display = 'none'; }
function slotIcon(sl) { return (typeof picOr === 'function') ? picOr(SLOT_DEFS[sl].pic, SLOT_DEFS[sl].icon, 14) : SLOT_DEFS[sl].icon; }
function itemLabel(it) { return slotIcon(it.slot) + ' ' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + ' +' + it.lvl + (it.locked ? ' 🔒' : ''); }
function itemLabelPlain(it) { return SLOT_DEFS[it.slot].icon + ' ' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + ' +' + it.lvl + (it.locked ? ' 🔒' : ''); }
function itemStats(it) {
  const mult = 1 + 0.1 * it.lvl;
  let s = STAT_NAMES[it.stat] + ' +' + (Math.round(it.val * mult * 10) / 10);
  (it.subs || []).forEach(x => { s += ' · ' + STAT_NAMES[x.stat] + ' +' + x.val; });
  return s;
}
function mkBtn(txt, fn, cls, tip) {
  const b = document.createElement('button');
  b.className = cls || 'claim';
  b.textContent = txt;
  if (tip) b.title = tip;
  b.onclick = fn;
  return b;
}
function toggleFuse(it) {
  const i = fuseSel.indexOf(it);
  if (i >= 0) { fuseSel.splice(i, 1); return; }
  if (fuseSel.length >= 3) return toast('⚗️ Máximo 3');
  if (it.locked) return toast('🔒 Bloqueado');
  if (it.rarity >= 4) return toast('⚠️ Mítico no fusionable');
  if (fuseSel.length && fuseSel[0].rarity !== it.rarity) return toast('❌ Misma rareza');
  fuseSel.push(it);
}
const BAG_SORTS = {
  rar: (a, b) => b.rarity - a.rarity || itemPower(b) - itemPower(a),
  pow: (a, b) => itemPower(b) - itemPower(a),
  ess: (a, b) => salvageEssence(b) - salvageEssence(a)
};
function renderGear() {
  const box = $('gearBody'); if (!box) return;
  box.innerHTML = '';
  // ===== header =====
  const head = document.createElement('div');
  head.style.cssText = 'grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12px;';
  head.innerHTML =
    '<span title="Esencia: fundí items para obtenerla">💎 <b style="color:#7efcff">' + (S.essence || 0) + '</b></span>' +
    '<span title="Amuletos: protegen mejoras">🧿 <b style="color:#c86bfa">' + (S.amulets || 0) + '</b></span>' +
    '<span>🎒 ' + S.gear.inv.length + '/' + bagMax() + '</span>';
  const bExp = mkBtn(bagMax() >= 100 ? 'MAX' : '+10 🪙' + fmt(bagExpandCost()), () => { expandBag(); renderGear(); }, 'claim', 'Ampliar mochila +10');
  if (bagMax() >= 100) bExp.disabled = true;
  head.appendChild(bExp);
  const sel = document.createElement('select');
  sel.style.cssText = 'background:#1a2340;color:#fff;border:1px solid #3a4a7a;border-radius:8px;padding:4px;font-size:11px;';
  sel.innerHTML = '<option value="-1">♻️ Auto-fundir: OFF</option>' + [0, 1, 2, 3].map(r => '<option value="' + r + '">♻️ Auto ≤ ' + RAR_NAMES[r] + '</option>').join('');
  sel.value = String(S.autoSalvage == null ? -1 : S.autoSalvage);
  sel.onchange = () => { S.autoSalvage = +sel.value; persist(); toast('♻️ Auto-fundir ' + (S.autoSalvage < 0 ? 'OFF' : '≤ ' + RAR_NAMES[S.autoSalvage])); };
  head.appendChild(sel);
  box.appendChild(head);
  // ===== panel de mejora =====
  if (enhTarget) {
    const it = enhTarget;
    const ch = enhanceChance(it.lvl);
    const p = document.createElement('div');
    p.style.cssText = 'grid-column:1/-1;background:rgba(126,252,252,.08);border:1px solid #7efcff;border-radius:10px;padding:10px;font-size:12px;text-align:left;';
    p.innerHTML = '<b>⬆ ' + itemLabel(it) + '</b><br>' +
      'Éxito: <b style="color:' + (ch >= 80 ? '#7bed9f' : ch >= 50 ? '#ffd700' : '#ff5252') + '">' + ch + '%</b> · 🪙 ' + fmt(enhanceGold(it)) + ' · 💎 ' + enhanceEssence(it) +
      (it.lvl >= 10 ? '<br><small style="color:#ff5252">⚠️ Fallar desde +10: 30% de ROMPERSE</small>' : '<br><small style="color:#8fa3c8">Al fallar: −1 nivel</small>');
    p.appendChild(mkBtn('MEJORAR', () => { enhanceItem(it, false); enhTarget = null; renderGear(); }, 'claim', 'Mejorar sin protección'));
    const bp = mkBtn('🧿 PROTEGER', () => { enhanceItem(it, true); enhTarget = null; renderGear(); }, 'claim', 'Usa 1 amuleto: sin rotura ni pérdida');
    if ((S.amulets || 0) < 1) bp.disabled = true;
    p.appendChild(bp);
    p.appendChild(mkBtn('✖', () => { enhTarget = null; renderGear(); }, 'claim', 'Cancelar'));
    box.appendChild(p);
  }
  // ===== barra de forja =====
  if (fuseSel.length) {
    const r = fuseSel[0].rarity;
    const fb = document.createElement('div');
    fb.style.cssText = 'grid-column:1/-1;background:rgba(200,107,250,.1);border:1px solid #c86bfa;border-radius:10px;padding:10px;font-size:12px;text-align:left;';
    fb.innerHTML = '<b>⚗️ FORJA:</b> ' + fuseSel.length + '/3 de rareza ' + RAR_NAMES[r] + ' · 💎' + FUSE_COST[r] + ' → ';
    const ss = document.createElement('select');
    ss.style.cssText = 'background:#1a2340;color:#fff;border:1px solid #3a4a7a;border-radius:8px;padding:3px;font-size:11px;';
    ss.innerHTML = '<option value="rnd">Slot al azar</option>' + Object.keys(SLOT_DEFS).map(k => '<option value="' + k + '">' + SLOT_DEFS[k].name + '</option>').join('');
    fb.appendChild(ss);
    fb.appendChild(mkBtn('FUSIONAR', () => { fuseItems(fuseSel.slice(), ss.value); fuseSel = []; renderGear(); }, 'claim', 'Crear item de rareza superior'));
    fb.appendChild(mkBtn('✖', () => { fuseSel = []; renderGear(); }, 'claim', 'Cancelar'));
    box.appendChild(fb);
  }
  // ===== equipado =====
  const eq = document.createElement('div'); eq.className = 'gearCol';
  eq.innerHTML = '<div class="gColHead"><h3>EQUIPADO · ⚙️ ' + fmt(gearPower()) + '</h3></div>'; // FIX float
  Object.keys(SLOT_DEFS).forEach(sl => {
    const it = S.gear.equipped[sl];
    const row = document.createElement('div'); row.className = 'gRow';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;text-align:left;'; // layout seguro
    if (it) {
      row.style.borderColor = RAR_COLORS[it.rarity];
      const info = document.createElement('div'); info.className = 'gInfo';
      info.style.cssText = 'flex:1;min-width:0;';
      info.innerHTML = '<b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b><small>' + itemStats(it) + '</small>';
      row.appendChild(info);
      const btns = document.createElement('div'); btns.className = 'gBtns';
      btns.style.cssText = 'display:grid;grid-template-columns:repeat(2,auto);gap:4px;';
      btns.appendChild(mkBtn('⬆', () => { enhTarget = it; renderGear(); }, 'claim', 'Mejorar'));
      btns.appendChild(mkBtn(it.locked ? '🔒' : '🔓', () => { it.locked = !it.locked; persist(); renderGear(); }, 'claim', 'Bloquear/desbloquear'));
      btns.appendChild(mkBtn('✖ DESEQUIPAR', () => { S.gear.inv.push(it); S.gear.equipped[sl] = null; Audio.SFX.click(); persist(); renderGear(); }, 'claim gEquip', 'Desequipar'));
      row.appendChild(btns);
    } else {
      row.innerHTML = '<div class="gInfo" style="flex:1;min-width:0;"><b>' + slotIcon(sl) + ' ' + SLOT_DEFS[sl].name + '</b><small>vacío</small></div>';
    }
    eq.appendChild(row);
  });
  box.appendChild(eq);
  // ===== mochila =====
  const inv = document.createElement('div'); inv.className = 'gearCol';
  const invHead = document.createElement('div'); invHead.className = 'gColHead';
  invHead.innerHTML = '<h3>MOCHILA (' + S.gear.inv.length + '/' + bagMax() + ')</h3>';
  const sortSel = document.createElement('select');
  sortSel.style.cssText = 'background:#1a2340;color:#fff;border:1px solid #3a4a7a;border-radius:8px;padding:3px;font-size:10px;';
  sortSel.innerHTML = '<option value="rar">Orden: rareza</option><option value="pow">Orden: poder</option><option value="ess">Orden: esencia</option>';
  sortSel.value = bagSort;
  sortSel.onchange = () => { bagSort = sortSel.value; renderGear(); };
  invHead.appendChild(sortSel);
  inv.appendChild(invHead);
  S.gear.inv.slice().sort(BAG_SORTS[bagSort] || BAG_SORTS.rar).forEach(it => {
    const row = document.createElement('div'); row.className = 'gRow';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;text-align:left;';
    row.style.borderColor = RAR_COLORS[it.rarity];
    if (fuseSel.includes(it)) row.style.background = 'rgba(200,107,250,.15)';
    const better = itemPower(it) > itemPower(S.gear.equipped[it.slot]);
    const info = document.createElement('div'); info.className = 'gInfo';
    info.style.cssText = 'flex:1;min-width:0;';
    info.innerHTML = '<b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b> ' +
      (better ? '<b style="color:#7bed9f">▲</b>' : '<b style="color:#ff6b81">▼</b>') +
      '<small>' + itemStats(it) + ' · 💥+' + salvageEssence(it) + '💎</small>';
    row.appendChild(info);
    const btns = document.createElement('div'); btns.className = 'gBtns';
    btns.style.cssText = 'display:grid;grid-template-columns:repeat(2,auto);gap:4px;';
    btns.appendChild(mkBtn('EQUIPAR', () => {
      const prev = S.gear.equipped[it.slot];
      S.gear.equipped[it.slot] = it;
      S.gear.inv = S.gear.inv.filter(x => x !== it);
      if (prev) S.gear.inv.push(prev);
      Audio.SFX.buy(); persist(); renderGear();
    }, 'claim gEquip', 'Equipar en el slot'));
    btns.appendChild(mkBtn('⬆', () => { enhTarget = it; renderGear(); }, 'claim', 'Mejorar'));
    btns.appendChild(mkBtn('⚗️', () => { toggleFuse(it); renderGear(); }, 'claim', 'Seleccionar para forja'));
    btns.appendChild(mkBtn('💥', () => { if (confirm('¿Fundir ' + itemLabelPlain(it) + ' por ' + salvageEssence(it) + '💎?')) { destroyItem(it); renderGear(); } }, 'claim', 'Fundir por esencia'));
    btns.appendChild(mkBtn(it.locked ? '🔒' : '🔓', () => { it.locked = !it.locked; persist(); renderGear(); }, 'claim', 'Bloquear/desbloquear'));
    row.appendChild(btns);
    inv.appendChild(row);
  });
  box.appendChild(inv);
}