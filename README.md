# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile, con cuentas online, ranking en vivo,
Arena PvP, **Gremios** (roles/banco/raid/chat/ranking), escuadrón de compañeros,
mascota, prestigio (ADN), mapa con rangos, **3 capas de eventos**, **Battle Pass**,
equipo profundo, arquitectura modular (SRP) y HUD adaptativo con HUB mobile.

- **Versión:** 4.3.0 · **Stack:** Node+Express+Socket.IO (Mongo opcional) · JS vanilla + Phaser 3 + WebAudio
- **Estado:** jugable de punta a punta · Arte 33/33 · Core+Game modulares · **Deudas #1–#16 ✅**

> 📌 Reglas: cambio → archivo completo · datos de balance → `data.js` ·
> lógica nueva → módulo propio · nunca re-declarar consts (TDZ) ·
> DOM touchers → guardias `if (!el) return;` · net.js autodetecta Live Server.

---

## 🚀 Quick start
```bash
npm install
node dev.js        # → http://localhost:3000 (DEV + live-reload)
# O Live Server (5500) + `node dev.js` en otra terminal (net.js autodetecta)
MONGO_URI=mongodb://... node server.js   # persistencia real
```

---

## 📁 Árbol (resumen)
```
server/
├── data/    storage · sanitize · power
├── auth/    auth (register/login/loginToken) · ranking
├── economy/ arena · weekly
└── social/  colonies (DEPRECADA L25) · guilds (L24+25)
public/
├── css/     01-base · 02-layout · 03-components · 04-features · 05-mobile
└── js/
    ├── core/   config · data · store · gear · events · season · progression · formulas · net · assets · audio
    ├── game/   anims · boot-scene · vfx · battle-state · squad · enemies · battle-update · battle-scene · icons · main
    ├── ui/     system/ (ui, ui-auth, ui-hud, ui-hub, ui-stats) · panels/ (gear, autoequip, shop, look, map, weekly, battlepass, events, missions)
    ├── modes/  sim · daily · tower · rogue
    └── social/ social (Arena) · guilds-ui
```

### Orden de scripts (crítico)
```
config → data → assets → audio → net → store → gear → events → season → progression → formulas
ui/system/ui → game/(anims→boot-scene→vfx→battle-state→squad→enemies→battle-update→battle-scene)
ui/system/ui-hud → ui/panels/* → ui/system/ui-hub,ui-stats
modes/* → social/social → social/guilds-ui → ui/system/ui-auth → game/main
```

---

## 🛡️ Gremios (L24+25) — sistema social único

| Sistema | Detalle |
|---|---|
| Fundar | 100K 🪙 · nombre 3-16 + tag 2-4 · creador = líder |
| Roles | líder(3) > oficial(2) > miembro(1) · kick jerárquico |
| Banco | donaciones → +1 XP c/100 🪙 |
| Nivel | `xpNeed = 500·l²` (máx 50) |
| **Bonus pasivo** | **+2% daño por nivel** (server envía `bonusPct`; cliente sincroniza `S.colonyLevel` → `dps()` sin tocar fórmulas) |
| Raid diaria | HP = 100K·nivel·(1+miembros·0.05) · golpe c/20s escalado por récord · recompensa por contribución |
| Cofre diario | 2000·nivel 🪙 + 1🧬 si nivel ≥10 (dot en 🛡️) |
| Chat | sala socket por gremio · últimas 50 |
| Ranking | `guildTop` top 20 por XP |
| **Migración (L25)** | al fundar, el `colonyLevel` del líder es el piso del gremio |

**Colonias: DEPRECADAS.** UI retirada (botón 🐜 y modal borrados, HUB filtrado en runtime).
`server/social/colonies.js` y campos `colony/colonyLevel` quedan por compatibilidad de saves.

---

## ⚔️ Sistemas clave (resumen)

- **Combate:** etapas infinitas · jefe c/5 (30s) · capítulos c/10 (fondo+música) · escuadrón dps/archer/mage + mascota.
- **Rangos:** S/A/B/C/R + mapa + skipToRecord + bonus pasivo.
- **Eventos 3 capas:** diario (calendario 7 días) + semanal (6 rotativos) + relámpago (5 min c/45-90 min).
- **Battle Pass:** 30 días · 50 niveles · premium 50🧬 (+50% XP, skins, título).
- **Equipo 2.0:** esencia/amuletos/forja/rotura/mochila/auto-fundir/bloqueo.
- **QoL:** x1/x10/MAX + mantenido · atajos Espacio/M/E/P · offline con tiempo · toasts tope 4.

### Fórmulas espejo cliente/servidor
```
dps = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(gremioNv−1))
      · (1+.05·shopFury) · evFuria · flashMult('dano')
goldKill = ⌈3·1.18^st⌉ · fortuna · adnMult · shopFort · evFiebre · dayOro · flashOro
```

---

## 📡 Protocolo Socket.IO (agregados L24)
`guildInfo/Top/Create/Join/Leave/Kick/Donate/RaidHit/Chest/Chat` (C→S) ·
`guildUpdate/guildChat` (S→C broadcast por sala `guild:<key>`).

---

## 🔧 Deuda técnica
| # | Estado |
|---|---|
| 1–9 | ✅ (assets paralelo, arena 1 lectura, colony bulk, resets únicos, sim.js, index, HOOKS, token, onGearOpen) |
| 10 atlas unificado | ⏳ baja |
| 11 prototipo Godot | ⏳ media |
| 12 CSS monolítico | ✅ 5 archivos (L16) |
| 13 store monolito | ✅ 7 módulos (L21) |
| 14 battle monolito | ✅ 8 módulos (L22) |
| 15 carpetas planas | ✅ reorganizadas (L23) |
| 16 colonias+gremios duplicados | ✅ unificados (L25) |

---

## 🗺️ Roadmap
1–5 ✅ (consolidación · profundización · UI/UX · expansión fase 1 · arquitectura + gremios)
6. **Fase 2:** 1) 🎮 Prototipo Godot · 2) 🦸 Más compañeros + overlays ← **ÚLTIMO**.

---

## 📝 CHANGELOG (extracto)
| Fecha | Lote | Cambio |
|---|---|---|
| 2026-08-21 | L17–L23 | relámpago · battle pass · calendario · fixes look/TAU/W/H · refactor core (7) · refactor game (8) · reorganización carpetas + auth módulo + net autodetección |
| 2026-08-22 | L24 | 🛡️ Gremios: roles, banco, raid diaria, cofre, chat, ranking (server-authoritative) |
| 2026-08-22 | L25 | 🔀 Unificación colonia→gremio: bonus +2%/nivel vía sync `colonyLevel` · migración al fundar · UI colonias retirada |
| 2026-08-22 | README | 📝 v4.3.0 |

---

## 🤝 Metodología
Archivo completo por cambio · divide y vencerás · CHANGELOG siempre ·
datos en `data.js` · guardias DOM · sin re-declaraciones · icons.js dinámico ·
socket autodetección.