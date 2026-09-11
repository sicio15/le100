'use strict';
/* ===== Chiptune engine WebAudio: música procedural por capítulo + SFX 8-bit ===== */
const Audio = (() => {
    let ctx = null, master = null, musicGain = null, sfxGain = null;
    let enabled = true, mVol = 0.5, sVol = 0.7;
    let loopId = null, step = 0, chapter = 0;

    // Escala menor pentatónica en La (frecuencias Hz)
    const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
    // L28: una progresión por ZONA (antes había 3 y se repetían en bucle desde el
    // capítulo 4) + un tema exclusivo de pelea contra jefe.
    const PROG = [
        [0, 3, 4, 3],   // 0 bosque    — abierto
        [0, 5, 3, 4],   // 1 cuevas    — cerrado
        [3, 0, 4, 5],   // 2 pantano   — pesado
        [0, 4, 5, 4],   // 3 torre     — marcial
        [5, 3, 0, 3],   // 4 sotobosque— descendente
        [4, 5, 4, 0],   // 5 ceniza    — inquieto
        [2, 5, 1, 4],   // 6 cristal   — disonante
        [0, 6, 4, 6]    // 7 vacío     — sin resolver
    ];
    const BOSS_PROG = [0, 1, 0, 6];   // tenso y repetitivo
    // Patrón de bajo (16 pasos), notas en octava baja
    const BASS = [0,0,3,3,4,4,3,3, 0,0,5,5,4,4,0,0];
    const BOSS_BASS = [0,0,0,1, 0,0,0,1, 3,3,3,4, 3,3,1,1];
    let bossMode = false;

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
            musicGain = ctx.createGain(); musicGain.gain.value = mVol * 0.25; musicGain.connect(master);
            sfxGain = ctx.createGain(); sfxGain.gain.value = sVol; sfxGain.connect(master);
        } catch (e) { enabled = false; }
    }

    function beep(freq, dur, type, gainNode, vol, when) {
        if (!ctx || !enabled) return;
        const t = when || ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(gainNode || sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
    }

    function noise(dur, vol) {
        if (!ctx || !enabled) return;
        const n = Math.floor(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain(); g.gain.value = vol || 0.2;
        src.connect(g); g.connect(sfxGain); src.start();
    }

    // ===== Loop musical =====
    const bpmNow = () => bossMode ? 152 : 132;
    function tick() {
        if (!ctx || !enabled) return;
        const prog = bossMode ? BOSS_PROG : PROG[chapter % PROG.length];
        const bass = bossMode ? BOSS_BASS : BASS;
        const chord = prog[Math.floor(step / 4) % prog.length];
        const spb = 60 / bpmNow() / 2; // 8th notes
        const t = ctx.currentTime;

        // Bajo
        const bn = bass[step % 16];
        beep(SCALE[bn] / 2, spb * 0.9, bossMode ? 'sawtooth' : 'triangle', musicGain, bossMode ? 0.6 : 0.5, t);

        // Melodía (pentatónica sobre el acorde) cada 2 pasos
        if (step % 2 === 0) {
            const idx = (chord + [0, 2, 4, 2, 1, 3][Math.floor(step / 2) % 6]) % SCALE.length;
            beep(SCALE[idx] * 2, spb * 1.4, 'square', musicGain, bossMode ? 0.22 : 0.18, t);
        }
        // Arpegio suave
        if (step % 4 === 2) {
            beep(SCALE[(chord + 2) % SCALE.length] * 1.5, spb * 0.8, 'sine', musicGain, 0.1, t);
        }
        // Hi-hat (doble en modo jefe: sube la tensión sin cambiar la melodía)
        if (step % 2 === 1) noise(0.04, 0.06);
        if (bossMode && step % 2 === 0) noise(0.03, 0.035);
        // Kick cada 4 (cada 2 en modo jefe)
        if (step % (bossMode ? 2 : 4) === 0) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.setValueAtTime(120, t);
            o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
            g.gain.setValueAtTime(bossMode ? 0.5 : 0.4, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.16);
        }
        step = (step + 1) % 16;
    }

    function restartLoop() {
        if (!loopId) return;
        clearInterval(loopId);
        loopId = setInterval(tick, 60000 / bpmNow() / 2);
    }
    function startMusic() {
        init();
        if (!ctx || loopId) return;
        if (ctx.state === 'suspended') ctx.resume();
        loopId = setInterval(tick, 60000 / bpmNow() / 2);
    }
    function stopMusic() { if (loopId) { clearInterval(loopId); loopId = null; } }
    function setChapter(c) { chapter = Math.max(0, c | 0); step = 0; }
    // L28: la pelea contra un jefe cambia de tema (más rápido, bajo saw, kick doble)
    function setBossMode(v) {
        v = !!v;
        if (v === bossMode) return;
        bossMode = v; step = 0;
        restartLoop();
    }

    // ===== SFX =====
    const SFX = {
        hit()    { beep(180 + Math.random()*40, 0.07, 'square', sfxGain, 0.25); },
        crit()   { beep(660, 0.06, 'square', sfxGain, 0.3); beep(990, 0.09, 'square', sfxGain, 0.25, ctx && ctx.currentTime + 0.05); },
        coin()   { beep(880, 0.06, 'square', sfxGain, 0.2); beep(1320, 0.1, 'square', sfxGain, 0.2, ctx && ctx.currentTime + 0.06); },
        levelup(){ [523, 659, 784, 1047].forEach((f,i)=> beep(f, 0.12, 'square', sfxGain, 0.25, ctx && ctx.currentTime + i*0.08)); },
        boss()   { beep(110, 0.25, 'sawtooth', sfxGain, 0.35); beep(82, 0.3, 'sawtooth', sfxGain, 0.3, ctx && ctx.currentTime + 0.1); },
        death()  { [440, 330, 220, 110].forEach((f,i)=> beep(f, 0.18, 'sawtooth', sfxGain, 0.3, ctx && ctx.currentTime + i*0.12)); },
        venom()  { noise(0.18, 0.18); beep(300, 0.15, 'sawtooth', sfxGain, 0.15); },
        click()  { beep(700, 0.04, 'square', sfxGain, 0.15); },
        buy()    { beep(600, 0.05, 'square', sfxGain, 0.2); beep(900, 0.08, 'square', sfxGain, 0.2, ctx && ctx.currentTime + 0.05); },
        ult()    { [392,523,659,784].forEach((f,i)=> beep(f, 0.1, 'square', sfxGain, 0.3, ctx && ctx.currentTime + i*0.06)); noise(0.2, 0.15); },
        // L28
        shield() { [880,1174,1568].forEach((f,i)=> beep(f, 0.07, 'square', sfxGain, 0.22, ctx && ctx.currentTime + i*0.04)); },
        zone()   { [262,330,392,523,659].forEach((f,i)=> beep(f, 0.16, 'triangle', musicGain, 0.32, ctx && ctx.currentTime + i*0.11)); },
        relic()  { [523,784,1047,1568].forEach((f,i)=> beep(f, 0.18, 'sine', sfxGain, 0.28, ctx && ctx.currentTime + i*0.1)); noise(0.25, 0.1); },
        page()   { beep(520, 0.03, 'square', sfxGain, 0.1); beep(660, 0.04, 'square', sfxGain, 0.08, ctx && ctx.currentTime + 0.03); },
    };

    return {
        init, startMusic, stopMusic, setChapter, setBossMode, SFX,
        get enabled() { return enabled; },
        setEnabled(v) { enabled = v; if (!v) stopMusic(); else startMusic(); saveSettings(); },
        setMusicVol(v) { mVol = v; if (musicGain) musicGain.gain.value = v * 0.25; saveSettings(); },
        setSfxVol(v) { sVol = v; if (sfxGain) sfxGain.gain.value = v; saveSettings(); },
        get vols() { return { m: mVol, s: sVol }; }
    };
})();