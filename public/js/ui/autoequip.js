'use strict';
// QoL: auto-equipar lo mejor (botón inyectado en el modal de equipo)
// LOTE 2A (deuda #9): inyección vía hook onGearOpen() — sin setTimeout(0),
// sin depender del orden de listeners del click de btnGear.
function autoEquip() {
  Object.keys(SLOT_DEFS).forEach(sl => {
    const candidates = S.gear.inv.filter(i => i.slot === sl);
    if (S.gear.equipped[sl]) candidates.push(S.gear.equipped[sl]);
    if (!candidates.length) return;
    const best = candidates.slice().sort((a, b) => itemPower(b) - itemPower(a))[0];
    if (best !== S.gear.equipped[sl]) {
      S.gear.inv = S.gear.inv.filter(i => i !== best);
      if (S.gear.equipped[sl]) S.gear.inv.push(S.gear.equipped[sl]);
      S.gear.equipped[sl] = best;
    }
  });
  persist(); renderGear(); Audio.SFX.buy();
  toast('⚡ Equipo optimizado');
}
onGearOpen(() => {
  const h = $('mGear') && $('mGear').querySelector('h2');
  if (h && !$('autoEqBtn')) {
    const b = document.createElement('button');
    b.id = 'autoEqBtn'; b.className = 'mbtn'; b.textContent = '⚡ AUTO-EQUIPAR';
    b.onclick = autoEquip;
    h.after(b);
  }
});