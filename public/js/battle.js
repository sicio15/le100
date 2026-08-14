'use strict';
let squad = [];
let enemies = [];
let spawnT = 1, bossT = 0, shake = 0, time = 0, stageFlash = 0, dustT = 0, lastChapter = -1;
let shieldT = 0, healT = 2, venT = 3;

const VFX = { float(){}, burst(){}, coin(){}, puff(){} };
function float(x, y, txt, color, big) { VFX.float(x, y, txt, color, big); }
function burst(x, y, color, n) { VFX.burst(x, y, color, n); }
function spawnCoins(x, y, n) { for (let i = 0; i < n; i++) VFX.coin(x, y); }
function puff(x, y) { VFX.puff(x, y); }

const heroX = () => Math.min(230, W * 0.22);
const groundY = () => H - 78;
const slotX = m => heroX() + (m.def.role === 'tank' ? 52 : m.def.role === 'dps' ? -6 : -70);

/* ===== Escuadrón ===== */
function makeHero(def) {
    const share = def.role === 'tank' ? 0.5 : def.role === 'dps' ? 0.3 : 0.2;
    const mh = maxHP() * share;
    return { def, share, maxHp: mh, hp: mh, energy: 0, alive: true,
             flash: 0, lunge: 0, castT: 0, atkT: Math.random() * 0.4, sprite: null, fx: false, su: 1 };
}
function initSquad() {
    const defs = (typeof HEROES !== 'undefined' ? HEROES : []).filter(h => S.best >= h.unlock);
    const old = {}; squad.forEach(m => old[m.def.id] = m);
    const prev = squad.length;
    squad = defs.map(d => old[d.id] || makeHero(d));
    squad.forEach(m => {
        const sh = maxHP() * m.share;
        const r = m.maxHp > 0 ? Math.min(1, m.hp / m.maxHp) : 1;
        m.maxHp = sh; m.hp = sh * r;
    });
    if (squad.length > prev && prev > 0) toast('🐛 ¡Nuevo compañero: ' + squad[squad.length - 1].def.name + '!');
}
function resetSquad() {
    squad.forEach(m => { m.alive = true; m.hp = m.maxHp; m.energy = 0; m.flash = 0; m.lunge = 0; m.castT = 0; });
}
function pickTarget() {
    return enemies.filter(e => e.dying === null && e.x < heroX() + 380).sort((a, b) => a.x - b.x)[0] || null;
}
function aliveByPriority() {
    for (const r of ['tank', 'dps', 'support']) {
        const m = squad.find(m => m.def.role === r && m.alive);
        if (m) return m;
    }
    return null;
}
function showCutin(m) {
    const c = document.createElement('div');
    c.className = 'cutin'; c.style.borderColor = m.def.color;
    c.innerHTML = '<div class="ciName" style="color:' + m.def.color + '">' + m.def.name + '</div><div class="ciUlt">¡' + m.def.ult + '!</div>';
    $('cutin').appendChild(c);
    setTimeout(() => c.remove(), 1100);
}
function gainEnergy(m, n) {
    m.energy = Math.min(100, m.energy + n);
    if (m.energy >= 100) { m.energy = 0; castUlt(m); }
}
function castUlt(m) {
    m.castT = 0.9; Audio.SFX.ult(); showCutin(m);
    const gy = groundY();
    if (m.def.role === 'dps') {
        for (let i = 0; i < 3; i++) {
            const t = pickTarget(); if (!t) break;
            const d = dps() * 1.5;
            t.hp -= d; t.flash = .2; t.kb = 12;
            float(t.x, gy - 80 * t.size, fmt(d), '#ffeb3b', true);
            burst(t.x, gy - 40 * t.size, '#ffeb3b', 12);
            if (t.hp <= 0) killEnemy(t);
        }
    } else if (m.def.role === 'tank') {
        shieldT = 3;
        float(slotX(m), gy - 120, '🛡️ ESCUDO', '#ffb347', true);
    } else {
        squad.forEach(a => {
            if (a.alive) {
                const h = a.maxHp * 0.3;
                a.hp = Math.min(a.maxHp, a.hp + h);
                float(slotX(a), gy - 110, '+' + fmt(h), '#7efcff');
            }
        });
    }
}

/* ===== Enemigos ===== */
function spawnEnemy() {
    const slots = [0,1,2,3,4];
    enemies.forEach(e => { if (e.dying === null) { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); } });
    if (!slots.length) return;
    const slot = slots[Math.random() * slots.length | 0];
    const kind = Math.random() < 0.5 ? 'beetle' : 'spider';
    const hp = eHP(S.stage) * (kind === 'beetle' ? 1.25 : 1);
    enemies.push({ hp, max: hp, slot, x: W + 60, atkT: 1, boss: false, kind, dying: null,
        spd: kind === 'spider' ? 95 : 70, hue: (S.stage * 25) % 360, size: 1,
        state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
}
function spawnBoss() {
    const hp = eHP(S.stage) * 10;
    enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, kind: 'boss', dying: null,
        spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0, sprite: null, fx: false });
    bossT = 30; shake = 10;
    $('bossBar').classList.remove('hidden');
    Audio.SFX.boss();
    toast('👑 ¡JEFE en la etapa ' + S.stage + '!');
}
function killEnemy(e) {
    if (e.dying !== null) return;
    e.dying = 0.45;
    puff(e.x, groundY() + 2);
    const g = goldKill(S.stage) * (e.boss ? 8 : 1);
    S.gold += g; S.kills++; S.ks++;
    float(e.x, groundY() - 60, '+' + fmt(g), '#ffd700');
    burst(e.x, groundY() - 30, 'hsl(' + e.hue + ',80%,60%)', e.boss ? 40 : 14);
    spawnCoins(e.x, groundY() - 40, e.boss ? 8 : 3);
    Audio.SFX.coin();
    if (e.boss) { shake = 14; $('bossBar').classList.add('hidden'); nextStage(); }
    else if (S.ks >= killsNeed()) nextStage();
}
function nextStage() {
    S.stage++; S.best = Math.max(S.best, S.stage); S.ks = 0;
    resetSquad(); initSquad();
    enemies = []; spawnT = 0.6;
    stageFlash = 0.5;
    const ch = Math.floor((S.stage - 1) / 10);
    if (ch !== lastChapter) { lastChapter = ch; Audio.setChapter(ch); Audio.SFX.levelup(); toast('🌄 ' + chapterOf(S.stage).name); }
    else Audio.SFX.levelup();
    persist(); netScore(S.name, S.best);
    toast('⚔️ Etapa ' + S.stage + (isBossStage() ? ' 👑' : ''));
}

/* ===== Update ===== */
function update(rawDt) {
    const dt = rawDt * SETTINGS.speed;
    time += dt;
    stageFlash = Math.max(0, stageFlash - dt);
    shieldT = Math.max(0, shieldT - dt);
    if (!squad.length) initSquad();
    const hx = heroX(), gy = groundY();

    // escuadrón: ataques básicos
    squad.forEach(m => {
        m.flash = Math.max(0, m.flash - dt);
        m.lunge = Math.max(0, m.lunge - dt * 4);
        m.castT = Math.max(0, m.castT - dt);
        if (!m.alive) return;
        m.atkT -= dt;
        if (m.atkT <= 0) {
            m.atkT = 0.5;
            const t = pickTarget();
            if (t) {
                m.lunge = 1;
                const mult = m.def.role === 'dps' ? 1 : m.def.role === 'tank' ? 0.45 : 0.35;
                const isCrit = Math.random() < 0.2;
                const d = dps() * 0.5 * mult * (isCrit ? 2.2 : 1);
                t.hp -= d; t.flash = 0.15; t.kb = isCrit ? 11 : 7;
                float(t.x, gy - 70 * t.size, fmt(d), isCrit ? '#ffeb3b' : '#fff', isCrit);
                burst(t.x, gy - 45 * t.size, isCrit ? '#ffeb3b' : '#ffffff', isCrit ? 10 : 6);
                if (isCrit) { shake = Math.max(shake, 3); Audio.SFX.crit(); } else Audio.SFX.hit();
                gainEnergy(m, 8);
                if (t.hp <= 0) killEnemy(t);
            }
        }
    });

    // support: cura periódica
    healT -= dt;
    if (healT <= 0) {
        healT = 2;
        const sup = squad.find(m => m.def.role === 'support' && m.alive);
        if (sup) {
            const target = squad.filter(m => m.alive && m.hp < m.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
            if (target) {
                const h = regenPs() * 2;
                target.hp = Math.min(target.maxHp, target.hp + h);
                float(slotX(target), gy - 110, '+' + fmt(h), '#7bed9f');
                gainEnergy(sup, 6);
            }
        }
    }

    // veneno AoE del escuadrón
    venT -= dt;
    if (venT <= 0) {
        venT = venomCd();
        const aliveE = enemies.filter(e => e.dying === null);
        if (aliveE.length) {
            const d = venomDm();
            float(hx + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0', true);
            Audio.SFX.venom();
            aliveE.forEach(e => {
                e.hp -= d; e.flash = 0.15; e.kb = 5;
                burst(e.x, gy - 30, '#a020f0', 8);
                squad.forEach(m => { if (m.alive) gainEnergy(m, 3); });
                if (e.hp <= 0) killEnemy(e);
            });
        }
    }

    // spawns
    if (!isBossStage()) {
        spawnT -= dt;
        if (spawnT <= 0 && enemies.filter(e => e.dying === null).length < 4) { spawnT = 1.6; spawnEnemy(); }
    } else if (!enemies.length && S.ks === 0) spawnBoss();

    // enemigos: caminan, telegrafian y pegan al tanque (o siguiente vivo)
    enemies.forEach(e => {
        e.flash = Math.max(0, e.flash - dt);
        e.kb = Math.max(0, e.kb - dt * 40);
        e.pop = Math.min(1, e.pop + dt * 3);
        if (e.dying !== null) { e.dying -= dt; return; }
        const slotX = hx + 150 + e.slot * 46;
        let lungeT = 0;
        if (e.x > slotX) {
            e.x -= e.spd * dt; e.state = 'walk';
            dustT -= dt;
            if (dustT <= 0) { dustT = 0.22; puff(e.x + 20, gy + 4); }
        } else {
            if (e.state === 'walk') e.state = 'idle';
            const m = aliveByPriority();
            if (m) {
                e.atkT -= dt;
                if (e.atkT <= 0.3 && e.atkT > 0.12) { e.state = 'windup'; lungeT = 10 * e.size; }
                else if (e.atkT <= 0.12) { e.state = 'strike'; lungeT = -18 * e.size; }
                if (e.atkT <= 0) {
                    e.atkT = 1 + Math.random() * 0.4;
                    e.state = 'idle';
                    let d = eDmg(S.stage) * (e.boss ? 3 : 1);
                    if (shieldT > 0) d *= 0.4;
                    m.hp -= d; m.flash = 0.15;
                    float(slotX(m), gy - 80, '-' + fmt(d), '#ff4757');
                    shake = Math.max(shake, 4);
                    Audio.SFX.hit();
                    gainEnergy(m, 6);
                    if (m.hp <= 0) {
                        m.alive = false;
                        toast('💀 ' + m.def.name + ' cayó');
                        Audio.SFX.death();
                        if (!aliveByPriority()) {
                            // wipe: regresión de etapa + revive escuadrón
                            if (S.stage > 1) S.stage--;
                            S.ks = 0;
                            enemies.forEach(x => { if (x.dying === null) { x.dying = 0.45; puff(x.x, gy + 2); } });
                            $('bossBar').classList.add('hidden');
                            spawnT = 0.8;
                            persist(); netScore(S.name, S.best);
                            toast('💀 Caíste → Etapa ' + S.stage + '. ¡Farmeá y volvé!');
                            resetSquad();
                        }
                    }
                }
            }
        }
        e.lungeX += (lungeT - e.lungeX) * Math.min(1, dt * 18);
    });
    enemies = enemies.filter(e => e.dying === null || e.dying > 0);

    if (isBossStage() && enemies.length) {
        bossT -= dt;
        $('bossFill').style.width = Math.max(0, bossT / 30) * 100 + '%';
        $('bossTime').textContent = Math.max(0, Math.ceil(bossT)) + 's';
        if (bossT <= 0) { bossT = 30; toast('⏰ El jefe se recuperó... ¡otra vez!'); }
    }
    if (shake > 0) shake -= dt * 20;
}