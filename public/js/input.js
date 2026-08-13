// Teclado, chat y joystick táctil
window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter' && !isMobile) { document.getElementById('chatInput').focus(); e.preventDefault(); return; }
    const map = { '1':'dash', '2':'shield', '3':'magnet', '4':'poison', ' ':'dash' };
    if (map[e.key]) { useAbility(map[e.key]); e.preventDefault(); }
});

const chatInput = document.getElementById('chatInput');
chatInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') {
        if (chatInput.value.trim()) socket.emit('chatMessage', chatInput.value.trim());
        chatInput.value = ''; chatInput.blur();
    }
    if (e.key === 'Escape') chatInput.blur();
});

// ===== Joystick virtual =====
const joyZone = document.getElementById('joyZone');
const joyBase = document.getElementById('joyBase');
const joyKnob = document.getElementById('joyKnob');
let joyId = null, joyCX = 0, joyCY = 0;

joyZone.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyCX = t.clientX; joyCY = t.clientY;
    joyBase.style.left = joyCX + 'px'; joyBase.style.top = joyCY + 'px';
    joyKnob.style.left = joyCX + 'px'; joyKnob.style.top = joyCY + 'px';
    joyBase.style.display = 'block'; joyKnob.style.display = 'block';
    G.joyActive = true;
}, { passive:false });

joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        let dx = t.clientX - joyCX, dy = t.clientY - joyCY;
        const max = 45, d = Math.hypot(dx, dy);
        if (d > max) { dx = dx/d*max; dy = dy/d*max; }
        joyKnob.style.left = (joyCX + dx) + 'px';
        joyKnob.style.top  = (joyCY + dy) + 'px';
        if (d > 8) {
            G.joyVec = { x: dx/max, y: dy/max };
            G.joyUsed = true;   // desbloquea el movimiento
        }
    }
}, { passive:false });

function joyEnd(e) {
    for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
            joyId = null; G.joyActive = false;
            joyBase.style.display = 'none'; joyKnob.style.display = 'none';
        }
    }
}
joyZone.addEventListener('touchend', joyEnd);
joyZone.addEventListener('touchcancel', joyEnd);