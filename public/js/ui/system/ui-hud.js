'use strict';
// ===== HUD: mejoras (cantidad + mantenido + delta), velocidad, settings, logros,
// prestigio, ranking, escuadrón, buffs, uiTick, atajos desktop =====

// ----- Cantidad de compra (x1 → x10 → MAX) -----
let buyQtyMode = (SETTINGS && SETTINGS.buyQty) || 1;
const qtyLabel = () => buyQtyMode === 'max' ? 'MAX' : 'x' + buyQtyMode;

// FIX L27: el botón mostraba el precio de UN nivel aunque el modo fuese x10/MAX,
// así que "🪙 120" te cobraba 1.500. Ahora el precio de la tarjeta es el precio real.
const upCostAt = (k, lv) => Math.floor(COSTS[k][0] * Math.pow(COSTS[k][1], lv) * (evHas('racha') ? 0.8 : 1));
function costN(k, n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += upCostAt(k, S.ups[k] + i);
  return total;
}
function maxAffordable(k) {
  let n = 0, total = 0;
  while (n < 999) {
    const c = upCostAt(k, S.ups[k] + n);
    if (total + c > S.gold) break;
    total += c; n++;
  }
  return { n, total };
}
// Lo que se compraría AHORA con el modo elegido (n niveles y su precio total)
function plannedBuy(k) {
  if (buyQtyMode === 'max') {
    const m = maxAffordable(k);
    return m.n > 0 ? m : { n: 1, total: upCostAt(k, S.ups[k]) };
  }
  return { n: buyQtyMode, total: costN(k, buyQtyMode) };
}

function cycleBuyQty() {
  buyQtyMode = buyQtyMode === 1 ? 10 : buyQtyMode === 10 ? 'max' : 1;
  SETTINGS.buyQty = buyQtyMode; saveSettings();
  const b = $('buyQtyBtn'); if (b) b.textContent = '🛒 ' + qtyLabel();
  toast('🛒 Compra ' + qtyLabel());
  Audio.SFX.click();
}
function buyUps(k, n) {
  let bought = 0;
  for (let i = 0; i < n; i++) { const co = cost(k); if (S.gold < co) break; S.gold -= co; S.ups[k]++; bought++; }
  if (bought) {
    if (k === 'vit') initSquad();
    persist(); Audio.SFX.buy();
    const b = upBtns[k];
    if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
  } else Audio.SFX.click();
  return bought;
}
// click = cantidad elegida · mantener pulsado = compra continua
function attachBuy(btn, k) {
  let holdT = null, repT = null, held = false;
  btn.addEventListener('click', () => {
    if (held) { held = false; return; }
    buyUps(k, buyQtyMode === 'max' ? 999 : buyQtyMode);
  });
  btn.addEventListener('pointerdown', () => {
    held = false;
    holdT = setTimeout(() => { held = true; repT = setInterval(() => buyUps(k, 1), 140); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    btn.addEventListener(ev, () => { clearTimeout(holdT); if (repT) { clearInterval(repT); repT = null; } }));
}

// ----- Mejoras -----
const upBtns = {}, upLvs = {}, upCards = {}, upDeltas = {};
// Cuánto rinde cada mejora por nivel, en términos relativos. Sirve para el
// "+X" de cada tarjeta y para decidir cuál conviene comprar.
const UP_GAIN = {
  dmg:     () => ({ rel: 0.3,                              txt: '+' + fmt(dps() * 0.3) + ' daño' }),
  vit:     () => ({ rel: 0.22,                             txt: '+' + fmt(maxHP() * 0.22) + ' vida' }),
  regen:   () => ({ rel: 0.01 / (0.02 + 0.01 * S.ups.regen), txt: '+' + fmt(maxHP() * 0.01) + '/s' }),
  venom:   () => ({ rel: 0.5 / (2 + 0.5 * S.ups.venom),    txt: '+' + fmt(venomDm() * (0.5 / (2 + 0.5 * S.ups.venom))) + ' veneno' }),
  fortune: () => ({ rel: 0.25 / (1 + 0.25 * S.ups.fortune), txt: '+' + fmt(goldKill(S.stage) * (0.25 / (1 + 0.25 * S.ups.fortune))) + ' oro' })
};
// El daño manda, el oro lo financia; la regeneración es la que menos mueve la aguja
// en un idle (el escuadrón ya se cura solo cada 2s).
const UP_WEIGHT = { dmg: 1, vit: 0.35, regen: 0.15, venom: 0.5, fortune: 0.7 };
function bestUpgrade() {
  let best = null, bestScore = 0;
  for (const k in UPDEF) {
    const c = cost(k); if (c <= 0) continue;
    const score = (UP_GAIN[k]().rel * UP_WEIGHT[k]) / c;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return best;
}

(function buildUps() {
  const ups = $('ups'); if (!ups) return;
  Object.keys(UPDEF).forEach(k => {
    const c = document.createElement('div');
    c.className = 'ucard';
    const ico = (typeof picOr === 'function') ? picOr(UPDEF[k].pic, UPDEF[k].icon, 14) : UPDEF[k].icon;
    c.innerHTML =
      '<span class="uBadge">MEJOR</span>' +
      '<div class="un">' + ico + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div>' +
      '<div class="udelta" id="dl_' + k + '"></div>' +
      '<button class="ubuy" id="buy_' + k + '"></button>';
    ups.appendChild(c);
    upCards[k] = c;
    upBtns[k] = c.querySelector('button');
    upLvs[k] = c.querySelector('.ul');
    upDeltas[k] = c.querySelector('.udelta');
    attachBuy(upBtns[k], k);
  });
  // botón de cantidad en heroStats
  const hs = $('heroStats');
  if (hs && !$('buyQtyBtn')) {
    const b = document.createElement('button');
    b.id = 'buyQtyBtn'; b.className = 'tbtn';
    b.setAttribute('data-tip', 'Cuántos niveles compra cada click (tecla <b>Q</b>)');
    b.style.cssText = 'font-size:8px;padding:5px 9px;';
    b.textContent = '🛒 ' + qtyLabel();
    b.onclick = cycleBuyQty;
    hs.appendChild(b);
  }
})();

// ----- Velocidad (x4 se desbloquea con el primer prestigio) -----
const SPEEDS = [1, 2, 3, 4];
const maxSpeed = () => (S.prestiges >= 1 ? 4 : 3);
function cycleSpeed() {
  const usable = SPEEDS.filter(s => s <= maxSpeed());
  const idx = usable.indexOf(SETTINGS.speed);
  SETTINGS.speed = usable[(idx + 1) % usable.length];
  saveSettings(); Audio.SFX.click();
  const b = $('speedBtn'); if (b) b.textContent = '⏩ x' + SETTINGS.speed;
  if (SETTINGS.speed === usable[0] && maxSpeed() < 4) toast('⏩ x4 se desbloquea con tu primer prestigio');
}
wire('speedBtn', 'click', cycleSpeed);
if ($('speedBtn')) $('speedBtn').textContent = '⏩ x' + SETTINGS.speed;

// ----- Atajos de teclado (desktop) -----
const KEYMAP = {
  m: 'btnMap', e: 'btnGear', p: 'btnPrestige', t: 'btnTower', r: 'btnRogue',
  a: 'btnArena', d: 'btnDaily', s: 'btnShop', c: 'btnMissions', b: 'btnBattlePass',
  g: 'btnGuild', l: 'btnLb', v: 'btnStats', o: 'btnSettings', h: 'btnSkills', x: 'btnCodex'
};
window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (dialogueActive) return; // L28: durante una cinemática manda ui-dialogue.js
  // Tab = drawer
  if (e.key === 'Tab') { e.preventDefault(); const b = $('btnHub'); if (b) b.click(); return; }
  // 1/2/3 = habilidades activas
  if (e.key >= '1' && e.key <= '3') {
    const d = SKILLS[+e.key - 1];
    if (d) { e.preventDefault(); castSkill(d.id); }
    return;
  }
  // Espacio = golpe manual si hay enemigos; si no, cambia la velocidad
  if (e.key === ' ') {
    e.preventDefault();
    if (typeof doTap === 'function' && typeof enemies !== 'undefined' && enemies.length) {
      doTap(heroX() + advance + 200, groundY() - 40);
      return;
    }
    cycleSpeed(); return;
  }
  if (e.key === 'q' || e.key === 'Q') { cycleBuyQty(); return; }
  const id = KEYMAP[String(e.key).toLowerCase()];
  if (id) { const b = $(id); if (b) b.click(); }
});

// ----- Settings -----
function openSettings() {
  Audio.SFX.click();
  $('setAudio').checked = SETTINGS.audio;
  $('setMusic').value = SETTINGS.musicVol; $('setMusicV').textContent = Math.round(SETTINGS.musicVol * 100);
  $('setSfx').value = SETTINGS.sfxVol; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol * 100);
  $('setReduce').checked = SETTINGS.reduceFx;
  if ($('setAuto')) $('setAuto').checked = S.skillAuto !== false;
  if ($('setHint')) $('setHint').checked = SETTINGS.hintBest !== false;
  // L28: el slider va al revés que el valor (izq = lento, der = instantáneo)
  if ($('setTextSpeed')) {
    $('setTextSpeed').value = Math.max(0, 40 - (+SETTINGS.textSpeed || 0));
    const l = $('setTextSpeedV');
    if (l) l.textContent = SETTINGS.textSpeed === 0 ? 'Instantáneo' : SETTINGS.textSpeed > 25 ? 'Lento' : 'Normal';
  }
  if ($('setSkipCut')) $('setSkipCut').checked = !!SETTINGS.skipCutscenes;
  $('mSettings').style.display = 'flex';
}
wire('btnSettings', 'click', openSettings);
wire('setClose', 'click', () => { $('mSettings').style.display = 'none'; });
wire('setAudio', 'change', e => { SETTINGS.audio = e.target.checked; Audio.setEnabled(SETTINGS.audio); });
wire('setMusic', 'input', e => { SETTINGS.musicVol = +e.target.value; $('setMusicV').textContent = Math.round(SETTINGS.musicVol * 100); Audio.setMusicVol(SETTINGS.musicVol); });
wire('setSfx', 'input', e => { SETTINGS.sfxVol = +e.target.value; $('setSfxV').textContent = Math.round(SETTINGS.sfxVol * 100); Audio.setSfxVol(SETTINGS.sfxVol); });
wire('setReduce', 'change', e => { SETTINGS.reduceFx = e.target.checked; saveSettings(); });
wire('setHint', 'change', e => { SETTINGS.hintBest = e.target.checked; saveSettings(); });
wire('setAuto', 'change', e => {
  S.skillAuto = e.target.checked; persist();
  toast(S.skillAuto ? '🤖 Auto-habilidades ON' : '🎮 Auto-habilidades OFF');
});
wire('setLogout', 'click', () => {
  if (!confirm('¿Cerrar sesión? (tu partida queda guardada en la cuenta)')) return;
  persist();
  if (typeof netClearToken === 'function') netClearToken();
  location.reload();
});

// ----- Logros -----
function renderAch() {
  $('achList').innerHTML = '';
  ACH.forEach(a => {
    const done = !!S.ach[a.id], can = !done && a.c();
    const row = document.createElement('div');
    row.className = 'mrow';
    const rew = a.r.g ? '🪙 ' + a.r.g : '🧬 ' + a.r.a;
    row.innerHTML = '<span>' + (done ? '✅' : can ? '🔔' : '🔒') + ' ' + a.d +
      '<br><small style="color:var(--text-dim)">Recompensa: ' + rew + '</small></span>';
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

// ----- Prestigio -----
wire('btnPrestige', 'click', () => {
  $('prGain').textContent = '+' + prGain() + ' 🧬';
  $('prStage').textContent = S.best;
  $('prBtn').disabled = !(S.best >= 10 && prGain() > 0);
  const info = $('prInfo');
  if (info) info.innerHTML = '♻️ Se reinicia: oro, etapa y mejoras.<br>' +
    '💾 Se conserva: ADN, equipo, logros, tienda, rangos, habilidades y modos.' +
    (S.prestiges === 0 ? '<br>⏩ Tu primer prestigio desbloquea la velocidad <b>x4</b>.' : '');
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
  resetCombo(); clearBuffs(); startStageClock(); // L26/L27: la run nueva arranca limpia
  persist(); netScore(S.name, S.best);
  $('mPrestige').style.display = 'none';
  Audio.SFX.levelup();
  toast('🧬 ¡Prestigio! +' + g + ' ADN');
});

// ----- Modales: logros + ranking -----
wire('btnAch', 'click', () => { renderAch(); $('mAch').style.display = 'flex'; Audio.SFX.click(); });
wire('achClose', 'click', () => { $('mAch').style.display = 'none'; });
wire('btnLb', 'click', () => {
  $('lbList').innerHTML = LB.length
    ? LB.map((p, i) => '<div class="mrow"><span>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') +
      ' <b style="color:' + (p.name === S.name ? '#7CFC7C' : '#fff') + '">' + p.name + '</b></span><span>Etapa ' + p.stage + '</span></div>').join('')
    : '<p style="color:var(--text-dim)">Todavía no hay nadie en línea...</p>';
  $('mLb').style.display = 'flex'; Audio.SFX.click();
});
wire('lbClose', 'click', () => { $('mLb').style.display = 'none'; });

// ----- HUD de escuadrón -----
let sqBuiltKey = '';
const sqRows = {};
function buildSquadHud() {
  const key = squad.map(m => m.def.id).join(',');
  if (key === sqBuiltKey) return;
  sqBuiltKey = key;
  const w = EL.heroHpWrap; if (!w) return;
  w.classList.add('squad');
  w.innerHTML = '';
  squad.forEach(m => {
    const r = document.createElement('div');
    r.className = 'sqRow';
    r.innerHTML = '<span class="sqName" style="color:' + m.def.color + '">' + m.def.name[0] + '</span>' +
      '<div class="sqBars"><div class="sqHp"><i></i></div><div class="sqEn"><i></i></div></div>';
    w.appendChild(r);
    sqRows[m.def.id] = { row: r, hp: r.querySelector('.sqHp'), hpI: r.querySelector('.sqHp i'),
      en: r.querySelector('.sqEn'), enI: r.querySelector('.sqEn i') };
  });
}

// ----- Buffs activos -----
let buffKey = '';
function updateBuffHud() {
  const box = EL.buffBar; if (!box) return;
  const active = SKILLS.filter(s => s.dur > 0 && (buffs[s.id] || 0) > 0);
  const key = active.map(s => s.id).join(',');
  if (key !== buffKey) {
    buffKey = key;
    box.innerHTML = '';
    active.forEach(s => {
      const p = document.createElement('div');
      p.className = 'buffPill';
      p.style.setProperty('--bc', s.color);
      p.innerHTML = '<span>' + s.ico + '</span><span>' + s.n + '</span><small></small>';
      p.dataset.id = s.id;
      box.appendChild(p);
    });
  }
  Array.prototype.forEach.call(box.children, el => {
    const t = buffs[el.dataset.id] || 0;
    const s = el.querySelector('small');
    if (s) s.textContent = t.toFixed(1) + 's';
  });
}

// ----- Indicador de sincronización cloud-save -----
let syncEl = null, lastSync = 0;
function initSync() {
  if (syncEl) return;
  syncEl = document.createElement('div');
  syncEl.id = 'syncIndicator';
  document.body.appendChild(syncEl);
}
function showSync(status, msg) {
  initSync();
  syncEl.style.color = status === 'saved' ? 'var(--green2)' : status === 'error' ? 'var(--red)' : 'var(--gold)';
  syncEl.textContent = msg;
  syncEl.style.opacity = '1';
  if (status === 'saved') setTimeout(() => { syncEl.style.opacity = '0'; }, 2000);
}
const _persistHud = persist;
persist = function () {
  if (authed && typeof socket !== 'undefined' && socket && socket.connected) { showSync('saving', '💾 Guardando...'); lastSync = Date.now(); }
  _persistHud();
  if (authed && typeof socket !== 'undefined' && socket && socket.connected) {
    setTimeout(() => { if (Date.now() - lastSync < 3000) showSync('saved', '✅ Sincronizado'); }, 500);
  }
};

// ----- Medidor de combo -----
function updateComboHud() {
  const box = EL.comboBox; if (!box) return;
  if (typeof combo === 'undefined' || combo < 2) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const m = comboMult();
  const tier = comboTier();
  box.style.setProperty('--tier', tier ? tier.color : 'var(--gold)');
  EL.comboX.textContent = 'x' + m.toFixed(2);
  EL.comboN.textContent = (tier ? tier.name + ' · ' : '') + Math.floor(combo) + ' kills · +' + comboPct() + '%';
  // la barra es el tiempo que queda antes de que la racha empiece a caer
  if (EL.comboBarFill) EL.comboBarFill.style.width = Math.max(0, Math.min(100, (comboT / COMBO_WINDOW) * 100)) + '%';
  box.classList.toggle('hot', m >= COMBO_MAX - 0.001);
}

// ----- HUD tick (10Hz desde BattleScene) -----
let dotAcc = 0, lastBest = '';
function uiTick() {
  // Recursos (con contador animado)
  setCount(EL.goldTxt, S.gold);
  setCount(EL.adnTxt, S.adn, n => String(Math.round(n)));
  if (EL.essTxt) setCount(EL.essTxt, S.essence || 0, n => String(Math.round(n)));
  if (EL.goldRate) {
    const gps = goldPerSec();
    EL.goldRate.textContent = gps > 0 ? '+' + fmt(gps) + '/s' : '';
  }
  // Etapa + capítulo + anillo de progreso
  EL.stageTxt.textContent = S.stage;
  if (EL.chapterTxt) EL.chapterTxt.textContent = chapterOf(S.stage).name;
  EL.bossTag.classList.toggle('hidden', !isBossStage());
  const need = killsNeed();
  const pct = isBossStage() ? 100 : Math.min(100, (S.ks / need) * 100);
  if (EL.scRing) EL.scRing.style.setProperty('--p', pct.toFixed(0));
  if (EL.stageProgFill) {
    EL.stageProgFill.style.width = pct + '%';
    EL.stageProgFill.classList.toggle('warn', !isBossStage() && need - S.ks <= 2);
  }
  if (EL.stageProgTxt) {
    const toBoss = need - S.ks;
    EL.stageProgTxt.textContent = isBossStage() ? '👑 JEFE' : (toBoss <= 2 ? '⚠️ JEFE EN ' + toBoss : S.ks + '/' + need);
  }
  // Vida y daño
  let totHp = 0, totMax = 0;
  for (const m of squad) { totHp += Math.max(0, m.hp); totMax += m.maxHp; }
  EL.hpTxt.textContent = fmt(totHp) + '/' + fmt(totMax);
  EL.dpsTxt.textContent = fmt(liveDps());
  if (EL.realDps) EL.realDps.textContent = fmt(dmgPerSec());
  updateComboHud();
  updateBuffHud();
  if (typeof updateSkillHud === 'function') updateSkillHud();
  // Escuadrón
  buildSquadHud();
  for (const m of squad) {
    const r = sqRows[m.def.id]; if (!r) continue;
    const frac = m.maxHp > 0 ? Math.max(0, m.hp / m.maxHp) : 0;
    r.hpI.style.width = frac * 100 + '%';
    r.hp.classList.toggle('low', frac < 0.3);
    r.enI.style.width = m.energy + '%';
    r.en.classList.toggle('full', m.energy >= 80);
    r.row.classList.toggle('dead', !m.alive);
    r.row.classList.toggle('ready', m.alive && m.energy >= 80);
  }
  // Tarjetas de mejora: nivel, precio real, delta y "mejor compra"
  const best = SETTINGS.hintBest !== false ? bestUpgrade() : null;
  if (best !== lastBest) {
    lastBest = best;
    for (const k in UPDEF) if (upCards[k]) upCards[k].classList.toggle('best', k === best);
  }
  for (const k in UPDEF) {
    const lv = upLvs[k]; if (lv) lv.textContent = 'Nv ' + S.ups[k];
    const b = upBtns[k]; if (!b) continue;
    const plan = plannedBuy(k);
    b.textContent = '🪙 ' + fmt(plan.total) + (plan.n > 1 ? '  x' + plan.n : '');
    b.disabled = S.gold < upCostAt(k, S.ups[k]);
    const card = upCards[k];
    if (card) {
      card.classList.toggle('can', !b.disabled);
      card.style.setProperty('--afford', Math.min(100, (S.gold / plan.total) * 100).toFixed(0) + '%');
    }
    const d = upDeltas[k];
    if (d) d.textContent = UP_GAIN[k]().txt;
  }
  // Puntos de aviso (cada 500ms: no hace falta más)
  if (++dotAcc >= 5) {
    dotAcc = 0;
    EL.prDot.style.display = (S.best >= 10 && prGain() > 0) ? 'block' : 'none';
    EL.achDot.style.display = ACH.some(a => !S.ach[a.id] && a.c()) ? 'block' : 'none';
    if (EL.gearDot) EL.gearDot.style.display = hasBetterGear() ? 'block' : 'none';
    if (EL.skillDot) {
      const canUp = SKILLS.some(s => skillUnlocked(s.id) && skillLv(s.id) > 0 &&
        skillLv(s.id) < SKILL_MAX_LV && S.gold >= skillCost(skillLv(s.id)));
      EL.skillDot.style.display = canUp ? 'block' : 'none';
    }
  }
}
