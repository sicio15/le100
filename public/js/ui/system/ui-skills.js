'use strict';
// ===== UI DE HABILIDADES (LOTE 27): barra de acción + panel de mejora =====
// La barra vive sobre el campo de batalla (es un control de combate, no de menú)
// y se redibuja sola cuando cambia el set de habilidades disponibles.

const skBtns = {};
let skBuiltKey = '';

function buildSkillBar() {
  const bar = EL.skillBar; if (!bar) return;
  const key = SKILLS.map(s => s.id + ':' + (skillUnlocked(s.id) ? 1 : 0) + ':' + skillLv(s.id)).join('|');
  if (key === skBuiltKey) return;
  skBuiltKey = key;
  bar.innerHTML = '';
  Object.keys(skBtns).forEach(k => delete skBtns[k]);
  SKILLS.forEach(s => {
    const unlocked = skillUnlocked(s.id);
    const b = document.createElement('button');
    b.className = 'skBtn' + (unlocked ? '' : ' locked');
    b.style.setProperty('--sc', s.color);
    b.setAttribute('data-tip', unlocked
      ? '<b>' + s.ico + ' ' + s.n + ' · Nv ' + skillLv(s.id) + '</b><br>' + s.d(skillLv(s.id)) +
        '<br>⏱️ ' + Math.round(skillCdMax(s.id)) + 's · tecla <b>' + s.hot + '</b>'
      : '<b>🔒 ' + s.n + '</b><br>Se desbloquea en la etapa ' + s.unlock + '.');
    b.innerHTML = '<span class="skKey">' + s.hot + '</span>' +
      '<span class="skIco">' + (unlocked ? s.ico : '🔒') + '</span>' +
      '<span class="skLv">' + (unlocked ? 'Nv' + skillLv(s.id) : s.unlock) + '</span>' +
      '<span class="skCd"></span><span class="skSecs"></span>';
    b.onclick = () => {
      if (!unlocked) { toast('🔒 ' + s.n + ' se desbloquea en la etapa ' + s.unlock); return; }
      if (castSkill(s.id)) { b.classList.remove('cast'); void b.offsetWidth; b.classList.add('cast'); }
    };
    bar.appendChild(b);
    skBtns[s.id] = { el: b, cd: b.querySelector('.skCd'), secs: b.querySelector('.skSecs') };
  });
  const more = document.createElement('button');
  more.className = 'skMore';
  more.textContent = '⚙';
  more.setAttribute('data-tip', 'Mejorar habilidades (tecla <b>H</b>)');
  more.onclick = () => { const b = $('btnSkills'); if (b) b.click(); };
  bar.appendChild(more);
}

// Llamado desde uiTick (10 Hz)
function updateSkillHud() {
  buildSkillBar();
  SKILLS.forEach(s => {
    const r = skBtns[s.id]; if (!r) return;
    const ready = skillReady(s.id);
    r.el.classList.toggle('ready', ready);
    // el velo se escala verticalmente: 0 = listo, 1 = recién lanzada
    const left = ready ? 0 : 1 - skillProgress(s.id);
    r.cd.style.transform = 'scaleY(' + left.toFixed(3) + ')';
    r.secs.textContent = (!ready && skillUnlocked(s.id)) ? Math.ceil(skillCd[s.id]) : '';
  });
}

// ===== Panel de mejora =====
function renderSkills() {
  const box = $('skillsBody'); if (!box) return;
  const auto = S.skillAuto !== false;
  let html = '<div class="mrow" style="margin-bottom:12px">' +
    '<span>🤖 Auto-lanzar habilidades<br><small style="color:var(--text-dim)">Las usa solas cuando conviene (modo idle)</small></span>' +
    '<button class="claim" id="skAutoBtn">' + (auto ? 'ON' : 'OFF') + '</button></div>';
  SKILLS.forEach(s => {
    const lv = skillLv(s.id), unlocked = skillUnlocked(s.id);
    const maxed = lv >= SKILL_MAX_LV;
    const c = skillCost(lv);
    const btn = !unlocked ? '<button class="claim" disabled>🔒 Et. ' + s.unlock + '</button>'
      : maxed ? '<button class="claim" disabled>MÁX</button>'
      : '<button class="claim" data-sk="' + s.id + '"' + (S.gold < c ? ' disabled' : '') + '>🪙 ' + fmt(c) + '</button>';
    html += '<div class="skRow" style="--sc:' + s.color + '">' +
      '<div class="skFace">' + (unlocked ? s.ico : '🔒') + '</div>' +
      '<div class="skInfo">' +
        '<b>' + s.n + ' <span style="color:var(--text-dim);font-size:11px">Nv ' + lv + '/' + SKILL_MAX_LV + '</span></b>' +
        '<p>' + s.d(Math.max(1, lv)) + '</p>' +
        '<div class="skMeta">⏱️ ' + Math.round(skillCdMax(s.id) || s.cd) + 's de recarga · tecla ' + s.hot + '</div>' +
      '</div>' + btn + '</div>';
  });
  box.innerHTML = html;
  const ab = $('skAutoBtn');
  if (ab) ab.onclick = () => {
    S.skillAuto = !(S.skillAuto !== false); persist();
    toast(S.skillAuto ? '🤖 Auto-habilidades ON' : '🎮 Auto-habilidades OFF');
    renderSkills();
  };
  box.querySelectorAll('[data-sk]').forEach(b => {
    b.onclick = () => { if (upgradeSkill(b.dataset.sk)) { skBuiltKey = ''; renderSkills(); } };
  });
}
wire('btnSkills', 'click', () => { renderSkills(); $('mSkills').style.display = 'flex'; Audio.SFX.click(); });
wire('skillsClose', 'click', () => { $('mSkills').style.display = 'none'; });
