'use strict';
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function toColor(str) {
    if (!str) return 0xffffff;
    if (str[0] === '#') return parseInt(str.slice(1), 16);
    const m = /hsl\((\d+)/.exec(str);
    if (m) { const c = Phaser.Display.Color.HSLToColor(+m[1] / 360, 0.8, 0.6); return (c.r << 16) | (c.g << 8) | c.b; }
    return 0xffffff;
}
/* Altura visual objetivo de cada sprite en px de mundo */
const TARGET_H = { hero: 105, beetle: 80, spider: 80, boss: 115 };
const baseScale = kind => (TARGET_H[kind] || 100) / STRIP_H;

class BattleScene extends Phaser.Scene {
    constructor() { super('battle'); }

    create() {
        this.bg = this.add.image(0, 0, 'bg'); this.bg.setOrigin(0.5, 1);
        this.fliesG = this.add.graphics();
        this.heroSpr = this.add.sprite(0, 0, 'hero_idle'); this.heroSpr.setOrigin(0.5, 1);
        this.bars = this.add.graphics();
        this.seen = new Map();
        this.curBg = 'bg';
        this.prevShake = 0; this.prevFlash = 0;
        this.ff = [];
        for (let i = 0; i < 12; i++) this.ff.push({ x: Math.random(), y: .5 + Math.random() * .5, p: Math.random() * TAU, s: .5 + Math.random() });

        VFX.float = (x, y, txt, color, big) => {
            const t = this.add.text(x, y, txt, {
                fontFamily: '"Press Start 2P", monospace', fontSize: (big ? 20 : 13) + 'px',
                color: color, stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
            this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
        };
        VFX.burst = (x, y, color, n) => {
            const k = SETTINGS.reduceFx ? 0.4 : 1;
            n = Math.max(2, Math.round(n * k));
            const col = toColor(color);
            for (let i = 0; i < n; i++) {
                const a = TAU * i / n, s = 2 + Math.random() * 3;
                const c = this.add.circle(x, y, 3, col);
                this.tweens.add({ targets: c, x: x + Math.cos(a) * s * 14, y: y + Math.sin(a) * s * 14 + 26,
                    alpha: 0, duration: 600, onComplete: () => c.destroy() });
            }
        };
        VFX.coin = (x, y) => {
            const c = this.add.circle(x, y, 4, 0xffd700);
            this.tweens.add({ targets: c, x: 30, y: -20, duration: 700, ease: 'Cubic.easeIn', onComplete: () => c.destroy() });
        };
        VFX.puff = (x, y) => {
            const c = this.add.circle(x, y, 4, 0xccbbbb, 0.5);
            this.tweens.add({ targets: c, y: y - 16, alpha: 0, duration: 500, onComplete: () => c.destroy() });
        };
    }

    update(tMs, dtMs) {
        const dt = Math.min(0.1, dtMs / 1000);
        W = this.scale.width; H = this.scale.height;
        update(dt);
        uiTick();
        this.sync();
    }

    sync() {
        const hx = heroX(), gy = groundY();
        const t = time;

        // fondo por capítulo
        const want = (chapterOf(S.stage).bg || 'img/bg.png').split('/').pop().replace('.png', '');
        if (want !== this.curBg && this.textures.exists(want)) { this.bg.setTexture(want); this.curBg = want; }
        const iw = this.bg.width || 1, ih = this.bg.height || 1;
        this.bg.setScale(Math.max(W / iw, H / ih));
        this.bg.setPosition(W / 2, H);

        // luciérnagas
        this.fliesG.clear();
        if (!SETTINGS.reduceFx) this.ff.forEach(f => {
            const x = (f.x + Math.sin(t * .12 * f.s + f.p) * .06) * W;
            const y = (f.y + Math.sin(t * .2 * f.s + f.p * 2) * .05) * H;
            const a = .35 + Math.sin(t * 2.4 * f.s + f.p) * .3;
            if (a > 0) { this.fliesG.fillStyle(0xffdc6e, a); this.fliesG.fillCircle(x, y, 2); }
        });

        // ===== héroe (escala base + grow de mejoras) =====
        const desired = hero.dead > 0 ? 'hero_death'
            : hero.flash > 0 ? 'hero_hurt'
            : hero.lunge > 0.35 ? 'hero_attack'
            : hero.venFlash > 0 ? 'hero_cast'
            : enemies.length ? 'hero_walk' : 'hero_idle';
        if (this.heroSpr.anims.currentAnim && this.heroSpr.anims.currentAnim.key !== desired) this.heroSpr.play(desired);
        const phW = t * 7;
        const walking = desired === 'hero_walk';
        this.heroSpr.setPosition(hx + hero.lunge * 22 - hero.recoil * 7, gy + (walking ? -Math.abs(Math.sin(phW)) * 2.2 : 0));
        const sy = 1 + Math.cos(phW * 2) * (walking ? 0.02 : 0.008);
        const grow = 1 + Math.min(0.6, (S.ups.dmg + S.ups.vit) * 0.012);
        const hb = baseScale('hero');
        if (hero.dead > 0) {
            const p = Math.min(1, (4 - hero.dead) * 2.5);
            this.heroSpr.setRotation(-(1 - Math.pow(1 - p, 3)) * 1.5);
            this.heroSpr.setAlpha(1 - p * .6);
        } else {
            this.heroSpr.setRotation(walking ? 0.02 : (desired === 'hero_attack' ? 0.06 : 0));
            this.heroSpr.setAlpha(1);
        }
        this.heroSpr.setScale(hb * grow * (2 - sy), hb * grow * sy);
        if (hero.flash > 0) this.heroSpr.setTint(0xffffff); else this.heroSpr.clearTint();

        // ===== enemigos =====
        const alive = new Set();
        enemies.forEach(e => {
            alive.add(e);
            const kind = e.boss ? 'boss' : e.kind;
            if (!e.sprite && this.anims.exists(kind + '_walk')) {
                e.sprite = this.add.sprite(e.x, gy, kind + '_walk');
                e.sprite.setOrigin(0.5, 1);
                e.sprite.play(kind + '_walk');
                this.seen.set(e, true);
            }
            if (!e.sprite) return;
            const su = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1);
            const bs = baseScale(kind);
            e.sprite.setPosition(e.x + e.lungeX + e.kb, gy);
            if (e.dying !== null) {
                if (!e.fx) {
                    e.fx = true;
                    this.tweens.add({ targets: e.sprite, rotation: 1.35, alpha: 0, y: gy + 12, duration: 450,
                        onComplete: () => { if (e.sprite) { e.sprite.destroy(); e.sprite = null; } } });
                }
            } else {
                let tilt = 0, sx = 1, sy2 = 1, hop = 0;
                if (e.state === 'walk') { const pw = t * (e.kind === 'spider' ? 10 : 8); hop = -Math.abs(Math.sin(pw)) * 2.5; tilt = Math.sin(pw) * 0.035; }
                else if (e.state === 'windup') { tilt = -0.1; sy2 = .93; sx = 1.05; }
                else if (e.state === 'strike') { tilt = 0.12; sx = 1.1; sy2 = .94; }
                else { sy2 = 1 + Math.sin(t * 3 + e.slot) * .015; sx = 2 - sy2; }
                e.sprite.setRotation(tilt);
                e.sprite.setScale(bs * su * sx, bs * su * sy2);
                e.sprite.y = gy + hop;
                if (e.flash > 0) e.sprite.setTint(0xffffff); else e.sprite.clearTint();
            }
            e.su = su;   // para la barra de vida
        });
        for (const e of this.seen.keys()) {
            if (!alive.has(e) && e.sprite && !e.fx) { e.sprite.destroy(); e.sprite = null; this.seen.delete(e); }
        }

        // barras de vida (tamaño lógico, no píxeles del sprite)
        this.bars.clear();
        enemies.forEach(e => {
            if (e.dying !== null || !e.sprite) return;
            const su = e.su || 1;
            const bw = 56 * su, bx = e.x + e.lungeX + e.kb, by = gy - 82 * su;
            this.bars.fillStyle(0x000000, 0.6); this.bars.fillRect(bx - bw / 2, by, bw, 6);
            this.bars.fillStyle(e.boss ? 0xff4757 : 0x7bed9f, 1);
            this.bars.fillRect(bx - bw / 2, by, bw * Math.max(0, e.hp / e.max), 6);
        });

        // cámara
        if (shake > this.prevShake + 1) this.cameras.main.shake(120, Math.min(0.03, 0.004 * shake));
        this.prevShake = shake;
        if (stageFlash > this.prevFlash + 0.2) this.cameras.main.flash(300, 255, 215, 0);
        this.prevFlash = stageFlash;
    }
}