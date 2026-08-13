const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// Estado del servidor
const WORLD_SIZE = 5000;
const TICK_RATE = 30; // Actualizaciones por segundo
const players = new Map();
let foods = [];
let foodIdCounter = 0;

// Generar comida inicial
function spawnInitialFood() {
    for (let i = 0; i < 500; i++) {
        foods.push({
            id: foodIdCounter++,
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            type: Math.random() < 0.1 ? 'big' : Math.random() < 0.3 ? 'special' : 'normal'
        });
    }
}
spawnInitialFood();

// Respawnear comida periódicamente
setInterval(() => {
    if (foods.length < 600) {
        for (let i = 0; i < 10; i++) {
            foods.push({
                id: foodIdCounter++,
                x: Math.random() * WORLD_SIZE,
                y: Math.random() * WORLD_SIZE,
                type: Math.random() < 0.05 ? 'big' : Math.random() < 0.2 ? 'special' : 'normal'
            });
        }
        io.emit('foodUpdate', foods);
    }
}, 3000);

io.on('connection', (socket) => {
    console.log(`🎮 Jugador conectado: ${socket.id}`);

    // Unirse al juego
    socket.on('joinGame', (data) => {
        const player = {
            id: socket.id,
            name: data.name || 'Anónimo',
            color: data.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            angle: 0,
            segments: [{ x: 0, y: 0 }],
            maxSegments: 10,
            score: 10,
            alive: true,
            abilities: {
                dash: { cooldown: 0, active: 0 },
                shield: { cooldown: 0, active: 0 },
                magnet: { cooldown: 0, active: 0 },
                poison: { cooldown: 0, active: 0 }
            }
        };
        players.set(socket.id, player);

        // Enviar estado inicial al cliente
        socket.emit('init', {
            playerId: socket.id,
            foods: foods,
            worldSize: WORLD_SIZE
        });

        // Avisar a los demás
        socket.broadcast.emit('playerJoined', player);
    });

    // Movimiento y estado del jugador
    socket.on('updatePlayer', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.alive) return;

        player.x = data.x;
        player.y = data.y;
        player.angle = data.angle;
        player.segments = data.segments;
        player.maxSegments = data.maxSegments;
        player.score = data.score;
        player.abilities = data.abilities;
    });

    // Usar habilidad
    socket.on('useAbility', (ability) => {
        const player = players.get(socket.id);
        if (!player || !player.alive) return;

        if (player.abilities[ability] && player.abilities[ability].cooldown === 0) {
            const durations = { dash: 60, shield: 180, magnet: 300, poison: 300 };
            const cooldowns = { dash: 180, shield: 300, magnet: 420, poison: 600 };
            
            player.abilities[ability].active = durations[ability];
            player.abilities[ability].cooldown = cooldowns[ability];
            
            // Notificar a todos del rastro de veneno
            if (ability === 'poison') {
                io.emit('poisonTrail', {
                    playerId: socket.id,
                    segments: player.segments.slice(0, 5)
                });
            }
        }
    });

    // Colisión con comida
    socket.on('eatFood', (foodId) => {
        const index = foods.findIndex(f => f.id === foodId);
        if (index !== -1) {
            const food = foods[index];
            foods.splice(index, 1);
            io.emit('foodEaten', { foodId, playerId: socket.id });
        }
    });

    // Muerte del jugador
    socket.on('playerDied', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.alive = false;
            io.emit('playerDied', {
                id: socket.id,
                killedBy: data.killedBy,
                segments: player.segments
            });

            // Respawnear después de 5 segundos
            setTimeout(() => {
                if (players.has(socket.id)) {
                    player.alive = true;
                    player.x = Math.random() * WORLD_SIZE;
                    player.y = Math.random() * WORLD_SIZE;
                    player.maxSegments = 10;
                    player.score = 10;
                    player.segments = [{ x: 0, y: 0 }];
                    socket.emit('respawned', {
                        x: player.x,
                        y: player.y
                    });
                }
            }, 5000);
        }
    });

    // Chat simple
    socket.on('chatMessage', (msg) => {
        const player = players.get(socket.id);
        io.emit('chatMessage', {
            name: player ? player.name : '???',
            message: msg
        });
    });

    // Desconexión
    socket.on('disconnect', () => {
        console.log(`❌ Jugador desconectado: ${socket.id}`);
        players.delete(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

// Game loop del servidor - Sincronizar estados
setInterval(() => {
    // Actualizar cooldowns de habilidades de todos los jugadores
    players.forEach(player => {
        Object.keys(player.abilities).forEach(ability => {
            if (player.abilities[ability].cooldown > 0) player.abilities[ability].cooldown--;
            if (player.abilities[ability].active > 0) player.abilities[ability].active--;
        });
    });

    // Enviar estado actualizado a todos
    const playersData = Array.from(players.values());
    io.emit('gameState', {
        players: playersData,
        foods: foods
    });
}, 1000 / TICK_RATE);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor le100.io corriendo en puerto ${PORT}`);
});