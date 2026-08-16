'use strict';
// ===== STORAGE: Mongo + fallback memoria (repositorios U y C) =====
// OPTIMIZACIÓN (deuda #3): U.setColonyLevel() = 1 escritura bulk (updateMany)
// en vez de N lecturas+escrituras individuales por donación de colonia.
let col = null, colonies = null;
const memUsers = new Map(), memColonies = new Map();
async function initStorage() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.warn('⚠️ Sin MONGO_URI: modo memoria'); return; }
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('le100');
    col = db.collection('users');
    colonies = db.collection('colonies');
    console.log('🗄️ MongoDB conectado');
  } catch (e) { console.error('❌ Mongo:', e.message); }
}
const U = {
  get: async k => col ? await col.findOne({ _id: k }) : memUsers.get(k) || null,
  create: async (k, d) => col ? await col.insertOne(Object.assign({ _id: k }, d)) : memUsers.set(k, Object.assign({ _id: k }, d)),
  save: async (k, s) => col ? await col.updateOne({ _id: k }, { $set: { save: s } }) : (u => { if (u) u.save = s; })(memUsers.get(k)),
  all: async () => col ? await col.find({}).toArray() : [...memUsers.values()],
  setColonyLevel: async (keys, lvl) => {
    if (!keys || !keys.length) return;
    if (col) return await col.updateMany({ _id: { $in: keys } }, { $set: { 'save.colonyLevel': lvl } });
    keys.forEach(k => { const u = memUsers.get(k); if (u && u.save) u.save.colonyLevel = lvl; });
  }
};
const C = {
  get: async k => colonies ? await colonies.findOne({ _id: k }) : memColonies.get(k) || null,
  create: async (k, d) => colonies ? await colonies.insertOne(Object.assign({ _id: k }, d)) : memColonies.set(k, Object.assign({ _id: k }, d)),
  update: async (k, o) => colonies ? await colonies.updateOne({ _id: k }, { $set: o }) : (c => { if (c) Object.assign(c, o); })(memColonies.get(k)),
  del: async k => colonies ? await colonies.deleteOne({ _id: k }) : memColonies.delete(k),
  all: async () => colonies ? await colonies.find({}).toArray() : [...memColonies.values()]
};
module.exports = { initStorage, U, C };