'use strict';
// ===== EVENTS: semanales + diarios + relámpago =====
function weekEventAt(w) { return EVENTS[((w % EVENTS.length) + EVENTS.length) % EVENTS.length]; }
function weekEvent() { return weekEventAt(weekNow()); }
const evHas = id => weekEvent().id === id;
const dayEvent = () => DAY_EVENTS[new Date().getDay()];
const dayHas = id => dayEvent().id === id;
const flashActive = () => !!(S.flashEnd && Date.now() < S.flashEnd);
const flashType = () => flashActive() ? S.flashType : null;
const flashMult = id => flashType() === id ? (FLASH_TYPES.find(f => f.id === id) || {}).mult || 1 : 1;
const flashInfo = () => FLASH_TYPES.find(f => f.id === S.flashType);
function checkFlash() {
  const now = Date.now();
  if (flashActive()) return;
  if (!S.flashNext) { S.flashNext = now + (10 + Math.random() * 10) * 60000; persist(); return; }
  if (now >= S.flashNext) {
    const t = FLASH_TYPES[Math.random() * FLASH_TYPES.length | 0];
    S.flashType = t.id;
    S.flashEnd = now + FLASH_DUR;
    S.flashNext = S.flashEnd + (45 + Math.random() * 45) * 60000;
    toast('🌠 ¡EVENTO: ' + t.n + '!'); Audio.SFX.levelup(); persist();
  }
}