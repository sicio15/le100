'use strict';
// ===== NET: socket + auth + ranking =====
// AUTODETECCIÓN: si el HTML se sirve desde Live Server (5500) → apuntar al backend (3000)
// Si se sirve desde el propio Node (3000) → mismo host
const BACKEND_URL = (() => {
  try {
    const host = window.location.hostname || '127.0.0.1';
    const port = window.location.port;
    // Live Server usa 5500/5501/etc → apuntar al backend en 3000
    if (port === '5500' || port === '5501' || port === '5502') {
      return 'http://' + host + ':3000';
    }
    // Si estamos en el backend Node, usar mismo origen
    return '';
  } catch (e) { return ''; }
})();

let socket = null;
try { socket = BACKEND_URL ? io(BACKEND_URL) : io(); } catch (e) { console.warn('⚠️ Socket.IO no disponible'); }

let LB = [];
if (socket) {
  socket.on('connect', () => console.log('✅ Socket conectado a', BACKEND_URL || 'mismo host'));
  socket.on('disconnect', () => console.log('❌ Socket desconectado'));
  socket.on('top', list => { LB = list; });
}

// ===== SESIÓN PERSISTENTE (deuda #8): token en localStorage =====
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