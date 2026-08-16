'use strict';
// ===== NET: socket + auth + ranking =====
let socket = null;
try { socket = io(); } catch (e) {}
let LB = [];
if (socket) socket.on('top', list => { LB = list; });
// ===== SESIÓN PERSISTENTE (deuda #8): token en localStorage =====
// El server guarda solo el HASH (SHA-256); el token viaja y se rota en cada login manual.
const TOKEN_KEY = 'le100_token_v1';
const netGetToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
const netSetToken = t => { try { if (t) localStorage.setItem(TOKEN_KEY, t); } catch (e) {} };
const netClearToken = () => { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
function netAuth(mode, name, pass, cb) {
  if (!socket || !socket.connected) return cb({ ok: false, err: 'Sin conexión al servidor' });
  socket.emit(mode, { name, pass }, cb);
}
function netLoginToken(token, cb) {
  if (!socket || !token) return cb({ ok: false });
  if (!socket.connected) return cb({ ok: false });
  socket.emit('loginToken', token, cb);
}
function netSendSave(save) { if (socket && authed) socket.emit('saveGame', save); }
function netScore(name, stage) { if (socket) socket.emit('score', { name, stage }); }