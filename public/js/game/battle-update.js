'use strict';
// ===== BATTLE UPDATE: loop de lógica pura + avance + nextStage =====
function updateAdvance(dt) {
  const hx = heroX();
  const cap = Math.max(0, Math.min(260, W - 420 - hx));
  if (isBossStage()) { advance = Math.max(0, advance - dt * 140); return; }
  const near = enemies.filter(e => e.dying === null).sort((a, b) => a.x - b.x)[0];
  const line = hx + advance + 170;
  if (!near) { advance = Math.min(cap, advance + dt * 70); return; }
  if (near.x > line + 60) advance = Math.min(cap, advance + dt * 70);
}
function nextStage() {
  const timeSec = (Date.now() - stageStartTime) / 1000;
  const rank = getStageRank(timeSec, stageHadDeaths, isBossStage());
  if (!S.stageRanks) S.stageRanks = {};
  S.stageRanks[S.stage] = rank;
  if (rank === 'S') toast('🌟 ¡RANGO S EN ETAPA ' + S.stage + '!');
  S.stage++; S.best = Math.max(S.best, S.stage); S.ks = 0;
  stageStartTime = Date.now();
  stageHadDeaths = false;
  resetSquad(); initSquad();
  reEnter();
  enemies = []; spawnT = 0.6;
  stageFlash = 0.5;
  const ch = Math.floor((S.stage - 1) / 10);
  if (ch !== lastChapter) { lastChapter = ch; Audio.setChapter(ch); Audio.SFX.levelup(); notify('🌄 ' + chapterOf(S.stage).name); }
  else Audio.SFX.levelup();
  addSeasonXp(10);
  persist(); netScore(S.name, S.best);
  notify('⚔️ Etapa ' + S.stage + (isBossStage() ? ' 👑' : ''));
}
function update(rawDt) {
  const dt = rawDt * SETTINGS.speed;
  time += dt;
  stageFlash = Math.max(0, stageFlash - dt);
  petCastT = Math.max(0, petCastT - dt);
  if (!squad.length) initSquad();
  const hx = heroX(), gy = groundY();
  updateAdvance(dt);
  squad.forEach(m => {
    m.flash = Math.max(0, m.flash - dt);
    m.lunge = Math.max(0, m.lunge - dt * 4);
    m.castT = Math.max(0, m.castT - dt);
    if (!m.alive) return;
    const tx = slotX(m) + advance;
    if (m.px < tx - 2) { m.px = Math.min(tx, m.px + 150 * dt); m.entering = true; }
    else { if (m.px > tx + 2) m.px = Math.max(tx, m.px - 150 * dt); m.entering = false; }
    m.atkT -= dt;
    if (m.atkT <= 0 && !m.entering) {
      m.atkT = 0.5;
      const t = pickTarget();
      if (t) {
        m.lunge = 1;
        const mult = m.def.role === 'dps' ? 1 : m.def.role === 'archer' ? 0.85 : 0.55;
        const isCrit = Math.random() < critChance();
        const d = dps() * 0.5 * mult * (isCrit ? critMult() : 1);
        t.hp -= d; t.flash = 0.15; t.kb = isCrit ? 11 : 7;
        float(t.x, gy - 70 * t.size, fmt(d), isCrit ? '#ffeb3b' : '#fff', isCrit);
        burst(t.x, gy - 45 * t.size, isCrit ? '#ffeb3b' : '#ffffff', isCrit ? 10 : 6);
        if (isCrit) { shake = Math.max(shake, 3); Audio.SFX.crit(); } else Audio.SFX.hit();
        if (isCrit && HOOKS.crit) HOOKS.crit(t.x, gy - 45 * t.size);
        gainEnergy(m, 8);
        if (t.hp <= 0) killEnemy(t);
      }
    }
  });
  healT -= dt;
  if (healT <= 0) {
    healT = 2;
    const target = squad.filter(m => m.alive && m.hp < m.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    if (target) {
      const h = regenPs() * 2;
      target.hp = Math.min(target.maxHp, target.hp + h);
      float(target.px, gy - 110, '+' + fmt(h), '#7bed9f');
    }
  }
  venT -= dt;
  if (venT <= 0) {
    venT = venomCd();
    const aliveE = enemies.filter(e => e.dying === null);
    if (aliveE.length) {
      const d = venomDm();
      float(hx + advance + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0', true);
      Audio.SFX.venom();
      petCastT = 0.9;
      aliveE.forEach(e => {
        e.hp -= d; e.flash = 0.15; e.kb = 5;
        burst(e.x, gy - 30, '#a020f0', 8);
        squad.forEach(m => { if (m.alive) gainEnergy(m, 3); });
        if (e.hp <= 0) killEnemy(e);
      });
    }
  }
  if (!isBossStage()) {
    spawnT -= dt;
    if (spawnT <= 0 && enemies.filter(e => e.dying === null).length < 4) { spawnT = 1.6; spawnEnemy(); }
  } else if (!enemies.length && S.ks === 0) spawnBoss();
  enemies.forEach(e => {
    e.flash = Math.max(0, e.flash - dt);
    e.kb = Math.max(0, e.kb - dt * 40);
    e.pop = Math.min(1, e.pop + dt * 3);
    if (e.dying !== null) { e.dying -= dt; return; }
    const ex = hx + advance + 150 + e.slot * 46;
    let lungeT = 0;
    if (e.x > ex) {
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
          const d = eDmg(S.stage) * (e.boss ? 3 : 1);
          m.hp -= d; m.flash = 0.15;
          float(m.px, gy - 80, '-' + fmt(d), '#ff4757');
          shake = Math.max(shake, 4);
          Audio.SFX.hit();
          gainEnergy(m, 6);
          if (m.hp <= 0) {
            m.alive = false;
            stageHadDeaths = true;
            notify('💀 ' + m.def.name + ' cayó');
            Audio.SFX.death();
            if (!aliveByPriority()) {
              if (S.stage > 1) S.stage--;
              S.ks = 0;
              enemies.forEach(x => { if (x.dying === null) { x.dying = 0.45; puff(x.x, gy + 2); } });
              if (HOOKS.bossHide) HOOKS.bossHide();
              spawnT = 0.8;
              reEnter();
              persist(); netScore(S.name, S.best);
              notify('💀 Caíste → Etapa ' + S.stage + '. ¡Farmeá y volvé!');
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
    if (HOOKS.bossTick) HOOKS.bossTick(Math.max(0, bossT / 30) * 100, Math.max(0, Math.ceil(bossT)) + 's');
    if (bossT <= 0) { bossT = 30; notify('⏰ El jefe se recuperó... ¡otra vez!'); }
  }
  if (shake > 0) shake -= dt * 20;
}