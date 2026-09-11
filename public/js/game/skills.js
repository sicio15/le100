'use strict';
// ===== HABILIDADES ACTIVAS (LOTE 27) =====
// El juego tenía exactamente una decisión en combate: tocar la pantalla. Tres
// habilidades con cooldown le dan ritmo y lectura a la pelea (¿guardo la Égida
// para la fase 3 del jefe o la tiro ahora?) sin romper el idle: `S.skillAuto`
// las lanza solas para quien quiera seguir dejándolo correr.
// Balance: SKILLS · SKILL_MAX_LV · skillCost · SKILL_* en core/data.js

const skillCd = {};                      // id → segundos restantes
SKILLS.forEach(s => { skillCd[s.id] = 0; });

const skillDef      = id => SKILLS.find(s => s.id === id) || null;
const skillLv       = id => (S.skills && S.skills[id]) || 0;
const skillUnlocked = id => { const d = skillDef(id); return !!d && S.best >= d.unlock; };
// Cada nivel recorta un 2% el cooldown (tope -18% a nivel 10)
const skillCdMax    = id => { const d = skillDef(id); return d ? d.cd * (1 - 0.02 * Math.max(0, skillLv(id) - 1)) : 0; };
const skillReady    = id => skillUnlocked(id) && skillLv(id) > 0 && (skillCd[id] || 0) <= 0;
const skillProgress = id => { const m = skillCdMax(id); return m > 0 ? 1 - Math.min(1, (skillCd[id] || 0) / m) : 1; };

// Desbloqueo automático al alcanzar la etapa: aparece a nivel 1, gratis.
function checkSkillUnlocks() {
  if (!S.skills) S.skills = {};
  SKILLS.forEach(s => {
    if (S.best >= s.unlock && !S.skills[s.id]) {
      S.skills[s.id] = 1;
      notify('✨ ¡Habilidad desbloqueada: ' + s.ico + ' ' + s.n + '! (tecla ' + s.hot + ')');
      Audio.SFX.levelup();
      persist();
    }
  });
}

function upgradeSkill(id) {
  const d = skillDef(id);
  if (!d) return false;
  if (!skillUnlocked(id)) { toast('🔒 Se desbloquea en la etapa ' + d.unlock); return false; }
  const lv = skillLv(id);
  if (lv >= SKILL_MAX_LV) { toast('⭐ ' + d.n + ' al máximo'); return false; }
  const c = skillCost(lv);
  if (S.gold < c) { toast('❌ Necesitás ' + fmt(c) + ' 🪙'); Audio.SFX.click(); return false; }
  S.gold -= c; S.skills[id] = lv + 1;
  toast('⬆️ ' + d.ico + ' ' + d.n + ' Nv ' + S.skills[id]);
  Audio.SFX.buy(); persist();
  return true;
}

// ----- Efectos -----
function castSmash(lv) {
  const live = liveEnemies();
  const gy = groundY();
  const cx = heroX() + advance + 200;
  VFX.shockwave(cx, gy - 20, 0xffa726, 260);
  shake = Math.max(shake, 12);
  if (!live.length) return;
  const d = liveDps() * SKILL_SMASH_MULT(lv);
  live.forEach(e => hitEnemy(e, d * affixDmgTaken(e), '#ffa726', true));
}
function castFrenzy(lv) {
  buffs.frenzy = skillDef('frenzy').dur;
  squad.forEach(m => { if (m.alive) { m.lunge = 1; gainEnergy(m, 10); } });
  VFX.shockwave(heroX() + advance, groundY() - 40, 0x7efcff, 160);
}
function castAegis(lv) {
  buffs.aegis = skillDef('aegis').dur;
  const gy = groundY();
  squad.forEach(m => {
    if (!m.alive) return;
    const h = m.maxHp * SKILL_AEGIS_HEAL(lv);
    m.hp = Math.min(m.maxHp, m.hp + h);
    float(m.px, gy - 112, '+' + fmt(h), '#7bed9f');
  });
  VFX.shockwave(heroX() + advance, gy - 40, 0x7bed9f, 180);
}
const SKILL_FX = { smash: castSmash, frenzy: castFrenzy, aegis: castAegis };

function castSkill(id, silent) {
  const d = skillDef(id);
  if (!d) return false;
  if (dialogueActive) return false; // L28: no se lanza nada durante una cinemática
  if (!skillUnlocked(id)) { if (!silent) toast('🔒 ' + d.n + ' se desbloquea en la etapa ' + d.unlock); return false; }
  if (!skillReady(id)) {
    if (!silent) { toast('⏳ ' + d.n + ': ' + Math.ceil(skillCd[id]) + 's'); Audio.SFX.click(); }
    return false;
  }
  const lv = skillLv(id);
  skillCd[id] = skillCdMax(id);
  (SKILL_FX[id] || (() => {}))(lv);
  if (!S.stats) S.stats = {};
  S.stats.skillCasts = (S.stats.skillCasts || 0) + 1;
  Audio.SFX.ult();
  if (HOOKS.skill) HOOKS.skill(d);
  return true;
}

// Auto-cast: lanza lo que esté listo cuando tiene sentido, no en cuanto sale del
// cooldown. Así el modo idle no desperdicia la Égida con el escuadrón a full.
function autoCastTick() {
  if (!S.skillAuto) return;
  const live = liveEnemies();
  if (!live.length) return;
  const boss = live.some(e => e.boss);
  if (skillReady('smash') && (live.length >= 3 || boss)) { castSkill('smash', true); return; }
  const hurt = squad.some(m => m.alive && m.hp / m.maxHp < 0.45);
  if (skillReady('aegis') && (hurt || (boss && bossPhase > 0))) { castSkill('aegis', true); return; }
  if (skillReady('frenzy') && (boss || live.length >= 2)) castSkill('frenzy', true);
}

// Llamado una vez por frame desde update()
function tickSkills(dt) {
  for (const id in skillCd) {
    if (skillCd[id] > 0) skillCd[id] = Math.max(0, skillCd[id] - dt);
  }
  autoCastTick();
}
