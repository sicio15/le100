// HUD, toasts, chat, skins y botones de habilidades
function toast(txt) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = txt;
    const box = document.getElementById('toasts');
    box.appendChild(t);
    setTimeout(() => t.remove(), 2400);
    while (box.children.length > 3) box.firstChild.remove();
}
function addChat(txt, color) {
    const box = document.getElementById('chatMsgs');
    const d = document.createElement('div');
    d.style.color = color; d.textContent = txt;
    box.appendChild(d); box.scrollTop = 1e9;
    while (box.children.length > 40) box.firstChild.remove();
}

// Skins
const skinsBox = document.getElementById('skins');
SKINS.forEach((s, i) => {
    const b = document.createElement('div');
    b.className = 'skin' + (i === 0 ? ' sel' : '');
    b.title = s.name;
    b.style.background = `linear-gradient(135deg, hsl(${s.hue},85%,55%), hsl(${(s.hue+40)%360},90%,65%))`;
    b.onclick = () => {
        selSkin = i;
        document.querySelectorAll('.skin').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
    };
    skinsBox.appendChild(b);
});

// Botones de habilidades (desktop + móvil)
const abUI = {}, mabUI = {};
const abBox = document.getElementById('abilities');
const mAbsBox = document.getElementById('mAbs');
Object.keys(AB_DEF).forEach(k => {
    const d = AB_DEF[k];
    const el = document.createElement('div');
    el.className = 'slot ready';
    el.innerHTML = `<div class="cd"></div><span style="position:relative">${d.icon}</span><span class="key">${d.key}</span>`;
    abBox.appendChild(el);
    abUI[k] = { el, cdEl: el.querySelector('.cd') };

    const b = document.createElement('div');
    b.className = 'mab ready';
    b.innerHTML = `<div class="cd"></div><span style="position:relative">${d.icon}</span>`;
    b.addEventListener('touchstart', e => { e.preventDefault(); useAbility(k); }, { passive:false });
    mAbsBox.appendChild(b);
    mabUI[k] = { el:b, cdEl:b.querySelector('.cd') };
});

function updateHUD() {
    document.getElementById('scoreVal').textContent = me.score;

    Object.keys(AB_DEF).forEach(k => {
        const a = me.abilities[k];
        [abUI[k], mabUI[k]].forEach(ui => {
            if (!ui) return;
            ui.cdEl.style.transform = `scaleY(${a.cd / AB_DEF[k].cd})`;
            ui.el.classList.toggle('ready', a.cd === 0);
            ui.el.classList.toggle('active', a.active > 0);
        });
    });

    const all = [{ name: me.name + ' (Tú)', score: me.score, me: true }];
    G.remotes.forEach(r => { if (r.alive) all.push({ name: r.name, score: r.score, me: false }); });
    all.sort((a, b) => b.score - a.score);
    const myRank = all.findIndex(x => x.me) + 1;

    document.getElementById('rankTxt').textContent = `Rank #${myRank} de ${all.length}`;
    document.getElementById('onlineCount').textContent = all.length;
    document.getElementById('lbList').innerHTML = all.slice(0, 8).map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        return `<div class="lb-row${p.me ? ' me' : ''}"><span>${medal} ${p.name}</span><span>${p.score}</span></div>`;
    }).join('');
}