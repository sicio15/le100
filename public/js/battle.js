'use strict';
let hero = { hp: maxHP(), atkT: 0, venT: 3, lunge: 0, recoil: 0, dead: 0, flash: 0, venFlash: 0 };
let enemies = [], floats = [], parts = [], coins = [], dust = [], flies = [];
let spawnT = 1, bossT = 0, shake = 0, time = 0, stageFlash = 0, dustT = 0;
let lastChapter = -1;

for (let i = 0; i < 14; i++) flies.push({ x: Math.random(), y: .5 + Math.random() * .5, p: Math.random() * TAU, s: .5 + Math.random() });

const heroX = () => Math.min(230, W * 0.22);
const groundY = () => H - 78;

function float(x, y, txt, color, big) { floats.push({ x, y, txt, color, life: 1.2, big: !!big }); }
function burst(x, y, color, n) {
    const k = SETTINGS.reduceFx ? 0.4 : 1;
    n = Math.max(2, Math.round(n * k));
    for (let i = 0; i < n; i++) {
        const a = TAU * i / n, s = 2 + Math.random() * 3;
        parts.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2, life: .7, color });
    }
}
function spawnCoins(x, y, n) {
    for (let i = 0; i < n; i++) coins.push({ x, y, t: 0, d: .7 + Math.random() * .3, ox: (Math.random()-.5)*60, oy: -40 - Math.random()*50 });
}
function puff(x, y) { dust.push({ x, y, life: .5 }); }

function spawnEnemy() {
    const slots = [0,1,2,3,4];
    enemies.forEach(e => { if (e.dying === null) { const i = slots.indexOf(e.slot); if (i >= 0) slots.splice(i, 1); } });
    if (!slots.length) return;
    const slot = slots[Math.random() * slots.length | 0];
    const kind = Math.random() < 0.5 ? 'beetle' : 'spider';
    const hp = eHP(S.stage) * (kind === 'beetle' ? 1.25 : 1);
    enemies.push({ hp, max: hp, slot, x: W + 60, atkT: 1, boss: false, kind, dying: null,
        spd: kind === 'spider' ? 95 : 70, hue: (S.stage * 25) % 360, size: 1,
        state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0 });
}
function spawnBoss() {
    const hp = eHP(S.stage) * 10;
    enemies.push({ hp, max: hp, slot: 1, x: W + 80, atkT: 1, boss: true, kind: 'boss', dying: null,
        spd: 40, hue: 0, size: 2.2, state: 'walk', flash: 0, lungeX: 0, kb: 0, pop: 0 });
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
    hero.hp = maxHP(); enemies = []; spawnT = 0.6;
    stageFlash = 0.5;
    // Cambio de capítulo → cambia música y fondo
    const ch = Math.floor((S.stage - 1) / 10);
    if (ch !== lastChapter) { lastChapter = ch; Audio.setChapter(ch); Audio.SFX.levelup(); toast('🌄 ' + chapterOf(S.stage).name); }
    else Audio.SFX.levelup();
    persist(); netScore(S.name, S.best);
    toast('⚔️ Etapa ' + S.stage + (isBossStage() ? ' 👑' : ''));
}

function update(rawDt) {
    const dt = rawDt * SETTINGS.speed;   // ⏩ velocidad de batalla
    time += dt;
    stageFlash = Math.max(0, stageFlash - dt);
    hero.flash = Math.max(0, hero.flash - dt);
    hero.venFlash = Math.max(0, hero.venFlash - dt);
    hero.recoil = Math.max(0, hero.recoil - dt * 3);
    const hx = heroX(), gy = groundY();

    if (hero.dead > 0) {
        hero.dead -= dt;
        if (hero.dead <= 0) { hero.hp = maxHP(); toast('✨ ¡Revivió!'); }
    } else {
        hero.hp = Math.min(maxHP(), hero.hp + regenPs() * dt);
        hero.atkT -= dt;
        if (hero.atkT <= 0) {
            hero.atkT = 0.5;
            const t = enemies.filter(e => e.dying === null && e.x < hx + 330).sort((a,b) => a.x - b.x)[0];
            if (t) {
                hero.lunge = 1;
                const isCrit = Math.random() < 0.2;          // 💥 20% crítico
                const d = dps() * 0.5 * (isCrit ? 2.2 : 1);
                t.hp -= d; t.flash = 0.15; t.kb = isCrit ? 11 : 7;
                float(t.x, gy - 70 * t.size, fmt(d), isCrit ? '#ffeb3b' : '#fff', isCrit);
                burst(t.x, gy - 45 * t.size, isCrit ? '#ffeb3b' : '#ffffff', isCrit ? 10 : 6);
                if (isCrit) { shake = Math.max(shake, 3); Audio.SFX.crit(); } else Audio.SFX.hit();
                if (t.hp <= 0) killEnemy(t);
            }
        }
        hero.venT -= dt;
        if (hero.venT <= 0) {
            hero.venT = venomCd();
            const alive = enemies.filter(e => e.dying === null);
            if (alive.length) {
                hero.venFlash = 0.3; hero.recoil = 1;
                const d = venomDm();
                float(hx + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0', true);
                Audio.SFX.venom();
                alive.forEach(e => {
                    e.hp -= d; e.flash = 0.15; e.kb = 5;
                    burst(e.x, gy - 30, '#a020f0', 8);
                    if (e.hp <= 0) killEnemy(e);
                });
            }
        }
    }
    hero.lunge = Math.max(0, hero.lunge - dt * 4);

    if (!isBossStage()) {
        spawnT -= dt;
        if (spawnT <= 0 && enemies.filter(e => e.dying === null).length < 4) { spawnT = 1.6; spawnEnemy(); }
    } else if (!enemies.length && S.ks === 0) spawnBoss();

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
            if (hero.dead <= 0) {
                e.atkT -= dt;
                if (e.atkT <= 0.3 && e.atkT > 0.12) { e.state = 'windup'; lungeT = 10 * e.size; }
                else if (e.atkT <= 0.12) { e.state = 'strike'; lungeT = -18 * e.size; }
                if (e.atkT <= 0) {
                    e.atkT = 1 + Math.random() * 0.4;
                    e.state = 'idle';
                    const d = eDmg(S.stage) * (e.boss ? 3 : 1);
                    hero.hp -= d; hero.flash = 0.15;
                    float(hx, gy - 80, '-' + fmt(d), '#ff4757');
                    shake = Math.max(shake, 4);
                    Audio.SFX.hit();
                    if (hero.hp <= 0) {
                        hero.dead = 4;
                        if (S.stage > 1) S.stage--;
                        S.ks = 0;
                        enemies.forEach(x => { if (x.dying === null) { x.dying = 0.45; puff(x.x, groundY() + 2); } });
                        $('bossBar').classList.add('hidden');
                        spawnT = 0.8;
                        Audio.SFX.death();
                        persist(); netScore(S.name, S.best);
                        toast('💀 Caíste → Etapa ' + S.stage + '. ¡Farmeá oro y volvé más fuerte!');
                    }
                }
            }
        }
        e.lungeX += (lungeT - e.lungeX) * Math.min(1, dt * 18);
    });
    enemies = enemies.filter(e => e.dying === null || e.dying > 0);

    if (isBossStage() && enemies.length) {
        bossT -= dt;
        $('bossFill').style.width = Math.max(0, bossT / 30 * 100) + '%';
        $('bossTime').textContent = Math.max(0, Math.ceil(bossT)) + 's';
        if (bossT <= 0) { bossT = 30; toast('⏰ El jefe se recuperó... ¡otra vez!'); }
    }

    floats.forEach(f => { f.y -= 40 * dt; f.life -= dt; });
    floats = floats.filter(f => f.life > 0);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 9 * dt; p.life -= dt; });
    parts = parts.filter(p => p.life > 0);
    coins.forEach(c => { c.t += dt / c.d; });
    coins = coins.filter(c => c.t < 1);
    dust.forEach(d => { d.life -= dt; });
    dust = dust.filter(d => d.life > 0);
    if (shake > 0) shake -= dt * 20;
}