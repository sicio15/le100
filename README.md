# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas, escuadrón de compañeros,
mascota, progresión por prestigio (ADN), mapa con rangos, recompensas semanales,
sistema de equipo profundo, eventos relámpago, **Battle Pass / Temporadas** y HUD adaptativo desktop/mobile con QoL de idle AAA.

- **Versión:** 3.8.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta · **Arte 33/33** · **Deudas #1–#9 ✅** · **CSS modular ✅** · **Battle Pass ✅**

> 📌 **Convención:** todo cambio → **archivo completo** · revisión previa de
> optimizaciones · **divide y vencerás** · registro en §CHANGELOG.

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
├── package.json         # v3.8.0 · deps: express, socket.io, mongodb
├── README.md
├── server/
│   ├── storage.js       # U/C: Mongo o memoria · setColonyLevel (bulk) · patch · findByTokenHash
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave() · stageRanks · essence/amulets/bagSize/autoSalvage · season/battlepass
│   ├── power.js         # powerOf()/bossMax()
│   ├── ranking.js       # Top 10 etapas en memoria + broadcast 'top'
│   ├── arena.js         # arenaInfo (1 lectura) / arenaFight
│   ├── colonies.js      # single-get + ensureBossDay + donate bulk
│   └── weekly.js        # weeklyInfo / weeklyClaim (server-authoritative)
└── public/
    ├── index.html       # head: 5 CSS + theme-color + viewport-fit + favicon · topbar mínima + 📱 HUB + 🎫 Battle Pass
    ├── css/             # ⚡ MODULAR (reemplaza al viejo style.css)
    │   ├── 01-base.css       # reset, variables :root, estructura, accesibilidad
    │   ├── 02-layout.css     # topbar, batalla (vignette), escuadrón, bottombar
    │   ├── 03-components.css # toasts, cut-ins, banner, modales, sync, tutorial
    │   ├── 04-features.css   # equipo 2.0, mapa, hub, modales temáticos
    │   └── 05-mobile.css     # portrait/<700px (HUD v2+v3 consolidado)
    ├── img/             # 26 sheets + 5 fondos + logo + icons (33/33)
    └── js/
        ├── core/
        │   ├── config.js   # $, fmt, COSTS, UPDEF, ACH, SETTINGS (buyQty), CHAPTERS, HEROES, SLOT_DEFS, SEASON_REWARDS
        │   ├── store.js    # S + fórmulas + checkDailyResets + rangos + bonus + equipo 2.0 + season/battlepass
        │   ├── net.js      # socket CDN + autodetección backend + token de sesión
        │   ├── audio.js    # Chiptune WebAudio procedural + SFX 8-bit
        │   └── assets.js   # chroma + analyze (MERGE_GAP) + Promise.all
        ├── game/
        │   ├── battle.js       # Lógica pura · roles · petCastT · HOOKS.bossRoar · rangos · season XP
        │   ├── battle-scene.js # Render · VFX · paperdoll · mascota · parallax
        │   ├── phaser-setup.js # ANIM_DEFS con fallbacks (sheet faltante → hermano)
        │   ├── icons.js        # íconos pixel (fallback emojis)
        │   └── main.js
        ├── ui/
        │   ├── ui.js           # toast (tope 4), wire, EL (caché DOM) + UI_HOOKS
        │   ├── ui-auth.js      # login/registro + auto-login token + offline (tiempo fuera) + tutorial
        │   ├── ui-hud.js       # mejoras (x1/x10/MAX + mantenido), atajos, settings, prestigio, sync
        │   ├── ui-hub.js       # HUB mobile categorizado (reutiliza handlers originales)
        │   ├── ui-gear.js      # Equipo 2.0: sticky ✖ · tooltips · orden · filas compactas
        │   ├── autoequip.js    # QoL · ignora items 🔒 · botón en gearTop
        │   ├── ui-shop.js      # Tienda ADN + skins
        │   ├── ui-look.js      # Vestidor: mascota + corona
        │   ├── ui-map.js       # Mapa capítulos · rangos · stats · bonus · skipToRecord
        │   ├── ui-weekly.js    # Recompensas semanales + dot pendiente
        │   ├── ui-battlepass.js # ⚡ Battle Pass / Temporadas (Lote 18)
        │   ├── ui-events.js    # Eventos relámpago + calendario (Lote 17)
        │   ├── ui-stats.js     # panel de multiplicadores
        │   └── ui-missions.js  # misiones diarias (+ season XP)
        ├── modes/
        │   ├── sim.js          # fightChance / rollFight compartida
        │   ├── daily.js        # Jefe Diario (3🎟️)
        │   ├── tower.js        # Torre + weekTower + checkMilestones
        │   └── rogue.js        # Sotobosque (8 salas, 1-de-3)
        └── social/
            └── social.js       # Arena PvP + Colonias
```

---

## 🧱 Arquitectura cliente

### Orden de `<link>` CSS (head de index.html)
```
01-base → 02-layout → 03-components → 04-features → 05-mobile
```
El tema completo vive en **variables `:root`** (01-base): cambiar paleta/radios/fuentes/sombras = tocar 1 bloque.

### Orden de `<script>`
```
socket.io CDN → phaser
core/config → core/assets → core/audio → core/net → core/store
ui/ui → game/battle → game/phaser-setup → game/battle-scene
ui/ui-hud → ui/ui-gear → ui/autoequip → ui/ui-shop → ui/ui-look
ui/ui-map → ui/ui-weekly → ui/ui-battlepass → ui/ui-events → ui/ui-hub → ui/ui-stats → ui/ui-missions
modes/sim → modes/daily → modes/tower → modes/rogue → social/social
ui/ui-auth → game/main
```

### Estado global (quién define qué)

| Global | Define | Uso |
|---|---|---|
| `S` | store.js | Save completo (ver §Save) |
| `authed` | store.js (let) | ui-auth la muta |
| `SETTINGS` | config.js | audio/volúmenes/velocidad/reduceFx/tutorial/**buyQty** |
| `SEASON_REWARDS` | config.js | 50 niveles de recompensas (gratis + premium) |
| `socket`, `LB` | net.js | conexión + leaderboard |
| `TOKEN_KEY`, `netGet/Set/ClearToken`, `netLoginToken` | net.js | sesión persistente |
| `squad`, `enemies`, `time`, `advance`, `petCastT`, `stageStartTime`, `stageHadDeaths` | battle.js | combate + rangos |
| `W`, `H` | config.js (muta BattleScene) | viewport |
| `EL` | ui.js | caché DOM hot-path |
| `UI_HOOKS`, `onGearOpen`, `fireGearOpen` | ui.js | hooks QoL |
| `HUB_SECTIONS` | ui-hub.js | menú mobile categorizado |
| `buyQtyMode`, `cycleBuyQty`, `buyUps` | ui-hud.js | compra en cantidad + mantenido |
| `checkSeasonReset`, `addSeasonXp`, `claimSeasonReward`, `buyPremiumPass` | store.js | Battle Pass |
| `FLASH_TYPES`, `flashActive`, `flashMult`, `checkFlash` | store.js | eventos relámpago |
| `PREP`, `STRIP_H` | assets.js | strips normalizadas 160px |
| `ANIM_KINDS` | phaser-setup.js | kinds de enemigos según sheets reales |
| `Audio` | audio.js | motor chiptune + SFX |
| `VFX`, `HOOKS` | battle.js (implementa BattleScene) | ult/crit/kill/cutin/bossShow/bossHide/bossTick/bossRoar |
| `fightChance`, `rollFight` | modes/sim.js | simulación compartida |

### Flujo de guardado + sesión
0. **Auto-login:** token `localStorage` → `loginToken`; server valida hash SHA-256.
1. `persist()` → `localStorage['le100_cache_v4']` + `netSendSave(S)` si `authed`
   (hook de ui-hud muestra 💾 Guardando… → ✅ Sincronizado).
2. Autoguardado: `setInterval(5s)` + `visibilitychange`/`beforeunload`/`pagehide`.
3. Server: throttle 2s → `sanitizeSave()` → `U.save()`.

---

## 📡 Protocolo Socket.IO

| Evento | Dir | Payload → Ack |
|---|---|---|
| `register` / `login` / `loginToken` | C→S | auth |
| `saveGame` | C→S | throttle 2s |
| `score` / `top` | C→S / S→C | ranking etapas |
| `arenaInfo` / `arenaFight` | C→S | `{ops,top}` / `{win,msg}` |
| `colonyInfo/Create/Join/Leave/Donate/Boss/Claim` | C→S | ver §Colonias |
| `weeklyInfo` / `weeklyClaim` | C→S | recompensas semanales (server-authoritative) |

---

## 💾 Save (`DEF_SAVE`)

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

## 🖥️ UI/UX (Lotes 15-18 + investigación)

### Investigación aplicada (idle games)
| Hallazgo | Implementación |
|---|---|
| Progreso ~60% idle / 40% activo | ✅ Offline rewards + modos activos |
| Tareas/bonos diarios retienen | ✅ Misiones diarias + semanales |
| "Mostrar solo lo necesario ahora" | ✅ Topbar mínima + HUB categorizado |
| Dar control al jugador | ✅ Settings/skins + `prefers-reduced-motion` |
| UI visible↔oculta con animaciones | ✅ Toasts/cut-ins/modales animados |
| Feedback rápido y consistente | ✅ SFX + hover/active + variables CSS |
| **Retención a largo plazo** | ✅ **Battle Pass con temporadas de 30 días** |

### Desktop refinado
- Glassmorphism (blur) + pills doradas + hover glow + vignette en batalla.
- Boss bar con brillo animado · cut-ins diagonales · cards con color por stat.
- **Atajos:** `Espacio` velocidad · `M` mapa · `E` equipo · `P` prestigio.
- Scrollbars finos · `:focus-visible` accesible.

### Mobile (HUD v3)
- **Topbar mínima (1 fila):** `[⚔️ etapa] [🪙] [🧬] [ MENU]` · cero scroll.
- **📱 HUB:** grilla 4 columnas · 4 categorías (Modos/Progreso/Tienda/Sistema) ·
  dots por item + dot agregado en 📱 · **cero lógica duplicada** (`.click()` del original).
- **Mejoras:** grilla 5 columnas (todas visibles) · safe-area + `100dvh`.
- Toasts máx 3 / cut-ins máx 2 (CSS `:nth-child`).

### QoL de progresión (Lotes 16-18)
- **Compra x1/x10/MAX** (botón 🛒 en heroStats) + **mantener pulsado = compra continua**.
- **Prestigio** con resumen claro (qué se reinicia / qué se conserva).
- **Offline** con tiempo fuera legible ("⏰ Estuviste fuera 2h 15min").
- **Eventos Relámpago** (5 min cada 45-90 min) · oro x3 / drops x3 / energía x2 / daño x2.
- **Battle Pass** · 50 niveles · temporadas de 30 días · track gratis + premium.

### Accesibilidad / PWA-feel
- `prefers-reduced-motion` apaga animaciones decorativas.
- `viewport-fit=cover` + `theme-color` + favicon 🐛 + `preconnect` a fonts.

---

## ⚔️ Sistemas clave

### Combate + escuadrón
- Etapas infinitas · **jefe cada 5** (30s) · caer → −1 etapa · capítulos cada 10.
- 🗡️ **Aguijón** `dps` (1, *Tajo Triple*) · 🏹 **Elara** `archer` (5, *Lluvia*) · 🔮 **Kael** `mage` (10, *Nova* +cura 15%).
- Vida 45/30/25% · daño 100/85/55% · formación dps→archer→mage.

### 👑 Rey Bestia v2
- Sheets `enemy_boss` + `boss_idle` + `boss_attack` + `boss_roar` (8f c/u).
- `HOOKS.bossRoar`: flash rojo + slow-mo 0.25 (350ms) + shake · tamaño +13%.

### 🐛 Mascota
- Toggleable (`S.look.pet`) · escala 0.62 + bob · escupe veneno (`petCastT`) · corona 👑 opcional.

### 🗺️ Mapa y Rangos
- Capítulos de 10 etapas con stats por nodo (S/A/B/C/R).
- Rangos: **S** (<15s sin bajas) · **A** (<30s) · **B** (<60s) · **C** (>60s) · **R** (jefe).
- Viaje a cualquier etapa ≤ récord · **⚡ SALTAR AL RÉCORD** · bonus pasivo +0.5%/S y +0.2%/A.

### 🎁 Recompensas Semanales + Milestones
- `weeklyClaim` server-authoritative (1 por `weekNow()`): Torre semanal (10/25/50/100) + Top Arena (1º→20🧬 … 4-10→3🧬).
- Milestones permanentes de Torre: 10/25/50/100 → títulos + 🧬.

### 🌠 Eventos Relámpago (Lote 17)
- 4 tipos: 🌠 Oro x3 · 🎁 Drops x3 · ⚡ Energía x2 · 🔥 Daño x2.
- Duración: 5 min · Spawn: cada 45-90 min (primero a los 10-20 min).
- Badge flotante con countdown + dot en ✨ + calendario en modal de eventos.

### 🎫 Battle Pass / Temporadas (Lote 18)
- **Temporadas de 30 días** con reset automático.
- **50 niveles** con track gratis + premium.
- **XP por:** kills (1xp) · etapas (10xp) · jefes (50xp) · misiones (100xp).
- **Pase premium** (50 ADN) = +50% XP + recompensas exclusivas (skins bronce/plata/oro, título "Conquistador de Temporada").
- **Dot de notificación** si hay niveles sin reclamar.

### 🎒 Equipo 2.0
- 💎 Esencia (fundir) · 🧿 Amuletos (protección) · ⬆ mejorar con riesgo (100→30%, rotura desde +10)
- ⚗️ Forja 3→1 · 🎒 mochila 30→100 · ♻️ auto-fundir · 🔒 bloqueo · UI sticky ✖ + tooltips + orden.

### Fórmulas (store.js ↔ sanitize/power espejo)
```
dps    = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1))
         · (1+.05·shopFury) · evFuria · (1 + rankBonus) · flashMult('dano')
maxHP  = ... · (1 + rankBonus·0.5)
crit   = min(.75, .2+crit%/100 + .02·shopCrit + evPrecisión) · critMult = 2.2 + critd%/100
veneno: cd = max(2, max(3,7−.3·venom) − evTóxico) · dmg = dps·(2+.5·venom)·ev
goldKill(st) = ⌈3·1.18^st⌋ · (1+.25·fortune) · adnMult · (1+.05·shopFort) · evFiebre · flashMult('oro')
eHP(st)=10·1.27^st · eDmg(st)=4·1.22^st · cost(k)=⌊base·mult^lv⌋ (evRacha ×0.8)
xpForLevel(lvl) = 100 + (lvl-1)·50 · season XP bonus con premium = ×1.5
```

---

## 🎨 Arte: pipeline + inventario (33/33) + BIBLIA VISUAL v5

**Pipeline (`assets.js`):** fondo claro → `chroma()` (>205/>205/>200) → `analyze()`
(blobs fila+columna · **MERGE_GAP=4** fusiona alas/piedras · descarta <35% alto) →
strip 160px → spritesheets+anims · **Promise.all**.

### Biblia Visual v5 — flujo de referencia
1. Walk con MASTER PROMPT v5 → REFERENCIA canónica.
2. Resto de sheets con REF-LOCK PROMPT + walk adjunta.
3. Checklist: silueta · ojos · 1 correa · muñequeras · orientación · escala · fondo.
4. Bloques: STYLE + CHARACTER LOCK + FACING LOCK + SCALE LOCK + BACKGROUND LOCK + LAYOUT LOCK + FORBIDDEN + POSES.

**Specs:** Aguijón (castaño corto, espada) · Elara (rubia larga, arco+carcaj) · Kael (mohawk azul, bastón gema) ·
Rey Bestia (rojo #A81C1C, corona black-gold, garras serradas) · Mascota (cienpies verde).
**Orientación:** héroes/mascota → DERECHA · enemigos/boss → IZQUIERDA.

### Sheets (26)
| Grupo | Archivos | Frames |
|---|---|---|
| Cienpies/mascota | `hero_walk/idle/attack/cast/hurt` | 4/3/6/3/6 |
| Enemigos | `enemy_beetle/spider/wasp/scorpion` | 4 c/u |
| Boss v2 | `enemy_boss` + `_idle` + `_attack` + `_roar` | 8/8/8(0-3)/8(0-3) |
| Aguijón | `hero_human_a` + `_idle` + `_attack` + `_hurt` | 5/3/4/5 |
| Elara | `hero_human_b` + `_idle` + `_attack` + `_hurt` | 5/3/4/5 |
| Kael | `hero_human_c` + `_idle` + `_attack` + `_hurt` | 5/3/4/5 |
| Overlay | `acc_crown` | 1 |

Fondos: `bg`/`bg_cave`/`bg_swamp`/`bg_tower`/`bg_rogue` · UI: `logo.png`/`icons.png`.

---

## 🔧 Deuda técnica

| # | Deuda | Estado |
|---|---|---|
| 1 | prepareAll serie | ✅ Promise.all (L1) |
| 2 | arena 2× U.all() | ✅ 1 lectura (L1) |
| 3 | colonyDonate N writes | ✅ bulk + single-get (L1) |
| 4 | resets triplicados | ✅ checkDailyResets (L1+2A) |
| 5 | sim duplicada | ✅ modes/sim.js (L3A) |
| 6 | index.html | ✅ reconstruido (L3A) + topbar/hub (L15) |
| 7 | battle con DOM | ✅ HOOKS (L2B) |
| 8 | sesión no persistida | ✅ token SHA-256 (L2C) |
| 9 | autoequip setTimeout | ✅ onGearOpen (L2A) |
| 10 | atlas unificado | ⏳ baja |
| 11 | prototipo Godot | ⏳ baja |
| 12 | CSS monolítico | ✅ modular 5 archivos + variables (L16) |

---

## 🗺️ Roadmap
1. ✅ Consolidación (deudas, arte 33/33, escuadrón, mascota, boss v2).
2. ✅ Profundización (mapa+rangos, semanales, milestones, equipo 2.0).
3. ✅ UI/UX (desktop refinado + mobile HUD v3 + QoL idle + CSS modular).
4. ✅ **Expansión fase 1:** Eventos relámpago (L17) + Battle Pass / Temporadas (L18).
5. **Expansión fase 2 (pendiente):**
   - Más compañeros reclutables (Biblia v5) + overlays de armadura visual.
   - Calendario de eventos especiales rotativos.
   - Sistema de guildas/clanes grandes (actualmente colonias pequeñas).
   - Prototipo Godot de 1 escena.

---

## 📝 CHANGELOG

| Fecha | Lote | Cambio |
|---|---|---|
| 2026-08-17 | README | 📄 Creado. |
| 2026-08-17 | Arte | 🎨 25→27/27 · Biblia Visual v1. |
| 2026-08-17 | L1 | 🔧 assets paralelo · arena/colonias/storage · checkDailyResets. |
| 2026-08-17 | L2A | 🔧 UI_HOOKS gearOpen · autoequip hook · resets migrados. |
| 2026-08-17 | L2B | 🔧 battle sin DOM (HOOKS boss+cut-in). |
| 2026-08-17 | L2C | 🔧 sesión token (net/server/ui-auth/ui-hud). |
| 2026-08-17 | L3 | 🔧 modes/sim.js + index.html · 📝 README. |
| 2026-08-17 | L4 | 🔧 escuadrón Aguijón/Elara/Kael (dps/archer/mage). |
| 2026-08-17 | L5 | 🔧 cienpies → mascota (`look{pet,crown}`, petCastT). |
| 2026-08-17 | L6 | 🎬 `hero_human_a_idle` + rework right-facing · Biblia v5. |
| 2026-08-17 | L7 | 🎬 sets completos Elara/Kael · muertes 3-4. |
| 2026-08-17 | L8 | 👑 Rey Bestia v2 + bossRoar + TARGET_H 130 → arte 33/33. |
| 2026-08-18 | L9 | 🔧 fallbacks phaser-setup (sheet faltante → hermano). |
| 2026-08-18 | L10 | 🔧 nombres boss_* + MERGE_GAP fix avispa + CORS. |
| 2026-08-18 | L11 | 🗺️ Mapa + rangos S/A/B/C/R + travelToStage. |
| 2026-08-18 | L12 | ⚡ skipToRecord + sync indicator + stats capítulo + bonus rangos. |
| 2026-08-18 | L13 | 🎁 Semanales server-auth + milestones Torre. |
| 2026-08-18 | L14 | 🎒 Equipo 2.0 (esencia/amuletos/forja/rotura/mochila/auto-fundir/🔒). |
| 2026-08-18 | UI | 💅 Equipo: sticky ✖ · tooltips · orden · confirm plain-text fix. |
| 2026-08-19 | L15 | 📱 Mobile HUD v3 (topbar mínima + HUB) · 🖥️ desktop glass/hover/vignette. |
| 2026-08-21 | CSS | 🧩 style.css → **5 archivos modulares** + variables `:root` + investigación idle-games aplicada (reduced-motion, theme-color, viewport-fit, favicon). |
| 2026-08-21 | L16 | ✨ QoL: compra x1/x10/MAX + mantenido · atajos Espacio/M/E/P · toasts tope 4 · prestigio con resumen · offline con tiempo fuera. |
| 2026-08-21 | L17 | 🌠 Eventos Relámpago: 4 tipos (oro/drops/energía/daño) · 5 min cada 45-90 min · badge con countdown · calendario. |
| 2026-08-21 | L18 | 🎫 **Battle Pass / Temporadas:** 30 días · 50 niveles · track gratis + premium · XP por kills/etapas/jefes/misiones · skins exclusivas · +50% XP premium. |
| 2026-08-21 | README | 📝 Actualizado a v3.8.0. |

---

## 🤝 Metodología (recordatorio)
- Cambio → **archivo completo** · antes → **revisar mejoras** · **divide y vencerás** ·
  cada cambio → **§CHANGELOG** + secciones afectadas.