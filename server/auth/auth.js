'use strict';
// ===== AUTH: register/login/loginToken + saveGame + score =====
const crypto = require('crypto');
const newToken = () => crypto.randomBytes(16).toString('hex');
const hashToken = t => crypto.createHash('sha256').update(String(t || '')).digest('hex');

function registerAuth(s, { U, sanitizeSave, pushScore }) {
  s.on('register', async (d, cb) => {
    try {
      const name = String((d && d.name) || '').trim();
      const pass = String((d && d.pass) || '');
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
      const key = String((d && d.name) || '').trim().toLowerCase();
      const doc = await U.get(key);
      if (!doc) return cb({ ok: false, err: 'La cuenta no existe' });
      if (crypto.scryptSync(String((d && d.pass) || ''), doc.salt, 32).toString('hex') !== doc.hash)
        return cb({ ok: false, err: 'Contraseña incorrecta' });
      const token = newToken();
      if (typeof U.patch === 'function') await U.patch(key, { tokenHash: hashToken(token) });
      s.user = key; pushScore(doc.name, doc.save.best);
      cb({ ok: true, name: doc.name, save: doc.save, token });
    } catch (e) { cb({ ok: false, err: 'Error del servidor' }); }
  });

  s.on('loginToken', async (token, cb) => {
    try {
      if (!token) return cb({ ok: false });
      const doc = (typeof U.findByTokenHash === 'function') ? await U.findByTokenHash(hashToken(token)) : null;
      if (!doc || !doc.save) return cb({ ok: false });
      s.user = doc._id || String(doc.name).toLowerCase();
      pushScore(doc.name, doc.save.best);
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
}
module.exports = { registerAuth };