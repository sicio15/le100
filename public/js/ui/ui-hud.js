'use strict';
// ===== HUD: mejoras, velocidad, settings, logros, prestigio, ranking, escuadrón, uiTick =====

// ----- Mejoras -----
const upBtns = {}, upLvs = {};
(function buildUps() {
  const ups = $('ups'); if (!ups) return;
  Object.keys(UPDEF).forEach(k => {
    const c = document.createElement('div');
    c.className = 'ucard';
    const ico = (typeof picOr === 'function') ? picOr(UPDEF[k].pic, UPDEF[k].icon, 14) : UPDEF[k].icon;
    c.innerHTML = '<div class="un">' + ico + ' ' + UPDEF[k].name + ' <span class="ul" id="lv_' + k + '">Nv 0</span></div><button class="ubuy" id="buy_' + k + '"></button>';
    ups.appendChild(c);
    upBtns[k] = c.querySelector('button');
    upLvs[k] = c.querySelector('.ul'); // span de nivel cacheado
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
})();

// ----- Velocidad -----
const SPEEDS = [1, 2, 3];
function cycleSpeed() {
  const idx = SPEEDS.indexOf(SETTINGS.speed);
  SETTINGS.speed = SPEEDS[(idx + 1) % SPEEDS.length];
  saveSettings(); Audio.SFX.click();
  $('speedBtn').textContent = '⏩ x' + SETTINGS.speed;
}
wire('speedBtn', 'click', cycleSpeed);
if ($('speedBtn')) $('speedBtn').textContent = '⏩ x' + SETTINGS.speed;

// ----- Settings -----
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

// ----- Logros -----
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

// ----- Prestigio -----
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

// ----- Modales: logros + ranking -----
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
      '<div class="sqHp"><i></i></div><div class="sqEn"><i></i></div>';
    w.appendChild(r);
    sqRows[m.def.id] = { row: r, hp: r.querySelector('.sqHp i'), en: r.querySelector('.sqEn i') };
  });
}

// ----- HUD tick (llamado a 10Hz desde BattleScene) -----
let dotAcc = 0;
function uiTick() {
  EL.goldTxt.textContent = fmt(S.gold);
  EL.stageTxt.textContent = S.stage;
  EL.adnTxt.textContent = S.adn;
  EL.bossTag.classList.toggle('hidden', !isBossStage());
  let totHp = 0, totMax = 0;
  for (const m of squad) { totHp += Math.max(0, m.hp); totMax += m.maxHp; }
  EL.hpTxt.textContent = fmt(totHp) + '/' + fmt(totMax);
  EL.dpsTxt.textContent = fmt(dps());
  buildSquadHud();
  for (const m of squad) {
    const r = sqRows[m.def.id]; if (!r) continue;
    r.hp.style.width = Math.max(0, m.hp / m.maxHp * 100) + '%';
    r.en.style.width = m.energy + '%';
    r.row.classList.toggle('dead', !m.alive);
  }
  const need = killsNeed();
  if (EL.stageProgFill) EL.stageProgFill.style.width = Math.min(100, (S.ks / need) * 100) + '%';
  if (EL.stageProgTxt) {
    const toBoss = need - S.ks;
    EL.stageProgTxt.textContent = isBossStage() ? '👑 JEFE' : (toBoss <= 2 ? '⚠️ JEFE EN ' + toBoss : S.ks + '/' + need);
  }
  for (const k in UPDEF) {
    const lv = upLvs[k]; if (lv) lv.textContent = 'Nv ' + S.ups[k];
    const b = upBtns[k]; if (!b) continue;
    const co = cost(k); // 1 cost() por mejora y tick (antes 2)
    b.textContent = '🪙 ' + fmt(co);
    b.disabled = S.gold < co;
  }
  // dots a 2Hz en vez de 10Hz (hasBetterGear/ACH.some no necesitan más)
  if (++dotAcc >= 5) {
    dotAcc = 0;
    EL.prDot.style.display = (S.best >= 10 && prGain() > 0) ? 'block' : 'none';
    EL.achDot.style.display = ACH.some(a => !S.ach[a.id] && a.c()) ? 'block' : 'none';
    if (EL.gearDot) EL.gearDot.style.display = hasBetterGear() ? 'block' : 'none';
  }
}