'use strict';
// ===== VESTIDOR: prototipo paperdoll (forma + pelo + corona) =====
// S.look viaja en el save; el server lo sanea con whitelist (sanitize.js)
function normLook(l) {
  const def = { form: 'cienpies', hair: 'a', crown: false };
  if (!l || typeof l !== 'object') return def;
  return {
    form: l.form === 'humano' ? 'humano' : 'cienpies',
    hair: ['a', 'b', 'c'].includes(l.hair) ? l.hair : 'a',
    crown: !!l.crown
  };
}
S.look = normLook(S.look);
// re-normalizar cuando llega un save del servidor
const _applyServerSaveLook = applyServerSave;
applyServerSave = function (sv) { _applyServerSaveLook(sv); S.look = normLook(S.look); };

const HAIR_NAMES = { a: '🟤 PICADO', b: '👱 ELFO', c: '🔵 MOHAWK' };
wire('btnLook', 'click', () => { renderLook(); $('mLook').style.display = 'flex'; Audio.SFX.click(); });
wire('lookClose', 'click', () => { $('mLook').style.display = 'none'; });
function renderLook() {
  const box = $('lookBody'); if (!box) return;
  box.innerHTML = '';
  // forma
  const r0 = document.createElement('div'); r0.className = 'mrow';
  r0.innerHTML = '<span>🐛 / 🧍 Forma del héroe<br><small style="color:#8fa3c8">El combate no cambia: solo el look</small></span>';
  const b0 = document.createElement('button'); b0.className = 'claim';
  b0.textContent = S.look.form === 'humano' ? '🧍 HUMANO' : '🐛 CIENPIÉS';
  b0.onclick = () => { S.look.form = S.look.form === 'humano' ? 'cienpies' : 'humano'; persist(); Audio.SFX.click(); renderLook(); };
  r0.appendChild(b0); box.appendChild(r0);
  // pelo (variantes completas = sin problemas de alineación)
  const r1 = document.createElement('div'); r1.className = 'mrow';
  r1.innerHTML = '<span>💇 Pelo<br><small style="color:#8fa3c8">Elegir pelo pasa a forma humana</small></span>';
  ['a', 'b', 'c'].forEach(h => {
    const b = document.createElement('button'); b.className = 'claim';
    b.textContent = HAIR_NAMES[h];
    b.disabled = S.look.form === 'humano' && S.look.hair === h;
    b.onclick = () => { S.look.hair = h; S.look.form = 'humano'; persist(); Audio.SFX.click(); renderLook(); };
    r1.appendChild(b);
  });
  box.appendChild(r1);
  // corona (overlay paperdoll real)
  const r2 = document.createElement('div'); r2.className = 'mrow';
  r2.innerHTML = '<span>👑 Corona<br><small style="color:#8fa3c8">Overlay anclado a la cabeza</small></span>';
  const b2 = document.createElement('button'); b2.className = 'claim';
  b2.textContent = S.look.crown ? 'QUITAR' : 'USAR';
  b2.onclick = () => { S.look.crown = !S.look.crown; persist(); Audio.SFX.click(); renderLook(); };
  r2.appendChild(b2); box.appendChild(r2);
}