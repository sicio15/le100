'use strict';
// ===== Equipo: render + equipar + mejorar =====
// LOTE 2A: al abrir el modal dispara fireGearOpen() (hooks QoL, deuda #9).
wire('btnGear', 'click', () => { renderGear(); $('mGear').style.display = 'flex'; Audio.SFX.click(); fireGearOpen(); });
wire('gearClose', 'click', () => { $('mGear').style.display = 'none'; });
function slotIcon(sl) {
  return (typeof picOr === 'function') ? picOr(SLOT_DEFS[sl].pic, SLOT_DEFS[sl].icon, 14) : SLOT_DEFS[sl].icon;
}
function itemLabel(it) { return slotIcon(it.slot) + ' ' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + ' +' + it.lvl; }
function itemStats(it) {
  const mult = 1 + 0.1 * it.lvl;
  let s = STAT_NAMES[it.stat] + ' +' + (Math.round(it.val * mult * 10) / 10);
  (it.subs || []).forEach(x => { s += ' · ' + STAT_NAMES[x.stat] + ' +' + x.val; });
  return s;
}
function renderGear() {
  const box = $('gearBody'); if (!box) return;
  box.innerHTML = '';
  const eq = document.createElement('div'); eq.className = 'gearCol';
  eq.innerHTML = '<h3>EQUIPADO · ⚙️ ' + gearPower() + '</h3>';
  Object.keys(SLOT_DEFS).forEach(sl => {
    const it = S.gear.equipped[sl];
    const row = document.createElement('div'); row.className = 'gRow';
    if (it) {
      row.style.borderColor = RAR_COLORS[it.rarity];
      row.innerHTML = '<div><b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b><br><small>' + itemStats(it) + '</small></div>';
      const b1 = document.createElement('button'); b1.className = 'claim';
      b1.textContent = '⬆️ ' + fmt(enhanceCost(it));
      b1.onclick = () => {
        const c = enhanceCost(it);
        if (S.gold >= c) { S.gold -= c; it.lvl++; Audio.SFX.buy(); persist(); renderGear(); }
        else Audio.SFX.click();
      };
      const b2 = document.createElement('button'); b2.className = 'claim'; b2.textContent = '✖';
      b2.onclick = () => { S.gear.inv.push(it); S.gear.equipped[sl] = null; Audio.SFX.click(); persist(); renderGear(); };
      row.appendChild(b1); row.appendChild(b2);
    } else {
      row.innerHTML = '<div><b>' + slotIcon(sl) + ' ' + SLOT_DEFS[sl].name + '</b><br><small>vacío</small></div>';
    }
    eq.appendChild(row);
  });
  box.appendChild(eq);
  const inv = document.createElement('div'); inv.className = 'gearCol';
  inv.innerHTML = '<h3>MOCHILA (' + S.gear.inv.length + '/30)</h3>';
  S.gear.inv.slice().sort((a, b) => b.rarity - a.rarity).forEach(it => {
    const row = document.createElement('div'); row.className = 'gRow';
    row.style.borderColor = RAR_COLORS[it.rarity];
    const better = itemPower(it) > itemPower(S.gear.equipped[it.slot]);
    row.innerHTML = '<div><b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b> ' +
      (better ? '<b style="color:#7bed9f">▲</b>' : '<b style="color:#ff6b81">▼</b>') +
      '<br><small>' + itemStats(it) + '</small></div>';
    const b = document.createElement('button'); b.className = 'claim'; b.textContent = 'EQUIPAR';
    b.onclick = () => {
      const prev = S.gear.equipped[it.slot];
      S.gear.equipped[it.slot] = it;
      S.gear.inv = S.gear.inv.filter(x => x !== it);
      if (prev) S.gear.inv.push(prev);
      Audio.SFX.buy(); persist(); renderGear();
    };
    row.appendChild(b);
    inv.appendChild(row);
  });
  box.appendChild(inv);
}