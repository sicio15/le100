'use strict';
// ===== VESTIDOR (LOTE 5): mascota + corona =====
// El cienpies YA NO es forma del héroe: es la MASCOTA (S.look.pet).
// Aguijón siempre es human_a; Elara/Kael tienen look fijo propio.
// S.look viaja en el save; el server lo sanea con whitelist (sanitize.js)
function normLook(l) {
  const def = { pet: true, crown: false };
  if (!l || typeof l !== 'object') return def;
  // saves viejos con form/hair: se ignoran y migran a pet:true (mascota visible)
  return {
    pet: l.pet !== false,
    crown: !!l.crown
  };
}
S.look = normLook(S.look);
// re-normalizar cuando llega un save del servidor
const _applyServerSaveLook = applyServerSave;
applyServerSave = function (sv) { _applyServerSaveLook(sv); S.look = normLook(S.look); };
wire('btnLook', 'click', () => { renderLook(); $('mLook').style.display = 'flex'; Audio.SFX.click(); });
wire('lookClose', 'click', () => { $('mLook').style.display = 'none'; });
function renderLook() {
  const box = $('lookBody'); if (!box) return;
  box.innerHTML = '';
  // mascota
  const r0 = document.createElement('div'); r0.className = 'mrow';
  r0.innerHTML = '<span>🐛 Mascota cienpies<br><small style="color:#8fa3c8">Acompaña al escuadrón y escupe el veneno ☠️</small></span>';
  const b0 = document.createElement('button'); b0.className = 'claim';
  b0.textContent = S.look.pet ? 'VISIBLE' : 'OCULTA';
  b0.onclick = () => { S.look.pet = !S.look.pet; persist(); Audio.SFX.click(); renderLook(); };
  r0.appendChild(b0); box.appendChild(r0);
  // corona (overlay paperdoll sobre escuadrón + mascota)
  const r2 = document.createElement('div'); r2.className = 'mrow';
  r2.innerHTML = '<span>👑 Corona<br><small style="color:#8fa3c8">Overlay anclado a la cabeza de todo el equipo</small></span>';
  const b2 = document.createElement('button'); b2.className = 'claim';
  b2.textContent = S.look.crown ? 'QUITAR' : 'USAR';
  b2.onclick = () => { S.look.crown = !S.look.crown; persist(); Audio.SFX.click(); renderLook(); };
  r2.appendChild(b2); box.appendChild(r2);
  // compañeros (apariencia fija)
  const r3 = document.createElement('div'); r3.className = 'mrow';
  r3.innerHTML = '<span>🗡️ Aguijón · tu héroe<br>🏹 Elara · arquera (etapa 5)<br>🔮 Kael · mago (etapa 10)<br><small style="color:#8fa3c8">Cada uno con su propio look</small></span>';
  box.appendChild(r3);
}