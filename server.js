const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const scores = new Map();
const top = () => [...scores.values()].sort((a, b) => b.stage - a.stage).slice(0, 10);

io.on('connection', (s) => {
    s.on('score', (d) => {
        scores.set(s.id, { name: String(d.name || 'Anónimo').slice(0, 14), stage: Math.min(9999, +d.stage || 1) });
        io.emit('top', top());
    });
    s.on('disconnect', () => { scores.delete(s.id); io.emit('top', top()); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 le100.io idle corriendo en ${PORT}`));