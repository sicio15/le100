'use strict';
// ===== EVENTO SEMANAL: badge + anuncio (la lógica vive en store.weekEvent) =====
wire('btnEvent', 'click', () => {
  const ev = weekEvent();
  const weekMs = 604800000;
  const left = Math.ceil((weekMs - (Date.now() % weekMs)) / 86400000);
  toast('✨ ' + ev.n + ' · ' + ev.d + ' · quedan ' + left + 'd');
  Audio.SFX.click();
});
// anuncio único por sesión al entrar
setTimeout(() => {
  const ev = weekEvent();
  toast('✨ Evento semanal: ' + ev.n + ' — ' + ev.d);
}, 1500);