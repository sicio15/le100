'use strict';
/* Phaser maneja el loop: BootScene → BattleScene */
const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'battleWrap',
    pixelArt: true,
    backgroundColor: '#151030',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [BootScene, BattleScene],
    fps: { target: 60 }
});