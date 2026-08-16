'use strict';
const ANIM_DEFS = [
  { key: 'hero_walk',     tex: 'hero_walk',      fps: 12, loop: true  },
  { key: 'hero_idle',     tex: 'hero_idle',      fps: 3,  loop: true  },
  { key: 'hero_attack',   tex: 'hero_attack',    fps: 14, loop: false },
  { key: 'hero_cast',     tex: 'hero_cast',      fps: 10, loop: false },
  { key: 'hero_hurt',     tex: 'hero_hurt',      fps: 10, loop: false, start: 0, end: 2 },
  { key: 'hero_death',    tex: 'hero_hurt',      fps: 8,  loop: false, start: 3, end: 5 },
  { key: 'beetle_walk',   tex: 'enemy_beetle',   fps: 7,  loop: true  },
  { key: 'spider_walk',   tex: 'enemy_spider',   fps: 10, loop: true  },
  { key: 'wasp_walk',     tex: 'enemy_wasp',     fps: 12, loop: true  },
  { key: 'scorpion_walk', tex: 'enemy_scorpion', fps: 8,  loop: true  },
  { key: 'boss_walk',     tex: 'enemy_boss',     fps: 3,  loop: true, yoyo: true },
  // humanos: walk/idle con espada envainada en la espalda (horneado en el arte)
  { key: 'human_a_walk',  tex: 'hero_human_a',   fps: 10, loop: true  },
  { key: 'human_a_idle',  tex: 'hero_human_a',   fps: 3,  loop: true, start: 0, end: 0 },
  { key: 'human_a_attack',tex: 'hero_human_a_attack', fps: 9, loop: false },
  { key: 'human_b_walk',  tex: 'hero_human_b',   fps: 10, loop: true  },
  { key: 'human_b_idle',  tex: 'hero_human_b',   fps: 3,  loop: true, start: 0, end: 0 },
  { key: 'human_b_attack',tex: 'hero_human_b_attack', fps: 9, loop: false },
  { key: 'human_c_walk',  tex: 'hero_human_c',   fps: 10, loop: true  },
  { key: 'human_c_idle',  tex: 'hero_human_c',   fps: 3,  loop: true, start: 0, end: 0 },
  { key: 'human_c_attack',tex: 'hero_human_c_attack', fps: 9, loop: false },
  { key: 'acc_crown',     tex: 'acc_crown',      fps: 1,  loop: false }
];
class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    this.load.on('loaderror', () => {});
    // solo fondos: los sheets crudos los procesa assets.js (PREP)
    ['bg', 'bg_cave', 'bg_swamp', 'bg_tower', 'bg_rogue'].forEach(k => {
      if (!this.textures.exists(k)) this.load.image(k, 'img/' + k + '.png');
    });
  }
  create() {
    ANIM_DEFS.forEach(d => {
      const p = PREP[d.tex];
      if (!p) { console.warn('⚠️ sin strip para ' + d.tex); return; }
      const texKey = '_strip_' + d.key;
      if (!this.textures.exists(texKey)) this.textures.addCanvas(texKey, p.strip);
      const srcTex = this.textures.get(texKey);
      if (!srcTex || !srcTex.getSourceImage()) { console.warn('⚠️ strip sin fuente: ' + d.key); return; }
      if (this.textures.exists(d.key)) this.textures.remove(d.key);
      this.textures.addSpriteSheet(d.key, srcTex.getSourceImage(), { frameWidth: p.fw, frameHeight: p.fh });
      const tex = this.textures.get(d.key);
      if (!tex || tex.frameTotal <= 0) { console.warn('⚠️ spritesheet vacía: ' + d.key); return; }
      if (this.anims.exists(d.key)) this.anims.remove(d.key);
      // FIX off-by-one: frameTotal incluye _BASE; el nº real de frames es p.count
      const total = Math.max(1, p.count || (tex.frameTotal - 1));
      const start = Math.min(d.start || 0, total - 1);
      const end = Math.min(d.end !== undefined ? d.end : total - 1, total - 1);
      this.anims.create({
        key: d.key,
        frames: this.anims.generateFrameNumbers(d.key, { start, end }),
        frameRate: d.fps,
        repeat: d.loop ? -1 : 0,
        yoyo: !!d.yoyo
      });
      console.log('🎞️ anim ' + d.key + ': ' + total + ' frames');
    });
    window.ANIM_KINDS = ANIM_DEFS
      .filter(d => PREP[d.tex])
      .map(d => d.tex === 'hero_walk' ? 'hero' : d.tex.replace('enemy_', ''));
    this.scene.start('battle');
  }
}