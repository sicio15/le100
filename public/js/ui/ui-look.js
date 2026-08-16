'use strict';
// ===== VESTIDOR: customiza SOLO al héroe principal (LOTE 4) =====
// Los compañeros (Elara/Kael) tienen apariencia fija: human_b / human_c.
// S.look viaja en el save; el server lo sanea con whitelist (sanitize.js)
function normLook(l) {
  const def = { form: 'cienpies', crown: false };
  if (!l || typeof l !== 'object') return def;
  return {
    form: l.form === 'humano' ? 'humano' : 'cienpies',
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
  // forma del principal
  const r0 = document.createElement('div'); r0.className = 'mrow';
  r0.innerHTML = '<span>🐛 / 🧍 Forma de Aguijón (tu héroe)<br><small style="color:#8fa3c8">El combate no cambia: solo el look</small></span>';
  const b0 = document.createElement('button'); b0.className = 'claim';
  b0.textContent = S.look.form === 'humano' ? '🧍 HUMANO' : '🐛 CIENPIÉS';
  b0.onclick = () => { S.look.form = S.look.form === 'humano' ? 'cienpies' : 'humano'; persist(); Audio.SFX.click(); renderLook(); };
  r0.appendChild(b0); box.appendChild(r0);
  // corona (overlay paperdoll sobre todo el escuadrón)
  const r2 = document.createElement('div'); r2.className = 'mrow';
  r2.innerHTML = '<span>👑 Corona<br><small style="color:#8fa3c8">Overlay anclado a la cabeza del escuadrón</small></span>';
  const b2 = document.createElement('button'); b2.className = 'claim';
  b2.textContent = S.look.crown ? 'QUITAR' : 'USAR';
  b2.onclick = () => { S.look.crown = !S.look.crown; persist(); Audio.SFX.click(); renderLook(); };
  r2.appendChild(b2); box.appendChild(r2);
  // compañeros (apariencia fija)
  const r3 = document.createElement('div'); r3.className = 'mrow';
  r3.innerHTML = '<span> Elara · arquera (etapa 5)<br>🔮 Kael · mago (etapa 10)<br><small style="color:#8fa3c8">Se unen al avanzar: cada uno con su propio look</small></span>';
  box.appendChild(r3);
}