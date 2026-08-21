'use strict';
// ===== le100.io — orquestador (Express + Socket.IO) =====
// LOTE 23: server modular (auth extraída) + rutas de la nueva estructura de carpetas.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { initStorage, U } = require('./server/data/storage');
const { sanitizeSave } = require('./server/data/sanitize');
const { makeRanking } = require('./server/auth/ranking');
const { registerAuth } = require('./server/auth/auth');
const { registerArena } = require('./server/economy/arena');
const { registerWeekly } = require('./server/economy/weekly');
const { registerColonies } = require('./server/social/colonies');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST']
  }
});
const { pushScore } = makeRanking(io);

// ===== MODO DEV (node dev.js): no-cache + live-reload =====
const DEV = process.env.DEV === '1';
const PUB_DIR = path.join(__dirname, 'public');
const STATIC_ROOT = fs.existsSync(PUB_DIR) ? PUB_DIR : __dirname;
if (DEV) {
  const lr = new Set();
  const INJECT = '<script>(function(){try{var s=new EventSource("/__lr");s.onmessage=function(){location.reload();};}catch(e){}})();</script>';
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
  registerAuth(s, { U, sanitizeSave, pushScore });
  registerArena(s);
  registerColonies(s);
  registerWeekly(s, U);
});

const PORT = process.env.PORT || 3000;
function start() {
  server.listen(PORT, () => console.log('🚀 le100.io corriendo en ' + PORT + (DEV ? ' (DEV + live-reload)' : '')));
}
if (require.main === module) start();
module.exports = { app, server, io, start };