'use strict';
/* BootScene: carga PNGs, normaliza sheets irregulares → spritesheets
   uniformes y registra las animaciones del motor. */
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
        this.load.on('loaderror', () => {});   // tolera assets faltantes
        ['bg','bg_cave','bg_swamp','hero_walk','hero_idle','hero_attack','hero_cast',
         'hero_hurt','enemy_beetle','enemy_spider','enemy_boss'].forEach(k =>
            this.load.image(k, 'img/' + k + '.png'));
    }
    create() {
        ANIM_DEFS.forEach(d => this.buildAnim(d));
        this.scene.start('battle');
    }
    buildAnim(d) {
        if (!this.textures.exists(d.tex)) return;
        const src = this.textures.getSourceImage(d.tex);
        if (!src) return;
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const g = c.getContext('2d');
        g.drawImage(src, 0, 0);
        try { chroma(g, c); } catch (e) {}
        const a = analyze(c);
        if (!a.frames.length) return;
        const fw = a.frames.reduce((m, f) => Math.max(m, f.sw), 1);
        const fh = a.maxH;
        const strip = document.createElement('canvas');
        strip.width = fw * a.frames.length; strip.height = fh;
        const sg = strip.getContext('2d');
        a.frames.forEach((f, i) => {
            sg.drawImage(c, f.sx, f.sy, f.sw, f.sh, i * fw + Math.floor((fw - f.sw) / 2), fh - f.sh, f.sw, f.sh);
        });
        this.textures.addSpriteSheet(d.key, strip, { frameWidth: fw, frameHeight: fh });
        const total = this.textures.get(d.key).frameTotal;
        const start = Math.min(d.start || 0, total - 1);
        const end = Math.min(d.end !== undefined ? d.end : total - 1, total - 1);
        this.anims.create({
            key: d.key,
            frames: this.anims.generateFrameNumbers(d.key, { start, end }),
            frameRate: d.fps,
            repeat: d.loop ? -1 : 0,
            yoyo: !!d.yoyo
        });
    }
}