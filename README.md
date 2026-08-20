# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas, escuadrón de compañeros,
mascota, progresión por prestigio (ADN), mapa con rangos, recompensas semanales
y sistema de equipo profundo.

- **Versión:** 3.4.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta · **Arte 33/33** · **Deudas #1–#9 ✅**

> 📌 **Convención:** todo cambio → **archivo completo** · revisión previa de
> optimizaciones · metodología **divide y vencerás** · registro en §CHANGELOG.

---

## 🚀 Quick start

```bash
npm install
node dev.js        # DEV: live-reload + no-cache → http://localhost:3000
node server.js     # PROD
# Opción Live Server: node server.js (puerto 3000) + Live Server (5500) con CORS configurado
MONGO_URI=mongodb://... node server.js   # persistencia real (sin esto: memoria)
```

---

## 📁 Árbol de carpetas

```
le100/
├── server.js            # Express + Socket.IO + DEV live-reload + CORS + tokens
├── dev.js               # node dev.js → DEV=1
├── package.json         # v3.4.0 · deps: express, socket.io, mongodb
├── README.md
├── server/
│   ├── storage.js       # U/C: Mongo o memoria · setColonyLevel (bulk) · patch · findByTokenHash
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave() · stageRanks · essence/amulets/bagSize
│   ├── power.js         # powerOf()/bossMax()
│   ├── ranking.js       # Top 10 etapas en memoria + broadcast
│   ├── arena.js         # arenaInfo / arenaFight
│   ├── colonies.js      # single-get + ensureBossDay + donate bulk
│   └── weekly.js        # ⚡ weeklyInfo / weeklyClaim (server-authoritative)
└── public/
    ├── index.html       # 16+ modales · gearTop sticky · mapa · weekly · socket CDN
    ├── css/style.css    # estilos + media portrait + gear compacto
    ├── img/             # 26 sheets + 5 fondos + logo + icons (33/33)
    └── js/
        ├── core/
        │   ├── config.js   # $, fmt, COSTS, UPDEF, ACH, SETTINGS, CHAPTERS, HEROES, SLOT_DEFS
        │   ├── store.js    # S + fórmulas + checkDailyResets + rangos + bonus + equipo 2.0
        │   ├── net.js      # socket (CDN) + autodetección de backend + token de sesión
        │   ├── audio.js    # Chiptune WebAudio procedural + SFX 8-bit
        │   └── assets.js   # chroma + analyze (MERGE_GAP fix avispa) + paralelo
        ├── game/
        │   ├── battle.js       # Lógica pura · roles · petCastT · HOOKS.bossRoar · rangos
        │   ├── battle-scene.js # Render · VFX · paperdoll · mascota · parallax
        │   ├── phaser-setup.js # ANIM_DEFS con fallbacks (si falta sheet → hermano)
        │   ├── icons.js        # íconos pixel fallback emojis
        │   └── main.js
        ├── ui/
        │   ├── ui.js           # toast, wire, EL (caché DOM) + UI_HOOKS
        │   ├── ui-auth.js      # login/registro + auto-login token + offline
        │   ├── ui-hud.js       # mejoras, settings, prestigio, sync indicator
        │   ├── ui-gear.js      # ⚡ Equipo 2.0: sticky ✖ · filas compactas · tooltips · orden
        │   ├── autoequip.js    # QoL · ignora items 🔒
        │   ├── ui-shop.js      # Tienda ADN + skins
        │   ├── ui-look.js      # Vestidor: mascota + corona
        │   ├── ui-map.js       # ⚡ Mapa con capítulos · rangos · stats · bonus · skipToRecord
        │   ├── ui-weekly.js    # ⚡ Recompensas semanales + dot de pendiente
        │   ├── ui-stats.js     # panel de multiplicadores
        │   ├── ui-events.js    # badge + anuncio semanal
        │   └── ui-missions.js  # misiones diarias
        ├── modes/
        │   ├── sim.js          # fightChance / rollFight compartida
        │   ├── daily.js        # Jefe Diario (3🎟️)
        │   ├── tower.js        # Torre Infinita + weekTower + checkMilestones
        │   └── rogue.js        # El Sotobosque (8 salas, 1-de-3)
        └── social/
            └── social.js       # Arena PvP + Colonias (netEmit/netCall)
```

---

## 🧱 Arquitectura cliente

### Orden de `<script>` en `index.html`
```
socket.io CDN → phaser
core/config → core/assets → core/audio → core/net → core/store
ui/ui → game/battle → game/phaser-setup → game/battle-scene
ui/ui-hud → ui/ui-gear → ui/autoequip → ui/ui-shop → ui/ui-look
ui/ui-map → ui/ui-weekly → ui/ui-stats → ui/ui-events → ui/ui-missions
modes/sim → modes/daily → modes/tower → modes/rogue → social/social
ui/ui-auth → game/main
```

### Estado global (quién define qué)

| Global | Define | Uso |
|---|---|---|
| `S` | store.js | Save completo (ver §Save) |
| `authed` | store.js (let) | ui-auth la muta |
| `SETTINGS` | config.js | audio/volúmenes/velocidad/reduceFx/tutorial |
| `socket`, `LB` | net.js | conexión + leaderboard |
| `TOKEN_KEY`, `netGet/Set/ClearToken`, `netLoginToken` | net.js | sesión persistente |
| `squad`, `enemies`, `time`, `advance`, `petCastT`, `stageStartTime`, `stageHadDeaths` | battle.js | combate + rangos |
| `W`, `H` | config.js (muta BattleScene) | viewport |
| `EL` | ui.js | caché DOM hot-path |
| `UI_HOOKS`, `onGearOpen`, `fireGearOpen` | ui.js | hooks QoL |
| `PREP`, `STRIP_H` | assets.js | strips normalizadas 160px |
| `ANIM_KINDS` | phaser-setup.js | kinds de enemigos según sheets reales |
| `Audio` | audio.js | motor chiptune + SFX |
| `VFX`, `HOOKS` | battle.js (implementa BattleScene) | ult/crit/kill/cutin/bossShow/bossHide/bossTick/**bossRoar** |
| `fightChance`, `rollFight` | modes/sim.js | simulación compartida |

### Flujo de guardado + sesión
0. **Auto-login:** token `localStorage` → `loginToken`; server valida hash SHA-256.
1. `persist()` → `localStorage['le100_cache_v4']` + `netSendSave(S)` si `authed`.
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
| `weeklyInfo` / `weeklyClaim` | C→S | ⚡ recompensas semanales (server-authoritative) |

---

## 💾 Save (`DEF_SAVE`)

`gold, adn, stage, best, kills, prestiges, prBase, ups{dmg,vit,regen,venom,fortune},
ach{}, gear{equipped, inv[≤100]}, tickets/ticketDate, tower/towerBest, rlTickets/rlDate,
arenaPts/arenaTickets/arenaDate, colony, colonyLevel, bossTicketDate,
mDate/mBase/mClaimed, shop{lv,skins,skin}, look{pet,crown}, last,
stageRanks{}, weekTower, weekClaimedKey, milestones{},
essence, amulets, bagSize, autoSalvage`
(+ `tokenHash` server-only).

---

## ⚔️ Sistemas clave

### Combate + escuadrón
- Etapas infinitas · **jefe cada 5** (30s) · caer → −1 etapa · capítulos cada 10.
- 🗡️ **Aguijón** `dps` (etapa 1, *Tajo Triple*) · 🏹 **Elara** `archer` (etapa 5, *Lluvia*) · 🔮 **Kael** `mage` (etapa 10, *Nova* +cura 15%).
- Vida 45/30/25% · daño 100/85/55% · formación dps→archer→mage.

### 👑 Rey Bestia v2
- Sheets: `enemy_boss` + `boss_idle` + `boss_attack` + `boss_roar` (8f c/u).
- Puesta en escena: `HOOKS.bossRoar` = flash rojo + slow-mo 0.25 (350ms) + shake.
- Tamaño +13% (`TARGET_H.boss` 130).

### 🐛 Mascota
- Toggleable (`S.look.pet`) · escala 0.62 + bob · escupe veneno (`petCastT`).
- Puede llevar corona 👑.

### 🗺️ Mapa y Rangos (LOTE 11-12)
- Etapas agrupadas por capítulos (10 c/u) con estadísticas visibles.
- Rangos: **S** (<15s + sin bajas) · **A** (<30s) · **B** (<60s) · **C** (>60s) · **R** (jefe).
- Viajar a cualquier etapa ≤ récord; botón **⚡ SALTAR AL RÉCORD** si estás atrás.
- Bonus pasivos: +0.5% daño por S, +0.2% por A.

### 🎁 Recompensas Semanales (LOTE 13)
- **Server-authoritative** (`weeklyClaim` único por `weekNow()`).
- Torre semanal: piso 10/25/50/100 → oro + ADN.
- Arena Top 10: 1er→20🧬 · 2do→12🧬 · 3ro→8🧬 · 4-10→3🧬.
- **Milestones permanentes**: piso 10/25/50/100 → títulos + recompensas únicas.

### 🎒 Equipo 2.0 (LOTE 14)
- **💎 Esencia**: fundiendo items.
- **🧿 Amuletos**: caen al fundir items Épico+ (5/15/40%).
- **⬆ Mejorar con riesgo**: oro + esencia; 100→80→60→45→30% éxito; desde +10 falla = 30% ROMPERSE.
- **⚗️ Forja**: 3 iguales → 1 de rareza superior (elige slot).
- **💥 Fundir**: item → esencia (+ chance amuleto).
- **🎒 Mochila ampliable**: 30→100 con oro.
- **♻️ Auto-fundir**: filtro ≤ rareza.
- **🔒 Bloqueo**: protege de fundir/fusionar/autoequip.
- **UI sticky ✖**, columnas scroll independiente, orden por rareza/poder/esencia.

### Fórmulas (store.js ↔ sanitize/power espejo)
```
dps    = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1))
         · (1+.05·shopFury) · evFuria · (1 + rankBonus)
maxHP  = ... · (1 + rankBonus·0.5)
crit   = min(.75, .2+crit%/100 + .02·shopCrit + evPrecisión) · critMult = 2.2 + critd%/100
veneno: cd = max(2, max(3,7−.3·venom) − evTóxico) · dmg = dps·(2+.5·venom)·ev
goldKill(st) = ⌈3·1.18^st⌉ · (1+.25·fortune) · adnMult · (1+.05·shopFort) · evFiebre
eHP(st)=10·1.27^st · eDmg(st)=4·1.22^st · cost(k)=⌊base·mult^lv⌋ (evRacha ×0.8)
```

---

## 🎨 Arte: pipeline + inventario (33/33) + BIBLIA VISUAL v5

**Pipeline (`assets.js`):** fondo claro → `chroma()` (>205/>205/>200) → `analyze()` (blobs
fila+columna, **MERGE_GAP = 4** fusiona partes de un sprite (alas/piedras), descarta <35%
alto máx) → strip alto 160px → spritesheets+anims · **Promise.all** (paralelo).

### Biblia Visual v5 — flujo de referencia
1. Walk con MASTER PROMPT v5 → REFERENCIA canónica.
2. Sheets siguientes con REF-LOCK PROMPT + walk adjunta.
3. Checklist: silueta · ojos · 1 correa · muñequeras · orientación · escala · fondo.
4. Bloques: STYLE + CHARACTER LOCK + FACING LOCK + SCALE LOCK + BACKGROUND LOCK
   + LAYOUT LOCK + FORBIDDEN + POSES.

**Specs canónicas:** Aguijón (corto castaño, espada, túnica verde #4C9E6A) · Elara
(rubia larga, arco+carcaj) · Kael (mohawk azul #2FA8E0, bastón gema #A020F0) ·
Rey Bestia (3 cabezas, encorvado, rojo #A81C1C, corona black-gold #C89020, garras
serradas #F0F0F0, cadenas rotas) · Mascota (cienpies verde #7EC87E).

**Orientación:** héroes/mascota → DERECHA · enemigos/boss → IZQUIERDA.

### Sheets (26)

| Grupo | Archivos | Frames |
|---|---|---|
| Cienpies/mascota | `hero_walk/idle/attack/cast/hurt` | 4/3/6/3/6 |
| Enemigos | `enemy_beetle/spider/wasp/scorpion` | 4 c/u loops |
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
| 6 | index.html | ✅ reconstruido (L3A) |
| 7 | battle con DOM | ✅ HOOKS (L2B) |
| 8 | sesión no persistida | ✅ token SHA-256 (L2C) |
| 9 | autoequip setTimeout | ✅ onGearOpen (L2A) |
| 10 | atlas unificado | ⏳ baja |
| 11 | prototipo Godot | ⏳ baja |

---

## 🗺️ Roadmap
1. ✅ Consolidación (deudas, arte 33/33, escuadrón, mascota, boss v2).
2. ✅ Profundización: mapa+rangos, recompensas semanales, milestones, equipo 2.0.
3. **Expansión (pendiente):**
   - Temporadas (battle pass con niveles + rewards).
   - Más compañeros reclutables (Biblia v5) + overlays de armadura.
   - Calendario de eventos especiales.
   - Prototipo Godot de 1 escena.
   - Sistema de guildas/clanes grandes (actualmente colonias pequeñas).

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
| 2026-08-17 | L4 | 🔧 escuadrón Aguijón/Elara/Kael (dps/archer/mage, looks propios). |
| 2026-08-17 | L5 | 🔧 cienpies → mascota (`look{pet,crown}`, petCastT). |
| 2026-08-17 | L6 | 🎬 `hero_human_a_idle` + rework right-facing · Biblia v5. |
| 2026-08-17 | L7 | 🎬 sets completos Elara/Kael · idles dedicados · muertes 3-4. |
| 2026-08-17 | L8 | 👑 Rey Bestia v2 + `HOOKS.bossRoar` + TARGET_H 130 → arte 33/33. |
| 2026-08-18 | L9 | 🔧 fallbacks en phaser-setup (sheets faltantes → hermano). |
| 2026-08-18 | L10 | 🔧 nombres alineados (boss_*) + MERGE_GAP fix avispa + CORS. |
| 2026-08-18 | L11 | 🗺️ Mapa con capítulos + rangos S/A/B/C/R + travelToStage. |
| 2026-08-18 | L12 | ⚡ skipToRecord + sync indicator + stats por capítulo + bonus de rangos. |
| 2026-08-18 | L13 | 🎁 Recompensas semanales (server-auth) + milestones Torre 10/25/50/100. |
| 2026-08-18 | L14 | 🎒 Equipo 2.0: esencia, amuletos, forja, rotura, mochila ampliable, auto-fundir, bloqueo. |
| 2026-08-18 | UI | 💅 Modal equipo: sticky ✖ · columnas scroll · tooltips · orden mochila. |
| 2026-08-18 | README | 📝 Actualizado al estado Lote 14 + UI final. |

---

## 🤝 Metodología (recordatorio)
- Cambio → **archivo completo** · antes → **revisar mejoras** · **divide y vencerás** ·
  cada cambio → **§CHANGELOG** + secciones afectadas.