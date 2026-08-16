'use strict';
// ===== TIENDA DE ADN: sumidero de prestigio (permanentes + skins cosméticas) =====
const SHOP_MAX = { fury: 10, vita: 10, fort: 10, regen: 10, crit: 5 };
const SHOP_DEFS = [
  { id: 'fury',  n: '🗡️ Furia Ancestral',    d: '+5% daño por nivel',         base: 5 },
  { id: 'vita',  n: '❤️ Vitalidad Ancestral', d: '+5% vida por nivel',         base: 5 },
  { id: 'fort',  n: '🪙 Fortuna Ancestral',   d: '+5% oro por nivel',          base: 6 },
  { id: 'regen', n: '💚 Regen Ancestral',     d: '+8% regeneración por nivel', base: 4 },
  { id: 'crit',  n: '🎯 Ojo Crítico',         d: '+2% crítico por nivel',      base: 8 }
];
const shopCost = (it, lv) => it.base + lv * 3;
const SKINS = {
  oro:    { n: '🌟 Dorado',  cost: 15, tints: { sting: 0xffd700, shell: 0xffa000, leaf: 0xffec8b } },
  hielo:  { n: '❄️ Glacial', cost: 25, tints: { sting: 0x7efcff, shell: 0x4fc3f7, leaf: 0xb3e5fc } },
  sombra: { n: '🌑 Sombrío', cost: 40, tints: { sting: 0xc86bfa, shell: 0x9575cd, leaf: 0x7e57c2 } }
};
const BASE_TINTS = {};
// Las skins mutan HEROES[].tint: battle-scene ya lo lee cada frame → cero edits en battle/
function applySkin() {
  if (typeof HEROES === 'undefined') return;
  const sk = S.shop && S.shop.skin ? SKINS[S.shop.skin] : null;
  HEROES.forEach(h => {
    if (!(h.id in BASE_TINTS)) BASE_TINTS[h.id] = h.tint;
    h.tint = (sk && sk.tints[h.id] != null) ? sk.tints[h.id] : BASE_TINTS[h.id];
  });
}
// re-aplicar skin cuando llega un save del servidor
const _applyServerSave = applyServerSave;
applyServerSave = function (sv) { _applyServerSave(sv); applySkin(); };
applySkin();

wire('btnShop', 'click', () => { renderShop(); $('mShop').style.display = 'flex'; Audio.SFX.click(); });
wire('shopClose', 'click', () => { $('mShop').style.display = 'none'; });
function buyShop(id) {
  const it = SHOP_DEFS.find(x => x.id === id); if (!it) return;
  const lv = shopLv(id);
  if (lv >= SHOP_MAX[id]) return;
  const c = shopCost(it, lv);
  if (S.adn < c) { Audio.SFX.click(); return; }
  S.adn -= c; S.shop.lv[id] = lv + 1;
  persist(); Audio.SFX.buy(); toast(it.n + ' Nv ' + (lv + 1));
  renderShop();
}
function buySkin(id) {
  const sk = SKINS[id]; if (!sk || (S.shop.skins || []).includes(id)) return;
  if (S.adn < sk.cost) { Audio.SFX.click(); return; }
  S.adn -= sk.cost; S.shop.skins.push(id); S.shop.skin = id;
  applySkin(); persist(); Audio.SFX.levelup(); toast(sk.n + ' desbloqueado');
  renderShop();
}
function equipSkin(id) {
  S.shop.skin = id; applySkin(); persist(); Audio.SFX.click(); renderShop();
}
function renderShop() {
  const box = $('shopList'); if (!box) return;
  box.innerHTML = '';
  SHOP_DEFS.forEach(it => {
    const lv = shopLv(it.id), max = SHOP_MAX[it.id], c = shopCost(it, lv);
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>' + it.n + ' <b style="color:#7efcff">Nv ' + lv + '/' + max + '</b><br><small style="color:#8fa3c8">' + it.d + '</small></span>';
    const b = document.createElement('button'); b.className = 'claim';
    b.textContent = lv >= max ? 'MAX' : '🧬 ' + c;
    b.disabled = lv >= max || S.adn < c;
    b.onclick = () => buyShop(it.id);
    row.appendChild(b); box.appendChild(row);
  });
  const sb = $('skinList'); if (!sb) return;
  sb.innerHTML = '';
  const r0 = document.createElement('div'); r0.className = 'mrow';
  r0.innerHTML = '<span>🐛 Original<br><small style="color:#8fa3c8">Sin tintas</small></span>';
  const b0 = document.createElement('button'); b0.className = 'claim';
  b0.textContent = (S.shop.skin || '') === '' ? 'USANDO' : 'USAR';
  b0.disabled = (S.shop.skin || '') === '';
  b0.onclick = () => equipSkin('');
  r0.appendChild(b0); sb.appendChild(r0);
  Object.keys(SKINS).forEach(id => {
    const sk = SKINS[id], owned = (S.shop.skins || []).includes(id);
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = '<span>' + sk.n + '<br><small style="color:#8fa3c8">' + (owned ? 'En tu colección' : 'Skin permanente de escuadrón') + '</small></span>';
    const b = document.createElement('button'); b.className = 'claim';
    if (owned) { b.textContent = S.shop.skin === id ? 'USANDO' : 'USAR'; b.disabled = S.shop.skin === id; b.onclick = () => equipSkin(id); }
    else { b.textContent = '🧬 ' + sk.cost; b.disabled = S.adn < sk.cost; b.onclick = () => buySkin(id); }
    row.appendChild(b); sb.appendChild(row);
  });
}