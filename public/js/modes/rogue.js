'use strict';
// ===== ROGUELIKE: EL SOTOBOSQUE =====
const RL_BUFFS = [
  { id: 'dmg',  n: '🗡️ Furia',      d: '+25% daño',       f: b => { b.dmg *= 1.25; } },
  { id: 'hp',   n: '❤️ Coraza',      d: '+25% vida máx',   f: (b, r) => { b.hp *= 1.25; r.maxHp *= 1.25; r.hp *= 1.25; } },
  { id: 'crit', n: '🎯 Precisión',   d: '+10% crítico',    f: b => { b.crit += 0.10; } },
  { id: 'heal', n: '💚 Savia',       d: 'Cura 50% ahora',  f: (b, r) => { r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.5); } },
  { id: 'ls',   n: '🩸 Vampirismo',  d: 'Roba 15% del daño', f: b => { b.ls += 0.15; } },
  { id: 'ven',  n: '☠️ Toxina',      d: '+40% veneno',     f: b => { b.ven *= 1.4; } }
];
let RL = null;
function checkRlTickets() { const d = new Date().toISOString().slice(0, 10); if (S.rlDate !== d) { S.rlDate = d; S.rlTickets = 2; } }
wire('btnRogue', 'click', () => { checkRlTickets(); renderRogue(); $('mRogue').style.display = 'flex'; Audio.SFX.click(); });
wire('rogueClose', 'click', () => { $('mRogue').style.display = 'none'; });
wire('rogueStart', 'click', () => {
  if (S.rlTickets <= 0) return;
  S.rlTickets--; persist();
  RL = { room: 1, hp: maxHP(), maxHp: maxHP(), b: { dmg: 1, hp: 1, crit: 0, ls: 0, ven: 1 }, over: false, choices: rollChoices() };
  Audio.SFX.click(); renderRogue();
});
function rollChoices() {
  const pool = RL_BUFFS.slice(), out = [];
  for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  return out;
}
function renderRogue() {
  const box = $('rogueBody'); if (!box) return;
  if (!RL) {
    box.innerHTML = '<p>8 salas · elegí 1 de 3 buffs por sala · recompensas según avance. <br><small style="color:#8fa3c8">Run perfecta (8/8) = +1🧬</small></p>';
    $('rogueStart').style.display = 'inline-block';
    $('rogueStart').textContent = '🌀 EMPEZAR (🎟️ ' + S.rlTickets + '/2)';
    $('rogueStart').disabled = S.rlTickets <= 0;
    return;
  }
  $('rogueStart').style.display = 'none';
  box.innerHTML = '<h3 style="color:#ffd700">SALA ' + RL.room + '/8</h3>' +
    '<div class="sqHp" style="width:100%;height:10px;margin:10px 0"><i style="width:' + Math.max(0, RL.hp / RL.maxHp * 100) + '%"></i></div>' +
    '<div class="buffRow">' + RL.choices.map((c, i) => '<button class="mbtn buff" data-i="' + i + '">' + c.n + '<br><small>' + c.d + '</small></button>').join('') + '</div>' +
    '<div id="rogueMsg" style="min-height:20px;color:#8fa3c8">Elegí un buff para entrar a la sala…</div>';
  box.querySelectorAll('.buff').forEach(b => { b.onclick = () => pickBuff(+b.dataset.i); });
}
function pickBuff(i) {
  if (!RL || RL.over) return;
  const c = RL.choices[i]; if (!c) return;
  c.f(RL.b, RL);
  const st = S.best + RL.room * 3, ehp = eHP(st) * 8, eatk = eDmg(st) * 1.5;
  const our = dps() * RL.b.dmg * 10 * (1 + RL.b.crit) * (1 + RL.b.ven * 0.2);
  const win = Math.random() < Math.max(0.05, Math.min(0.95, our / ehp));
  let taken = eatk * 8 * (win ? 0.5 : 1);
  taken *= Math.max(0.4, 1 - (RL.b.hp - 1) * 0.4);
  RL.hp -= taken;
  if (RL.b.ls > 0) RL.hp = Math.min(RL.maxHp, RL.hp + our * RL.b.ls);
  const msgEl = $('rogueMsg');
  if (RL.hp <= 0) { RL.over = true; if (msgEl) msgEl.textContent = '💀 Caíste en la sala ' + RL.room + '…'; setTimeout(() => endRun(false), 700); return; }
  if (!win)     { RL.over = true; if (msgEl) msgEl.textContent = '💀 El guardián te superó…'; setTimeout(() => endRun(false), 700); return; }
  if (RL.room >= 8) { RL.over = true; if (msgEl) msgEl.textContent = '🏆 ¡SOTOBOSQUE COMPLETO!'; setTimeout(() => endRun(true), 700); return; }
  RL.room++; RL.choices = rollChoices(); Audio.SFX.hit(); renderRogue();
}
function endRun(cleared) {
  if (!RL) return;
  const rooms = cleared ? 8 : Math.max(0, RL.room - 1);
  const g = goldKill(S.best + 5) * Math.max(1, rooms) * 3;
  S.gold += g;
  let msg = '🌀 Run: ' + rooms + '/8 salas · +' + fmt(g) + ' 🪙';
  if (rooms >= 3) dropItem(Math.floor(rooms / 3) - 1);
  if (cleared) { S.adn++; msg += ' · ¡PERFECTO! +1🧬'; }
  persist(); toast(msg);
  if (cleared) Audio.SFX.levelup(); else Audio.SFX.death();
  RL = null; checkRlTickets(); renderRogue();
}