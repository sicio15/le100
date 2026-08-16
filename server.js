'use strict';
// ===== le100.io — orquestador (Express + Socket.IO) =====
// Módulos en server/: storage · sanitize · power · ranking · arena · colonies
// LOTE 2C (deuda #8): sesión persistente con token (hash SHA-256 en el doc,
// token se rota en login/register manual y se reutiliza en loginToken).
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { initStorage, U } = require('./server/storage');
const { sanitizeSave } = require('./server/sanitize');
const { makeRanking } = require('./server/ranking');
const { registerArena } = require('./server/arena');
const { registerColonies } = require('./server/colonies');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const { pushScore } = makeRanking(io);
const newToken = () => crypto.randomBytes(16).toString('hex');
const hashToken = t => crypto.createHash('sha256').update(String(t || '')).digest('hex');
// ===== MODO DEV (node dev.js): no-cache + live-reload =====
const DEV = process.env.DEV === '1';
const PUB_DIR = path.join(__dirname, 'public');
// Si no existe public/ (prueba local sin deploy), sirve la raíz del proyecto
const STATIC_ROOT = fs.existsSync(PUB_DIR) ? PUB_DIR : __dirname;
if (DEV) {
  const lr = new Set();
  const INJECT = '<script>(function(){try{var s=new EventSource("/__lr");s.onmessage=function(){location.reload();};}catch(e){}})();</script>';
  // index.html con el script de reload inyectado (antes que el static)
  app.get(['/', '/index.html'], (req, res) => {
    fs.readFile(path.join(STATIC_ROOT, 'index.html'), 'utf8', (e, html) => {
      if (e) return res.status(404).end();
      res.type('html').send(html.includes('</body>') ? html.replace('</body>', INJECT + '</body>') : html + INJECT);
    });
  });
  app.get('/__lr', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' });
    res.write('retry: 500\n\n');
    lr.add(res);
    req.on('close', () => lr.delete(res));
  });
  let t = null;
  const onChange = (ev, fn) => {
    fn = String(fn || '');
    if (fn.includes('node_modules')) return;
    clearTimeout(t);
    t = setTimeout(() => { console.log('🔁 cambio detectado → reload'); lr.forEach(c => c.write('data: reload\n\n')); }, 250);
  };
  try { fs.watch(STATIC_ROOT, { recursive: true }, onChange); }
  catch (e) {
    fs.watch(STATIC_ROOT, onChange);
    const img = path.join(STATIC_ROOT, 'img');
    if (fs.existsSync(img)) fs.watch(img, onChange);
  }
  console.log('🔧 DEV: live-reload activo');
}
app.use(express.static(STATIC_ROOT, DEV ? {
  etag: false, maxAge: 0,
  setHeaders: res => res.setHeader('Cache-Control', 'no-store')
} : {}));
initStorage();
// ===== SOCKET =====
io.on('connection', s => {
  s.user = null;
  s.on('register', async (d, cb) => {
    try {
      const name = String(d.name || '').trim();
      const pass = String(d.pass || '');
      if (name.length < 3 || name.length > 14) return cb({ ok: false, err: 'Nombre de 3 a 14 caracteres' });
      if (pass.length < 4) return cb({ ok: false, err: 'Contraseña de 4+ caracteres' });
      const key = name.toLowerCase();
      if (await U.get(key)) return cb({ ok: false, err: 'Ese nombre ya existe' });
      const salt = crypto.randomBytes(8).toString('hex');
      const token = newToken();
      const save = sanitizeSave(null); save.last = Date.now();
      await U.create(key, { name, salt, hash: crypto.scryptSync(pass, salt, 32).toString('hex'), tokenHash: hashToken(token), save });
      s.user = key; pushScore(name, save.best);
      cb({ ok: true, name, save, token });
    } catch (e) { cb({ ok: false, err: 'Error del servidor' }); }
  });
  s.on('login', async (d, cb) => {
    try {
      const key = String(d.name || '').trim().toLowerCase();
      const doc = await U.get(key);
      if (!doc) return cb({ ok: false, err: 'La cuenta no existe' });
      if (crypto.scryptSync(String(d.pass || ''), doc.salt, 32).toString('hex') !== doc.hash) return cb({ ok: false, err: 'Contraseña incorrecta' });
      const token = newToken(); // rotación en login manual
      await U.patch(key, { tokenHash: hashToken(token) });
      s.user = key; pushScore(doc.name, doc.save.best);
      cb({ ok: true, name: doc.name, save: doc.save, token });
    } catch (e) { cb({ ok: false, err: 'Error del servidor' }); }
  });
  // LOTE 2C: auto-login silencioso con token persistente
  s.on('loginToken', async (token, cb) => {
    try {
      const doc = await U.findByTokenHash(hashToken(token));
      if (!doc || !doc.save) return cb({ ok: false });
      s.user = doc._id; pushScore(doc.name, doc.save.best);
      cb({ ok: true, name: doc.name, save: doc.save, token });
    } catch (e) { cb({ ok: false, err: 'Error del servidor' }); }
  });
  s.on('saveGame', d => {
    if (!s.user) return;
    const now = Date.now();
    if (now - (s.lastSaveAt || 0) < 2000) return;
    s.lastSaveAt = now;
    U.save(s.user, sanitizeSave(d));
  });
  s.on('score', d => { if (d && d.name) pushScore(String(d.name).slice(0, 14), Math.min(9999, +d.stage || 1)); });
  registerArena(s);
  registerColonies(s);
});
const PORT = process.env.PORT || 3000;
function start() {
  server.listen(PORT, () => console.log('🚀 le100.io corriendo en ' + PORT + (DEV ? ' (DEV + live-reload)' : '')));
}
if (require.main === module) start();
module.exports = { app, server, io, start };