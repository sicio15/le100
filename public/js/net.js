'use strict';
let socket = null;
try { socket = io(); } catch (e) {}
let LB = [];
if (socket) socket.on('top', list => { LB = list; });

function netAuth(mode, name, pass, cb) {
    if (!socket || !socket.connected) return cb({ ok:false, err:'Sin conexión al servidor' });
    socket.emit(mode, { name, pass }, cb);
}
function netSendSave(save) { if (socket && authed) socket.emit('saveGame', save); }
function netScore(name, stage) { if (socket) socket.emit('score', { name, stage }); }