'use strict';
/* FIX: guarda contra doble montaje del juego (causa del "Texture key already in use") */
if (!window.__LE100_GAME__) {
    prepareAll().then(() => {
        window.__LE100_GAME__ = new Phaser.Game({
            type: Phaser.AUTO,
            parent: 'battleWrap',
            pixelArt: true,
            backgroundColor: '#151030',
            scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
            scene: [BootScene, BattleScene],
            fps: { target: 60 }
        });
    }).catch(e => console.error('❌ prepareAll:', e));
}