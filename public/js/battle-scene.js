'use strict';
const easeOutBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function toColor(str) {
    if (!str) return 0xffffff;
    if (str[0] === '#') return parseInt(str.slice(1), 16);
    const m = /hsl\((\d+)/.exec(str);
    if (m) { const c = Phaser.Display.Color.HSLToColor(+m[1] / 360, 0.8, 0.6); return (c.r << 16) | (c.g << 8) | c.b; }
    return 0xffffff;
}
const TARGET_H = { hero: 105, beetle: 80, spider: 80, boss: 115 };
const ROLE_SCALE = { dps: 1, tank: 1.15, support: 0.9 };
const baseScale = kind => (TARGET_H[kind] || 100) / (typeof STRIP_H !== 'undefined' ? STRIP_H : 160);

function showBanner(txt) {
    const d = document.createElement('div');
    d.className = 'banner'; d.textContent = txt;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1500);
}

class BattleScene extends Phaser.Scene {
    constructor() { super('battle'); }

    create() {
        this.bg = this.add.image(0, 0, 'bg'); this.bg.setOrigin(0.5, 1);
        this.fliesG = this.add.graphics();
        this.bars = this.add.graphics();
        this.seen = new Map();
        this.curBg = 'bg';
        this.prevShake = 0; this.prevFlash = 0; this.lastStage = S.stage;
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

        /* Juice hooks (con guard: si battle.js es viejo, no rompe) */
        if (typeof HOOKS !== 'undefined') {
            HOOKS.crit = (x, y) => { this.ring(x, y, 0xffeb3b); this.hitStop(0.25, 60); };
            HOOKS.ult = () => { this.cameras.main.flash(220, 126, 252, 252); this.hitStop(0.2, 80); this.zoomPulse(); };
            HOOKS.kill = (e) => { this.ring(e.x, groundY() - 30, 0xffffff); };
        }
    }

    hitStop(sc, ms) {
        this.time.timeScale = sc;
        this.time.delayedCall(ms, () => { this.time.timeScale = 1; });
    }
    zoomPulse() { const c = this.cameras.main; c.zoomTo(1.05, 100); c.zoomTo(1, 260); }
    ring(x, y, color) {
        const o = { r: 8, a: 1 };
        const g = this.add.graphics();
        this.tweens.add({ targets: o, r: 42, a: 0, duration: 320, ease: 'Cubic.easeOut',
            onUpdate: () => { g.clear(); g.lineStyle(3, color, o.a); g.strokeCircle(x, y, o.r); },
            onComplete: () => g.destroy() });
    }
    slash(x, y) {
        const o = { p: 0 };
        const g = this.add.graphics();
        this.tweens.add({ targets: o, p: 1, duration: 180, ease: 'Quad.easeOut',
            onUpdate: () => {
                g.clear(); g.lineStyle(4, 0xffffff, 1 - o.p);
                g.beginPath(); g.arc(x, y, 28 + o.p * 18, -1.1 + o.p * 1.4, 0.7 + o.p * 1.4); g.strokePath();
            },
            onComplete: () => g.destroy() });
    }

    update(tMs, dtMs) {
        const dt = Math.min(0.1, dtMs / 1000);
        W = this.scale.width; H = this.scale.height;
        try { update(dt); } catch (e) { console.error('⚔️ battle update:', e); }
        if (typeof uiTick === 'function') { try { uiTick(); } catch (e) { console.error('🖥️ uiTick:', e); } }
        this.sync();
    }

    sync() {
        const gy = groundY();
        const t = time;
        const sq = typeof squad !== 'undefined' ? squad : [];
        const sxOf = (typeof slotX === 'function') ? slotX : (m => heroX());

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

        // banner de etapa
        if (S.stage !== this.lastStage) { this.lastStage = S.stage; showBanner('⚔️ ETAPA ' + S.stage); }

        // ===== ESCUADRÓN =====
        const hb = baseScale('hero');
        this.bars.clear();
        sq.forEach(m => {
            this.bars.fillStyle(0x000000, 0.35);
            this.bars.fillEllipse(sxOf(m), gy + 6, 60 * (ROLE_SCALE[m.def.role] || 1), 12);

            if (!m.sprite && this.anims.exists('hero_idle')) {
                m.sprite = this.add.sprite(sxOf(m), gy, 'hero_idle');
                m.sprite.setOrigin(0.5, 1);
                m.sprite.play('hero_idle');
                if (m.def.tint) m.sprite.setTint(m.def.tint);
                this.ring(sxOf(m), gy - 30, 0x7bed9f);
            }
            if (!m.sprite) return;

            if (m.lunge > 0.8 && !m.slashDone) { m.slashDone = true; this.slash(sxOf(m) + 62, gy - 50); }
            if (m.lunge < 0.3) m.slashDone = false;

            const desired = !m.alive ? 'hero_death'
                : m.flash > 0 ? 'hero_hurt'
                : m.castT > 0 ? 'hero_cast'
                : m.lunge > 0.35 ? 'hero_attack'
                : enemies.length ? 'hero_walk' : 'hero_idle';
            if (m.sprite.anims.currentAnim && m.sprite.anims.currentAnim.key !== desired) m.sprite.play(desired);
            const phW = t * 7 + (m.def.role === 'tank' ? 2 : m.def.role === 'support' ? 4 : 0);
            const walking = desired === 'hero_walk';
            m.sprite.setPosition(sxOf(m) + m.lunge * 20, gy + (walking ? -Math.abs(Math.sin(phW)) * 2.2 : 0));
            const sy = 1 + Math.cos(phW * 2) * (walking ? 0.02 : 0.008);
            const rs = ROLE_SCALE[m.def.role] || 1;
            if (!m.alive) { m.sprite.setRotation(-1.2); m.sprite.setAlpha(0.5); }
            else {
                m.sprite.setRotation(walking ? 0.02 : (desired === 'hero_attack' ? 0.06 : 0));
                m.sprite.setAlpha(1);
            }
            m.sprite.setScale(hb * rs * (2 - sy), hb * rs * sy);
            if (m.flash > 0) m.sprite.setTint(0xffffff);
            else if (m.def.tint) m.sprite.setTint(m.def.tint);
            else m.sprite.clearTint();
        });

        // ===== ENEMIGOS =====
        const alive = new Set();
        enemies.forEach(e => {
            alive.add(e);
            const kind = e.boss ? 'boss' : e.kind;
            if (!e.sprite && this.anims.exists(kind + '_walk')) {
                e.sprite = this.add.sprite(e.x, gy, kind + '_walk');
                e.sprite.setOrigin(0.5, 1);
                e.sprite.play(kind + '_walk');
                this.seen.set(e, true);
                if (e.boss) { showBanner('👑 JEFE · ETAPA ' + S.stage); this.cameras.main.shake(400, 0.02); }
                else this.ring(e.x, gy - 20, 0x7bed9f);
            }
            if (!e.sprite) return;
            const su = e.size * (1 + Math.min(0.5, S.stage * 0.004)) * (e.pop < 1 ? Math.max(0.01, easeOutBack(e.pop)) : 1);
            const bs = baseScale(kind);
            e.sprite.setPosition(e.x + e.lungeX + e.kb, gy);

            if (e.state === 'windup' && e.dying === null) {
                if (!e.warn) e.warn = this.add.text(e.x, gy - 95 * e.size, '!', {
                    fontFamily: '"Press Start 2P", monospace', fontSize: '18px', color: '#ff5252',
                    stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
                e.warn.setPosition(e.x, gy - 95 * e.size + Math.sin(t * 20) * 2);
            } else if (e.warn) { e.warn.destroy(); e.warn = null; }

            if (e.dying !== null) {
                if (e.warn) { e.warn.destroy(); e.warn = null; }
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
            e.su = su;
        });
        for (const e of this.seen.keys()) {
            if (!alive.has(e) && e.sprite && !e.fx) {
                if (e.warn) { e.warn.destroy(); e.warn = null; }
                e.sprite.destroy(); e.sprite = null; this.seen.delete(e);
            }
        }

        // ===== overlays =====
        if (shieldT > 0) {
            this.bars.lineStyle(2, 0xffb347, 0.7);
            this.bars.strokeRect(heroX() - 110, gy - 130, 200, 120);
        }
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