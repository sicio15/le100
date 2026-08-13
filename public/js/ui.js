'use strict';
function toast(t) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = t;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 2400);
}

/* ===== cuenta: login/registro ===== */
let authMode = 'login';
$('tabLogin').onclick = () => { authMode = 'login'; $('tabLogin').classList.add('sel'); $('tabReg').classList.remove('sel'); };
$('tabReg').onclick   = () => { authMode = 'register'; $('tabReg').classList.add('sel'); $('tabLogin').classList.remove('sel'); };
$('authBtn').onclick = () => {
    $('authErr').textContent = '';
    netAuth(authMode, $('authName').value, $('authPass').value, res => {
        if (!res.ok) { $('authErr').textContent = res.err || 'Error'; return; }
        authed = true;
        S.name = res.name;
        applyServerSave(res.save);
        $('mAuth').style.display = 'none';
        afterLogin();
    });
};
function afterLogin() {
    const sec = Math.min(Date.now() - (S.last || Date.now()), 8 * 3600 * 1000) / 1000;
    const pending = Math.floor(sec * goldKill(S.best) * 0.4);
    if (pending >= 10) {
        $('offlineAmt').textContent = '🪙 ' + fmt(pending);
        $('mOffline').style.display = 'flex';
        $('offlineBtn').onclick = () => {
            S.gold += pending; persist();
            $('mOffline').style.display = 'none';
            toast('🪙 +' + fmt(pending) + ' de tu AFK');
        };
    }
    netScore(S.name, S.best);
    persist();
    toast(' ¡Hola, ' + S.name + '!');
}

/* ===== mejoras ===== */
const upBtns = {};
Object.keys(UPDEF).forEach(k => {
    const c = document.createElement('div');
    c.className = 'ucard';
    c.innerHTML = '<div class="un">' + UPDEF[k].icon + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div><button class="ubuy" id="buy_' + k + '"></button>';
    $('ups').appendChild(c);
    upBtns[k] = c.querySelector('button');
    upBtns[k].onclick = () => {
        const co = cost(k);
        if (S.gold >= co) {
            S.gold -= co; S.ups[k]++;
            if (k === 'vit') hero.hp = Math.min(maxHP(), hero.hp + maxHP() * 0.3);
            persist(); toast(UPDEF[k].icon + ' ' + UPDEF[k].name + ' Nv ' + S.ups[k]);
        }
    };
});

/* ===== logros ===== */
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
            persist(); toast('🏅 ¡Logro reclamado!');
            renderAch();
        };
        row.appendChild(b);
        $('achList').appendChild(row);
    });
}

/* ===== prestigio ===== */
$('btnPrestige').onclick = () => {
    $('prGain').textContent = '+' + prGain() + ' 🧬';
    $('prBtn').disabled = !(S.best >= 10 && prGain() > 0);
    $('mPrestige').style.display = 'flex';
};
$('prClose').onclick = () => $('mPrestige').style.display = 'none';
$('prBtn').onclick = () => {
    const g = prGain();
    if (g <= 0) return;
    S.adn += g; S.prestiges++;
    S.gold = 0; S.stage = 1; S.ks = 0;
    S.ups = { dmg:0, vit:0, regen:0, venom:0, fortune:0 };
    hero = { hp: maxHP(), atkT: 0, venT: 3, lunge: 0, dead: 0, flash: 0, venFlash: 0 };
    enemies = [];
    persist(); netScore(S.name, S.best);
    $('mPrestige').style.display = 'none';
    toast('🧬 ¡Prestigio! +' + g + ' ADN');
};

/* ===== modales varios ===== */
$('btnAch').onclick = () => { renderAch(); $('mAch').style.display = 'flex'; };
$('achClose').onclick = () => $('mAch').style.display = 'none';
$('btnLb').onclick = () => {
    $('lbList').innerHTML = LB.length
        ? LB.map((p, i) => '<div class="mrow"><span>' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.') + ' <b style="color:' + (p.name===S.name?'#7CFC7C':'#fff') + '">' + p.name + '</b></span><span>Etapa ' + p.stage + '</span></div>').join('')
        : '<p style="color:#8fa3c8">Todavía no hay nadie en línea...</p>';
    $('mLb').style.display = 'flex';
};
$('lbClose').onclick = () => $('mLb').style.display = 'none';

/* ===== HUD ===== */
function uiTick() {
    $('goldTxt').textContent = fmt(S.gold);
    $('stageTxt').textContent = S.stage;
    $('adnTxt').textContent = S.adn;
    $('bossTag').classList.toggle('hidden', !isBossStage());
    $('hpTxt').textContent = fmt(Math.max(0, hero.hp)) + '/' + fmt(maxHP());
    $('dpsTxt').textContent = fmt(dps());
    $('heroHp').style.width = Math.max(0, hero.hp / maxHP() * 100) + '%';
    Object.keys(UPDEF).forEach(k => {
        $('lv_' + k).textContent = 'Nv ' + S.ups[k];
        const b = upBtns[k];
        b.textContent = '🪙 ' + fmt(cost(k));
        b.disabled = S.gold < cost(k);
    });
    $('prDot').style.display = (S.best >= 10 && prGain() > 0) ? 'block' : 'none';
    $('achDot').style.display = ACH.some(a => !S.ach[a.id] && a.c()) ? 'block' : 'none';
}