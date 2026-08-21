'use strict';
// ===== SOTOBOSQUE (Roguelike) =====
let rogueRun = null;
const ROGUE_BUFFS = [
  { id: 'furia',  n: '🗡️ Furia',       d: '+25% daño',        eff: () => { rogueRun.dmgMult *= 1.25; } },
  { id: 'vital',  n: '❤️ Vitalidad',   d: '+25% vida',        eff: () => { rogueRun.hpMult *= 1.25; } },
  { id: 'oro',    n: '🪙 Fiebre',      d: '+50% oro',         eff: () => { rogueRun.goldMult *= 1.5; } },
  { id: 'drop',   n: '🎒 Suerte',      d: 'Drops garantizados', eff: () => { rogueRun.drop = true; } },
  { id: 'crit',   n: '🎯 Precisión',   d: '+20% crítico',     eff: () => { rogueRun.critAdd += 0.2; } },
  { id: 'venom',  n: '☠️ Tóxico',      d: 'Veneno +50%',      eff: () => { rogueRun.venomMult *= 1.5; } }
];

wire('btnRogue', 'click', () => { renderRogue(); const m = $('mRogue'); if (m) m.style.display = 'flex'; Audio.SFX.click(); });
wire('rogueClose', 'click', () => { const m = $('mRogue'); if (m) m.style.display = 'none'; });

function renderRogue() {
  const body = $('rogueBody');
  if (!body) return; // GUARDIÁN
  checkDailyResets();
  const isBonus = (typeof dayHas === 'function' && dayHas('soto'));
  if (rogueRun) { renderRogueRun(); return; }
  body.innerHTML = '<p style="color:#8fa3c8;font-size:11px">🌀 ' + new Date().toISOString().slice(0,10) + (isBonus ? ' · HOY +1 🎟️' : '') + '</p>' +
    '<p>🎟️ Tickets: <b style="color:#ffd700">' + S.rlTickets + ' / ' + (2 + (isBonus ? 1 : 0)) + '</b></p>' +
    '<p style="font-size:12px;margin:12px 0">8 salas. Elegí 1 de 3 buffs por sala. Llegá al final para el botín.</p>' +
    '<button class="mbtn" id="rogueStart">ENTRAR (1 🎟️)</button>';
  const b = $('rogueStart');
  if (b) b.onclick = startRogue;
}

function startRogue() {
  if (S.rlTickets < 1) return toast('❌ Sin tickets');
  S.rlTickets--;
  rogueRun = { room: 1, max: 8, dmgMult: 1, hpMult: 1, goldMult: 1, venomMult: 1, critAdd: 0, drop: false, buffs: [] };
  persist();
  renderRogueRun();
}

function renderRogueRun() {
  const body = $('rogueBody');
  if (!body || !rogueRun) return;
  if (rogueRun.room > rogueRun.max) { finishRogue(true); return; }
  body.innerHTML = '<h3>🌀 Sala ' + rogueRun.room + ' / ' + rogueRun.max + '</h3>' +
    '<p style="font-size:11px;color:#8fa3c8">Buffs activos: ' + (rogueRun.buffs.length ? rogueRun.buffs.map(b => b.n).join(', ') : 'ninguno') + '</p>' +
    '<div class="buffRow" id="rogueChoices"></div>';
  const choices = [];
  const pool = ROGUE_BUFFS.slice();
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(idx, 1)[0]);
  }
  const cBox = $('rogueChoices');
  if (!cBox) return;
  choices.forEach(c => {
    const card = document.createElement('div');
    card.className = 'mrow buff';
    card.style.cursor = 'pointer';
    card.innerHTML = '<span><b>' + c.n + '</b><br><small>' + c.d + '</small></span>';
    card.onclick = () => {
      c.eff(); rogueRun.buffs.push(c); rogueRun.room++;
      persist(); renderRogueRun();
    };
    cBox.appendChild(card);
  });
}

function finishRogue(won) {
  const body = $('rogueBody');
  if (!body) { rogueRun = null; return; }
  const g = goldKill(S.best) * 20 * (rogueRun ? rogueRun.goldMult : 1);
  S.gold += g;
  let msg = '🌀 ' + (won ? '¡Completado!' : 'Abandonado') + ' +' + fmt(g) + ' 🪙';
  if (won) {
    const a = 5; S.adn += a; msg += ' +' + a + ' 🧬';
    for (let i = 0; i < 3; i++) dropItem(2);
    msg += ' +3 🎒';
    Audio.SFX.levelup();
  } else Audio.SFX.click();
  toast(msg);
  rogueRun = null;
  persist();
  renderRogue();
}