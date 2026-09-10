'use strict';
// ===== SOTOBOSQUE (Roguelike) =====
// REESCRITO EN L26. Antes era un roguelike sin roguelike: elegías un buff por sala,
// la sala avanzaba sola y al llegar a la 8 cobrabas el botín completo. No había
// combate, ni riesgo, ni decisión — y de los 6 buffs sólo `goldMult` hacía algo:
// dmgMult, hpMult, critAdd, venomMult y drop se calculaban y se tiraban a la basura.
//
// Ahora cada sala es ELEGIR BUFF → PELEAR. La dificultad escala por sala, los buffs
// entran en la probabilidad de victoria, perder termina la run y podés retirarte con
// lo acumulado en cualquier momento. Constantes de balance en core/data.js.
let rogueRun = null;
const ROGUE_BUFFS = [
  { id: 'furia',  n: '🗡️ Furia',       d: '+25% daño',          eff: () => { rogueRun.dmgMult *= 1.25; } },
  { id: 'vital',  n: '❤️ Vitalidad',   d: '+25% aguante',        eff: () => { rogueRun.hpMult *= 1.25; } },
  { id: 'oro',    n: '🪙 Fiebre',      d: '+50% oro',            eff: () => { rogueRun.goldMult *= 1.5; } },
  { id: 'drop',   n: '🎒 Suerte',      d: 'Botín garantizado',   eff: () => { rogueRun.drop = true; } },
  { id: 'crit',   n: '🎯 Precisión',   d: '+20% crítico',        eff: () => { rogueRun.critAdd += 0.2; } },
  { id: 'venom',  n: '☠️ Tóxico',      d: 'Veneno +50%',         eff: () => { rogueRun.venomMult *= 1.5; } }
];

wire('btnRogue', 'click', () => { renderRogue(); const m = $('mRogue'); if (m) m.style.display = 'flex'; Audio.SFX.click(); });
wire('rogueClose', 'click', () => { const m = $('mRogue'); if (m) m.style.display = 'none'; });

// ----- Poder efectivo de la run (los buffs por fin cuentan) -----
function roguePower() {
  const r = rogueRun;
  const crit = Math.min(0.95, critChance() + r.critAdd);
  const critAvg = 1 + crit * (critMult() - 1);
  const venomShare = 1 + 0.15 * (r.venomMult - 1);
  return dps() * 30 * 1.4 * r.dmgMult * critAvg * venomShare;
}
const rogueIsBoss = () => rogueRun.room >= rogueRun.max;
function rogueOdds() {
  const r = rogueRun;
  const hpMul = ROGUE_HP_MUL * Math.pow(ROGUE_STEP, r.room - 1) * (rogueIsBoss() ? 2.5 : 1);
  const atkMul = (1.2 + r.room * 0.1) / r.hpMult; // dividir el daño entrante ≈ más aguante
  return fightChance(S.best, hpMul, atkMul, { our: roguePower(), min: 0.08 });
}
const rogueRoomGold = room => goldKill(S.best) * (2 + room);

function renderRogue() {
  const body = $('rogueBody');
  if (!body) return; // GUARDIÁN
  checkDailyResets();
  const isBonus = (typeof dayHas === 'function' && dayHas('soto'));
  if (rogueRun) { renderRogueRun(); return; }
  body.innerHTML = '<p style="color:#8fa3c8;font-size:11px">🌀 ' + new Date().toISOString().slice(0, 10) + (isBonus ? ' · HOY +1 🎟️' : '') + '</p>' +
    '<p>🎟️ Tickets: <b style="color:#ffd700">' + S.rlTickets + ' / ' + (2 + (isBonus ? 1 : 0)) + '</b></p>' +
    '<p style="font-size:12px;margin:12px 0">' + ROGUE_ROOMS + ' salas. En cada una elegís <b>1 de 3 buffs</b> y después peleás.<br>' +
    'La dificultad sube sala a sala. Si perdés, se termina la run.<br>' +
    '<b style="color:#7efcff">Podés retirarte cuando quieras y quedarte con lo ganado.</b></p>' +
    '<button class="mbtn" id="rogueStart">ENTRAR (1 🎟️)</button>';
  const b = $('rogueStart');
  if (b) b.onclick = startRogue;
}

function startRogue() {
  if (S.rlTickets < 1) return toast('❌ Sin tickets');
  S.rlTickets--;
  rogueRun = { room: 1, max: ROGUE_ROOMS, dmgMult: 1, hpMult: 1, goldMult: 1, venomMult: 1,
    critAdd: 0, drop: false, buffs: [], gold: 0, cleared: 0, phase: 'buff' };
  persist();
  renderRogueRun();
}

function renderRogueRun() {
  const body = $('rogueBody');
  if (!body || !rogueRun) return;
  const r = rogueRun;
  const head = '<h3>🌀 Sala ' + r.room + ' / ' + r.max + (rogueIsBoss() ? ' 👑' : '') + '</h3>' +
    '<p style="font-size:11px;color:#8fa3c8">Buffs: ' + (r.buffs.length ? r.buffs.map(b => b.n).join(', ') : 'ninguno') + '</p>' +
    '<p style="font-size:11px;color:#7bed9f">💰 Acumulado: <b>' + fmt(r.gold) + '</b> 🪙 · ' + r.cleared + ' salas limpias</p>';

  if (r.phase === 'buff') {
    body.innerHTML = head + '<p style="font-size:11px;color:#ffd700;margin-top:8px">Elegí una bendición:</p><div class="buffRow" id="rogueChoices"></div>' +
      (r.cleared > 0 ? '<button class="mbtn gray" id="rogueLeave">🚪 RETIRARSE CON ' + fmt(r.gold) + ' 🪙</button>' : '');
    const pool = ROGUE_BUFFS.slice();
    const choices = [];
    for (let i = 0; i < 3 && pool.length; i++) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const cBox = $('rogueChoices');
    if (cBox) choices.forEach(c => {
      const card = document.createElement('div');
      card.className = 'mrow buff';
      card.style.cursor = 'pointer';
      card.innerHTML = '<span><b>' + c.n + '</b><br><small>' + c.d + '</small></span>';
      card.onclick = () => { c.eff(); r.buffs.push(c); r.phase = 'fight'; persist(); renderRogueRun(); };
      cBox.appendChild(card);
    });
    const lv = $('rogueLeave');
    if (lv) lv.onclick = () => finishRogue('leave');
    return;
  }

  // fase de combate: mostramos las probabilidades ANTES de apostar
  const ch = rogueOdds();
  const col = ch >= 0.7 ? '#7bed9f' : ch >= 0.4 ? '#ffd700' : '#ff5252';
  body.innerHTML = head +
    '<div class="mrow" style="border:1px solid ' + col + '"><span>' + (rogueIsBoss() ? '👑 <b>GUARDIÁN DEL SOTOBOSQUE</b>' : '👾 <b>Emboscada</b>') +
    '<br><small style="color:#8fa3c8">Recompensa: ' + fmt(rogueRoomGold(r.room) * r.goldMult) + ' 🪙</small></span>' +
    '<b style="color:' + col + '">' + Math.round(ch * 100) + '%</b></div>' +
    '<button class="mbtn" id="rogueFight">⚔️ PELEAR</button>' +
    (r.cleared > 0 ? '<button class="mbtn gray" id="rogueLeave">🚪 RETIRARSE CON ' + fmt(r.gold) + ' 🪙</button>' : '');
  const fb = $('rogueFight');
  if (fb) fb.onclick = rogueFight;
  const lv = $('rogueLeave');
  if (lv) lv.onclick = () => finishRogue('leave');
}

function rogueFight() {
  const r = rogueRun; if (!r) return;
  const won = rollFight(rogueOdds());
  if (!won) {
    Audio.SFX.death();
    toast('💀 La sala ' + r.room + ' te derrotó');
    return finishRogue('lost');
  }
  r.gold += Math.floor(rogueRoomGold(r.room) * r.goldMult);
  r.cleared++;
  Audio.SFX.levelup();
  if (rogueIsBoss()) return finishRogue('won');
  r.room++; r.phase = 'buff';
  toast('✅ Sala ' + (r.room - 1) + ' superada');
  persist();
  renderRogueRun();
}

// outcome: 'won' (llegaste al final) · 'leave' (te retiraste) · 'lost' (te derrotaron)
function finishRogue(outcome) {
  const r = rogueRun;
  if (!r) { renderRogue(); return; }
  S.gold += r.gold;
  let msg = '🌀 ' + (outcome === 'won' ? '¡Sotobosque completado!' : outcome === 'leave' ? 'Te retiraste' : 'Run perdida') + ' +' + fmt(r.gold) + ' 🪙';
  if (outcome === 'won') {
    const a = 5; S.adn += a; msg += ' +' + a + ' 🧬';
    for (let i = 0; i < 3; i++) dropItem(2);
    msg += ' +3 🎒';
    Audio.SFX.levelup();
  } else if (outcome === 'leave') {
    // retirarse conserva un botín proporcional a lo limpiado
    const a = Math.floor(r.cleared / 3);
    if (a > 0) { S.adn += a; msg += ' +' + a + ' 🧬'; }
    if (r.drop || r.cleared >= 4) { dropItem(1); msg += ' +🎒'; }
    Audio.SFX.coin();
  } else if (r.drop && r.cleared > 0) {
    dropItem(0); msg += ' +🎒'; // el buff 🎒 Suerte salva algo incluso al perder
  }
  toast(msg);
  rogueRun = null;
  persist();
  renderRogue();
}
