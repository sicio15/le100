'use strict';
/* NOTE: LB y socket viven en net.js — acá NO se re-declaran */
function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 2400);
}
const wire = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };

/* ===== Cuentas ===== */
let authMode = 'login';
wire('tabLogin', 'click', () => { authMode = 'login'; $('tabLogin').classList.add('sel'); $('tabReg').classList.remove('sel'); Audio.SFX.click(); });
wire('tabReg',   'click', () => { authMode = 'register'; $('tabReg').classList.add('sel'); $('tabLogin').classList.remove('sel'); Audio.SFX.click(); });
wire('authBtn',  'click', () => {
    $('authErr').textContent = '';
    netAuth(authMode, $('authName').value, $('authPass').value, res => {
        if (!res.ok) { $('authErr').textContent = res.err || 'Error'; return; }
        authed = true; S.name = res.name; applyServerSave(res.save);
        $('mAuth').style.display = 'none';
        afterLogin();
    });
});
if (!authed) { const m = $('mAuth'); if (m) m.style.display = 'flex'; }

function afterLogin() {
    Audio.init(); Audio.startMusic();
    Audio.setChapter(Math.floor((S.stage - 1) / 10));
    const sec = Math.min(Date.now() - (S.last || Date.now()), 8 * 3600 * 1000) / 1000;
    const pending = Math.floor(sec * goldKill(S.best) * 0.4);
    if (pending >= 10) {
        $('offlineAmt').textContent = '🪙 ' + fmt(pending);
        $('mOffline').style.display = 'flex';
        wire('offlineBtn', 'click', () => {
            S.gold += pending; persist();
            $('mOffline').style.display = 'none';
            Audio.SFX.coin();
            toast('🪙 +' + fmt(pending) + ' de tu AFK');
        });
    }
    netScore(S.name, S.best);
    persist();
    toast('¡Hola, ' + S.name + '!');
    if (!SETTINGS.tutorialDone) startTutorial();
}

/* ===== Tutorial ===== */
const TUT_STEPS = [
    { t:'Tu cienpiés pelea solo. ¡Miralo combatir! 🐛', s:'battleWrap' },
    { t:'Ganá oro y comprá mejoras acá abajo ⬇️', s:'bottombar' },
    { t:'Cada 5 etapas aparece un JEFE 👑. Si caés, bajás una etapa a farmear.', s:'topbar' },
    { t:'Usá ⏩ para acelerar la batalla (x1/x2/x3).', s:'speedBtn' },
    { t:'Configurá audio y efectos en ⚙️. ¡A jugar!', s:'btnSettings' }
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
        const r = target ? target.getBoundingClientRect() : { left: W/2-150, top: H/2, width: 300, height: 0 };
        box.innerHTML = '<div class="tutTxt">' + step.t + '</div><div class="tutCtr">' + (i+1) + '/' + TUT_STEPS.length +
            ' <button class="mbtn" id="tutNext">' + (i === TUT_STEPS.length-1 ? '¡LISTO!' : 'SIGUIENTE ▶') + '</button></div>';
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
    c.innerHTML = '<div class="un">' + UPDEF[k].icon + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div><button class="ubuy" id="buy_' + k + '"></button>';
    ups.appendChild(c);
    upBtns[k] = c.querySelector('button');
    upBtns[k].onclick = () => {
        const co = cost(k);
        if (S.gold >= co) {
            S.gold -= co; S.ups[k]++;
            if (k === 'vit') hero.hp = Math.min(maxHP(), hero.hp + maxHP() * 0.3);
            persist(); Audio.SFX.buy();
            toast(UPDEF[k].icon + ' ' + UPDEF[k].name + ' Nv ' + S.ups[k]);
        } else Audio.SFX.click();
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
    $('setMusic').value = SETTINGS.musicVol; $('setMusicV').textContent = Math.round(SETTINGS.musicVol*100);
    $('setSfx').value = SETTINGS.sfxVol; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol*100);
    $('setReduce').checked = SETTINGS.reduceFx;
    $('mSettings').style.display = 'flex';
}
wire('btnSettings', 'click', openSettings);
wire('setClose', 'click', () => $('mSettings').style.display = 'none');
wire('setAudio', 'change', e => { SETTINGS.audio = e.target.checked; Audio.setEnabled(SETTINGS.audio); });
wire('setMusic', 'input', e => { SETTINGS.musicVol = +e.target.value; $('setMusicV').textContent = Math.round(SETTINGS.musicVol*100); Audio.setMusicVol(SETTINGS.musicVol); });
wire('setSfx', 'input', e => { SETTINGS.sfxVol = +e.target.value; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol*100); Audio.setSfxVol(SETTINGS.sfxVol); });
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
wire('prClose', 'click', () => $('mPrestige').style.display = 'none');
wire('prBtn', 'click', () => {
    const g = prGain();
    if (g <= 0) return;
    S.adn += g; S.prestiges++;
    S.gold = 0; S.stage = 1; S.ks = 0;
    S.ups = { dmg:0, vit:0, regen:0, venom:0, fortune:0 };
    hero = { hp: maxHP(), atkT: 0, venT: 3, lunge: 0, recoil: 0, dead: 0, flash: 0, venFlash: 0 };
    enemies = [];
    persist(); netScore(S.name, S.best);
    $('mPrestige').style.display = 'none';
    Audio.SFX.levelup();
    toast('🧬 ¡Prestigio! +' + g + ' ADN');
});

/* ===== Modales ===== */
wire('btnAch', 'click', () => { renderAch(); $('mAch').style.display = 'flex'; Audio.SFX.click(); });
wire('achClose', 'click', () => $('mAch').style.display = 'none');
wire('btnLb', 'click', () => {
    $('lbList').innerHTML = LB.length
        ? LB.map((p, i) => '<div class="mrow"><span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' <b style="color:' + (p.name===S.name?'#7CFC7C':'#fff') + '">' + p.name + '</b></span><span>Etapa ' + p.stage + '</span></div>').join('')
        : '<p style="color:#8fa3c8">Todavía no hay nadie en línea...</p>';
    $('mLb').style.display = 'flex'; Audio.SFX.click();
});
wire('lbClose', 'click', () => $('mLb').style.display = 'none');

/* ===== HUD ===== */
function uiTick() {
    $('goldTxt').textContent = fmt(S.gold);
    $('stageTxt').textContent = S.stage;
    $('adnTxt').textContent = S.adn;
    $('bossTag').classList.toggle('hidden', !isBossStage());
    $('hpTxt').textContent = fmt(Math.max(0, hero.hp)) + '/' + fmt(maxHP());
    $('dpsTxt').textContent = fmt(dps());
    $('heroHp').style.width = Math.max(0, hero.hp / maxHP() * 100) + '%';

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
}