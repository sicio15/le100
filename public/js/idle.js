// ===== Sistema IDLE: progreso persistente =====
const SAVE_KEY = 'le100_save_v1';
const UPG = {
    len:    { name:'Longitud inicial', desc:'+5 segmentos al nacer', base:50,  g:1.7, max:10, icon:'🐛' },
    speed:  { name:'Velocidad',        desc:'+5% velocidad',         base:80,  g:1.8, max:8,  icon:'💨' },
    cd:     { name:'Reflejos',         desc:'-5% enfriamientos',     base:100, g:1.8, max:10, icon:'⏱️' },
    magnet: { name:'Imán ampliado',    desc:'+20 radio y +1s de imán', base:70, g:1.7, max:10, icon:'🧲' },
    coin:   { name:'Biomasa',          desc:'+25% monedas',          base:120, g:1.9, max:15, icon:'🪙' }
};

let SAVE = loadSave();
function loadSave() {
    try {
        const s = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (s) return Object.assign({ coins:0, best:0, last:Date.now(), up:{} }, s);
    } catch (e) {}
    return { coins:0, best:0, last:Date.now(), up:{} };
}
function store() {
    SAVE.last = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE));
}
function lvl(k) { return SAVE.up[k] || 0; }
function cost(k) { return Math.floor(UPG[k].base * Math.pow(UPG[k].g, lvl(k))); }
function stats() {
    return {
        spd: 3 + 0.15 * lvl('speed'),
        cdMult: Math.max(0.5, 1 - 0.05 * lvl('cd')),
        startLen: 10 + 5 * lvl('len'),
        magnetR: 200 + 20 * lvl('magnet'),
        magnetLvl: lvl('magnet'),
        coinMult: 1 + 0.25 * lvl('coin')
    };
}
function addCoins(n) {
    SAVE.coins += Math.floor(n);
    store();
    updateCoinsUI();
}
function bankRun(score) {
    const gain = Math.floor(score * 0.6 * stats().coinMult);
    SAVE.best = Math.max(SAVE.best, score);
    addCoins(gain);
    return gain;
}
function offlinePending() {
    const dt = Math.min(Date.now() - SAVE.last, 8 * 3600 * 1000) / 1000;
    const rate = (0.2 + SAVE.best * 0.002) * stats().coinMult;
    return Math.floor(dt * rate);
}
function updateCoinsUI() {
    const a = document.getElementById('coinTxt');
    const b = document.getElementById('menuCoins');
    const c = document.getElementById('shopCoins');
    if (a) a.textContent = '🪙 ' + SAVE.coins;
    if (b) b.textContent = '🪙 ' + SAVE.coins;
    if (c) c.textContent = '🪙 ' + SAVE.coins;
}

// ===== Tienda =====
function buildShop() {
    const list = document.getElementById('shopList');
    list.innerHTML = '';
    Object.keys(UPG).forEach(k => {
        const d = UPG[k], l = lvl(k), c = cost(k), maxed = l >= d.max;
        const row = document.createElement('div');
        row.className = 'srow';
        row.innerHTML = `
            <div class="info">
                <div class="nm">${d.icon} ${d.name} <span class="lv">Nv ${l}/${d.max}</span></div>
                <div class="ds">${d.desc}</div>
            </div>
            <button class="buy" ${maxed || SAVE.coins < c ? 'disabled' : ''}>${maxed ? 'MAX' : '🪙 ' + c}</button>`;
        row.querySelector('.buy').onclick = () => {
            if (maxed || SAVE.coins < c) return;
            SAVE.coins -= c;
            SAVE.up[k] = l + 1;
            store();
            updateCoinsUI();
            buildShop();
            toast(`${d.icon} ¡${d.name} Nv ${l + 1}!`);
        };
        list.appendChild(row);
    });
}
document.getElementById('shopBtn').onclick = () => {
    buildShop();
    document.getElementById('shop').style.display = 'flex';
};
document.getElementById('shopClose').onclick = () => {
    document.getElementById('shop').style.display = 'none';
};

// ===== Ganancia offline =====
(function offlineModal() {
    const pending = offlinePending();
    if (pending >= 5) {
        document.getElementById('offlineAmt').textContent = '🪙 ' + pending;
        document.getElementById('offline').style.display = 'flex';
        document.getElementById('offlineBtn').onclick = () => {
            addCoins(pending);
            document.getElementById('offline').style.display = 'none';
            toast(`🪙 +${pending} de tu AFK`);
        };
    }
    store();
})();
updateCoinsUI();