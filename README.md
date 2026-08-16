# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas, escuadrón de compañeros,
mascota y progresión por prestigio (ADN).

- **Versión:** 3.1.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta · **Arte 28/28** · **Deudas #1–#9 ✅** (ver §Deuda)

> 📌 **Convención de trabajo:** todo cambio se entrega como **archivo completo**,
> con **revisión previa de mejoras/optimizaciones**, y se registra en el §CHANGELOG.
> Metodología: **divide y vencerás** (módulos pequeños por dominio).

---

## 🚀 Quick start

```bash
npm install
node dev.js        # DEV: live-reload + no-cache → http://localhost:3000
node server.js     # PROD
MONGO_URI=mongodb://... node server.js   # persistencia real (sin esto: memoria)
```

---

## 📁 Árbol de carpetas

```
le100/
├── server.js            # Orquestador: Express + Socket.IO + DEV live-reload + tokens de sesión
├── dev.js               # node dev.js → DEV=1
├── package.json         # v3.1.0 · deps: express, socket.io, mongodb
├── README.md            # ← este documento vivo
├── server/
│   ├── storage.js       # U/C: Mongo o memoria · setColonyLevel (bulk) · patch · findByTokenHash
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave() · look{pet,crown}
│   ├── power.js         # powerOf()/bossMax(): fórmulas server (arena/colonias)
│   ├── ranking.js       # Ranking en memoria + broadcast 'top'
│   ├── arena.js         # arenaInfo (1 sola lectura) / arenaFight
│   └── colonies.js      # single-get + ensureBossDay + donate bulk
└── public/
    ├── index.html       # RECONSTRUIDO: 16 modales + IDs validados + orden de scripts (deuda #6)
    ├── css/style.css    # estilos completos + media portrait mobile
    ├── img/             # 21 sheets + 5 fondos + logo + icons (28/28, ver §Arte)
    └── js/
        ├── core/
        │   ├── config.js   # $, fmt, COSTS, UPDEF, ACH, SETTINGS, CHAPTERS, HEROES (squad Lote 4), SLOT_DEFS
        │   ├── store.js    # S, persist, applyServerSave, fórmulas, dropItem, EVENTS, checkDailyResets() (deuda #4)
        │   ├── net.js      # socket + netAuth/netSendSave/netScore/LB + TOKEN de sesión (deuda #8)
        │   ├── audio.js    # Chiptune WebAudio procedural por capítulo + SFX 8-bit
        │   └── assets.js   # chroma/analyze/PREP/loadImg + prepareAll PARALELO (deuda #1) · +hero_human_a_idle
        ├── game/
        │   ├── battle.js       # LÓGICA PURA sin DOM (deuda #7) · roles dps/archer/mage · petCastT (mascota)
        │   ├── battle-scene.js # RENDER: VFX, HOOKS (boss+cut-in), paperdoll por miembro, MASCOTA, parallax
        │   ├── phaser-setup.js # BootScene + ANIM_DEFS (human_a_idle con sheet dedicado, Lote 6)
        │   ├── icons.js        # íconos pixel desde img/icons.png (fallback emojis; lo carga main.js)
        │   └── main.js         # bootstrap Phaser.Game (último script)
        ├── ui/
        │   ├── ui.js           # toast, wire, EL (caché DOM) + UI_HOOKS onGearOpen (deuda #9)
        │   ├── ui-auth.js      # login/registro/invitado + AUTO-LOGIN por token + offline + tutorial
        │   ├── ui-hud.js       # mejoras, velocidad, settings, logros, prestigio, uiTick · logout limpia token
        │   ├── ui-gear.js      # equipo + fireGearOpen() al abrir
        │   ├── autoequip.js    # QoL vía hook onGearOpen (sin setTimeout)
        │   ├── ui-shop.js      # Tienda ADN + skins (tints por id) · monkey-patchea applyServerSave
        │   ├── ui-look.js      # Vestidor: MASCOTA + corona
        │   ├── ui-stats.js     # panel de transparencia de multiplicadores
        │   ├── ui-events.js    # badge + anuncio del evento semanal
        │   └── ui-missions.js  # misiones diarias (checkMissions = alias de checkDailyResets)
        ├── modes/
        │   ├── sim.js          # fightChance()/rollFight(): simulación compartida (deuda #5)
        │   ├── daily.js        # Jefe Diario (3 tickets/día)
        │   ├── tower.js        # Torre Infinita
        │   └── rogue.js        # El Sotobosque (8 salas, buffs 1-de-3)
        └── social/
            └── social.js       # UI Arena PvP + Colonias (netEmit/netCall)
```

---

## 🧱 Arquitectura cliente

### Orden de `<script>` (CRÍTICO — globals clásicos; validado en index.html)

```
socket.io.js → phaser
core/config.js → core/assets.js → core/audio.js → core/net.js → core/store.js
ui/ui.js → game/battle.js → game/phaser-setup.js → game/battle-scene.js
ui/ui-hud.js → ui/ui-gear.js → ui/autoequip.js → ui/ui-shop.js → ui/ui-look.js
ui/ui-stats.js → ui/ui-events.js → ui/ui-missions.js
modes/sim.js → modes/daily.js → modes/tower.js → modes/rogue.js → social/social.js
ui/ui-auth.js → game/main.js   (main.js SIEMPRE último; icons.js lo carga él dinámico)
```

### Estado global (quién define qué)

| Global | Define | Uso |
|---|---|---|
| `S` | store.js | Save completo (ver §Save) |
| `authed` | store.js (let) | ui-auth la muta; persist/net la leen |
| `SETTINGS` | config.js | audio/volúmenes/velocidad/reduceFx/tutorial |
| `socket`, `LB` | net.js | conexión + leaderboard |
| `TOKEN_KEY`, `netGet/Set/ClearToken`, `netLoginToken` | net.js | sesión persistente (deuda #8) |
| `squad`, `enemies`, `time`, `advance`, `petCastT` | battle.js | combate + cast de la mascota |
| `W`, `H` | config.js (muta BattleScene) | viewport |
| `EL` | ui.js | caché DOM hot-path (0 getElementById por tick) |
| `UI_HOOKS`, `onGearOpen`, `fireGearOpen` | ui.js | hooks QoL (deuda #9) |
| `PREP`, `STRIP_H` | assets.js | strips normalizadas (alto 160px) |
| `ANIM_KINDS` | phaser-setup.js | kinds de enemigos según sheets reales |
| `Audio` | audio.js | motor chiptune + SFX |
| `VFX`, `HOOKS` | battle.js (implementa BattleScene) | ult/crit/kill/cutin/bossShow/bossHide/bossTick |
| `fightChance`, `rollFight` | modes/sim.js | simulación compartida (deuda #5) |

### Flujo de guardado + sesión

0. **Auto-login (deuda #8):** token en `localStorage` → `loginToken`; server valida hash SHA-256.
   Token rota en login/register manual; se limpia en logout.
1. `persist()` → `localStorage['le100_cache_v4']` + (si `authed`) `netSendSave(S)`.
2. Autoguardado: `setInterval(5s)` + `visibilitychange`/`beforeunload`/`pagehide`.
3. Server: throttle 2s → `sanitizeSave()` → `U.save()`.
4. Login/registro/auto-login → `applyServerSave()` (+ patches de shop/look).

---

## 📡 Protocolo Socket.IO

| Evento | Dir | Payload → Ack |
|---|---|---|
| `register` / `login` | C→S | `{name,pass}` → `{ok,name,save,token}` ó `{ok:false,err}` |
| `loginToken` | C→S | `token` → `{ok,name,save,token}` ó `{ok:false}` |
| `saveGame` | C→S | save (throttle 2s) |
| `score` / `top` | C→S / S→C | ranking de etapas |
| `arenaInfo` / `arenaFight` | C→S | `{ops,top}` / `{win,msg}` |
| `colonyInfo/Create/Join/Leave/Donate/Boss/Claim` | C→S | ver §Colonias |

**Server:** `sanitize.js` = única fuente de verdad · `power.js` replica `dps()/maxHP()` con tienda ADN.

---

## 💾 Save (`DEF_SAVE`, espejo cliente/servidor)

`gold, adn, stage, best, kills, prestiges, prBase, ups{dmg,vit,regen,venom,fortune},
ach{}, gear{equipped{fang,shell,antenna,charm}, inv[≤30]}, tickets/ticketDate,
tower/towerBest, rlTickets/rlDate, arenaPts/arenaTickets/arenaDate, colony, colonyLevel,
bossTicketDate, mDate/mBase/mClaimed, shop{lv,skins,skin}, look{pet,crown}, last`
(+ `tokenHash` server-only). Saves viejos (`form/hair`) migran a `look={pet:true,crown}`.

---

## ⚔️ Sistemas y números clave

### Combate principal + escuadrón (LOTE 4)
- Etapas infinitas · **jefe cada 5** (30s) · caer → −1 etapa · capítulos cada 10 (fondo+música).
- **Personajes con sheet propio** (fix bug "3 iguales"):
  - 🗡️ **Aguijón** — principal (`human_a`) · `dps` melee · etapa 1 · *Tajo Triple*.
  - 🏹 **Elara** — elfa arquera (`human_b`) · `archer` · etapa 5 · *Lluvia de Flechas* (AoE).
  - 🔮 **Kael** — mago mohawk (`human_c`) · `mage` · etapa 10 · *Nova Arcana* (AoE + cura 15%).
- Vida: 45/30/25% · daño básico: 100/85/55% · formación dps→archer→mage · regen pasiva al más herido.
- **battle.js lógica pura** (deuda #7): boss bar y cut-in vía `HOOKS` (refs cacheadas en scene).

### 🐛 Mascota (LOTE 5)
- Cienpies = mascota toggleable (`S.look.pet`, default on) · escala 0.62 + bob · camina detrás de Aguijón.
- El **veneno** lo escupe ella (`petCastT` → `hero_cast`) · puede llevar corona 👑 · sin efecto jugable al ocultarla.

### Fórmulas (store.js ↔ sanitize/power espejo)

```
dps   = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1)) · (1+.05·shopFury) · evFuria
maxHP = 100·1.22^vit · (1+hp%/100) · (1+.05·shopVita) · evVital
crit  = min(.75, .2+crit%/100 + .02·shopCrit + evPrecisión) · critMult = 2.2 + critd%/100
veneno: cd = max(2, max(3,7−.3·venom) − evTóxico) · dmg = dps·(2+.5·venom)·ev
goldKill(st) = ⌈3·1.18^st⌉ · (1+.25·fortune) · adnMult · (1+.05·shopFort) · evFiebre
eHP(st)=10·1.27^st · eDmg(st)=4·1.22^st · cost(k)=⌊base·mult^lv⌋ (evRacha ×0.8)
```

### Simulación de modos (modes/sim.js, deuda #5)
`fightChance(st,hpMul,atkMul,{our,aguante,min})` + `rollFight(ch)`:
Daily `(best+5,12,2.5,min .1)` · Torre `(best+f, 6+f·.5, 1.5+f·.08)` ·
Rogue `(st,8,1.5,{aguante:false,our custom})`.

### Prestigio · Equipo · Modos · Colonias · Tienda · Eventos · Misiones · Offline
- Prestigio: `prTotal=⌊3·√max(0,x−8)⌋` · requiere `best≥10` · 🧬 = +10% daño/oro.
- Equipo: 4 slots · rarezas pesos `[50,30,14,5,1]` · subs 0–2 · mejorar `⌊20·1.35^lvl·(rar+1)⌋` · mochila 30.
- Modos (reset único `checkDailyResets()`): Daily 3🎟️ · Torre ∞(oro) · Sotobosque 2🎟️ · Arena 5🎟️ · Jefe Colonia 1/día.
- Colonias: crear 10k🪙 · máx 20 · donar `1000·lvl`→+10xp · `lvl=1+⌊xp/100⌋` · boss `1e6·lvl·miembros`.
- Tienda ADN: fury/vita/fort/regen(10) crit(5) · costo `base+lv·3` · skins por `id` (tints).
- Eventos semanales determinísticos (6) · Misiones 6/día (perfecto +1🧬) · Logros 13.
- Offline: `min(Δt,8h)·goldKill(best)·0.4`.

### Vestidor
`look={pet,crown}` · corona overlay en escuadrón + mascota · compañeros con sheet fijo.

---

## 🎨 Arte: pipeline + inventario (28/28) + BIBLIA VISUAL v5

**Pipeline (`assets.js`):** fondo claro → `chroma()` (>205/>205/>200) → `analyze()` (blobs fila+columna,
descarta <35% alto máx) → strip alto 160px → spritesheets+anims (`ANIM_DEFS`) · carga **paralela** (deuda #1).

### 🎬 Rework de animaciones (LOTE 6)
- `hero_human_a_idle.png` **nuevo** (sheet dedicado, respiración/blink) → `human_a_idle` ya no usa frame del walk.
- Walk/attack/hurt de Aguijón regenerados con **ciclo real de piernas/braceo** y **RIGHT-FACING LOCK**
  (todos los frames miran a la derecha, coherente con juego horizontal).
- Código sin tocar fuera de `assets.js` (SHEETS) y `phaser-setup.js` (tex de `human_a_idle`).

### 📖 Biblia Visual v5 — flujo de referencia (consistencia garantizada)
1. **Sheet canónica:** generar `hero_human_a.png` (walk) con el MASTER PROMPT v5 → queda como REFERENCIA.
2. **Sheets siguientes:** adjuntar la referencia + **REF-LOCK PROMPT** (no re-describe al personaje).
3. **Validar** con checklist antes de guardar; si deriva, regenerar con ambas referencias.
4. **Reglas de sesión:** mismo aspect ratio · mismo orden (walk→idle→attack→hurt) · solo cambia el bloque `POSES:`.

**Spec canónica AGUIJÓN (bloque LOCK verbatim):** chibi half-elf boy 2.5 cabezas (head 40% / torso 30% /
legs 30%) · pelo corto picado castaño #7A4A2B · ojos marrones #6B3E1E con 2 brillos · orejas semi-elfo ·
rubor #F79BB0 · túnica verde #4C9E6A manga corta · cross-strap único con hebilla plateada · belt #8B5A2B ·
muñequeras en AMBAS muñecas · botas #8B5A3B · espada envainada diagonal al hombro derecho ·
contorno negro grueso · cel-shading 1 tono · scale lock 70% del canvas · fondo plano #EAE8F2 +
sombra elíptica #C9C4DE · 1 fila horizontal · **FORBIDDEN:** pelo largo, ojos azules, girl, capa, capucha,
escudo, arco, magia, sin mangas, doble X-strap, texto/watermark, front/back view, mirar a cámara/izquierda.

**MASTER PROMPT v5** (primera sheet) = STYLE + CHARACTER LOCK + FACING LOCK + SCALE LOCK +
BACKGROUND LOCK + LAYOUT LOCK + FORBIDDEN + `POSES:` · **REF-LOCK** (siguientes) = "pixel-identical to
attached reference, ONLY poses change" + mismos bloques técnicos + `POSES:`.

**POSES:** walk(5) contacto/pasando alternado con braceo opuesto · idle(3) relajado/inhala/blink ·
attack(4) alerta→windup→tajo con arco→follow-through · hurt(5) puños→pecho→mareo→caída X→tirado X.

**Checklist manual:** silueta pelo ✔ · ojos marrones+orejas ✔ · 1 correa+belt ✔ · muñequeras ambas ✔ ·
todos mirando derecha ✔ · misma escala ~70% ✔ · fondo lavanda ✔.

**Specs pendientes (misma metodología):** Elara (elfa rubia pelo largo, arco) · Kael (mohawk azul, magia)
→ se generan con su propio LOCK + referencia de Aguijón para estilo compartido.

### Sheets (21)

| Archivo | Frames | Ventanas/anim |
|---|---|---|
| `hero_walk/idle/attack/cast/hurt` | 4/3/6/3/6 | mascota + héroe legacy |
| `enemy_beetle/spider/wasp/scorpion/boss` | 4/4/4/4/2 | loops + yoyo |
| `hero_human_a` | 5 | walk real (Lote 6) |
| `hero_human_a_idle` | 3 | **nuevo** dedicado (Lote 6) |
| `hero_human_a_attack` | 4 | one-shot (Lote 6) |
| `hero_human_a_hurt` | 5 | hurt 0-2 · death 3-4 |
| `hero_human_b` / `_attack` / `_hurt` | 5/4/7 | Elara (b_hurt death 5-6) |
| `hero_human_c` / `_attack` / `_hurt` | 5/4/5 | Kael |
| `acc_crown` | 1 | overlay |

### Fondos (5) + UI (2)
`bg`/`bg_cave`/`bg_swamp` (capítulos) · `bg_tower`/`bg_rogue` (modales CSS) · `logo.png` · `icons.png`
(10 íconos, orden = `ICON_NAMES` ✔).

---

## 🧠 Informe estratégico (resumen del PDF)
Phaser hoy · Godot candidata largo plazo · strips/atlases ✅ · paperdoll ✅ (compañeros + corona) ·
cloud save ✅ (+token) · eventos ✅ v1 · responsive ✅.

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
1. ✅ Consolidación (deudas, index.html, arte, escuadrón, mascota, animaciones).
2. **Profundización:** specs+sheets de Elara/Kael con Biblia v5 · eventos v2 · recompensas semanales ·
   indicador sync cloud-save · árbol de habilidades ramificado.
3. **Expansión:** más compañeros · overlays de armadura · calendario de eventos · prototipo Godot.

---

## 📝 CHANGELOG

| Fecha | Cambio |
|---|---|
| 2026-08-17 | 📄 README creado (inventario v3.1.0, protocolo, fórmulas, deuda). |
| 2026-08-17 | 🎨 Arte verificado 25/27 · hurts generados → 27/27 · Biblia Visual v1. |
| 2026-08-17 | 🔧 L1: assets paralelo · arena/colonias/storage · checkDailyResets. |
| 2026-08-17 | 🔧 L2A: resets migrados · UI_HOOKS gearOpen · autoequip hook. |
| 2026-08-17 | 🔧 L2B: battle sin DOM (HOOKS boss+cut-in). |
| 2026-08-17 | 🔧 L2C: sesión token (net/server/ui-auth/ui-hud). |
| 2026-08-17 | 🔧 L3A: modes/sim.js + index.html reconstruido. · 📝 L3B: README. |
| 2026-08-17 | 🔧 L4: escuadrón Aguijón/Elara/Kael (dps/archer/mage, looks propios, sanitize sin hair). |
| 2026-08-17 | 🔧 L5: cienpies → mascota (`look{pet,crown}`, petCastT, render pet, migración saves). |
| 2026-08-17 | 🎬 L6: `hero_human_a_idle` nuevo + rework walk/attack/hurt right-facing · Biblia Visual v5 (Master Prompt + REF-LOCK + flujo de referencia) → arte 28/28. |
| 2026-08-17 | 📝 README actualizado al estado final post-Lotes 1–6. |

---

## 🤝 Metodología (recordatorio)
- Cambio → **archivo completo** · antes → **revisar mejoras** · **divide y vencerás** ·
  cada cambio → **§CHANGELOG** + secciones afectadas.