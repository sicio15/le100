'use strict';
/* ============================================================
   FASE 4: Torre Infinita + Roguelike Sotobosque + QoL de equipo
   ============================================================ */

/* ===== QoL: auto-equipar lo mejor ===== */
const gearScore = it => it.rarity * 20 + it.lvl * 2 + it.val;
/* ===== QoL: auto-equipar lo mejor (FIX: conserva la mochila) ===== */
const gearScore = it => it.rarity * 20 + it.lvl * 2 + it.val + (it.subs || []).reduce((a, s) => a + s.val, 0);
function autoEquip() {
    Object.keys(SLOT_DEFS).forEach(sl => {
        const candidates = S.gear.inv.filter(i => i.slot === sl);
        if (S.gear.equipped[sl]) candidates.push(S.gear.equipped[sl]);
        if (!candidates.length) return;
        const best = candidates.slice().sort((a, b) => gearScore(b) - gearScore(a))[0];
        if (best !== S.gear.equipped[sl]) {
            S.gear.inv = S.gear.inv.filter(i => i !== best);              // saca SOLO el mejor
            if (S.gear.equipped[sl]) S.gear.inv.push(S.gear.equipped[sl]); // devuelve el anterior
            S.gear.equipped[sl] = best;
        }
    });
    persist(); renderGear(); Audio.SFX.buy();
    toast('⚡ Equipo optimizado');
}
if ($('btnGear')) $('btnGear').addEventListener('click', () => {
    setTimeout(() => {
        const h = $('mGear') && $('mGear').querySelector('h2');
        if (h && !$('autoEqBtn')) {
            const b = document.createElement('button');
            b.id = 'autoEqBtn'; b.className = 'mbtn'; b.textContent = '⚡ AUTO-EQUIPAR';
            b.onclick = autoEquip;
            h.after(b);
        }
    }, 0);
});

/* ============================================================
   🗼 TORRE INFINITA
   ============================================================ */
wire('btnTower', 'click', () => { renderTower(); $('mTower').style.display = 'flex'; Audio.SFX.click(); });
wire('towerClose', 'click', () => { $('mTower').style.display = 'none'; });
wire('towerFight', 'click', towerFight);

const towerPower = f => ({
    hp: eHP(S.best + f) * (6 + f * 0.5),
    atk: eDmg(S.best + f) * (1.5 + f * 0.08)
});

function renderTower() {
    const f = S.tower, p = towerPower(f);
    $('towerInfo').innerHTML = '🗼 Piso ' + f + ' <small>(récord ' + S.towerBest + ')</small><br>' +
        '<small>❤️ ' + fmt(p.hp) + ' · ⚔️ ' + fmt(p.atk) + '/s</small><br>' +
        '<small style="color:#8fa3c8">Cada piso: oro · cada 3: 🎒 equipo · cada 10: +1🧬</small>';
    $('towerFight').disabled = false;
}
function towerFight() {
    const f = S.tower, p = towerPower(f);
    const our = dps() * 30 * 1.4;
    const aguante = maxHP() / (p.atk * 0.5);
    const ratio = our / p.hp;
    const win = Math.random() < Math.max(0.05, Math.min(0.95, ratio * (aguante >= 20 ? 1 : 0.5)));
    const g = goldKill(S.best + f) * (win ? 12 : 3);
    S.gold += g;
    let msg;
    if (win) {
        S.tower++; S.towerBest = Math.max(S.towerBest, S.tower);
        msg = '✅ Piso ' + f + ' superado! +' + fmt(g) + ' 🪙';
        if (f % 3 === 2) { dropItem(1 + Math.floor(f / 10)); msg += ' +🎒'; }
        if (f % 10 === 9) { S.adn++; msg += ' +1🧬'; }
        Audio.SFX.levelup();
    } else {
        msg = '💀 El piso ' + f + ' te frenó. +' + fmt(g) + ' 🪙';
        Audio.SFX.death();
    }
    toast(msg);
    $('towerResult').textContent = msg;
    persist(); netScore(S.name, S.best);
    renderTower();
}

/* ============================================================
   🌀 ROGUELIKE: EL SOTOBOSQUE (2 runs/día, 8 salas)
   ============================================================ */
const RL_BUFFS = [
    { id: 'dmg',  n: '🗡️ Furia',      d: '+25% daño',        f: b => { b.dmg *= 1.25; } },
    { id: 'hp',   n: '❤️ Coraza',      d: '+25% vida máx',    f: (b, r) => { b.hp *= 1.25; r.maxHp *= 1.25; r.hp *= 1.25; } },
    { id: 'crit', n: '🎯 Precisión',   d: '+10% crítico',     f: b => { b.crit += 0.10; } },
    { id: 'heal', n: '💚 Savia',       d: 'Cura 50% ahora',   f: (b, r) => { r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.5); } },
    { id: 'ls',   n: '🩸 Vampirismo',  d: 'Roba 15% del daño',f: b => { b.ls += 0.15; } },
    { id: 'ven',  n: '☠️ Toxina',      d: '+40% veneno',      f: b => { b.ven *= 1.4; } }
];
let RL = null;

function checkRlTickets() {
    const d = new Date().toISOString().slice(0, 10);
    if (S.rlDate !== d) { S.rlDate = d; S.rlTickets = 2; }
}
wire('btnRogue', 'click', () => { checkRlTickets(); renderRogue(); $('mRogue').style.display = 'flex'; Audio.SFX.click(); });
wire('rogueClose', 'click', () => { $('mRogue').style.display = 'none'; });
wire('rogueStart', 'click', () => {
    if (S.rlTickets <= 0) return;
    S.rlTickets--; persist();
    RL = { room: 1, hp: maxHP(), maxHp: maxHP(), b: { dmg: 1, hp: 1, crit: 0, ls: 0, ven: 1 }, choices: rollChoices() };
    Audio.SFX.click();
    renderRogue();
});
function rollChoices() {
    const pool = RL_BUFFS.slice();
    const out = [];
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
    return out;
}
function renderRogue() {
    const box = $('rogueBody'); if (!box) return;
    if (!RL) {
        box.innerHTML = '<p>8 salas · elegí 1 de 3 buffs por sala · recompensas según avance.<br>' +
            '<small style="color:#8fa3c8">Run perfecta (8/8) = +1🧬</small></p>';
        $('rogueStart').style.display = 'inline-block';
        $('rogueStart').textContent = '🌀 EMPEZAR (🎟️ ' + S.rlTickets + '/2)';
        $('rogueStart').disabled = S.rlTickets <= 0;
        return;
    }
    $('rogueStart').style.display = 'none';
    box.innerHTML = '<h3 style="color:#ffd700">SALA ' + RL.room + '/8</h3>' +
        '<div class="sqHp" style="width:100%;height:10px;margin:10px 0"><i style="width:' + Math.max(0, RL.hp / RL.maxHp * 100) + '%"></i></div>' +
        '<div class="buffRow">' + RL.choices.map((c, i) =>
            '<button class="mbtn buff" data-i="' + i + '">' + c.n + '<br><small>' + c.d + '</small></button>').join('') + '</div>' +
        '<div id="rogueMsg" style="min-height:20px;color:#8fa3c8">Elegí un buff para entrar a la sala…</div>';
    box.querySelectorAll('.buff').forEach(b => { b.onclick = () => pickBuff(+b.dataset.i); });
}
function pickBuff(i) {
    const c = RL.choices[i];
    c.f(RL.b, RL);
    const st = S.best + RL.room * 3;
    const ehp = eHP(st) * 8, eatk = eDmg(st) * 1.5;
    const our = dps() * RL.b.dmg * 10 * (1 + RL.b.crit) * (1 + RL.b.ven * 0.2);
    const ratio = our / ehp;
    const win = Math.random() < Math.max(0.05, Math.min(0.95, ratio));
    let taken = eatk * 8 * (win ? 0.5 : 1);
    taken *= Math.max(0.4, 1 - (RL.b.hp - 1) * 0.4);
    RL.hp -= taken;
    if (RL.b.ls > 0) RL.hp = Math.min(RL.maxHp, RL.hp + our * RL.b.ls);
    const msgEl = $('rogueMsg');
    if (RL.hp <= 0) {
        if (msgEl) msgEl.textContent = '💀 Caíste en la sala ' + RL.room + '…';
        setTimeout(() => endRun(false), 700);
        return;
    }
    if (!win) {
        if (msgEl) msgEl.textContent = '💀 El guardián te superó…';
        setTimeout(() => endRun(false), 700);
        return;
    }
    if (RL.room >= 8) {
        if (msgEl) msgEl.textContent = '🏆 ¡SOTOBOSQUE COMPLETO!';
        setTimeout(() => endRun(true), 700);
        return;
    }
    RL.room++;
    RL.choices = rollChoices();
    Audio.SFX.hit();
    renderRogue();
}
function endRun(cleared) {
    const rooms = cleared ? 8 : Math.max(0, RL.room - 1);
    const g = goldKill(S.best + 5) * Math.max(1, rooms) * 3;
    S.gold += g;
    let msg = '🌀 Run: ' + rooms + '/8 salas · +' + fmt(g) + ' 🪙';
    if (rooms >= 3) dropItem(Math.floor(rooms / 3) - 1);
    if (cleared) { S.adn++; msg += ' · ¡PERFECTO! +1🧬'; }
    persist();
    toast(msg);
    if (cleared) Audio.SFX.levelup(); else Audio.SFX.death();
    RL = null;
    checkRlTickets();
    renderRogue();
}