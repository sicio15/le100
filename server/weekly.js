'use strict';
// ===== RECOMPENSAS SEMANALES: server-authoritative (anti-cheat) =====
// El servidor valida que no se reclame 2 veces en la misma semana y calcula
// los bonus por Top de Arena y mejor piso semanal de Torre.
const weekNow = () => Math.floor(Date.now() / 604800000);
const TOWER_WEEKLY = [
  { f: 10,  g: 1000,  a: 0 },
  { f: 25,  g: 2500,  a: 1 },
  { f: 50,  g: 5000,  a: 2 },
  { f: 100, g: 10000, a: 5 }
];
const ARENA_POS = [ { p: 1, a: 20 }, { p: 2, a: 12 }, { p: 3, a: 8 }, { p: 10, a: 3 } ];
function registerWeekly(s, U) {
  // Info para el modal: posición en Arena + piso semanal + si ya reclamó
  s.on('weeklyInfo', async cb => {
    const me = await U.get(s.user);
    if (!me || !me.save) return cb({ ok: false });
    const sv = me.save;
    const docs = (await U.all()).filter(u => u.save);
    const sorted = docs.sort((a, b) => (b.save.arenaPts || 0) - (a.save.arenaPts || 0));
    const pos = sorted.findIndex(u => u._id === s.user) + 1;
    cb({
      ok: true, week: weekNow(),
      tower: sv.weekTower || 1,
      claimed: sv.weekClaimedKey === weekNow(),
      pos: pos > 0 ? pos : null,
      top: sorted.slice(0, 10).map(u => ({ name: u.name, pts: u.save.arenaPts || 0 }))
    });
  });
  // Reclamo único por semana: Torre semanal + posición Arena
  s.on('weeklyClaim', async cb => {
    const me = await U.get(s.user);
    if (!me || !me.save) return cb({ ok: false, err: 'Sin cuenta' });
    const sv = me.save;
    const wk = weekNow();
    if (sv.weekClaimedKey === wk) return cb({ ok: false, err: 'Ya reclamaste esta semana' });
    const rewards = [];
    let gold = 0, adn = 0;
    // Torre semanal
    const wt = Math.max(1, sv.weekTower || 1);
    TOWER_WEEKLY.forEach(t => {
      if (wt >= t.f) {
        gold += t.g; adn += t.a;
        rewards.push('🗼 Piso ' + t.f + ': +' + t.g + '🪙' + (t.a ? ' +' + t.a + '🧬' : ''));
      }
    });
    // Top Arena (posición actual)
    const docs = (await U.all()).filter(u => u.save);
    const sorted = docs.sort((a, b) => (b.save.arenaPts || 0) - (a.save.arenaPts || 0));
    const pos = sorted.findIndex(u => u._id === s.user) + 1;
    if (pos > 0) {
      const bonus = ARENA_POS.find(x => pos <= x.p);
      if (bonus) { adn += bonus.a; rewards.push('⚔️ Top ' + pos + ' Arena: +' + bonus.a + '🧬'); }
    }
    if (!rewards.length) { gold += 500; rewards.push('🎁 Participación: +500🪙'); }
    sv.gold = (sv.gold || 0) + gold;
    sv.adn = Math.min(5000, (sv.adn || 0) + adn);
    sv.weekClaimedKey = wk;
    await U.save(s.user, sv);
    cb({ ok: true, gold, adn, rewards, pos: pos > 0 ? pos : null, week: wk });
  });
}
module.exports = { registerWeekly, weekNow };