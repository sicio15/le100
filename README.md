# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas y progresión por prestigio (ADN).

- **Versión:** 3.1.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta · **Arte 27/27** · **Deudas #1–#9 aplicadas ✅** (ver §Deuda)

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
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave(): el cliente NUNCA decide números
│   ├── power.js         # powerOf()/bossMax(): fórmulas server (arena/colonias)
│   ├── ranking.js       # Ranking en memoria + broadcast 'top'
│   ├── arena.js         # arenaInfo (1 sola lectura) / arenaFight
│   └── colonies.js      # single-get + ensureBossDay + donate bulk
└── public/
    ├── index.html       # RECONSTRUIDO: 16 modales + IDs validados + orden de scripts (deuda #6)
    ├── css/style.css    # estilos completos + media portrait mobile
    ├── img/             # 20 sheets + 5 fondos + logo + icons (27/27, ver §Arte)
    └── js/
        ├── core/
        │   ├── config.js   # $, fmt, COSTS, UPDEF, ACH, SETTINGS, CHAPTERS, HEROES, SLOT_DEFS
        │   ├── store.js    # S, persist, applyServerSave, fórmulas, dropItem, EVENTS,
        │   │               # checkDailyResets() central (deuda #4)
        │   ├── net.js      # socket, netAuth, netSendSave, netScore, LB + TOKEN de sesión (deuda #8)
        │   ├── audio.js    # Chiptune WebAudio procedural por capítulo + SFX 8-bit
        │   └── assets.js   # chroma/analyze/PREP/loadImg + prepareAll PARALELO (deuda #1)
        ├── game/
        │   ├── battle.js       # LÓGICA PURA sin DOM (deuda #7): todo sale por VFX/HOOKS
        │   ├── battle-scene.js # RENDER Phaser: VFX, HOOKS (boss bar + cut-in), paperdoll, parallax
        │   ├── phaser-setup.js # BootScene + ANIM_DEFS (strips → spritesheets → anims)
        │   ├── icons.js        # íconos pixel desde img/icons.png (fallback emojis; lo carga main.js)
        │   └── main.js         # bootstrap Phaser.Game (último script)
        ├── ui/
        │   ├── ui.js           # toast, wire, EL (caché DOM) + UI_HOOKS onGearOpen (deuda #9)
        │   ├── ui-auth.js      # login/registro/invitado + AUTO-LOGIN por token + offline + tutorial
        │   ├── ui-hud.js       # mejoras, velocidad, settings, logros, prestigio, uiTick · logout limpia token
        │   ├── ui-gear.js      # equipo + fireGearOpen() al abrir
        │   ├── autoequip.js    # QoL vía hook onGearOpen (sin setTimeout)
        │   ├── ui-shop.js      # Tienda ADN + skins · monkey-patchea applyServerSave
        │   ├── ui-look.js      # Vestidor paperdoll · monkey-patchea applyServerSave
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

### Orden de `<script>` (CRÍTICO — globals clásicos, sin módulos; validado en index.html)

```
socket.io.js → phaser
core/config.js → core/assets.js → core/audio.js → core/net.js → core/store.js
ui/ui.js → game/battle.js → game/phaser-setup.js → game/battle-scene.js
ui/ui-hud.js → ui/ui-gear.js → ui/autoequip.js → ui/ui-shop.js → ui/ui-look.js
ui/ui-stats.js → ui/ui-events.js → ui/ui-missions.js
modes/sim.js → modes/daily.js → modes/tower.js → modes/rogue.js → social/social.js
ui/ui-auth.js → game/main.js   (main.js SIEMPRE último; icons.js lo carga él dinámico)
```

Notas: `net.js` antes que `store.js` (`setInterval(persist,5000)` usa `netSendSave`);
`ui-shop.js`/`ui-look.js` monkey-patchean `applyServerSave` antes de `ui-auth.js`;
`sim.js` antes que los modos (define `fightChance`/`rollFight`).

### Estado global (quién define qué)

| Global | Define | Uso |
|---|---|---|
| `S` | store.js | Save completo (ver §Save) |
| `authed` | store.js (let) | ui-auth la muta; persist/net la leen |
| `SETTINGS` | config.js | audio/volúmenes/velocidad/reduceFx/tutorial |
| `socket`, `LB` | net.js | conexión + leaderboard broadcasteado |
| `TOKEN_KEY`, `netGet/Set/ClearToken`, `netLoginToken` | net.js | sesión persistente (deuda #8) |
| `squad`, `enemies`, `time`, `advance`, `shieldT` | battle.js | estado de combate |
| `W`, `H` | config.js (muta BattleScene) | viewport |
| `EL` | ui.js | caché DOM hot-path (0 getElementById por tick) |
| `UI_HOOKS`, `onGearOpen`, `fireGearOpen` | ui.js | hooks QoL (deuda #9) |
| `PREP`, `STRIP_H` | assets.js | strips normalizadas (alto 160px) |
| `ANIM_KINDS` | phaser-setup.js | kinds de enemigos según sheets reales |
| `Audio` | audio.js | motor chiptune + SFX |
| `VFX`, `HOOKS` | battle.js (implementa BattleScene) | `HOOKS` = ult/crit/kill/cutin/bossShow/bossHide/bossTick |
| `fightChance`, `rollFight` | modes/sim.js | simulación compartida (deuda #5) |

### Flujo de guardado + sesión

0. **Auto-login (deuda #8):** si hay token en `localStorage` → `loginToken` al conectar;
   el server valida el **hash SHA-256** guardado en el doc y restaura sesión sin tocar el login.
   Token se **rota** en login/register manual y se **limpia** en logout.
1. `persist()` → `localStorage['le100_cache_v4']` + (si `authed`) `netSendSave(S)`.
2. Autoguardado: `setInterval(5s)` + `visibilitychange`/`beforeunload`/`pagehide`.
3. Server: throttle 2s por socket → `sanitizeSave()` → `U.save()`.
4. Login/registro/auto-login devuelven `save` saneado → `applyServerSave()` (+ patches de shop/look).

---

## 📡 Protocolo Socket.IO

| Evento | Dir | Payload → Ack |
|---|---|---|
| `register` / `login` | C→S | `{name,pass}` → `{ok,name,save,token}` ó `{ok:false,err}` |
| `loginToken` | C→S | `token` → `{ok,name,save,token}` ó `{ok:false}` (deuda #8) |
| `saveGame` | C→S | save (sin ack, throttle 2s) |
| `score` | C→S | `{name,stage}` (ranking) |
| `top` | S→C | lista top-10 etapas |
| `arenaInfo` | C→S | → `{ops[3 cercanos], top[10]}` (1 sola lectura de users, deuda #2) |
| `arenaFight` | C→S | `opName` → `{win,msg}` |
| `colonyInfo` | C→S | → `{in,list,members,me}` (single-get, deuda #3) |
| `colonyCreate/Join/Leave` | C→S | name/key/– → `{ok[,err]}` |
| `colonyDonate` | C→S | → `{ok,level}` (bulk `U.setColonyLevel`, deuda #3) |
| `colonyBoss` | C→S | → `{ok,dmg,killed,hp,max}` |
| `colonyClaim` | C→S | → `{ok,g}` |

**Server:** `sanitize.js` = única fuente de verdad de rangos/whitelists (gear, shop, look, tickets…).
`power.js` replica `dps()/maxHP()` **incluyendo tienda ADN** (fury/vita) para una Arena justa.

---

## 💾 Save (`DEF_SAVE`, espejo cliente/servidor)

`gold, adn, stage, best, kills, prestiges, prBase, ups{dmg,vit,regen,venom,fortune},
ach{}, gear{equipped{fang,shell,antenna,charm}, inv[≤30]}, tickets/ticketDate,
tower/towerBest, rlTickets/rlDate, arenaPts/arenaTickets/arenaDate, colony, colonyLevel,
bossTicketDate, mDate/mBase/mClaimed, shop{lv,skins,skin}, look{form,hair,crown}, last`
(+ campo server-only `tokenHash` en el doc de usuario, nunca en el save).

---

## ⚔️ Sistemas y números clave

### Combate principal
- Etapas infinitas; **jefe cada 5** (timer 30s). Caer → −1 etapa y farmeo.
- Kills por etapa: 8 (jefe: 1). Capítulos cada 10 etapas (fondo+música): Bosque/Cueva/Pantano.
- Escuadrón: **Aguijón** (dps, etapa 1) · **Caparazón** (tank, 5) · **Hojita** (support, 10).
  Energía → ultimate con cut-in (dps: 3 golpes; tank: escudo 3s ×0.4; support: cura 30%).
- Avance por proximidad (`advance`), repliegue en jefe y al caer (re-entrada desde pantalla).
- **battle.js es lógica pura** (deuda #7): barra de jefe y cut-in salen por `HOOKS`
  (implementados en battle-scene con refs DOM cacheadas 1 sola vez).

### Fórmulas (store.js ↔ sanitize/power espejo)

```
dps   = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1)) · (1+.05·shopFury) · evFuria
maxHP = 100·1.22^vit · (1+hp%/100) · (1+.05·shopVita) · evVital
crit  = min(.75, .2 + crit%/100 + .02·shopCrit + evPrecisión) · critMult = 2.2 + critd%/100
veneno: cd = max(2, max(3, 7−.3·venom) − evTóxico) · dmg = dps·(2+.5·venom)·ev
goldKill(st) = ⌈3·1.18^st⌉ · (1+.25·fortune) · adnMult · (1+.05·shopFort) · evFiebre
eHP(st)=10·1.27^st · eDmg(st)=4·1.22^st · cost(k)=⌊base·mult^lv⌋ (evRacha ×0.8)
```

### Simulación de modos (modes/sim.js, deuda #5)
`fightChance(st, hpMul, atkMul, {our, aguante, min})` → prob = `(our / eHP·mul)`, con aguante
(`maxHP/(atk·0.5) ≥ 20 ? ×1 : ×0.5`) y clamp `[min, 0.95]` · `rollFight(ch)` = roll.
- Daily: `fightChance(best+5, 12, 2.5, {min:.1})`
- Torre: `fightChance(best+f, 6+f·.5, 1.5+f·.08)`
- Rogue: `fightChance(st, 8, 1.5, {aguante:false, our: dps·b.dmg·10·(1+b.crit)·(1+b.ven·.2)})`

### Prestigio
`prTotal(x)=⌊3·√max(0,x−8)⌋`; ganancia = `prTotal(best)−prTotal(prBase)`; requiere `best≥10`.
Reset: oro, etapa, mejoras. Cada 🧬 = +10% daño y oro permanente.

### Equipo
- 4 slots · rarezas `[Común..Mítico]` pesos `[50,30,14,5,1]` (+luck) · 0–2 subs · lvl ≤99.
- Mejorar: `⌊20·1.35^lvl·(rar+1)⌋`  · Mochila 30 (llena → convierte a oro).

### Modos secundarios (tickets diarios, reset único en `checkDailyResets()`, deuda #4)

| Modo | Tickets | Premios |
|---|---|---|
| 🎯 Jefe Diario | 3 | oro ×40/×8 + drop garantizado |
| 🗼 Torre |  (oro) | cada 3 pisos 🎒 · cada 10 +1🧬 |
| 🌀 Sotobosque | 2 | salas/3 → drop · 8/8 → +1🧬 |
| ⚔️ Arena | 5 | ±pts + oro |
| 🐲 Jefe Colonia | 1/día/miembro | claim de oro al matar |

### Colonias
Crear 10.000🪙 · máx 20 miembros · donar `1000·lvl`🪙 → +10xp · `lvl = 1+⌊xp/100⌋`
→ buff global +2% daño por nivel. Boss diario `1e6·lvl·miembros` (reset por `ensureBossDay`).

### Tienda de ADN (permanentes) + Skins
`fury/vita/fort/regen` (10 nv) · `crit` (5) · costo `base + lv·3` 🧬.
Skins (tints de escuadrón): oro 15🧬 · hielo 25🧬 · sombra 40🧬 (mutan `HEROES[].tint`).

### Eventos semanales (rotación determinística por semana epoch, 0 campos en save)
fiebre · precision · furia · vital · toxico · racha.

### Misiones diarias (6) + Logros (13)
Progreso derivado de stats (`mBase` snapshot diario) · perfecto = +1🧬.
Logros en `ACH` (config.js) con reward oro/ADN.

### Offline
`min(transcurrido, 8h) · goldKill(best) · 0.4` → modal RECLAMAR.

### Paperdoll / Vestidor
`look = {form: cienpies|humano, hair: a|b|c, crown}` (whitelist server).
Humano usa sheets `hero_human_{a,b,c}` (+`_attack`/`_hurt`); corona = overlay `acc_crown` anclado.
`HAIR_NAMES`: a=🟤 PICADO (castaño) · b=👱 ELFO (rubia) · c=🔵 MOHAWK (azul).

---

## 🎨 Arte: pipeline + inventario COMPLETO (27/27) + BIBLIA VISUAL

**Pipeline (`assets.js`):** PNG con fondo claro → `chroma()` (flood-fill blanco/casi-blanco → alpha,
umbral >205/>205/>200; también elimina el borde-sticker del logo) → `analyze()` (blobs ordenados
por fila+columna, descarta piezas <35% del alto máx) → normaliza a **alto 160px** → **strip
horizontal** → `BootScene` registra spritesheet + anims (`ANIM_DEFS`). Carga **en paralelo**
(`Promise.all`, deuda #1). **Robustez:** sheet faltante → warn y sigue; `safePlay`/`ANIM_KINDS`
usan solo lo existente.

###  Biblia visual (guía de estilo para generaciones consistentes)

**Estilo global (todo sheet de personaje/enemigo):**
- Chibi/kawaii pixel-art 16-bit, **2–2.5 cabezas** (cabeza ≈ 45–50% del cuerpo).
- **Contorno negro grueso** (2–3px), cel-shading suave, **rubor rosado**, ojos grandes con brillos.
- Fondo **lavanda muy claro uniforme (≈ #EAE8F2)** (canales >205 → compatible con `chroma()`).
- Sombra elíptica gris-lavanda bajo el personaje (parte del blob, correcto).
- Frames en fila(s) horizontal(es) **bien separados**; sin texto/watermark/borde sticker.
- Altura de pie ≈ 60–75% del alto de la imagen, consistente entre sheets del mismo char.

**Paleta base (no variar):**

| Elemento | Colores |
|---|---|
| Cienpies cuerpo/cabeza | verde #7EC87E |
| Cienpies panza | crema #F5F0D0 segmentada |
| Cienpies patas | naranja #F5A040 |
| Cienpies capa | roja #C03030 |
| Antenas | verdes con esfera blanca |
| Túnica humana | verde #3E8E5A |
| Correa/belt/brazaletes | cuero #8B5A2B, hebilla gris |
| Botas | marrón #8B5A3B |
| Espada espalda | empuñadura marrón + hoja gris |
| Corona | oro #E8C050 + gemas rojas |

**Descripciones BASE (copiar VERBATIM en cada prompt):**
- 🐛 **Cienpies:** "cute green caterpillar hero with big round head, huge black shiny eyes with
  white highlights, cream segmented belly, tiny orange feet, red cape tied at the neck,
  two green antennae with white ball tips, pink blush cheeks"
- 🧍 **human_a (🟤 PICADO):** "chibi boy with messy spiky brown hair, green tunic, brown leather
  cross strap with sword sheathed on back, belt with gray buckle, brown wristbands and boots, pink blush"
- 🧍 **human_b (👱 ELFO):** "chibi elf girl with long blonde hair and pointy elf ears, green tunic,
  brown leather cross strap with sword on back, belt with gray buckle, brown boots, pink blush"
- 🧍 **human_c (🔵 MOHAWK):** "chibi boy with spiky bright blue mohawk and shaved gray sides,
  blue eyebrows, green tunic, brown leather cross strap with sword on back, belt with gray buckle,
  brown boots, pink blush"

**Enemigos (base):** beetle (cabeza roja, caparazón púrpura) · spider (azul peluda, ojos cian) ·
wasp (rayas amarillo/negro, ojos rojos, alas celestes) · scorpion (púrpura, pinzas rojas, aguijón
verde) · boss (bestia roja musculosa, armadura dorada con picos, corona, 2 frames yoyo).

**Fondos (sin chroma):** `bg` bosque nocturno · `bg_cave` cueva cristal · `bg_swamp` pantano tóxico ·
`bg_tower` salón de piedra (modal Torre) · `bg_rogue` sendero bosque (modal Sotobosque).

**🎯 Plantilla de prompt (Qwen-Image 3.0) para sheets nuevos:**

```
chibi pixel art sprite sheet, [DESCRIPCIÓN BASE], [N] frames in one horizontal row:
[POSES EN ORDEN DE ANIM], uniform very light lavender background (#EAE8F2), thick black outlines,
soft cel shading, pink blush cheeks, huge shiny eyes, soft ground shadow under each frame,
consistent character size and palette across frames, wide spacing between frames,
no text, no watermark, 16-bit style
```

**Reglas de consistencia:** 1) descripción base completa siempre · 2) no cambiar ropa/paleta,
solo poses · 3) mismo fondo/escala que sheets existentes · 4) orden de frames = ventanas de
`ANIM_DEFS` (dolor primero, muerte al final) · 5) referenciar sheets existentes del personaje.

### Sheets (20)

| Archivo | Contenido | Frames | Ventanas/anim |
|---|---|---|---|
| `hero_walk.png` | Cienpies caminando | 4 | loop fps12 |
| `hero_idle.png` | Cienpies idle | 3 | loop fps3 |
| `hero_attack.png` | Cienpies ataque | 6 | one-shot fps14 |
| `hero_cast.png` | Escupir orbe veneno | 3 | one-shot fps10 |
| `hero_hurt.png` | Dolor + muerte | 6 | hurt 0-2 · death 3-5 |
| `enemy_beetle.png` | Escarabajo | 4 | loop fps7 |
| `enemy_spider.png` | Araña azul | 4 | loop fps10 |
| `enemy_wasp.png` | Avispa | 4 | loop fps12 |
| `enemy_scorpion.png` | Escorpión | 4 | loop fps8 |
| `enemy_boss.png` | Rey bestia | 2 | yoyo fps3 |
| `hero_human_a.png` | Castaño walk | 4 | loop fps10 |
| `hero_human_a_attack.png` | Castaño ataque | 4 | one-shot fps9 |
| `hero_human_a_hurt.png` | Castaño dolor+caída *(generado)* | 5 | hurt 0-2 · death 3-4 |
| `hero_human_b.png` | Elfa walk | 4 | loop fps10 |
| `hero_human_b_attack.png` | Elfa ataque | 4 | one-shot fps9 |
| `hero_human_b_hurt.png` | Elfa dolor+muerte | 7 | hurt 0-2 · death 5-6 |
| `hero_human_c.png` | Mohawk walk | 5 | loop fps10 |
| `hero_human_c_attack.png` | Mohawk ataque | 4 | one-shot fps9 |
| `hero_human_c_hurt.png` | Mohawk dolor+caída *(generado)* | 5 | hurt 0-2 · death 3-4 |
| `acc_crown.png` | Corona overlay | 1 | estática |

### Fondos (5) + UI (2)

| Archivo | Uso |
|---|---|
| `bg.png` / `bg_cave.png` / `bg_swamp.png` | Capítulos 1/2/3 |
| `bg_tower.png` / `bg_rogue.png` | Fondos modales Torre / Sotobosque (CSS) |
| `logo.png` | Logo chroma (login) |
| `icons.png` | 10 íconos 3 filas → orden = `ICON_NAMES` ✔ |

---

## 🧠 Informe estratégico (resumen del PDF)

- **Motor:** Phaser hoy; **Godot** candidata a largo plazo (prototipo comparativo). Unity descartada.
- **Rendimiento:** strips/atlases (✅ PREP), batching, `reduceFx`.
- **Personalización:** paperdoll por capas (✅ form/hair/crown) con descubrimiento progresivo.
- **Retención:** cloud save (✅ + sesión token), eventos (✅ semanales v1), UI responsive (✅).

---

## 🔧 Deuda técnica — ESTADO TRAS 5 LOTES

| # | Deuda | Solución aplicada | Lote |
|---|---|---|---|
| 1 | `prepareAll` en serie | `Promise.all` + `prepareSheet()` | 1 ✅ |
| 2 | `arenaInfo` 2× `U.all()` | 1 sola lectura | 1 ✅ |
| 3 | `colonyDonate` N writes | `U.setColonyLevel()` bulk + single-get + `ensureBossDay` | 1 ✅ |
| 4 | Resets triplicados | `store.checkDailyResets()` (alias `checkTickets`/`checkMissions`) | 1+2A ✅ |
| 5 | Simulación duplicada | `modes/sim.js` (`fightChance`/`rollFight`) | 3A ✅ |
| 6 | `index.html` sin validar | Reconstruido: 16 modales, IDs verificados, orden de scripts | 3A ✅ |
| 7 | `battle.js` tocaba DOM | `HOOKS.bossShow/bossHide/bossTick/cutin` (refs cacheadas en scene) | 2B ✅ |
| 8 | Sesión no persistida | Token localStorage + hash SHA-256 server + `loginToken` + rotación | 2C ✅ |
| 9 | `autoequip` setTimeout(0) | `UI_HOOKS.onGearOpen`/`fireGearOpen` | 2A ✅ |
| 10 | Atlas unificado | pendiente (baja) | — |
| 11 | Prototipo Godot | pendiente (baja) | — |

---

## 🗺️ Roadmap

1. **Consolidación:** ✅ completada (deudas #1–#9 + index.html + arte 27/27 + Biblia Visual).
2. **Profundización:** eventos v2, recompensas semanales Arena/Colonias, indicador de sync
   cloud-save en UI, árbol de habilidades ramificado (del informe).
3. **Expansión:** más capas de paperdoll (armaduras overlay con la Biblia Visual),
   calendario editorial de eventos, prototipo Godot de 1 escena.

---

## 📝 CHANGELOG

| Fecha | Cambio |
|---|---|
| 2026-08-17 | 📄 README creado: inventario v3.1.0, protocolo, fórmulas y deuda técnica. |
| 2026-08-17 | 🎨 §Arte verificado (25/27) contra `ANIM_DEFS` e `ICON_NAMES` (icons = mapeo 1:1 ✔). |
| 2026-08-17 | 🎨 Generados `hero_human_a_hurt`/`hero_human_c_hurt` (Qwen-Image 3.0) → 27/27. |
| 2026-08-17 | 📖 §Biblia Visual: estilo, paletas, descripciones base y plantilla de prompt. |
| 2026-08-17 | 🔧 **Lote 1:** assets paralelo (#1) · arena 1 lectura (#2) · colonias bulk (#3) · store `checkDailyResets` (#4) · storage `setColonyLevel/patch/findByTokenHash`. |
| 2026-08-17 | 🔧 **Lote 2A:** daily/rogue/social/missions/auth → `checkDailyResets` · `UI_HOOKS` gearOpen · autoequip por hook (#9). |
| 2026-08-17 | 🔧 **Lote 2B:** `battle.js` 100% sin DOM (#7): HOOKS boss bar + cut-in; scene con refs cacheadas. |
| 2026-08-17 | 🔧 **Lote 2C:** sesión persistente con token (#8): net/server/ui-auth/ui-hud. |
| 2026-08-17 | 🔧 **Lote 3A:** `modes/sim.js` (#5) + daily/tower/rogue lo consumen · `index.html` reconstruido (#6). |
| 2026-08-17 | 📝 **Lote 3B:** README actualizado al estado final post-optimizaciones. |

---

## 🤝 Metodología de trabajo (recordatorio)

- Todo cambio → **archivo completo** en la respuesta.
- Antes de cambiar → **revisar mejoras/optimizaciones** del archivo y su entorno.
- **Divide y vencerás:** módulos por dominio (core/game/ui/modes/social · server/*).
- Cada cambio → **actualizar §CHANGELOG** (y secciones afectadas) de este README.