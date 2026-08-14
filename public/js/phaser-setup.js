'use strict';
/* BootScene: los strips ya vienen normalizados en PREP (assets.js).
   Phaser solo registra spritesheets + animaciones. */
const ANIM_DEFS = [
    { key:'hero_walk',   tex:'hero_walk',    fps:8,  loop:true  },
    { key:'hero_idle',   tex:'hero_idle',    fps:2,  loop:true  },
    { key:'hero_attack', tex:'hero_attack',  fps:10, loop:false },
    { key:'hero_cast',   tex:'hero_cast',    fps:7,  loop:false },
    { key:'hero_hurt',   tex:'hero_hurt',    fps:8,  loop:false, start:0, end:2 },
    { key:'hero_death',  tex:'hero_hurt',    fps:4,  loop:false, start:3, end:5 },
    { key:'beetle_walk', tex:'enemy_beetle', fps:7,  loop:true  },
    { key:'spider_walk', tex:'enemy_spider', fps:10, loop:true  },
    { key:'boss_walk',   tex:'enemy_boss',   fps:3,  loop:true, yoyo:true }
];

class BootScene extends Phaser.Scene {
    constructor() { super('boot'); }
    preload() {
        this.load.on('loaderror', () => {});   // tolera fondos faltantes
        ['bg','bg_cave','bg_swamp'].forEach(k => this.load.image(k, 'img/' + k + '.png'));
    }
    create() {
        ANIM_DEFS.forEach(d => {
            const p = PREP[d.tex];
            if (!p) return;
            this.textures.addSpriteSheet(d.key, p.strip, { frameWidth: p.fw, frameHeight: p.fh });
            const total = p.count;
            const start = Math.min(d.start || 0, total - 1);
            const end = Math.min(d.end !== undefined ? d.end : total - 1, total - 1);
            this.anims.create({
                key: d.key,
                frames: this.anims.generateFrameNumbers(d.key, { start, end }),
                frameRate: d.fps,
                repeat: d.loop ? -1 : 0,
                yoyo: !!d.yoyo
            });
        });
        this.scene.start('battle');
    }
}