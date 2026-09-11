'use strict';
// QoL: auto-equipar lo mejor (ignora items bloqueados 🔒)
// El botón ahora vive en la barra sticky del modal (#autoEqBtn en index.html).
function autoEquip() {
  Object.keys(SLOT_DEFS).forEach(sl => {
    const candidates = S.gear.inv.filter(i => i.slot === sl && !i.locked);
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
(function initAutoEquip() {
  const b = $('autoEqBtn');
  if (b) b.onclick = autoEquip; // botón nuevo en gearTop
  if (typeof onGearOpen === 'function') {
    onGearOpen(() => { // fallback si el HTML viejo no lo tiene
      const h = $('mGear') && $('mGear').querySelector('h2');
      if (h && !$('autoEqBtn')) {
        const nb = document.createElement('button');
        nb.id = 'autoEqBtn'; nb.className = 'mbtn'; nb.textContent = '⚡ AUTO-EQUIPAR';
        nb.onclick = autoEquip;
        h.after(nb);
      }
    });
  }
})();