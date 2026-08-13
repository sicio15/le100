// Conexión con el servidor
const socket = io();

socket.on('init', d => {
    G.myId = d.playerId;
    G.foods = d.foods;
    G.worldSize = d.worldSize;
});

socket.on('playerJoined', p => {
    if (p.id !== G.myId) { remotesAdd(p); toast(`📥 ${p.name} entró`); }
});
socket.on('playerLeft', id => {
    const r = G.remotes.get(id);
    if (r) toast(`📤 ${r.name} salió`);
    G.remotes.delete(id);
});

socket.on('gameState', d => {
    G.foods = d.foods;
    d.players.forEach(p => {
        if (p.id === G.myId) return;
        if (G.remotes.has(p.id)) G.remotes.get(p.id).sync(p);
        else remotesAdd(p);
    });
});
function remotesAdd(p) { G.remotes.set(p.id, new Remote(p)); }

socket.on('foodEaten', d => {
    const f = G.foods.find(x => x.id === d.foodId);
    if (f) { burst(f.x, f.y, foodColor(f), 10); G.foods = G.foods.filter(x => x.id !== d.foodId); }
});
socket.on('foodUpdate', f => { G.foods = f; });

socket.on('playerDied', d => {
    const r = G.remotes.get(d.id);
    const segs = d.segments || (r && r.segments) || [];
    if (segs[0]) burst(segs[0].x, segs[0].y, r ? `hsl(${r.hue},85%,60%)` : '#fff', 40);
    if (r) toast(`💀 ${r.name} murió`);
});

socket.on('respawned', d => {
    resetMe(d.x, d.y);
    G.state = 'playing';
    document.getElementById('death').style.display = 'none';
    toast('✨ ¡Renaciste!');
});

socket.on('chatMessage', d => addChat(`${d.name}: ${d.message}`, '#fff'));