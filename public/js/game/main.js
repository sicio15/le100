'use strict';
if (!window.LE100_GAME) {
  const loadScript = src => new Promise(res => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = res;
    document.head.appendChild(s);
  });
  // relativo a la PÁGINA (no a este archivo): icons.js vive en js/game/
  loadScript('js/game/icons.js').then(() => Promise.all([
    prepareAll(),
    typeof prepareIcons === 'function' ? prepareIcons() : null
  ])).then(() => {
    window.LE100_GAME = new Phaser.Game({
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