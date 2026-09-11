# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile, con cuentas online, ranking en vivo,
Arena PvP, **Gremios** (roles/banco/raid/chat/ranking), escuadrón de compañeros,
mascota, prestigio (ADN), mapa con rangos, **3 capas de eventos**, **Battle Pass**,
equipo profundo, **habilidades activas**, **afijos de enemigo**, **jefes por fases**
y un HUD adaptativo con menú único para escritorio y mobile.

- **Versión:** 5.0.0 · **Stack:** Node+Express+Socket.IO (Mongo opcional) · JS vanilla + Phaser 3 + WebAudio
- **Estado:** jugable de punta a punta · Core+Game modulares · **Deudas #1–#16 ✅**

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
├── css/     01-base (tokens) · 02-layout · 03-components · 04-features · 06-hud · 05-mobile
└── js/
    ├── core/   config · data · store · gear · events · season · progression · formulas · net · assets · audio
    ├── game/   anims · boot-scene · vfx · battle-state · affixes · skills · squad · enemies ·
    │           battle-update · ambience · battle-scene · tap · icons · main
    ├── ui/     system/ (ui, ui-fx, ui-hud, ui-skills, ui-hub, ui-stats, ui-auth) ·
    │           panels/ (gear, autoequip, shop, look, map, weekly, battlepass, events, missions)
    ├── modes/  sim · daily · tower · rogue
    └── social/ social (Arena) · guilds-ui
```

### Orden de scripts (crítico)
```
config → data → assets → audio → net → store → gear → events → season → progression → formulas
ui/system/ui → ui/system/ui-fx
game/(anims → boot-scene → vfx → battle-state → affixes → skills → squad → enemies →
      battle-update → ambience → battle-scene → tap)
ui/system/ui-hud → ui/system/ui-skills → ui/panels/* → ui/system/ui-hub,ui-stats
modes/* → social/social → social/guilds-ui → ui/system/ui-auth → game/main
```
`css/06-hud.css` carga **antes** de `05-mobile.css` (mobile es la última palabra).

---

## ✨ Lote 27 — lo nuevo

### Habilidades activas (`game/skills.js` · `ui/system/ui-skills.js`)
| Tecla | Habilidad | Desbloqueo | CD | Efecto |
|---|---|---|---|---|
| `1` | 💥 Golpe Sísmico | Etapa 3 | 12s | `(5+2·Nv)×` tu daño a **todos** los enemigos |
| `2` | ⚡ Frenesí | Etapa 8 | 26s | 8s: ataque ×2 y `+15+3·Nv`% de crítico |
| `3` | 🛡️ Égida | Etapa 15 | 34s | Cura `25+5·Nv`% y ×0.4 al daño recibido por 7s |

Se desbloquean solas al llegar a la etapa · se suben con oro (`1200·2.35^Nv`, máx Nv 10) ·
cada nivel recorta un 2% el cooldown · **auto-cast** opcional (`S.skillAuto`, ON por
defecto) que las lanza cuando conviene, no en cuanto salen del CD → el idle sigue siendo idle.

### Afijos de enemigo (`game/affixes.js`)
Desde la etapa 6, un 16% de los spawns (y **todos** los élites) llevan un afijo con
insignia y tinte propios: 🛡 **Acorazado** (−45% daño recibido, ×2.2 oro) ·
💨 **Veloz** (corre y pega mucho más rápido) · 🩸 **Vampírico** (se cura con lo que pega) ·
💣 **Volátil** (explota al morir y castiga a quien esté a menos de 220px).

### Jefes por fases (`enemies.js`)
A 60% y 30% de vida el Rey Bestia cambia de fase: ruge, invoca 2 esbirros, +30% daño
y +25% de velocidad de ataque acumulativos. El marco del jefe muestra vida, puntos de
fase y el reloj de furia de 30s (que sigue sumando su +25%/ciclo del L26).

### Ambiente por capítulo (`game/ambience.js`)
Cada capítulo tiene clima propio y un velo de color: hojas en el bosque, goteo en la
cueva, burbujas y niebla en el pantano, brasas en la torre, motas del vacío más allá.

### HUD y UI
- **Topbar**: anillo de progreso hasta el jefe, nombre del capítulo, contadores animados
  con oro/segundo real y píldora de 💎 esencia.
- **Menú ☰ único** (escritorio + mobile) en drawer lateral, categorizado, con nombres,
  atajos y estado de cada sección — reemplaza la fila de 18 emojis sin etiqueta.
- **Marco del jefe**, **medidor de combo con escalones** (RACHA → ARDIENTE → IMPARABLE →
  MASACRE), **píldoras de buff** con cuenta atrás y **barra de habilidades** con barrido de CD.
- **Tarjetas de mejora**: precio REAL del modo x1/x10/MAX, `+X daño` por nivel, barra de
  "cuánto falta para pagarla" y chapa **MEJOR** en la de mejor relación beneficio/precio.
- **Tooltips** (`data-tip`), toasts tipados por color, transiciones de modal, y `Tab`
  para el menú.
- Velocidad **x4** desbloqueada con el primer prestigio.

### VFX y animaciones
Ondas de choque, haces de la Lluvia de Flechas, nova arcana, cortes con el color del rol,
chispas de impacto, monedas que vuelan al contador, hit-stop por niveles, zoom de cámara
en la entrada del jefe y en los cambios de fase, y muerte con squash + rotación.

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

**Colonias: DEPRECADAS.** `server/social/colonies.js` y los campos `colony/colonyLevel`
quedan sólo por compatibilidad de saves.

---

## ⚔️ Sistemas clave (resumen)

- **Combate:** etapas infinitas · jefe c/5 con fases · capítulos c/10 (fondo+música+clima) ·
  escuadrón dps/archer/mage + mascota · golpe manual · combo · afijos · 3 habilidades.
- **Rangos:** S/A/B/C/R + mapa + skipToRecord + bonus pasivo de daño.
- **Eventos 3 capas:** diario (calendario 7 días) + semanal (6 rotativos) + relámpago (5 min c/45-90 min).
- **Battle Pass:** 30 días · 50 niveles · premium 50🧬 (+50% XP, skins, título).
- **Equipo 2.0:** esencia/amuletos/forja/rotura/mochila/auto-fundir/bloqueo.
- **QoL:** x1/x10/MAX con precio real · atajos completos · offline con tiempo · toasts tope 4 ·
  Escape y click-fuera cierran cualquier panel.

### Fórmulas espejo cliente/servidor
```
dps = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(gremioNv−1))
      · (1+.05·shopFury) · evFuria · flashMult('dano') · rangos
liveDps  = dps · combo                         (sólo en pantalla; los modos idle usan dps)
crit     = min(.85, .2 + equipo + tienda + evPrecisión + Frenesí)
goldKill = ⌈3·1.18^st · fortuna · adnMult · shopFort · evFiebre · dayOro · flashOro⌉ · afijo
```

---

## ⌨️ Atajos
`1` `2` `3` habilidades · `Espacio` golpe manual (o velocidad si no hay enemigos) ·
`Tab` menú · `Q` cantidad de compra · `Esc` cerrar panel ·
`M` mapa · `E` equipo · `H` habilidades · `P` prestigio · `T` torre · `R` sotobosque ·
`A` arena · `D` diario · `S` tienda · `C` misiones · `B` pase · `G` gremio · `L` ranking ·
`V` stats · `O` ajustes.

---

## 📡 Protocolo Socket.IO
`guildInfo/Top/Create/Join/Leave/Kick/Donate/RaidHit/Chest/Chat` (C→S) ·
`guildUpdate/guildChat` (S→C broadcast por sala `guild:<key>`) ·
`register/login/loginToken/saveGame/score` · `top` (S→C).

El sanitizer del servidor valida además `skills` (3 ids, tope Nv 10), `skillAuto` y
las nuevas `stats` (`skillCasts`, `affixKills`, `taps`): el cliente nunca decide sus números.

---

## 🔧 Deuda técnica
| # | Estado |
|---|---|
| 1–9 | ✅ |
| 10 atlas unificado | ⏳ baja |
| 11 prototipo Godot | ⏳ media |
| 12 CSS monolítico | ✅ 6 archivos |
| 13 store monolito | ✅ 7 módulos (L21) |
| 14 battle monolito | ✅ 11 módulos (L22+L27) |
| 15 carpetas planas | ✅ reorganizadas (L23) |
| 16 colonias+gremios duplicados | ✅ unificados (L25) |
| 17 archivos muertos | ⏳ `public/css/01-features.css` y `public/js/game/phaser-setup.js` no los carga nadie (duplican `04-features.css` y `anims.js`+`boot-scene.js`); `phaser-setup.js` re-declara `ANIM_DEFS`, así que **no** debe añadirse al index |

---

## 📝 CHANGELOG (extracto)
| Fecha | Lote | Cambio |
|---|---|---|
| 2026-08-21 | L17–L23 | relámpago · battle pass · calendario · refactor core (7) · refactor game (8) · reorganización de carpetas |
| 2026-08-22 | L24 | 🛡️ Gremios: roles, banco, raid diaria, cofre, chat, ranking |
| 2026-08-22 | L25 | 🔀 Unificación colonia→gremio |
| 2026-08-22 | L26 | 👊 golpe manual · 🔥 combo · ✨ élites · 👑 furia del jefe · 📊 panel de stats · gestor de modales |
| 2026-09-10 | **L27** | ✨ **habilidades activas** · 🩸 **afijos de enemigo** · 👑 **jefes por fases** · 🌦️ **ambiente por capítulo** · 🎨 **rediseño completo de HUD/UI** (tokens, drawer único, marco de jefe, buffs, tooltips, contadores animados, tarjetas de mejora con delta y precio real) · 💥 **VFX nuevos** (ondas, haces, novas, chispas, monedas al contador, hit-stop, zoom) |

### Fixes del L27
- `server/economy/arena.js` y `server/social/colonies.js` requerían `./storage` y `./power`
  en vez de `../data/…`: **el servidor no arrancaba** desde la reorganización del L23.
- `img/boss_idle.png`, `boss_attack.png` y `boss_roar.png` existían desde el L8 pero no
  estaban en `SHEETS` de `assets.js` → el jefe usaba siempre el fallback de 1 frame.
  Ahora respira, golpea y ruge.
- El botón de mejora mostraba el precio de **un** nivel aunque el modo fuese x10/MAX.
- En etapa de jefe, matar un esbirro invocado cerraba la etapa (`killsNeed()===1`).
- El tutorial se posicionaba con `W`/`H` (viewport de Phaser, 0 hasta el primer frame),
  así que aparecía fuera de pantalla.
- `guilds-ui.js` comprobaba el duplicado de 🛡️ Gremio en una sola sección del menú.

---

## 🗺️ Roadmap
1–5 ✅ · 6 ✅ (L26 profundidad de combate) · 7 ✅ (L27 agencia + presentación)
8. **Fase 3:** 1) 🎮 prototipo Godot · 2) 🦸 más compañeros con habilidad propia ·
   3) 🧩 árbol de talentos por héroe · 4) 🗂️ atlas unificado (deuda #10).

---

## 🤝 Metodología
Archivo completo por cambio · divide y vencerás · CHANGELOG siempre ·
datos en `data.js` · guardias DOM · sin re-declaraciones · icons.js dinámico ·
socket autodetección.
