'use strict';
// ===== ARENA PvP: handlers socket =====
// OPTIMIZACIÓN (deuda #2): arenaInfo hacía 2× U.all() por llamada → ahora 1 sola lectura.
const { U } = require('./storage');
const { powerOf } = require('./power');
function registerArena(s) {
  s.on('arenaInfo', async cb => {
    const me = await U.get(s.user);
    if (!me || !me.save) return cb({ ops: [], top: [] });
    const docs = (await U.all()).filter(u => u.save); // única lectura de usuarios
    const myPts = me.save.arenaPts || 0;
    const ops = docs
      .filter(u => u._id !== s.user)
      .sort((a, b) => Math.abs((a.save.arenaPts || 0) - myPts) - Math.abs((b.save.arenaPts || 0) - myPts))
      .slice(0, 3)
      .map(u => ({ name: u.name, best: u.save.best || 1, pts: u.save.arenaPts || 0 }));
    const top = docs
      .map(u => ({ name: u.name, pts: u.save.arenaPts || 0 }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 10);
    cb({ ops, top });
  });
  s.on('arenaFight', async (opName, cb) => {
    const me = await U.get(s.user);
    if (!me || !me.save) return cb({ win: false, msg: '?' });
    const d = new Date().toISOString().slice(0, 10);
    if (me.save.arenaDate !== d) { me.save.arenaDate = d; me.save.arenaTickets = 5; }
    if ((me.save.arenaTickets || 0) <= 0) return cb({ win: false, msg: '🎟️ Sin tickets hoy' });
    const op = (await U.all()).find(u => u.name === opName && u.save);
    if (!op) return cb({ win: false, msg: 'Rival no encontrado' });
    me.save.arenaTickets--;
    const pa = powerOf(me.save), pb = powerOf(op.save);
    const tA = pa.hp / (pb.dps * 0.6), tB = pb.hp / (pa.dps * 0.6);
    const win = (tB * (0.9 + Math.random() * 0.2)) < (tA * (0.9 + Math.random() * 0.2));
    me.save.arenaPts = Math.max(0, (me.save.arenaPts || 0) + (win ? 30 : -10));
    op.save.arenaPts = Math.max(0, (op.save.arenaPts || 0) + (win ? -10 : 15));
    const g = Math.ceil(3 * Math.pow(1.18, me.save.best || 1)) * (win ? 15 : 4);
    me.save.gold += g;
    await U.save(s.user, me.save); await U.save(op._id, op.save);
    cb({ win, msg: (win ? '🏆 ¡Victoria! +' : '💀 Derrota... +') + g + ' 🪙 · ' + (win ? '+30' : '-10') + ' pts' });
  });
}
module.exports = { registerArena };