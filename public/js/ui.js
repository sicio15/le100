'use strict';
function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 2400);
}
const wire = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
/* ===== Logo con chroma ===== */
(function loadLogo() {
    const img = new Image();
    img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        try { chroma(g, c); } catch (e) {}
        const el = $('logoImg');
        if (el) el.src = c.toDataURL();
    };
    img.src = 'img/logo.png';
})();
/* ===== Cuentas ===== */
let authMode = 'login';
wire('tabLogin', 'click', () => { authMode = 'login'; $('tabLogin').classList.add('sel'); $('tabReg').classList.remove('sel'); Audio.SFX.click(); });
wire('tabReg', 'click', () => { authMode = 'register'; $('tabReg').classList.add('sel'); $('tabLogin').classList.remove('sel'); Audio.SFX.click(); });
wire('authBtn', 'click', () => {
    $('authErr').textContent = '';
    netAuth(authMode, $('authName').value, $('authPass').value, res => {
        if (!res.ok) { $('authErr').textContent = res.err || 'Error'; return; }
        authed = true; S.name = res.name; applyServerSave(res.save);
        $('mAuth').style.display = 'none';
        afterLogin();
    });
});
if (!authed) { const m = $('mAuth'); if (m) m.style.display = 'flex'; }
/* ===== MODO LOCAL: invitado sin servidor/cuenta (no toca index.html) ===== */
(function addGuestBtn() {
    const m = $('mAuth'); if (!m) return;
    const b = document.createElement('button');
    b.className = 'mbtn gray';
    b.textContent = '🎮 JUGAR EN LOCAL (sin cuenta)';
    b.onclick = () => {
        if (!S.name) S.name = 'Invitado';
        $('mAuth').style.display = 'none';
        afterLogin();
    };
    const hint = m.querySelector('.hintTxt');
    if (hint) hint.before(b);
    else (m.querySelector('.mcard') || m).appendChild(b);
})();
let offlinePending = 0, offlineWired = false;
function afterLogin() {
    Audio.init(); Audio.startMusic();
    Audio.setChapter(Math.floor((S.stage - 1) / 10));
    initSquad();
    checkTickets();
    const sec = Math.min(Date.now() - (S.last || Date.now()), 8 * 3600 * 1000) / 1000;
    const pending = Math.floor(sec * goldKill(S.best) * 0.4);
    offlinePending = pending;
    if (pending >= 10) {
        $('offlineAmt').textContent = '🪙 ' + fmt(pending);
        $('mOffline').style.display = 'flex';
        if (!offlineWired) {
            offlineWired = true;
            wire('offlineBtn', 'click', () => {
                if (offlinePending > 0) {
                    S.gold += offlinePending; persist();
                    Audio.SFX.coin();
                    toast('🪙 +' + fmt(offlinePending) + ' de tu AFK');
                    offlinePending = 0;
                }
                $('mOffline').style.display = 'none';
            });
        }
    }
    if (authed) netScore(S.name, S.best);
    persist();
    toast('¡Hola, ' + S.name + '!');
    if (!SETTINGS.tutorialDone) startTutorial();
}
/* ===== Tutorial ===== */
const TUT_STEPS = [
    { t: 'Tu escuadrón pelea solo. ¡Miralo combatir! 🐛', s: 'battleWrap' },
    { t: 'Ganá oro y comprá mejoras acá abajo ⬇️', s: 'bottombar' },
    { t: 'Cada héroe carga ⚡ energía: al 100% lanza su ULTIMATE con cut-in.', s: 'heroHpWrap' },
    { t: 'Cada 5 etapas aparece un JEFE 👑. Si caés, bajás una etapa a farmear.', s: 'topbar' },
    { t: '⏩ acelera la batalla y ⚙️ ajustes arriba. ¡A jugar!', s: 'speedBtn' }
];
function startTutorial() {
    let i = 0;
    const ov = document.createElement('div'); ov.id = 'tutOv';
    const box = document.createElement('div'); box.id = 'tutBox';
    ov.appendChild(box); document.body.appendChild(ov);
    function show() {
        if (i >= TUT_STEPS.length) {
            SETTINGS.tutorialDone = true; saveSettings();
            ov.remove(); return;
        }
        const step = TUT_STEPS[i];
        const target = $(step.s);
        const r = target ? target.getBoundingClientRect() : { left: W / 2 - 150, top: H / 2, width: 300, height: 0 };
        box.innerHTML = '<div class="tutTxt">' + step.t + '</div><div class="tutCtr">' + (i + 1) + '/' + TUT_STEPS.length +
            ' <button class="mbtn" id="tutNext">' + (i === TUT_STEPS.length - 1 ? '¡LISTO!' : 'SIGUIENTE ▶') + '</button></div>';
        box.style.left = Math.max(10, Math.min(W - 320, r.left)) + 'px';
        box.style.top = Math.min(H - 140, r.top + r.height + 14) + 'px';
        wire('tutNext', 'click', () => { Audio.SFX.click(); i++; show(); });
    }
    show();
}
/* ===== Mejoras ===== */
const upBtns = {};
Object.keys(UPDEF).forEach(k => {
    const ups = $('ups'); if (!ups) return;
    const c = document.createElement('div');
    c.className = 'ucard';
    const ico = (typeof picOr === 'function') ? picOr(UPDEF[k].pic, UPDEF[k].icon, 14) : UPDEF[k].icon;
    c.innerHTML = '<div class="un">' + ico + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div><button class="ubuy" id="buy_' + k + '"></button>';
    ups.appendChild(c);
    upBtns[k] = c.querySelector('button');
    upBtns[k].onclick = () => {
        const co = cost(k);
        if (S.gold >= co) {
            S.gold -= co; S.ups[k]++;
            if (k === 'vit') initSquad();
            persist(); Audio.SFX.buy();
            toast(UPDEF[k].icon + ' ' + UPDEF[k].name + ' Nv ' + S.ups[k]);
        } else { Audio.SFX.click(); }
    };
});
/* ===== Velocidad ===== */
const SPEEDS = [1, 2, 3];
function cycleSpeed() {
    const idx = SPEEDS.indexOf(SETTINGS.speed);
    SETTINGS.speed = SPEEDS[(idx + 1) % SPEEDS.length];
    saveSettings(); Audio.SFX.click();
    $('speedBtn').textContent = '⏩ x' + SETTINGS.speed;
}
wire('speedBtn', 'click', cycleSpeed);
if ($('speedBtn')) $('speedBtn').textContent = '⏩ x' + SETTINGS.speed;
/* ===== Settings ===== */
function openSettings() {
    Audio.SFX.click();
    $('setAudio').checked = SETTINGS.audio;
    $('setMusic').value = SETTINGS.musicVol; $('setMusicV').textContent = Math.round(SETTINGS.musicVol * 100);
    $('setSfx').value = SETTINGS.sfxVol; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol * 100);
    $('setReduce').checked = SETTINGS.reduceFx;
    $('mSettings').style.display = 'flex';
}
wire('btnSettings', 'click', openSettings);
wire('setClose', 'click', () => { $('mSettings').style.display = 'none'; });
wire('setAudio', 'change', e => { SETTINGS.audio = e.target.checked; Audio.setEnabled(SETTINGS.audio); });
wire('setMusic', 'input', e => { SETTINGS.musicVol = +e.target.value; $('setMusicV').textContent = Math.round(SETTINGS.musicVol * 100); Audio.setMusicVol(SETTINGS.musicVol); });
wire('setSfx', 'input', e => { SETTINGS.sfxVol = +e.target.value; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol * 100); Audio.setSfxVol(SETTINGS.sfxVol); });
wire('setReduce', 'change', e => { SETTINGS.reduceFx = e.target.checked; saveSettings(); });
wire('setLogout', 'click', () => {
    if (!confirm('¿Cerrar sesión? (tu partida queda guardada en la cuenta)')) return;
    persist(); location.reload();
});
/* ===== Logros ===== */
function renderAch() {
    $('achList').innerHTML = '';
    ACH.forEach(a => {
        const done = !!S.ach[a.id], can = !done && a.c();
        const row = document.createElement('div');
        row.className = 'mrow';
        const rew = a.r.g ? '🪙 ' + a.r.g : '🧬 ' + a.r.a;
        row.innerHTML = '<span>' + (done ? '✅' : can ? '🔔' : '🔒') + ' ' + a.d + '<br><small style="color:#8fa3c8">Recompensa: ' + rew + '</small></span>';
        const b = document.createElement('button');
        b.className = 'claim'; b.textContent = done ? 'OK' : 'RECLAMAR';
        b.disabled = !can;
        b.onclick = () => {
            S.ach[a.id] = 1;
            if (a.r.g) S.gold += a.r.g;
            if (a.r.a) S.adn += a.r.a;
            persist(); Audio.SFX.levelup(); toast('🏅 ¡Logro reclamado!');
            renderAch();
        };
        row.appendChild(b);
        $('achList').appendChild(row);
    });
}
/* ===== Prestigio ===== */
wire('btnPrestige', 'click', () => {
    $('prGain').textContent = '+' + prGain() + ' 🧬';
    $('prBtn').disabled = !(S.best >= 10 && prGain() > 0);
    $('mPrestige').style.display = 'flex'; Audio.SFX.click();
});
wire('prClose', 'click', () => { $('mPrestige').style.display = 'none'; });
wire('prBtn', 'click', () => {
    const g = prGain();
    if (g <= 0) return;
    S.adn += g; S.prestiges++;
    S.prBase = S.best;
    S.gold = 0; S.stage = 1; S.ks = 0;
    S.ups = { dmg: 0, vit: 0, regen: 0, venom: 0, fortune: 0 };
    initSquad(); resetSquad();
    enemies = [];
    persist(); netScore(S.name, S.best);
    $('mPrestige').style.display = 'none';
    Audio.SFX.levelup();
    toast('🧬 ¡Prestigio! +' + g + ' ADN');
});
/* ===== Modales ===== */
wire('btnAch', 'click', () => { renderAch(); $('mAch').style.display = 'flex'; Audio.SFX.click(); });
wire('achClose', 'click', () => { $('mAch').style.display = 'none'; });
wire('btnLb', 'click', () => {
    $('lbList').innerHTML = LB.length
        ? LB.map((p, i) => '<div class="mrow"><span>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') +
            ' <b style="color:' + (p.name === S.name ? '#7CFC7C' : '#fff') + '">' + p.name + '</b></span><span>Etapa ' + p.stage + '</span></div>').join('')
        : '<p style="color:#8fa3c8">Todavía no hay nadie en línea...</p>';
    $('mLb').style.display = 'flex'; Audio.SFX.click();
});
wire('lbClose', 'click', () => { $('mLb').style.display = 'none'; });
/* ===== HUD de escuadrón ===== */
let sqBuiltKey = '';
const sqRows = {};
function buildSquadHud() {
    const key = squad.map(m => m.def.id).join(',');
    if (key === sqBuiltKey) return;
    sqBuiltKey = key;
    const w = $('heroHpWrap'); if (!w) return;
    w.classList.add('squad');
    w.innerHTML = '';
    squad.forEach(m => {
        const r = document.createElement('div');
        r.className = 'sqRow';
        r.innerHTML = '<span class="sqName" style="color:' + m.def.color + '">' + m.def.name[0] + '</span>' +
            '<div class="sqHp"><i></i></div><div class="sqEn"><i></i></div>';
        w.appendChild(r);
        sqRows[m.def.id] = { row: r, hp: r.querySelector('.sqHp i'), en: r.querySelector('.sqEn i') };
    });
}
/* ===== HUD tick ===== */
function uiTick() {
    $('goldTxt').textContent = fmt(S.gold);
    $('stageTxt').textContent = S.stage;
    $('adnTxt').textContent = S.adn;
    $('bossTag').classList.toggle('hidden', !isBossStage());
    const totHp = squad.reduce((a, m) => a + Math.max(0, m.hp), 0);
    const totMax = squad.reduce((a, m) => a + m.maxHp, 0);
    $('hpTxt').textContent = fmt(totHp) + '/' + fmt(totMax);
    $('dpsTxt').textContent = fmt(dps());
    buildSquadHud();
    squad.forEach(m => {
        const r = sqRows[m.def.id]; if (!r) return;
        r.hp.style.width = Math.max(0, m.hp / m.maxHp * 100) + '%';
        r.en.style.width = m.energy + '%';
        r.row.classList.toggle('dead', !m.alive);
    });
    const need = killsNeed();
    const pct = Math.min(100, (S.ks / need) * 100);
    if ($('stageProgFill')) $('stageProgFill').style.width = pct + '%';
    const toBoss = need - S.ks;
    if ($('stageProgTxt')) $('stageProgTxt').textContent = isBossStage() ? '👑 JEFE' : (toBoss <= 2 ? '⚠️ JEFE EN ' + toBoss : S.ks + '/' + need);
    Object.keys(UPDEF).forEach(k => {
        const lv = $('lv_' + k); if (lv) lv.textContent = 'Nv ' + S.ups[k];
        const b = upBtns[k]; if (!b) return;
        b.textContent = '🪙 ' + fmt(cost(k));
        b.disabled = S.gold < cost(k);
    });
    $('prDot').style.display = (S.best >= 10 && prGain() > 0) ? 'block' : 'none';
    $('achDot').style.display = ACH.some(a => !S.ach[a.id] && a.c()) ? 'block' : 'none';
    const gd = $('gearDot');
    if (gd) gd.style.display = hasBetterGear() ? 'block' : 'none';
}
/* ================= EQUIPO ================= */
wire('btnGear', 'click', () => { renderGear(); $('mGear').style.display = 'flex'; Audio.SFX.click(); });
wire('gearClose', 'click', () => { $('mGear').style.display = 'none'; });
function slotIcon(sl) {
    return (typeof picOr === 'function') ? picOr(SLOT_DEFS[sl].pic, SLOT_DEFS[sl].icon, 14) : SLOT_DEFS[sl].icon;
}
function itemLabel(it) { return slotIcon(it.slot) + ' ' + RAR_NAMES[it.rarity] + ' ' + SLOT_DEFS[it.slot].name + ' +' + it.lvl; }
function itemStats(it) {
    const mult = 1 + 0.1 * it.lvl;
    let s = STAT_NAMES[it.stat] + ' +' + (Math.round(it.val * mult * 10) / 10);
    (it.subs || []).forEach(x => { s += ' · ' + STAT_NAMES[x.stat] + ' +' + x.val; });
    return s;
}
function renderGear() {
    const box = $('gearBody'); if (!box) return;
    box.innerHTML = '';
    const eq = document.createElement('div'); eq.className = 'gearCol';
    eq.innerHTML = '<h3>EQUIPADO · ⚙️ ' + gearPower() + '</h3>';
    Object.keys(SLOT_DEFS).forEach(sl => {
        const it = S.gear.equipped[sl];
        const row = document.createElement('div'); row.className = 'gRow';
        if (it) {
            row.style.borderColor = RAR_COLORS[it.rarity];
            row.innerHTML = '<div><b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b><br><small>' + itemStats(it) + '</small></div>';
            const b1 = document.createElement('button'); b1.className = 'claim';
            b1.textContent = '⬆️ ' + fmt(enhanceCost(it));
            b1.onclick = () => {
                const c = enhanceCost(it);
                if (S.gold >= c) { S.gold -= c; it.lvl++; Audio.SFX.buy(); persist(); renderGear(); }
                else Audio.SFX.click();
            };
            const b2 = document.createElement('button'); b2.className = 'claim'; b2.textContent = '✖';
            b2.onclick = () => { S.gear.inv.push(it); S.gear.equipped[sl] = null; Audio.SFX.click(); persist(); renderGear(); };
            row.appendChild(b1); row.appendChild(b2);
        } else {
            row.innerHTML = '<div><b>' + slotIcon(sl) + ' ' + SLOT_DEFS[sl].name + '</b><br><small>vacío</small></div>';
        }
        eq.appendChild(row);
    });
    box.appendChild(eq);
    const inv = document.createElement('div'); inv.className = 'gearCol';
    inv.innerHTML = '<h3>MOCHILA (' + S.gear.inv.length + '/30)</h3>';
    S.gear.inv.slice().sort((a, b) => b.rarity - a.rarity).forEach(it => {
        const row = document.createElement('div'); row.className = 'gRow';
        row.style.borderColor = RAR_COLORS[it.rarity];
        const better = itemPower(it) > itemPower(S.gear.equipped[it.slot]);
        row.innerHTML = '<div><b style="color:' + RAR_COLORS[it.rarity] + '">' + itemLabel(it) + '</b> ' +
            (better ? '<b style="color:#7bed9f">▲</b>' : '<b style="color:#ff6b81">▼</b>') +
            '<br><small>' + itemStats(it) + '</small></div>';
        const b = document.createElement('button'); b.className = 'claim'; b.textContent = 'EQUIPAR';
        b.onclick = () => {
            const prev = S.gear.equipped[it.slot];
            S.gear.equipped[it.slot] = it;
            S.gear.inv = S.gear.inv.filter(x => x !== it);
            if (prev) S.gear.inv.push(prev);
            Audio.SFX.buy(); persist(); renderGear();
        };
        row.appendChild(b);
        inv.appendChild(row);
    });
    box.appendChild(inv);
}
/* ================= JEFE DIARIO ================= */
wire('btnDaily', 'click', () => { checkTickets(); renderDaily(); $('mDaily').style.display = 'flex'; Audio.SFX.click(); });
wire('dailyClose', 'click', () => { $('mDaily').style.display = 'none'; });
function renderDaily() {
    const st = S.best + 5;
    $('dailyInfo').innerHTML = '👑 Jefe Diario (Etapa ' + st + ')<br><small>❤️ ' + fmt(eHP(st) * 12) + ' · ⚔️ ' + fmt(eDmg(st) * 2.5) + '/s</small><br><small style="color:#8fa3c8">Ganar = equipo garantizado de buena rareza + mucho oro</small>';
    $('dailyBtn').textContent = '🎟️ USAR TICKET (' + S.tickets + '/3)';
    $('dailyBtn').disabled = S.tickets <= 0;
}
wire('dailyBtn', 'click', () => {
    if (S.tickets <= 0) return;
    S.tickets--; persist();
    const st = S.best + 5;
    const bhp = eHP(st) * 12, bAtk = eDmg(st) * 2.5;
    const our = dps() * 30 * 1.4;
    const aguante = maxHP() / (bAtk * 0.5);
    const ratio = our / bhp;
    const win = Math.random() < Math.max(0.1, Math.min(0.95, ratio * (aguante >= 20 ? 1 : 0.5)));
    const g = goldKill(st) * (win ? 40 : 8);
    S.gold += g;
    const msg = win ? '🏆 ¡VICTORIA! +' + fmt(g) + ' 🪙' : '💀 Derrota... +' + fmt(g) + ' 🪙 de consuelo';
    if (win) dropItem(3); else if (Math.random() < 0.25) dropItem(1);
    if (win) Audio.SFX.levelup(); else Audio.SFX.death();
    toast(msg);
    $('dailyResult').textContent = msg;
    renderDaily();
});
setInterval(() => {
    checkTickets();
    const d = $('dailyDot');
    if (d) d.style.display = S.tickets > 0 ? 'block' : 'none';
}, 2000);