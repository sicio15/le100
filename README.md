# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas, escuadrón de compañeros,
mascota, progreso por prestigio (ADN), mapa con rangos, **3 capas de eventos**
(diario + semanal + relámpago), **Battle Pass por temporadas**, equipo profundo,
**core y game modulares (SRP)** y HUD adaptativo con HUB mobile.

- **Versión:** 4.1.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta · **Arte 33/33** · **Core modular ✅** · **Game modular ✅** · **Deudas #1–#13 ✅**

> 📌 **Convención:** todo cambio → **archivo completo** · revisión previa de
> optimizaciones · **divide y vencerás** · registro en §CHANGELOG.
> **Reglas de oro:**
> - Datos de balance → `data.js` · datos estáticos de juego → `config.js`
> - Lógica nueva → módulo propio (máx ~150 líneas)
> - Nunca re-declarar consts entre módulos (causa TDZ/redeclaration)
> - Scripts que tocan DOM → guardias `if (!el) return;`

---

## 🚀 Quick start

```bash
npm install
node dev.js        # DEV: live-reload + no-cache → http://localhost:3000
node server.js     # PROD
# Live Server (5500): correr además `node server.js` (CORS ya configurado)
MONGO_URI=mongodb://... node server.js   # persistencia real (sin esto: memoria)
```

---

## 📁 Árbol de carpetas

```
le100/
├── server.js            # Express + Socket.IO + DEV live-reload + CORS + tokens
├── dev.js               # node dev.js → DEV=1
├── package.json         # v4.1.0
├── README.md
├── server/
│   ├── storage.js       # U/C: Mongo o memoria · setColonyLevel (bulk) · patch · findByTokenHash
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave() (espejo del cliente, con topes)
│   ├── power.js         # powerOf()/bossMax()
│   ├── ranking.js       # Top 10 etapas en memoria + broadcast 'top'
│   ├── arena.js         # arenaInfo (1 lectura) / arenaFight
│   ├── colonies.js      # single-get + ensureBossDay + donate bulk
│   └── weekly.js        # weeklyInfo / weeklyClaim (server-authoritative)
└── public/
    ├── index.html       # head: 5 CSS + theme-color + viewport-fit + favicon · topbar + 📱 HUB
    ├── css/             # MODULAR (5 archivos)
    │   ├── 01-base.css       # reset, variables :root, accesibilidad
    │   ├── 02-layout.css     # topbar, batalla (vignette), escuadrón, bottombar
    │   ├── 03-components.css # toasts, cut-ins, banner, modales, sync, tutorial
    │   ├── 04-features.css   # equipo 2.0, mapa, hub, modales temáticos
    │   └── 05-mobile.css     # portrait/<700px (HUD v2+v3 consolidado)
    ├── img/             # 26 sheets + 5 fondos + logo + icons (33/33)
    └── js/
        ├── core/        # ⚡ 7 MÓDULOS SRP
        │   ├── config.js     # utilidades + datos estáticos ($, fmt, TAU, W/H, COSTS, HEROES, SLOT_DEFS…)
        │   ├── data.js       # balance puro (SEASON_*, EVENTS, DAY_EVENTS, FLASH_TYPES, milestones…)
        │   ├── store.js      # S + DEF + persist + applyServerSave + resets diarios
        │   ├── gear.js       # equipo 2.0 (esencia, forja, rotura, mochila, drops)
        │   ├── events.js     # semanales + diarios + relámpago (checkFlash)
        │   ├── season.js     # Battle Pass (XP, reclamos, premium)
        │   ├── progression.js# rangos S/A/B/C/R, mapa, travel, milestones
        │   ├── formulas.js   # dps/maxHP/goldKill/cost/eHP/eDmg/prestigio
        │   ├── net.js        # socket CDN + autodetección backend + token de sesión
        │   ├── assets.js     # chroma + analyze (MERGE_GAP) + Promise.all
        │   └── audio.js      # Chiptune WebAudio procedural + SFX 8-bit
        ├── game/        # ⚡ 8 MÓDULOS SRP (Lote 22)
        │   ├── anims.js      # ANIM_DEFS (data pura) + fallbacks + boss v2
        │   ├── boot-scene.js # BootScene (registra spritesheets + ANIM_KINDS limpio)
        │   ├── vfx.js        # VFX + HOOKS de cámara + banner DOM + toColor
        │   ├── battle-state.js # estado compartido (squad/enemies/timers) + accessores
        │   ├── squad.js      # héroes (makeHero/init/reset/gainEnergy/castUlt)
        │   ├── enemies.js    # enemigos (spawn/kill/hit/chapterKinds)
        │   ├── battle-update.js # loop update + nextStage + advance
        │   ├── battle-scene.js # solo BattleScene (render/paperdoll/parallax)
        │   ├── icons.js      # íconos pixel (cargado dinámicamente por main.js)
        │   └── main.js       # arranque Phaser (carga icons + prepareAll)
        ├── ui/
        │   ├── ui.js           # toast (tope 4), wire, EL, UI_HOOKS
        │   ├── ui-auth.js      # login/registro + auto-login token + offline + tutorial
        │   ├── ui-hud.js       # mejoras (x1/x10/MAX + mantenido), atajos, settings, sync
        │   ├── ui-hub.js       # HUB mobile categorizado
        │   ├── ui-gear.js      # Equipo 2.0 UI
        │   ├── autoequip.js    # QoL autoequipar mejor
        │   ├── ui-shop.js      # Tienda ADN + skins
        │   ├── ui-look.js      # Vestidor: mascota + corona
        │   ├── ui-map.js       # Mapa capítulos + rangos + skipToRecord
        │   ├── ui-weekly.js    # Recompensas semanales
        │   ├── ui-battlepass.js# Battle Pass UI + dot
        │   ├── ui-events.js    # Calendario diario + semanal + relámpago + badge
        │   ├── ui-stats.js     # panel de multiplicadores
        │   └── ui-missions.js  # misiones diarias (+ season XP)
        ├── modes/       # Modos de juego (con guardias anti-crash)
        │   ├── sim.js          # fightChance / rollFight compartida
        │   ├── daily.js        # Jefe Diario (3🎟️ + bonus miércoles)
        │   ├── tower.js        # Torre + día de torre x2 + milestones
        │   └── rogue.js        # Sotobosque (8 salas, 1-de-3, +1🎟️ martes)
        └── social/
            └── social.js       # Arena PvP + Colonias
```

---

## 🧱 Arquitectura cliente

### Orden de `<link>` CSS
```
01-base → 02-layout → 03-components → 04-features → 05-mobile
```
Tema completo en **variables `:root`** (01-base): paleta/radios/fuentes/sombras en 1 bloque.

### Orden de `<script>` (crítico por TDZ)
```
socket.io CDN → phaser

core/config → core/data → core/assets → core/audio → core/net → core/store
core/gear → core/events → core/season → core/progression → core/formulas

ui/ui

game/anims → game/boot-scene → game/vfx → game/battle-state
game/squad → game/enemies → game/battle-update → game/battle-scene
# ⚠️ game/icons.js NO se carga acá (main.js lo carga dinámicamente)

ui/ui-hud → ui/ui-gear → ui/autoequip → ui/ui-shop → ui/ui-look
ui/ui-map → ui/ui-weekly → ui/ui-battlepass → ui/ui-events
ui/ui-hub → ui/ui-stats → ui/ui-missions

modes/sim → modes/daily → modes/tower → modes/rogue
social/social

ui/ui-auth → game/main  (main.js carga icons.js dinámicamente)
```
**Regla TDZ:** `data.js` (consts puras) carga antes de `store.js` (que clampa con
`SEASON_MAX_LEVEL` en `loadCache()`). El resto son funciones usadas solo en
tiempo de llamada → orden flexible.

### Estado global (quién define qué)

| Global | Módulo | Contenido |
|---|---|---|
| `$`, `fmt`, `TAU`, `W`, `H`, `COSTS`, `UPDEF`, `ACH`, `SETTINGS`, `CHAPTERS`, `HEROES` (con `look`), `SLOT_DEFS`, `RAR_*` | config.js | utilidades + datos estáticos |
| `SEASON_*`, `EVENTS`, `DAY_EVENTS`, `FLASH_TYPES`, `FLASH_DUR`, `TOWER_MILESTONES`, `ESSENCE_BY_RAR`, `FUSE_COST`, `AMULET_DROP_CHANCE`, `RANK_COLORS` | data.js | balance puro |
| `S`, `authed`, `DEF`, `persist`, `applyServerSave`, `checkDailyResets`, `weekNow`, `checkWeekReset` | store.js | estado + persistencia |
| `bagMax`, `salvageEssence`, `destroyItem`, `enhance*`, `fuseItems`, `gearBonuses`, `itemPower`, `rollItem`, `dropItem` | gear.js | equipo 2.0 |
| `weekEvent(At)`, `evHas`, `dayEvent`, `dayHas`, `flashActive/Type/Mult/Info`, `checkFlash` | events.js | 3 capas de eventos |
| `checkSeasonReset`, `xpForLevel`, `addSeasonXp`, `claimSeasonReward`, `buyPremiumPass` | season.js | Battle Pass |
| `getStageRank`, `travelToStage`, `getChapterStats`, `getTotalRankBonus`, `skipToRecord`, `checkMilestones` | progression.js | rangos + mapa |
| `dps`, `maxHP`, `regenPs`, `critChance/Mult`, `venomCd/Dm`, `goldKill`, `eHP`, `eDmg`, `cost`, `prGain` | formulas.js | matemática de juego |
| `ANIM_DEFS` | anims.js | data de animaciones |
| `VFX`, `HOOKS`, `squad`, `enemies`, `time`, `advance`, `spawnT/bossT/shake`, `stageStartTime/HadDeaths`, `heroX/groundY/slotX`, `pickTarget/aliveByPriority` | battle-state.js | estado del combate |
| `makeHero`, `initSquad`, `resetSquad`, `reEnter`, `gainEnergy`, `castUlt` | squad.js | héroes |
| `KIND_STATS`, `chapterKinds`, `spawnEnemy`, `spawnBoss`, `hitEnemy`, `killEnemy` | enemies.js | enemigos |
| `updateAdvance`, `nextStage`, `update` | battle-update.js | loop de combate |
| `BootScene`, `BattleScene` | boot-scene.js / battle-scene.js | Phaser |
| `PREP`, `STRIP_H` | assets.js | strips 160px |
| `ANIM_KINDS` | boot-scene.js | kinds según sheets reales |
| `Audio` | audio.js | chiptune + SFX |
| `fightChance`, `rollFight` | modes/sim.js | simulación compartida |

### Flujo de guardado + sesión
0. **Auto-login:** token `localStorage` → `loginToken`; server valida hash SHA-256 y rota.
1. `persist()` → `localStorage['le100_cache_v4']` + `netSendSave(S)` si `authed`
   (hook de ui-hud: 💾 Guardando… → ✅ Sincronizado).
2. Autoguardado: `setInterval(5s)` + `visibilitychange`/`beforeunload`/`pagehide`.
3. Server: throttle 2s → `sanitizeSave()` → `U.save()`.

---

## 📡 Protocolo Socket.IO

| Evento | Dir | Payload → Ack |
|---|---|---|
| `register` / `login` / `loginToken` | C→S | auth (+token) |
| `saveGame` | C→S | throttle 2s |
| `score` / `top` | C→S / S→C | ranking etapas |
| `arenaInfo` / `arenaFight` | C→S | `{ops,top}` / `{win,msg}` |
| `colonyInfo/Create/Join/Leave/Donate/Boss/Claim` | C→S | ver §Colonias |
| `weeklyInfo` / `weeklyClaim` | C→S | recompensas semanales (server-authoritative) |

---

## 💾 Save (`DEF_SAVE`, espejo cliente/servidor)

`gold, adn, stage, best, kills, prestiges, prBase, ups{dmg,vit,regen,venom,fortune},
ach{}, gear{equipped, inv[≤100]}, tickets/ticketDate, tower/towerBest, rlTickets/rlDate,
arenaPts/arenaTickets/arenaDate, colony, colonyLevel, bossTicketDate,
mDate/mBase/mClaimed, shop{lv,skins,skin}, look{pet,crown}, last,
stageRanks{}, weekTower, weekClaimedKey, milestones{},
essence, amulets, bagSize, autoSalvage,
flashType, flashEnd, flashNext,
season, seasonXp, seasonLevel, hasPremiumPass, seasonClaimed{}, seasonStart`
(+ `tokenHash` server-only).

---

## 🖥️ UI/UX (investigación idle-games aplicada)

| Hallazgo | Implementación |
|---|---|
| ~60% idle / 40% activo | ✅ Offline rewards + modos activos |
| Tareas/bonos diarios retienen | ✅ Misiones + calendario diario + semanales + flash |
| "Mostrar solo lo necesario" | ✅ Topbar mínima + HUB categorizado mobile |
| Dar control al jugador | ✅ Settings/skins/`prefers-reduced-motion`/auto-fundir |
| UI conectada por animaciones | ✅ Toasts/cut-ins/badge con countdown |
| Retención a largo plazo | ✅ Battle Pass por temporadas de 30 días |

- **Desktop:** glass + pills doradas + hover glow + vignette + boss bar animada + atajos `Espacio/M/E/P`.
- **Mobile (HUD v3):** topbar `[⚔️][🪙][][📱]` · HUB grilla 4 col (Modos/Progreso/Tienda/Sistema) ·
  mejoras en grilla 5 · safe-area + `100dvh` · toasts máx 3 / cut-ins máx 2.

---

## ⚔️ Sistemas clave

### Combate + escuadrón
- Etapas infinitas · **jefe cada 5** (30s) · caer → −1 etapa · capítulos cada 10 (fondo+música).
- 🗡️ **Aguijón** `dps` (`look:human_a`, *Tajo Triple*) · 🏹 **Elara** `archer` (`human_b`, *Lluvia*) · 🔮 **Kael** `mage` (`human_c`, *Nova* +cura 15%).
- Vida 45/30/25% · daño 100/85/55% · formación dps→archer→mage · mascota 🐛 escupe veneno.

### 👑 Rey Bestia v2
- Sheets `enemy_boss` + `boss_idle/attack/roar` · `HOOKS.bossRoar` (flash rojo + shake + slow-mo) · +13% tamaño.

### 🗺️ Mapa y Rangos
- Rangos: **S** (<15s sin bajas) · **A** (<30s) · **B** (<60s) · **C** · **R** (jefe).
- Viaje a etapa ≤ récord · ⚡ skipToRecord · bonus pasivo +0.5%/S y +0.2%/A.

### 📆 3 capas de eventos (apilables → momentos "jackpot")
1. **Diario** (calendario): LUN torre x2 · MAR +1🌀 · MIÉ +1🎯 · JUE drops x2 · VIE energía x2 · SÁB/DOM oro x2.
2. **Semanal** (6 rotativos): fiebre/precisión/furia/vital/tóxico/racha.
3. **Relámpago** (5 min c/45-90 min): oro x3 / drops x3 / energía x2 / daño x2 · badge con countdown.

### 🎫 Battle Pass (season.js)
- Temporadas 30 días · 50 niveles · XP: kill 1 / etapa 10 / jefe 50 / misión 100.
- Premium 50🧬: +50% XP + skins bronce/plata/oro + título.

### 🎁 Semanales server-auth + Milestones
- `weeklyClaim` 1/semana: Torre (10/25/50/100) + Top Arena (1º→20🧬 … 4-10→3🧬).
- Milestones permanentes Torre 10/25/50/100.

### 🎒 Equipo 2.0 (gear.js)
- 💎 esencia · 🧿 amuletos · ⬆ riesgo (100→30%, rotura desde +10) · ⚗️ forja 3→1 ·
  🎒 30→100 · ♻️ auto-fundir · 🔒 bloqueo · UI sticky ✖ + tooltips + orden.

### Fórmulas (formulas.js ↔ sanitize/power espejo)
```
dps    = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1))
         · (1+.05·shopFury) · evFuria · (1+rankBonus) · flashMult('dano')
goldKill = ⌈3·1.18^st⌉ · (1+.25·fortune) · adnMult · (1+.05·shopFort)
           · evFiebre · dayOro · flashOro
xpForLevel(lvl) = 100 + (lvl−1)·50 · premium ×1.5
```

---

## 🎨 Arte: pipeline + inventario (33/33) + BIBLIA VISUAL v5

**Pipeline (`assets.js`):** fondo claro → `chroma()` → `analyze()` (blobs fila+columna ·
**MERGE_GAP=4** · descarta <35%) → strip 160px → anims · **Promise.all**.

### Biblia v5 — flujo de referencia
1. Walk con MASTER PROMPT v5 → REFERENCIA canónica.
2. Resto con REF-LOCK + walk adjunta.
3. Checklist: silueta · ojos · 1 correa · muñequeras · orientación · escala · fondo.
4. Bloques: STYLE + CHARACTER/FACING/SCALE/BACKGROUND/LAYOUT LOCK + FORBIDDEN + POSES.

**Specs:** Aguijón (castaño, espada) · Elara (rubia, arco+carcaj) · Kael (mohawk azul, bastón) ·
Rey Bestia (rojo #A81C1C, corona black-gold, garras serradas) · Mascota (cienpies verde).
**Orientación:** héroes/mascota → DERECHA · enemigos/boss → IZQUIERDA.

### Sheets (26)
| Grupo | Archivos | Frames |
|---|---|---|
| Cienpies/mascota | `hero_walk/idle/attack/cast/hurt` | 4/3/6/3/6 |
| Enemigos | `enemy_beetle/spider/wasp/scorpion` | 4 c/u |
| Boss v2 | `enemy_boss` + `_idle` + `_attack` + `_roar` | 8/8/8(0-3)/8(0-3) |
| Héroes a/b/c | `hero_human_X` + `_idle` + `_attack` + `_hurt` | 5/3/4/5 |
| Overlay | `acc_crown` | 1 |

---

## 🔧 Deuda técnica

| # | Deuda | Estado |
|---|---|---|
| 1 | prepareAll serie | ✅ Promise.all (L1) |
| 2 | arena 2× U.all() | ✅ 1 lectura (L1) |
| 3 | colonyDonate N writes | ✅ bulk (L1) |
| 4 | resets triplicados | ✅ checkDailyResets (L1) |
| 5 | sim duplicada | ✅ modes/sim.js (L3) |
| 6 | index.html | ✅ reconstruido (L3) + topbar/hub (L15) |
| 7 | battle con DOM | ✅ HOOKS (L2) |
| 8 | sesión no persistida | ✅ token SHA-256 (L2) |
| 9 | autoequip setTimeout | ✅ onGearOpen (L2) |
| 10 | atlas unificado | ⏳ baja |
| 11 | prototipo Godot | ⏳ media (roadmap) |
| 12 | CSS monolítico | ✅ 5 archivos + variables (L16) |
| 13 | store.js monolito (400 líneas) | ✅ 7 módulos SRP (L21) |
| 14 | battle.js/phaser-setup.js monolitos | ✅ 8 módulos SRP (L22) |

---

## 🗺️ Roadmap
1. ✅ Consolidación (deudas, arte, escuadrón, mascota, boss v2).
2. ✅ Profundización (mapa+rangos, semanales, milestones, equipo 2.0).
3. ✅ UI/UX (desktop + mobile HUD v3 + CSS modular).
4. ✅ Expansión fase 1 (eventos 3 capas + Battle Pass + **core y game modulares**).
5. **Expansión fase 2 (orden decidido):**
   1. 🐜 **Guildas/clanes grandes** (evolución de colonias).
   2. 🎮 Prototipo Godot de 1 escena.
   3. 🦸 **Más compañeros + overlays de armadura** ← **ÚLTIMO** (requiere Biblia v5 + arte).

---

## 📝 CHANGELOG

| Fecha | Lote | Cambio |
|---|---|---|
| 2026-08-17 | L1–L8 | 🔧 Deudas 1-9 · escuadrón · mascota · boss v2 · arte 33/33 · Biblia v5. |
| 2026-08-18 | L9–L14 | 🔧 Fallbacks anims · CORS · mapa+rangos · semanales · equipo 2.0. |
| 2026-08-19 | L15–L16 | 📱 HUD v3 + HUB · ✨ QoL (x1/x10/MAX, atajos, offline tiempo). |
| 2026-08-21 | L17 | 🌠 Eventos relámpago + badge countdown. |
| 2026-08-21 | L18 | 🎫 Battle Pass / Temporadas. |
| 2026-08-21 | L19 | 📆 Calendario diario (7 eventos rotativos). |
| 2026-08-21 | L20 | 🐛 Fix `look` por héroe (sprites distintos) + `TAU`/`W`/`H` en config. |
| 2026-08-21 | L21 | 🔧 **Refactor core:** store.js → `data/store/gear/events/season/progression/formulas` (SRP, sin TDZ). |
| 2026-08-21 | L22 | 🔧 **Refactor game:** `battle.js` + `phaser-setup.js` → 8 módulos SRP (`anims/boot-scene/vfx/battle-state/squad/enemies/battle-update/battle-scene`) + fondos por capítulo + bossRoar implementado + ANIM_KINDS limpio + modes con guardias anti-crash. |
| 2026-08-21 | README | 📝 v4.1.0 con arquitectura completa modular asentada. |

---

## 🤝 Metodología (recordatorio)
- Cambio → **archivo completo** · antes → **revisar mejoras** · **divide y vencerás** ·
  cada cambio → **§CHANGELOG** + secciones afectadas.
- **Core:** datos de balance → `data.js` · datos estáticos → `config.js` · lógica nueva → módulo propio.
- **Game:** datos de anims → `anims.js` · render puro → `battle-scene.js` · lógica pura → `battle-update.js` · estado compartido → `battle-state.js`.
- **DOM touchers:** siempre guardias `if (!el) return;` al inicio (ver modes/daily+tower+rogue).
- **Nunca re-declarar** consts entre módulos (causa TDZ/redeclaration — ver L21).
- **`icons.js`:** se carga dinámicamente en `main.js` antes de Phaser (NO estático en HTML).