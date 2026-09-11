'use strict';
// ===== DIÁLOGOS Y CINEMÁTICAS (LOTE 28) =====
// Sistema de conversación con retrato, máquina de escribir y auto-avance.
// Los retratos NO son arte nuevo: se recortan del primer frame de las strips que
// assets.js ya procesó (PREP), así que salen gratis y en el mismo estilo.
// Mientras hay un diálogo abierto, `dialogueActive` congela el combate; si el
// jugador está AFK cada línea avanza sola a los DLG_AUTO_MS.

// ----- Retratos desde PREP (cacheados por sheet) -----
const PORTRAIT_CACHE = {};
function portraitURL(sheet) {
  if (!sheet) return '';
  if (PORTRAIT_CACHE[sheet] !== undefined) return PORTRAIT_CACHE[sheet];
  const p = (typeof PREP !== 'undefined') ? PREP[sheet] : null;
  if (!p || !p.strip) { PORTRAIT_CACHE[sheet] = ''; return ''; }
  try {
    const c = document.createElement('canvas');
    c.width = p.fw; c.height = p.fh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(p.strip, 0, 0, p.fw, p.fh, 0, 0, p.fw, p.fh);
    PORTRAIT_CACHE[sheet] = c.toDataURL();
  } catch (e) { PORTRAIT_CACHE[sheet] = ''; }
  return PORTRAIT_CACHE[sheet];
}
// Quién habla: un id de SPEAKERS, o el id de un jefe (usa su sprite y color)
function speakerOf(who) {
  if (SPEAKERS[who]) return SPEAKERS[who];
  const b = BOSSES.find(x => x.id === who);
  if (b) {
    const sheet = b.sprite === 'boss' ? 'enemy_boss' : 'enemy_' + b.sprite;
    return { n: b.name, sheet, color: b.color, boss: true, ico: b.ico };
  }
  return SPEAKERS.narr;
}

// ----- Estado -----
let dlgQueue = [], dlgLine = 0, dlgTimer = null, dlgTypeT = null, dlgDone = null;
let dlgFull = '', dlgShown = 0, dlgStarted = 0;

function dlgEls() {
  return { box: $('dialogue'), face: $('dlgFace'), name: $('dlgName'),
    txt: $('dlgText'), next: $('dlgNext'), skip: $('dlgSkip') };
}

function playDialogue(lines, onDone, tag) {
  if (!lines || !lines.length) { if (onDone) onDone(); return; }
  // Si ya hay una cinemática corriendo, encolamos las líneas nuevas detrás
  if (dialogueActive) { dlgQueue = dlgQueue.concat(lines); return; }
  if (SETTINGS.skipCutscenes) { if (onDone) onDone(); return; }
  dlgQueue = lines.slice();
  dlgLine = -1;
  dlgDone = onDone || null;
  dialogueActive = true;
  const e = dlgEls();
  if (e.box) { e.box.classList.remove('hidden'); e.box.classList.add('in'); }
  if (tag) markLore(tag);
  dlgAdvance();
}

function dlgClear() {
  if (dlgTimer) { clearTimeout(dlgTimer); dlgTimer = null; }
  if (dlgTypeT) { clearInterval(dlgTypeT); dlgTypeT = null; }
}

function dlgAdvance() {
  dlgClear();
  dlgLine++;
  if (dlgLine >= dlgQueue.length) return dlgEnd();
  const line = dlgQueue[dlgLine];
  const sp = speakerOf(line.w);
  const e = dlgEls();
  if (!e.box) return dlgEnd();
  // Retrato
  const url = portraitURL(sp.sheet);
  if (e.face) {
    e.face.innerHTML = url
      ? '<img src="' + url + '" alt="">'
      : '<span class="dlgGlyph">' + (sp.ico || '📖') + '</span>';
    e.face.style.setProperty('--sp', sp.color);
    e.face.classList.toggle('narr', !sp.sheet && !sp.ico);
  }
  if (e.name) {
    e.name.textContent = sp.n || '';
    e.name.style.color = sp.color;
    e.name.classList.toggle('hidden', !sp.n);
  }
  e.box.classList.toggle('narrLine', !sp.n);
  e.box.style.setProperty('--sp', sp.color);
  // Máquina de escribir
  dlgFull = line.t; dlgShown = 0; dlgStarted = Date.now();
  const speed = Math.max(0, +SETTINGS.textSpeed || 0);
  if (e.txt) e.txt.textContent = '';
  if (speed === 0) { dlgReveal(); }
  else {
    dlgTypeT = setInterval(() => {
      dlgShown += 2;
      if (e.txt) e.txt.textContent = dlgFull.slice(0, dlgShown);
      if (dlgShown >= dlgFull.length) dlgReveal();
    }, speed);
  }
  if (e.next) e.next.textContent = (dlgLine === dlgQueue.length - 1) ? 'CONTINUAR ▶' : 'SIGUIENTE ▶';
  // Auto-avance para jugadores AFK
  dlgTimer = setTimeout(dlgAdvance, DLG_AUTO_MS);
}

function dlgReveal() {
  if (dlgTypeT) { clearInterval(dlgTypeT); dlgTypeT = null; }
  dlgShown = dlgFull.length;
  const e = dlgEls();
  if (e.txt) e.txt.textContent = dlgFull;
}

// Un toque: primero completa el texto; el segundo pasa de línea
function dlgTap() {
  if (!dialogueActive) return;
  if (Date.now() - dlgStarted < DLG_MIN_MS && dlgShown < dlgFull.length) { dlgReveal(); return; }
  if (dlgShown < dlgFull.length) { dlgReveal(); return; }
  dlgAdvance();
}

function dlgEnd() {
  dlgClear();
  dlgQueue = []; dlgLine = 0;
  dialogueActive = false;
  const e = dlgEls();
  if (e.box) { e.box.classList.add('hidden'); e.box.classList.remove('in'); }
  const cb = dlgDone; dlgDone = null;
  if (cb) { try { cb(); } catch (err) { console.error('dlg cb', err); } }
  drainScenes();
}

// ----- Cola de escenas -----
// Matar al Jefe de Zona dispara SU despedida y, en el mismo frame, la entrada a
// la zona siguiente. Sin esta cola las dos cinemáticas se pisaban.
let sceneQueue = [], zoneCardActive = false;
function queueScene(fn) {
  if (dialogueActive || zoneCardActive) { sceneQueue.push(fn); return; }
  fn();
}
function drainScenes() {
  if (dialogueActive || zoneCardActive || !sceneQueue.length) return;
  const fn = sceneQueue.shift();
  try { fn(); } catch (e) { console.error('scene', e); }
}

function dlgSkipAll() { dlgQueue = []; dlgEnd(); }

// ----- Entrada -----
wire('dlgNext', 'click', dlgTap);
wire('dlgSkip', 'click', dlgSkipAll);
(function wireDlg() {
  const box = $('dialogue');
  if (box) box.addEventListener('pointerdown', ev => {
    if (ev.target.closest('#dlgSkip')) return;
    dlgTap();
  });
  window.addEventListener('keydown', ev => {
    if (!dialogueActive) return;
    if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); dlgTap(); }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); dlgSkipAll(); }
  }, true);
})();

// ===== Tarjeta de zona: el cartel grande al entrar a una zona nueva =====
function showZoneCard(zi, cb) {
  const z = ZONES[Math.min(ZONES.length - 1, zi)];
  const card = $('zoneCard');
  if (!card || !z) { if (cb) cb(); return; }
  card.style.setProperty('--zc', z.color);
  card.innerHTML =
    '<div class="zcNum">ZONA ' + (zi + 1) + ' · ETAPAS ' + (zi * 10 + 1) + '–' + (zi * 10 + 10) + '</div>' +
    '<div class="zcName">' + z.name + '</div>' +
    '<div class="zcSub">' + z.sub + '</div>' +
    '<div class="zcBoss">' + zoneBoss(zi).ico + ' Jefe de zona: ' + zoneBoss(zi).name + '</div>';
  card.classList.remove('hidden');
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  zoneCardActive = true;
  Audio.SFX.zone();
  setTimeout(() => {
    card.classList.add('hidden');
    zoneCardActive = false;
    if (cb) cb();
    drainScenes();
  }, 2600);
}

// ===== Secuencias completas =====
// Entrada a zona: cartel → diálogo de la zona (una sola vez por partida guardada)
function playZoneIntro(zi) {
  const z = ZONES[Math.min(ZONES.length - 1, zi)];
  if (!z) return;
  const isNew = codexZone(zi);
  const key = 'zi_' + z.id;
  const lines = (zi >= ZONES.length - 1 && loreSeen(key)) ? ENDLESS_LINES : (ZONE_INTRO[z.id] || []);
  notify('🌄 ' + z.name);
  if (typeof screenWipe === 'function') screenWipe(z.color);
  showZoneCard(zi, () => {
    if (loreSeen(key) && !isNew && lines !== ENDLESS_LINES) return;  // ya la leíste
    playDialogue(lines, null, key);
  });
  if (isNew) persist();
}
// Encuentro con el Jefe de Zona: su charla, una vez por partida
function playBossIntro(e) {
  if (!e || e.mini || !e.def) return;
  const key = 'bi_' + e.def.id;
  if (bossIntroShown[e.def.id] || loreSeen(key)) return;
  bossIntroShown[e.def.id] = 1;
  playDialogue(e.def.intro, null, key);
}
function playBossEnrage(e) {
  if (!e || e.mini || !e.def || !e.def.enrage) return;
  if (e._enrageSaid) return;
  e._enrageSaid = 1;
  // el enrage no congela el combate: es una línea suelta encima de la pelea
  const l = e.def.enrage[0];
  const sp = speakerOf(l.w);
  bossBark((sp.n ? sp.n + ': ' : '') + l.t, sp.color);
}
function playBossDefeat(e) {
  if (!e || e.mini || !e.def) return;
  playDialogue(e.def.defeat, null, 'bd_' + e.def.id);
}
// Línea corta flotante (sin pausar): para enrages y comentarios en combate
function bossBark(text, color) {
  const layer = $('barks'); if (!layer) return;
  const d = document.createElement('div');
  d.className = 'bark';
  d.textContent = text;
  if (color) d.style.setProperty('--bk', color);
  layer.appendChild(d);
  while (layer.children.length > 2) layer.firstChild.remove();
  setTimeout(() => d.remove(), 4200);
}

// ===== Enganche con el combate =====
// Las tres cinemáticas entran por la cola, así nunca se solapan entre sí.
HOOKS.zoneIn     = zi => queueScene(() => playZoneIntro(zi));
HOOKS.bossIntro  = e  => queueScene(() => playBossIntro(e));
HOOKS.bossDefeat = e  => queueScene(() => playBossDefeat(e));

// Ajustes de texto
wire('setTextSpeed', 'input', e => {
  // el slider va de "lento" a "instantáneo": invertimos para que leer izq→der sea natural
  SETTINGS.textSpeed = Math.max(0, 40 - (+e.target.value));
  saveSettings();
  const l = $('setTextSpeedV');
  if (l) l.textContent = SETTINGS.textSpeed === 0 ? 'Instantáneo' : SETTINGS.textSpeed > 25 ? 'Lento' : 'Normal';
});
wire('setSkipCut', 'change', e => {
  SETTINGS.skipCutscenes = e.target.checked; saveSettings();
  toast(SETTINGS.skipCutscenes ? '⏭️ Cinemáticas desactivadas' : '🎬 Cinemáticas activadas');
});
