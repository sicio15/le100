'use strict';
// ===== BOOT SCENE: registra spritesheets/anims desde PREP (assets.js) =====
class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    this.load.on('loaderror', () => {});
    ['bg', 'bg_cave', 'bg_swamp', 'bg_tower', 'bg_rogue'].forEach(k => {
      if (!this.textures.exists(k)) this.load.image(k, 'img/' + k + '.png');
    });
  }
  create() {
    ANIM_DEFS.forEach(d => {
      let p = PREP[d.tex];
      let start = d.start, end = d.end;
      if (!p && d.fallback) {
        p = PREP[d.fallback.tex]; start = d.fallback.start; end = d.fallback.end;
        console.warn('↩️ ' + d.key + ': fallback ' + d.fallback.tex);
      }
      if (!p) { console.warn('⚠️ sin strip para ' + d.tex); return; }
      const texKey = 'strip' + d.key;
      if (!this.textures.exists(texKey)) this.textures.addCanvas(texKey, p.strip);
      const srcTex = this.textures.get(texKey);
      if (!srcTex || !srcTex.getSourceImage()) { console.warn('⚠️ strip sin fuente: ' + d.key); return; }
      if (this.textures.exists(d.key)) this.textures.remove(d.key);
      this.textures.addSpriteSheet(d.key, srcTex.getSourceImage(), { frameWidth: p.fw, frameHeight: p.fh });
      const tex = this.textures.get(d.key);
      if (!tex || tex.frameTotal <= 0) { console.warn('⚠️ spritesheet vacía: ' + d.key); return; }
      if (this.anims.exists(d.key)) this.anims.remove(d.key);
      const total = Math.max(1, p.count || (tex.frameTotal - 1));
      const s = Math.min(start || 0, total - 1);
      const e = Math.min(end !== undefined ? end : total - 1, total - 1);
      this.anims.create({ key: d.key, frames: this.anims.generateFrameNumbers(d.key, { start: s, end: e }), frameRate: d.fps, repeat: d.loop ? -1 : 0, yoyo: !!d.yoyo });
      console.log('🎞️ anim ' + d.key + ': frames ' + s + '-' + e + ' (total ' + total + ')');
    });
    // kinds de enemigos LIMPIOS: solo walks de enemy_* + hero
    window.ANIM_KINDS = ANIM_DEFS
      .filter(d => PREP[d.tex] || (d.fallback && PREP[d.fallback.tex]))
      .map(d => d.tex === 'hero_walk' ? 'hero' : (d.tex.indexOf('enemy_') === 0 ? d.tex.slice(6) : null))
      .filter(k => k !== null);
    this.scene.start('battle');
  }
}