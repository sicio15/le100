# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile, con **8 zonas narradas**, **8 Jefes de Zona**
con mecánicas propias, **códice/bestiario**, **reliquias**, habilidades activas, afijos de
enemigo, cuentas online, ranking en vivo, Arena PvP, **Gremios**, escuadrón de compañeros,
prestigio (ADN), **3 capas de eventos**, **Battle Pass** y equipo profundo.

- **Versión:** 6.0.0 · **Stack:** Node+Express+Socket.IO (Mongo opcional) · JS vanilla + Phaser 3 + WebAudio
- **Estado:** jugable de punta a punta · Core+Game modulares · **Deudas #1–#16 ✅**

> 📌 Reglas: cambio → archivo completo · datos de balance → `data.js` · narrativa → `lore.js` ·
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
├── css/     01-base (tokens) · 02-layout · 03-components · 04-features · 06-hud · 07-lore · 05-mobile
└── js/
    ├── core/   config (ZONES) · data · lore · codex · store · gear · events · season ·
    │           progression · formulas · net · assets · audio
    ├── game/   anims · boot-scene · vfx · battle-state · affixes · bosses · skills · squad ·
    │           enemies · battle-update · ambience · battle-scene · tap · icons · main
    ├── ui/     system/ (ui, ui-fx, ui-hud, ui-dialogue, ui-skills, ui-hub, ui-stats, ui-auth) ·
    │           panels/ (codex, gear, autoequip, shop, look, map, weekly, battlepass, events, missions)
    ├── modes/  sim · daily · tower · rogue
    └── social/ social (Arena) · guilds-ui
```

### Orden de scripts (crítico)
```
config → data → lore → codex → assets → audio → net → store → gear → events → season →
progression → formulas → ui/system/ui → ui/system/ui-fx
game/(anims → boot-scene → vfx → battle-state → affixes → bosses → skills → squad →
      enemies → battle-update → ambience → battle-scene → tap)
ui/system/ui-hud → ui-dialogue → ui-skills → ui/panels/* → ui/system/ui-hub,ui-stats
modes/* → social/social → social/guilds-ui → ui/system/ui-auth → game/main
```
`lore.js`/`codex.js` van **antes** de `store.js` (lo normaliza al cargar el save).
`css/07-lore.css` va **antes** de `05-mobile.css` (mobile es la última palabra).

---

## 🗺️ Lote 28 — el mundo

### 8 zonas con identidad propia (`core/config.js` → `ZONES`)
Cada zona tiene fondo, clima, progresión musical, color, Jefe de Zona y lore.

| # | Zona | Etapas | Jefe de Zona | Reliquia |
|---|---|---|---|---|
| 1 | Bosque de los Inicios | 1–10 | 🪲 Escarabajo Ancestral | 🪵 Corteza Viva · +12% vida |
| 2 | Cuevas del Eco | 11–20 | 🕷️ Tejedora del Eco | 🔔 Eco Fósil · +10% daño |
| 3 | Pantano de Niebla | 21–30 | 🐝 Avispa Reina | 🧪 Bilis Real · +30% veneno |
| 4 | Torre del Rey Bestia | 31–40 | 👑 Rey Bestia | 👑 Corona Astillada · +20% oro |
| 5 | Sotobosque Profundo | 41–50 | 🦂 Escorpión de Obsidiana | 🖤 Aguijón Negro · +15% daño crít. |
| 6 | Jardín Calcinado | 51–60 | 🔥 Rey de Cenizas | 🔥 Brasa Eterna · +12% daño y +10% oro |
| 7 | Abismo de Cristal | 61–70 | 💎 Tejedora Prismática | 🔮 Prisma Roto · +8% crítico |
| 8 | Más allá del Mapa | 71+ | 🕳️ El Vacío que Repta | 🗺️ Borde del Mapa · +20% daño y vida |

Los 8 jefes salen del arte que ya existía: cuatro son bichos gigantes (escarabajo, araña,
avispa, escorpión) y cuatro usan el sprite del Rey Bestia con tinte, escala y nombre propios.

### Diálogos y cinemáticas (`ui/system/ui-dialogue.js`)
- **Al cruzar de zona (cada 10 etapas):** barrido de pantalla → cartel de zona → conversación.
- **Al encontrar al Jefe de Zona:** su presentación, una vez por partida, con barras de cine.
- **Al derrotarlo:** su despedida y la reliquia.
- **En combate:** frases sueltas (*barks*) al cambiar de fase, sin congelar la pelea.
- **Retratos** recortados del primer frame de las strips que `assets.js` ya procesa: pixel art
  real, cero assets nuevos.
- Máquina de escribir, `Espacio`/click para acelerar, `Esc` para saltar, **auto-avance a los
  5,2 s** para que un jugador AFK nunca quede trabado, y un interruptor de cinemáticas en ⚙️.

### Mecánicas de jefe (`game/bosses.js`)
| | Habilidad | Qué hace |
|---|---|---|
| 🔆 | Caparazón | Escudo que absorbe daño y se rearma en cada fase |
| 🐛 | Llamada | Invoca esbirros al cambiar de fase |
| 💢 | Embate | Telegrafía un círculo en el suelo y pega a TODO el escuadrón |
| 🩸 | Drenaje | Se cura con el daño que reparte |
| 🌑 | Maldición | Recorta tu daño un 35% durante 6 s |
| ✳️ | Andanada | Proyectiles que viajan hacia héroes al azar |
| 💨 | Agonía | Ataca más rápido cuanta menos vida le queda |
| 🪞 | Espinas | Te devuelve el 5% del daño (con tope del 4% de vida por golpe) |

Cada jefe lleva de 2 a 5, y suma las fases del L27 (60% y 30% de vida).
Las etapas `%5` que no son `%10` traen un **mini-jefe**: el Guardián de la criatura de esa
zona, más chico y con una sola habilidad.

### Códice (`core/codex.js` + `ui/panels/ui-codex.js`)
Cuatro pestañas — **Zonas, Bestiario, Jefes, Reliquias** — donde el lore es progresión:
cada ficha da hasta ★★★ (25/100/500 kills para bichos, 1/5/25 victorias para jefes) y
**cada estrella suma +0,5% de daño permanente** (hasta +18%). Las reliquias son un bonus
pasivo garantizado la primera vez que matás a cada Jefe de Zona, y **sobreviven al prestigio**.

### Y además
- **Música por zona**: 8 progresiones distintas (antes había 3 en bucle) + **tema de jefe**
  (más rápido, bajo saw, kick doble) que entra y sale solo al empezar y terminar la pelea.
- **Clima nuevo**: esporas del sotobosque y esquirlas del abismo, además de hojas, goteo,
  burbujas, brasas y motas del vacío.
- **Mezcla de bichos por zona**: cada una tiene su fauna (antes se repetían los 4 desde la
  etapa 31 y el bestiario no significaba nada).
- **Mapa rehecho**: cada bloque de 10 etapas es una zona con nombre, color, jefe, reliquia y
  marcas 🛡️/👑 en las etapas de pelea grande.
- **Misiones nuevas**: derrotar un jefe, usar 5 habilidades, matar 3 enemigos con afijo.
- **Logros nuevos**: primer jefe, 4 jefes, todos los jefes, 3 reliquias, 50% del bestiario.
- **Portales de aparición**, proyectiles con estela y telegrafías en el suelo.

---

## ✨ Lote 27 — habilidades, afijos y HUD

### Habilidades activas (`game/skills.js`)
| Tecla | Habilidad | Desbloqueo | CD | Efecto |
|---|---|---|---|---|
| `1` | 💥 Golpe Sísmico | Etapa 3 | 12s | `(5+2·Nv)×` tu daño a **todos** los enemigos |
| `2` | ⚡ Frenesí | Etapa 8 | 26s | 8s: ataque ×2 y `+15+3·Nv`% de crítico |
| `3` | 🛡️ Égida | Etapa 15 | 34s | Cura `25+5·Nv`% y ×0.4 al daño recibido por 7s |

Se suben con oro (`1200·2.35^Nv`, máx Nv 10) · **auto-cast** opcional que las lanza cuando
conviene, no en cuanto salen del CD.

### Afijos de enemigo (`game/affixes.js`)
Desde la etapa 6, 16% de los spawns (y **todos** los élites): 🛡 **Acorazado** ·
💨 **Veloz** · 🩸 **Vampírico** · 💣 **Volátil**.

### HUD
Anillo de progreso al jefe, nombre de zona, contadores animados con oro/segundo real,
**menú ☰ único** para escritorio y mobile, marco del jefe, combo con escalones, píldoras de
buff, barra de habilidades con barrido de CD, tarjetas de mejora con `+X daño` y precio real
del modo x1/x10/MAX, tooltips y toasts tipados.

---

## 🛡️ Gremios (L24+25)

| Sistema | Detalle |
|---|---|
| Fundar | 100K 🪙 · nombre 3-16 + tag 2-4 · creador = líder |
| Roles | líder(3) > oficial(2) > miembro(1) · kick jerárquico |
| Banco | donaciones → +1 XP c/100 🪙 |
| Nivel | `xpNeed = 500·l²` (máx 50) · **+2% daño por nivel** |
| Raid diaria | HP = 100K·nivel·(1+miembros·0.05) · recompensa por contribución |
| Cofre diario | 2000·nivel 🪙 + 1🧬 si nivel ≥10 |
| Chat + Ranking | sala socket por gremio · top 20 por XP |

**Colonias: DEPRECADAS.** `server/social/colonies.js` y los campos `colony/colonyLevel`
quedan sólo por compatibilidad de saves.

---

## ⚔️ Fórmulas espejo cliente/servidor
```
dps = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(gremioNv−1)) · (1+.05·shopFury)
      · evFuria · flashMult('dano') · rangos · códice · reliquias
liveDps  = dps · combo · maldición          (los modos idle usan dps puro)
crit     = min(.85, .2 + equipo + tienda + evPrecisión + Frenesí + reliquias)
goldKill = ⌈3·1.18^st · fortuna · adnMult · shopFort · evFiebre · dayOro · flashOro · reliquias⌉ · afijo
códice   = 1 + 0.005·estrellas        (tope +18%)
```

---

## ⌨️ Atajos
`1` `2` `3` habilidades · `Espacio` golpe manual (o avanzar diálogo) · `Tab` menú ·
`Q` cantidad de compra · `Esc` cerrar panel / saltar cinemática ·
`X` códice · `M` mapa · `E` equipo · `H` habilidades · `P` prestigio · `T` torre ·
`R` sotobosque · `A` arena · `D` diario · `S` tienda · `C` misiones · `B` pase ·
`G` gremio · `L` ranking · `V` stats · `O` ajustes.

---

## 📡 Protocolo Socket.IO
`guildInfo/Top/Create/Join/Leave/Kick/Donate/RaidHit/Chest/Chat` (C→S) ·
`guildUpdate/guildChat` (S→C por sala `guild:<key>`) ·
`register/login/loginToken/saveGame/score` · `top` (S→C).

El sanitizer valida `skills`, `skillAuto`, `codex` (bestiario, jefes, zonas, lore, reliquias)
y las `stats` nuevas. **Si agregás una zona o un jefe, hay que sumar su id a las listas
`CODEX_*` de `server/data/sanitize.js`**, o el cliente lo pierde en cada round-trip.

---

## 🔧 Deuda técnica
| # | Estado |
|---|---|
| 1–9 | ✅ |
| 10 atlas unificado | ⏳ baja |
| 11 prototipo Godot | ⏳ media |
| 12 CSS monolítico | ✅ 7 archivos |
| 13 store monolito | ✅ 7 módulos (L21) |
| 14 battle monolito | ✅ 13 módulos (L22+L27+L28) |
| 15 carpetas planas | ✅ reorganizadas (L23) |
| 16 colonias+gremios duplicados | ✅ unificados (L25) |
| 17 archivos muertos | ⏳ `public/css/01-features.css` y `public/js/game/phaser-setup.js` no los carga nadie; `phaser-setup.js` re-declara `ANIM_DEFS`, así que **no** debe añadirse al index |
| 18 ids duplicados cliente/servidor | ⏳ `CODEX_*` en `sanitize.js` son copia manual de `lore.js` |

---

## 📝 CHANGELOG (extracto)
| Fecha | Lote | Cambio |
|---|---|---|
| 2026-08-21 | L17–L23 | relámpago · battle pass · calendario · refactor core (7) · refactor game (8) · reorganización de carpetas |
| 2026-08-22 | L24–L25 | 🛡️ Gremios + unificación colonia→gremio |
| 2026-08-22 | L26 | 👊 golpe manual · 🔥 combo · ✨ élites · 👑 furia del jefe · 📊 stats · gestor de modales |
| 2026-09-10 | L27 | ✨ habilidades activas · 🩸 afijos · 👑 fases de jefe · 🌦️ ambiente por capítulo · 🎨 rediseño de HUD/UI · 💥 VFX nuevos |
| 2026-09-10 | **L28** | 🗺️ **8 zonas con lore** · 👑 **8 Jefes de Zona + mini-jefes** · 💬 **diálogos y cinemáticas** · 📖 **códice/bestiario con daño permanente** · 🏺 **reliquias** · 🎵 **música por zona + tema de jefe** · 🗺️ **mapa rehecho** |

### Fixes del L28
- **El códice no registraba nada** en una partida nueva: `loadCache()` devolvía el `DEF` sin
  normalizar, así que `id in c.bosses` era falso siempre. Ahora se normaliza al crear el save
  y `codex()` se autorepara (agregar zonas o jefes tampoco romperá saves viejos).
- Las **Espinas** escalaban con TU daño sin tope: cuanto más fuerte te hacías, más te mataban
  ellas solas. Ahora tienen tope del 4% de vida por golpe.
- El **Embate** mataba de un golpe a dos héroes de tres (2.6 → 1.7 ×eDmg).
- Los toasts aterrizaban justo encima del nombre del jefe y de los títulos de los paneles.
- `Press Start 2P` no tiene mayúsculas acentuadas: "VACÍO" mezclaba dos fuentes en la misma
  palabra. `pixelUpper()` quita las tildes de los títulos en fuente pixel.

### Fixes del L27
- `server/economy/arena.js` y `server/social/colonies.js` requerían `./storage` y `./power`
  en vez de `../data/…`: **el servidor no arrancaba** desde la reorganización del L23.
- `img/boss_idle.png`, `boss_attack.png` y `boss_roar.png` existían desde el L8 pero no
  estaban en `SHEETS` de `assets.js` → el jefe usaba el fallback de 1 frame.
- El botón de mejora mostraba el precio de **un** nivel aunque el modo fuese x10/MAX.
- En etapa de jefe, matar un esbirro invocado cerraba la etapa (`killsNeed()===1`).
- El tutorial se posicionaba con `W`/`H` (0 hasta el primer frame de Phaser).

---

## 🗺️ Roadmap
1–5 ✅ · 6 ✅ (L26 profundidad) · 7 ✅ (L27 agencia) · 8 ✅ (L28 mundo y narrativa)
9. **Fase 4:** 1) 🧩 árbol de talentos por héroe · 2) 🦸 cuarto compañero con habilidad propia ·
   3) 🎭 eventos narrativos aleatorios entre etapas · 4) 🗂️ atlas unificado (deuda #10) ·
   5) 🎮 prototipo Godot.

---

## 🤝 Metodología
Archivo completo por cambio · divide y vencerás · CHANGELOG siempre ·
balance en `data.js` · narrativa en `lore.js` · guardias DOM · sin re-declaraciones ·
icons.js dinámico · socket autodetección.
