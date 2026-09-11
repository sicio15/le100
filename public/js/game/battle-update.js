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
  const prev = S.stageRanks[S.stage];
  // L26: un rango sólo mejora, nunca empeora al re-farmear una etapa ya conquistada
  const ORDER = { R: 0, C: 1, B: 2, A: 3, S: 4 };
  if (!prev || ORDER[rank] > ORDER[prev]) {
    S.stageRanks[S.stage] = rank;
    invalidateRankBonus(); // el bonus de daño por rangos S/A cambió → recalcular
    if (rank === 'S') toast('🌟 ¡RANGO S EN ETAPA ' + S.stage + '!');
  }
  const prevZone = zoneIndex(S.stage);
  S.stage++; S.best = Math.max(S.best, S.stage); S.ks = 0;
  startStageClock();
  resetSquad(); initSquad();
  if (typeof checkSkillUnlocks === 'function') checkSkillUnlocks(); // L27
  reEnter();
  enemies = []; spawnT = 0.6;
  stageFlash = 0.5;
  curseT = 0;
  // L28: cambio de ZONA — transición cinemática + diálogo + registro en el códice
  const zi = zoneIndex(S.stage);
  if (zi !== prevZone || lastChapter < 0) {
    lastChapter = zi;
    Audio.setChapter(zoneOf(S.stage).music);
    Audio.SFX.levelup();
    if (HOOKS.zoneIn) HOOKS.zoneIn(zi);
  } else Audio.SFX.levelup();
  addSeasonXp(10);
  persist(); netScore(S.name, S.best);
  notify('⚔️ Etapa ' + S.stage + (isZoneBossStage(S.stage) ? ' 👑' : isMiniBossStage(S.stage) ? ' 🛡️' : ''));
}

// ----- Escuadrón: mover, atacar, curar -----
function updateSquad(dt, hx, gy) {
  const haste = buffHaste();
  squad.forEach(m => {
    m.flash = Math.max(0, m.flash - dt);
    m.lunge = Math.max(0, m.lunge - dt * 4);
    m.castT = Math.max(0, m.castT - dt);
    if (!m.alive) return;
    const tx = slotX(m) + advance;
    if (m.px < tx - 2) { m.px = Math.min(tx, m.px + 150 * dt); m.entering = true; }
    else { if (m.px > tx + 2) m.px = Math.max(tx, m.px - 150 * dt); m.entering = false; }
    m.atkT -= dt;
    if (m.atkT > 0 || m.entering) return;
    m.atkT = 0.5 / haste; // ⚡ Frenesí: el doble de golpes por segundo
    const t = pickTarget();
    if (!t) return;
    m.lunge = 1;
    const mult = m.def.role === 'dps' ? 1 : m.def.role === 'archer' ? 0.85 : 0.55;
    const isCrit = Math.random() < critChance();
    const d = liveDps() * 0.5 * mult * (isCrit ? critMult() : 1) * affixDmgTaken(t);
    t.flash = 0.15; t.kb = isCrit ? 11 : 7;
    const dealt = damageEnemy(t, d);
    float(t.x, gy - 70 * t.size, fmt(dealt), isCrit ? '#ffeb3b' : '#fff', isCrit);
    burst(t.x, gy - 45 * t.size, isCrit ? '#ffeb3b' : '#ffffff', isCrit ? 10 : 6);
    if (isCrit) { shake = Math.max(shake, 3); Audio.SFX.crit(); } else Audio.SFX.hit();
    if (isCrit && HOOKS.crit) HOOKS.crit(t.x, gy - 45 * t.size);
    gainEnergy(m, 8);
  });
}

// ----- Enemigos: avance, golpes, afijos, habilidades de jefe -----
function updateEnemies(dt, hx, gy) {
  enemies.forEach(e => {
    e.flash = Math.max(0, e.flash - dt);
    e.kb = Math.max(0, e.kb - dt * 40);
    e.pop = Math.min(1, e.pop + dt * 3);
    if (e.dying !== null) { e.dying -= dt; return; }
    if (e.boss) bossTickAbilities(e, dt); // L28
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
          // 💨 Veloz pega más seguido · 👑 el jefe acelera con cada fase y con la agonía
          e.atkT = (1 + Math.random() * 0.4) * affixAtkSpd(e)
            * (e.boss ? bossPhaseSpd() * bossHasteMult(e) : 1);
          e.state = 'idle';
          // L26: el jefe pega más fuerte por cada ciclo de 30s que dejás pasar
          // L27: …y por cada fase. L28: …y por su propio dmgMul. La Égida lo recorta.
          const raw = eDmg(S.stage) * (e.boss
            ? (e.mini ? 2 : 3) * e.def.dmgMul * bossRageMult() * bossPhaseDmg()
            : e.elite ? 1.6 : 1);
          const d = raw * damageTakenMult();
          m.hp -= d; m.flash = 0.15;
          float(m.px, gy - 80, '-' + fmt(d), hasBuff('aegis') ? '#7bed9f' : '#ff4757');
          shake = Math.max(shake, 4);
          Audio.SFX.hit();
          gainEnergy(m, 6);
          affixOnDealDamage(e, d); // 🩸 el Vampírico se cura con lo que pega
          if (e.boss) bossDrain(e, d); // 🩸 …y los jefes con Drenaje también
          if (m.hp <= 0) killHero(m);
        }
      }
    }
    e.lungeX += (lungeT - e.lungeX) * Math.min(1, dt * 18);
  });
  enemies = enemies.filter(e => e.dying === null || e.dying > 0);
}

// ----- Jefe: reloj de furia + HUD -----
function updateBoss(dt) {
  const boss = enemies.find(e => e.boss && e.dying === null);
  if (!isBossStage() || !boss) return;
  bossT -= dt;
  if (HOOKS.bossTick) {
    HOOKS.bossTick({
      name: bossName(boss), ico: bossIco(boss), color: boss.def.color,
      title: boss.mini ? 'Guardián de zona' : boss.def.title,
      chips: bossAbilityChips(boss),
      time: Math.max(0, bossT / BOSS_TIMER) * 100,
      secs: Math.max(0, Math.ceil(bossT)),
      hp: Math.max(0, boss.hp / boss.max) * 100,
      hpTxt: fmt(Math.max(0, boss.hp)) + ' / ' + fmt(boss.max),
      shield: boss.shieldMax > 0 ? Math.max(0, boss.shield / boss.shieldMax) * 100 : 0,
      hasShield: boss.shieldMax > 0,
      rage: bossRage,
      phase: bossPhase,
      phases: BOSS_PHASES.length
    });
  }
  // FIX L26: antes el reloj llegaba a 0 y sólo se reiniciaba con un toast — no
  // pasaba absolutamente nada. Ahora el jefe ENFURECE: +25% de daño acumulativo.
  if (bossT <= 0) {
    bossT = BOSS_TIMER; bossRage++;
    shake = Math.max(shake, 8);
    bossRoar();
    Audio.SFX.boss();
    notify('🔥 ¡' + bossName(boss) + ' ENFURECE! +' + Math.round((bossRageMult() - 1) * 100) + '% daño');
  }
}

function update(rawDt) {
  const dt = rawDt * SETTINGS.speed;
  time += dt;
  // L28: durante una cinemática el combate se congela, pero el reloj de la escena
  // sigue para que las animaciones de fondo (ambiente, parallax) no se corten.
  if (dialogueActive) return;
  stageFlash = Math.max(0, stageFlash - dt);
  petCastT = Math.max(0, petCastT - dt);
  tapCd = Math.max(0, tapCd - dt);
  bossRoarT = Math.max(0, bossRoarT - dt);
  curseT = Math.max(0, curseT - dt);
  tickBuffs(dt);                                        // L27
  if (typeof tickSkills === 'function') tickSkills(dt); // L27
  // L26: el combo decae si dejás de matar (no se pierde de golpe: se desangra)
  if (combo > 0) {
    comboT -= dt;
    if (comboT <= 0) { combo = Math.max(0, combo - COMBO_DECAY * dt); if (combo < 1) combo = 0; }
  }
  if (!squad.length) initSquad();
  const hx = heroX(), gy = groundY();
  updateAdvance(dt);
  updateSquad(dt, hx, gy);
  // Curación pasiva al héroe más herido
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
  // Veneno en área (mascota)
  venT -= dt;
  if (venT <= 0) {
    venT = venomCd();
    const aliveE = liveEnemies();
    if (aliveE.length) {
      const d = venomDm();
      float(hx + advance + 140, gy - 90, '☠️ ' + fmt(d), '#a020f0', true);
      Audio.SFX.venom();
      petCastT = 0.9;
      aliveE.forEach(e => {
        e.flash = 0.15; e.kb = 5;
        damageEnemy(e, d * affixDmgTaken(e));
        burst(e.x, gy - 30, '#a020f0', 8);
        squad.forEach(m => { if (m.alive) gainEnergy(m, 3); });
      });
    }
  }
  if (!isBossStage()) {
    spawnT -= dt;
    if (spawnT <= 0 && liveEnemies().length < 4) { spawnT = 1.6; spawnEnemy(); }
  } else if (!enemies.length && S.ks === 0) spawnBoss();
  updateEnemies(dt, hx, gy);
  updateBoss(dt);
  if (shake > 0) shake -= dt * 20;
}
