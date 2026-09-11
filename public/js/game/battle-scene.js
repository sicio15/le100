'use strict';
// ===== BATTLE SCENE: solo render (sprites, paperdoll, parallax, ambiente, barras) =====
const TARGET_H = { hero: 105, human_a: 105, human_b: 105, human_c: 105, beetle: 80, spider: 80, wasp: 70, scorpion: 85, boss: 130 };
const ROLE_SCALE = { dps: 1.05, archer: 1, mage: 0.95 };
const baseScale = kind => (TARGET_H[kind] || 100) / (typeof STRIP_H !== 'undefined' ? STRIP_H : 160);
const lookOf = m => m.def.look || 'human_a';
// MEJORA: fondos por capítulo (antes nunca cambiaban)
const CHAPTER_BG = ['bg', 'bg_cave', 'bg_swamp', 'bg_tower', 'bg_tower'];
const chapterBg = () => CHAPTER_BG[Math.min(CHAPTER_BG.length - 1, Math.floor((S.stage - 1) / 10))];
// L27: capas de profundidad explícitas — antes todo compartía depth 0 y el orden
// dependía de en qué frame se había creado cada sprite.
const Z = { bg: -20, grade: -5, parts: -4, fog: -3, shadow: -1, sprite: 0, crown: 2, bars: 12, badge: 13, fx: 20 };

class BattleScene extends Phaser.Scene {
  constructor() { super('battle'); }
  create() {
    this.bg = this.add.image(0, 0, 'bg').setOrigin(0.5, 1).setDepth(Z.bg);
    ambienceInit(this);
    this.shadows = this.add.graphics().setDepth(Z.shadow);
    this.bars = this.add.graphics().setDepth(Z.bars);
    this.seen = new Set(); // sprites vivos a limpiar (antes era un Map que nunca se vaciaba)
    this.curBg = 'bg';
    this.petSprite = null; this.petCrown = null;
    this.prevShake = 0; this.prevFlash = 0; this.lastStage = S.stage;
    this.uiAcc = 0;
    attachVFX(this);
    if (typeof checkSkillUnlocks === 'function') checkSkillUnlocks();
    if (typeof uiTick === 'function') { try { uiTick(); } catch (e) {} }
  }
  safePlay(sprite, key) {
    if (!sprite || !this.anims.exists(key)) return;
    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key === key) return;
    try { sprite.play(key); } catch (e) {}
  }
  update(tMs, dtMs) {
    const dt = Math.min(0.1, dtMs / 1000);
    W = this.scale.width; H = this.scale.height;
    try { update(dt); } catch (e) { console.error('⚔️ battle update:', e); }
    this.uiAcc += dtMs;
    if (this.uiAcc >= 100) {
      this.uiAcc = 0;
      if (typeof uiTick === 'function') { try { uiTick(); } catch (e) { console.error('🖥️ uiTick:', e); } }
    }
    try { ambienceUpdate(dt, time); } catch (e) {}
    this.sync();
  }

  // ---- Fondo con parallax + zoom sutil por capítulo ----
  syncBg() {
    const want = chapterBg();
    if (want !== this.curBg && this.textures.exists(want)) {
      this.bg.setTexture(want); this.curBg = want;
      this.cameras.main.fadeIn(420, 0, 0, 0);
    }
    const iw = this.bg.width || 1, ih = this.bg.height || 1;
    const ps = Math.max(W / iw, H / ih) * 1.12;
    this.bg.setScale(ps);
    const maxShift = Math.max(0, (iw * ps - W) / 2);
    const off = Math.min(maxShift, (typeof advance !== 'undefined' ? advance : 0) * 0.35);
    this.bg.setPosition(W / 2 - off, H);
  }

  // ---- Escuadrón ----
  syncSquad(gy, t, wantCrown) {
    const sq = typeof squad !== 'undefined' ? squad : [];
    sq.forEach(m => {
      const px = (typeof m.px === 'number') ? m.px : heroX();
      const lb = lookOf(m);
      // sombra proyectada
      this.shadows.fillStyle(0x000000, 0.35);
      this.shadows.fillEllipse(px, gy + 6, 60 * (ROLE_SCALE[m.def.role] || 1), 12);
      // L27: aro de carga bajo el héroe — avisa que la ultimate está por salir
      if (m.alive && m.energy >= 80 && !SETTINGS.reduceFx) {
        const pulse = 0.3 + Math.sin(t * 9) * 0.22;
        this.shadows.lineStyle(2, toColor(m.def.color), pulse);
        this.shadows.strokeEllipse(px, gy + 6, 64 + Math.sin(t * 9) * 5, 16);
      }
      if (m.sprite && m.lookKey !== lb) {
        m.sprite.destroy(); m.sprite = null;
        if (m.crown) { m.crown.destroy(); m.crown = null; }
      }
      if (!m.sprite && this.anims.exists(lb + '_idle')) {
        m.sprite = this.add.sprite(px, gy, lb + '_idle').setOrigin(0.5, 1).setDepth(Z.sprite);
        m.lookKey = lb;
        this.safePlay(m.sprite, lb + '_idle');
        if (m.def.tint) m.sprite.setTint(m.def.tint);
        vfxRing(this, px, gy - 30, 0x7bed9f);
      }
      if (!m.sprite) return;
      if (m.lunge > 0.8 && !m.slashDone) {
        m.slashDone = true;
        vfxSlash(this, px + 62, gy - 50, m.def.color);
      }
      if (m.lunge < 0.3) m.slashDone = false;
      const desired = !m.alive ? lb + '_death'
        : m.entering ? lb + '_walk'
        : m.flash > 0 ? lb + '_hurt'
        : m.castT > 0 ? lb + '_attack'
        : m.lunge > 0.35 ? lb + '_attack'
        : enemies.length ? lb + '_walk' : lb + '_idle';
      this.safePlay(m.sprite, desired);
      const phW = t * 7 + (m.def.role === 'archer' ? 2 : m.def.role === 'mage' ? 4 : 0);
      const walking = desired === lb + '_walk';
      m.sprite.setPosition(px + m.lunge * 20, gy + (walking ? -Math.abs(Math.sin(phW)) * 2.2 : 0));
      if (walking && m.alive && !SETTINGS.reduceFx && Math.random() < 0.09) VFX.puff(px - 14, gy + 2);
      const sy = 1 + Math.cos(phW * 2) * (walking ? 0.02 : 0.008);
      const rs = ROLE_SCALE[m.def.role] || 1;
      const hb = baseScale(lb);
      if (!m.alive) { m.sprite.setRotation(-1.2); m.sprite.setAlpha(0.5); }
      else {
        m.sprite.setRotation(walking ? 0.02 : (desired === lb + '_attack' ? 0.1 : 0));
        m.sprite.setAlpha(1);
      }
      m.sprite.setScale(hb * rs * (2 - sy), hb * rs * sy);
      // L27: la Égida pinta al escuadrón de verde mientras protege
      if (m.flash > 0) m.sprite.setTint(0xffffff);
      else if (hasBuff('aegis')) m.sprite.setTint(0xa8f0c0);
      else if (hasBuff('frenzy')) m.sprite.setTint(0xbdf4ff);
      else if (m.def.tint) m.sprite.setTint(m.def.tint);
      else m.sprite.clearTint();
      if (wantCrown) {
        if (!m.crown && this.textures.exists('acc_crown')) {
          m.crown = this.add.sprite(0, 0, 'acc_crown').setOrigin(0.5, 1).setDepth(Z.crown);
        }
        if (m.crown) {
          m.crown.setVisible(m.alive);
          m.crown.setPosition(m.sprite.x, m.sprite.y - m.sprite.displayHeight + 6 * m.sprite.scaleY);
          m.crown.setScale(m.sprite.scaleX * 0.45, m.sprite.scaleY * 0.45);
        }
      } else if (m.crown) { m.crown.destroy(); m.crown = null; }
    });
  }

  // ---- Mascota ----
  syncPet(gy, t, wantCrown) {
    const sq = typeof squad !== 'undefined' ? squad : [];
    const wantPet = !!(S.look && S.look.pet);
    if (!wantPet) {
      if (this.petSprite) { this.petSprite.destroy(); this.petSprite = null; }
      if (this.petCrown) { this.petCrown.destroy(); this.petCrown = null; }
      return;
    }
    if (!this.petSprite && this.anims.exists('hero_idle')) {
      this.petSprite = this.add.sprite(0, gy, 'hero_idle').setOrigin(0.5, 1).setDepth(Z.sprite);
      this.safePlay(this.petSprite, 'hero_idle');
    }
    if (!this.petSprite) return;
    const main = sq.find(m => m.def.role === 'dps');
    const bx = (main ? main.px : heroX()) - 52;
    const casting = (typeof petCastT !== 'undefined' && petCastT > 0);
    const desired = casting ? 'hero_cast' : (main && main.entering) ? 'hero_walk' : enemies.length ? 'hero_walk' : 'hero_idle';
    this.safePlay(this.petSprite, desired);
    const pb = baseScale('hero') * 0.62;
    const bob = Math.sin(t * 5) * 2;
    this.petSprite.setPosition(bx, gy - 4 + bob);
    this.petSprite.setScale(pb, pb);
    if (wantCrown) {
      if (!this.petCrown && this.textures.exists('acc_crown')) {
        this.petCrown = this.add.sprite(0, 0, 'acc_crown').setOrigin(0.5, 1).setDepth(Z.crown);
      }
      if (this.petCrown) {
        this.petCrown.setPosition(this.petSprite.x, this.petSprite.y - this.petSprite.displayHeight + 4 * this.petSprite.scaleY);
        this.petCrown.setScale(this.petSprite.scaleX * 0.5, this.petSprite.scaleY * 0.5);
      }
    } else if (this.petCrown) { this.petCrown.destroy(); this.petCrown = null; }
  }

  // ---- Enemigos ----
  syncEnemies(gy, t) {
    const alive = new Set();
    enemies.forEach(e => {
      alive.add(e);
      const kind = e.boss ? 'boss' : e.kind;
      if (!e.sprite && this.anims.exists(kind + '_walk')) {
        e.sprite = this.add.sprite(e.x, gy, kind + '_walk').setOrigin(0.5, 1).setDepth(Z.sprite);
        this.safePlay(e.sprite, kind + '_walk');
        this.seen.add(e);
        if (e.boss) {
          showBanner('👑 JEFE', chapterOf(S.stage).name + ' · Etapa ' + S.stage, 'bnRed');
          this.cameras.main.shake(400, 0.02);
          vfxZoomPulse(this, 1.14, 220);
        } else {
          vfxRing(this, e.x, gy - 20, e.elite ? 0xffd700 : e.affix ? toColor(affixDef(e.affix).css) : 0x7bed9f);
        }
      }
      if (!e.sprite) return;
      const su = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1);
      const bs = baseScale(kind);
      e.sprite.setPosition(e.x + e.lungeX + e.kb, gy);
      // Aviso de golpe
      if (e.state === 'windup' && e.dying === null) {
        if (!e.warn) e.warn = this.add.text(e.x, gy - 95 * e.size, '!', {
          fontFamily: '"Press Start 2P", monospace', fontSize: '18px',
          color: '#ff5252', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(Z.badge);
        e.warn.setPosition(e.x, gy - 95 * e.size + Math.sin(t * 20) * 2);
      } else if (e.warn) { e.warn.destroy(); e.warn = null; }
      // Muerte
      if (e.dying !== null) {
        if (e.warn) { e.warn.destroy(); e.warn = null; }
        if (e.badge) { e.badge.destroy(); e.badge = null; }
        if (!e.fx) {
          e.fx = true;
          this.tweens.add({ targets: e.sprite, rotation: 1.35, alpha: 0, y: gy + 12,
            scaleX: e.sprite.scaleX * 1.1, scaleY: e.sprite.scaleY * 0.8,
            duration: 450, ease: 'Quad.easeIn',
            onComplete: () => { if (e.sprite) { e.sprite.destroy(); e.sprite = null; } } });
        }
      } else {
        let tilt = 0, sx = 1, sy2 = 1, hop = 0;
        if (e.state === 'walk') { const pw = t * (e.kind === 'spider' || e.kind === 'wasp' ? 10 : 8); hop = -Math.abs(Math.sin(pw)) * 2.5; tilt = Math.sin(pw) * 0.035; }
        else if (e.state === 'windup') { tilt = -0.1; sy2 = .93; sx = 1.05; }
        else if (e.state === 'strike') { tilt = 0.12; sx = 1.1; sy2 = .94; }
        else { sy2 = 1 + Math.sin(t * 3 + e.slot) * .015; sx = 2 - sy2; }
        e.sprite.setRotation(tilt);
        e.sprite.setScale(bs * su * sx, bs * su * sy2);
        e.sprite.y = gy + hop;
        // LOTE 8: boss con anims propios (attack con restart, idle, walk)
        // L27: + boss_roar, que existía como arte y como anim pero nunca se reproducía.
        if (e.boss) {
          const des = bossRoarT > 0 ? 'boss_roar'
            : (e.state === 'windup' || e.state === 'strike') ? 'boss_attack'
            : e.state === 'idle' ? 'boss_idle' : 'boss_walk';
          const cur = e.sprite.anims.currentAnim && e.sprite.anims.currentAnim.key;
          if (cur !== des || (des !== 'boss_idle' && des !== 'boss_walk' && !e.sprite.anims.isPlaying)) {
            if (this.anims.exists(des)) { try { e.sprite.play(des); } catch (err) {} }
          }
        }
        // L26: élites en dorado · L27: los afijos tienen su propio tinte
        if (e.flash > 0) e.sprite.setTint(0xffffff);
        else if (e.elite) e.sprite.setTint(0xffd76b);
        else if (e.affix) e.sprite.setTint(affixDef(e.affix).tint);
        else e.sprite.clearTint();
      }
      e.su = su;
    });
    // FIX L26: fuga de memoria. La condición anterior (`e.sprite && !e.fx`) nunca se
    // cumplía para un enemigo muerto — el tween de muerte pone e.sprite = null y deja
    // e.fx = true —, así que el Map crecía sin tope durante toda la partida.
    for (const e of this.seen) {
      if (alive.has(e)) continue;
      if (e.warn) { e.warn.destroy(); e.warn = null; }
      if (e.badge) { e.badge.destroy(); e.badge = null; }
      if (e.sprite) { e.sprite.destroy(); e.sprite = null; }
      if (e.aura) { e.aura.destroy(); e.aura = null; }
      e.fx = false;
      this.seen.delete(e);
    }
  }

  // ---- Barras de vida + insignias de afijo ----
  syncBars(gy, t) {
    enemies.forEach(e => {
      if (e.dying !== null || !e.sprite) return;
      const su = e.su || 1;
      const bw = (e.boss ? 86 : 56) * su, bx = e.x + e.lungeX + e.kb, by = gy - 82 * su;
      const aff = e.affix ? affixDef(e.affix) : null;
      // halo palpitante bajo élites y afijos (en el graphics compartido: 0 objetos extra)
      if ((e.elite || aff) && !SETTINGS.reduceFx) {
        const pulse = 0.3 + Math.sin(t * 5) * 0.15;
        this.shadows.fillStyle(e.elite ? 0xffd700 : toColor(aff.css), pulse);
        this.shadows.fillEllipse(bx, gy + 4, 66 * su, 16);
      }
      this.bars.fillStyle(0x000000, 0.65); this.bars.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, 8);
      this.bars.fillStyle(e.boss ? 0xff4757 : e.elite ? 0xffd700 : aff ? toColor(aff.css) : 0x7bed9f, 1);
      this.bars.fillRect(bx - bw / 2, by, bw * Math.max(0, e.hp / e.max), 6);
      // Insignia de afijo: un solo objeto de texto por enemigo, reposicionado
      if (aff && !SETTINGS.reduceFx) {
        if (!e.badge) {
          e.badge = this.add.text(bx, by - 12, aff.ico + ' ' + aff.n.toUpperCase(), {
            fontFamily: '"Press Start 2P", monospace', fontSize: '7px',
            color: aff.css, stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(Z.badge);
        }
        e.badge.setPosition(bx, by - 12);
      } else if (e.badge) { e.badge.destroy(); e.badge = null; }
    });
  }

  sync() {
    const gy = groundY(), t = time;
    this.syncBg();
    this.shadows.clear();
    this.bars.clear();
    if (S.stage !== this.lastStage) {
      this.lastStage = S.stage;
      showBanner('⚔️ ETAPA ' + S.stage, chapterOf(S.stage).name);
    }
    const wantCrown = !!(S.look && S.look.crown);
    this.syncSquad(gy, t, wantCrown);
    this.syncPet(gy, t, wantCrown);
    this.syncEnemies(gy, t);
    this.syncBars(gy, t);
    if (shake > this.prevShake + 1) this.cameras.main.shake(120, Math.min(0.03, 0.004 * shake));
    this.prevShake = shake;
    if (stageFlash > this.prevFlash + 0.2) this.cameras.main.flash(300, 255, 215, 0);
    this.prevFlash = stageFlash;
  }
}
