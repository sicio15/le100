'use strict';
// ===== AMBIENTE POR CAPÍTULO (LOTE 27) =====
// Antes los 5 capítulos compartían exactamente el mismo aire: un fondo distinto y
// nada más (las mismas 12 luciérnagas amarillas incluso dentro de una cueva).
// Ahora cada uno tiene su propio clima, sus partículas y un velo de color que
// tiñe la escena entera, así que el avance se NOTA aunque los bichos se repitan.
// Datos: CHAPTER_FX en core/data.js

const AMB = {
  ch: -1,
  parts: [],
  fog: [],
  g: null,       // graphics de partículas (detrás de los sprites)
  grade: null,   // rectángulo de gradación de color (delante del fondo)
  def: null
};

function ambienceInit(scene) {
  AMB.grade = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0, 0).setDepth(-5);
  AMB.g = scene.add.graphics().setDepth(-4);
  AMB.fogG = scene.add.graphics().setDepth(-3);
  AMB.ch = -1;
}

function ambienceBuild(idx) {
  const def = CHAPTER_FX[Math.min(CHAPTER_FX.length - 1, Math.max(0, idx))];
  AMB.def = def;
  AMB.ch = idx;
  AMB.parts = [];
  for (let i = 0; i < def.n; i++) {
    AMB.parts.push({
      x: Math.random(), y: Math.random(),
      p: Math.random() * TAU,
      s: 0.55 + Math.random() * 0.9,
      v: 0.5 + Math.random()
    });
  }
  AMB.fog = [];
  if (def.fog > 0) {
    for (let i = 0; i < 4; i++) AMB.fog.push({ x: Math.random(), y: 0.45 + i * 0.13, v: 0.02 + Math.random() * 0.03 });
  }
  if (AMB.grade) { AMB.grade.setFillStyle(def.grade, def.gradeA); }
}

// dt en segundos · t es el reloj de la escena
function ambienceUpdate(dt, t) {
  const idx = Math.min(CHAPTER_FX.length - 1, Math.floor((S.stage - 1) / 10));
  if (idx !== AMB.ch) ambienceBuild(idx);
  const def = AMB.def;
  if (!def || !AMB.g) return;
  if (AMB.grade) AMB.grade.setSize(W, H);
  const g = AMB.g;
  g.clear();
  if (SETTINGS.reduceFx) { if (AMB.fogG) AMB.fogG.clear(); return; }

  const drift = (typeof advance !== 'undefined' ? advance : 0) * 0.0006;
  AMB.parts.forEach(f => {
    let x, y, a = 1, r = 2;
    switch (def.kind) {
      case 'leaf':   // hojas cayendo con vaivén
        f.y += dt * 0.055 * f.v; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
        x = (f.x + Math.sin(t * 0.9 * f.v + f.p) * 0.035 - drift) * W;
        y = f.y * H * 0.92;
        a = 0.55; r = 2.4 * f.s;
        break;
      case 'drip':   // goteo de cueva: cae recto y rápido
        f.y += dt * 0.55 * f.v; if (f.y > 1.02) { f.y = -0.08; f.x = Math.random(); }
        x = (f.x - drift) * W; y = f.y * H * 0.8;
        a = 0.5; r = 1.6 * f.s;
        break;
      case 'bubble': // burbujas de pantano subiendo
        f.y -= dt * 0.07 * f.v; if (f.y < -0.05) { f.y = 1.03; f.x = Math.random(); }
        x = (f.x + Math.sin(t * 1.6 * f.v + f.p) * 0.02 - drift) * W;
        y = f.y * H;
        a = 0.28 + Math.sin(t * 2 + f.p) * 0.12; r = 3.2 * f.s;
        break;
      case 'ember':  // brasas de la torre subiendo y parpadeando
        f.y -= dt * 0.13 * f.v; if (f.y < -0.05) { f.y = 1.03; f.x = Math.random(); }
        x = (f.x + Math.sin(t * 2.2 * f.v + f.p) * 0.03 - drift) * W;
        y = f.y * H;
        a = 0.35 + Math.sin(t * 5 * f.v + f.p) * 0.3; r = 2.2 * f.s;
        break;
      default:       // 'star': motas del vacío que titilan en su sitio
        x = (f.x + Math.sin(t * 0.2 * f.v + f.p) * 0.01 - drift * 0.4) * W;
        y = (f.y * 0.8) * H;
        a = 0.25 + Math.sin(t * 3 * f.v + f.p) * 0.35; r = 1.8 * f.s;
    }
    if (a <= 0.02) return;
    g.fillStyle(def.color, a);
    if (def.kind === 'leaf') {
      // la hoja es un rombo achatado que gira: no hace falta un sprite
      const w = r * 1.9, h = r * (0.5 + Math.abs(Math.sin(t * 1.6 + f.p)) * 0.9);
      g.fillEllipse(x, y, w, h);
    } else if (def.kind === 'drip') {
      g.fillRect(x, y, 1.5, r * 4);
    } else {
      g.fillCircle(x, y, r);
    }
  });

  // Niebla: bandas horizontales suaves que cruzan la escena
  const fg = AMB.fogG;
  if (fg) {
    fg.clear();
    AMB.fog.forEach(b => {
      b.x += dt * b.v; if (b.x > 1.4) b.x = -0.4;
      fg.fillStyle(def.color, def.fog * 0.35);
      fg.fillEllipse(b.x * W, b.y * H, W * 0.75, H * 0.1);
    });
  }
}

// Pulso de color puntual (lo usa el jefe al enfurecer)
function ambienceFlash(color, alpha, ms) {
  if (!AMB.grade || SETTINGS.reduceFx) return;
  const base = AMB.def ? AMB.def.gradeA : 0.1;
  AMB.grade.setFillStyle(color, alpha);
  setTimeout(() => { if (AMB.grade && AMB.def) AMB.grade.setFillStyle(AMB.def.grade, base); }, ms || 260);
}
