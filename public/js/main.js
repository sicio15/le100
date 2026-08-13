'use strict';
let lastT = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (W === 0) fit();
    update(dt);
    draw();
    uiTick();
}
requestAnimationFrame(loop);