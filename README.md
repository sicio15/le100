# 🐛 le100.io — Idle Cienpies

Juego **idle AFK** pixel-art, web + mobile (portrait incluido), con cuentas online,
ranking en vivo, Arena PvP, colonias cooperativas y progresión por prestigio (ADN).

- **Versión:** 3.1.0 (`package.json`)
- **Stack server:** Node + Express + Socket.IO (+ MongoDB opcional, fallback memoria)
- **Stack client:** JS vanilla (scripts clásicos, globals compartidos) + **Phaser 3** + WebAudio procedural
- **Estado:** jugable de punta a punta (ver §Sistemas) · **Arte: 27/27 completo**

> 📌 **Convención de trabajo:** todo cambio se entrega como **archivo completo**,
> con **revisión previa de mejoras/optimizaciones**, y se registra en el §CHANGELOG de este README.
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
├── server.js            # Orquestador: Express + Socket.IO + modo DEV (live-reload)
├── dev.js               # node dev.js → DEV=1
├── package.json         # v3.1.0 · deps: express, socket.io, mongodb
├── README.md            # ← este documento vivo
├── server/
│   ├── storage.js       # Repositorios U (users) y C (colonies): Mongo o Map() memoria
│   ├── sanitize.js      # DEF_SAVE + sanitizeSave(): el cliente NUNCA decide números
│   ├── power.js         # powerOf()/bossMax(): fórmulas server (arena/colonias)
│   ├── ranking.js       # Ranking de etapas en memoria + broadcast 'top'
│   ├── arena.js         # arenaInfo / arenaFight
│   └── colonies.js      # colonyInfo/create/join/leave/donate/boss/claim
└── public/
    ├── index.html       # topbar + battleWrap + bottombar + 14 modales
    ├── css/style.css    # estilos completos + media portrait mobile
    ├── img/             # 20 sheets + 5 fondos + logo + icons (ver §Arte, 27/27)
    └── js/
        ├── core/
        │   ├── config.js   # $, fmt, COSTS, UPDEF, ACH, SETTINGS, CHAPTERS, HEROES, SLOT_DEFS
        │   ├── store.js    # S, persist, applyServerSave, fórmulas, dropItem, EVENTS, shopLv
        │   ├── net.js      # socket, netAuth, netSendSave, netScore, LB
        │   ├── audio.js    # Chiptune WebAudio procedural por capítulo + SFX 8-bit
        │   └── assets.js   # chroma/analyze/PREP/loadImg/prepareAll (20 sheets)
        ├── game/
        │   ├── battle.js       # LÓGICA pura del combate (squad, enemies, update, VFX/HOOKS)
        │   ├── battle-scene.js # RENDER Phaser (VFX, paperdoll, parallax, uiTick 10Hz)
        │   ├── phaser-setup.js # BootScene + ANIM_DEFS (strips → spritesheets → anims)
        │   ├── icons.js        # íconos pixel desde img/icons.png (fallback emojis)
        │   └── main.js         # bootstrap Phaser.Game (último script)
        ├── ui/
        │   ├── ui.js           # toast, wire, EL (caché DOM hot-path), logo chroma
        │   ├── ui-auth.js      # login/registro/invitado, recompensa offline, tutorial
        │   ├── ui-hud.js       # mejoras, velocidad, settings, logros, prestigio, uiTick
        │   ├── ui-gear.js      # equipo: render/equipar/mejorar
        │   ├── autoequip.js    # QoL: botón AUTO-EQUIPAR inyectado en mGear
        │   ├── ui-shop.js      # Tienda ADN + skins · monkey-patchea applyServerSave
        │   ├── ui-look.js      # Vestidor paperdoll · monkey-patchea applyServerSave
        │   ├── ui-stats.js     # panel de transparencia de multiplicadores
        │   ├── ui-events.js    # badge + anuncio del evento semanal
        │   └── ui-missions.js  # misiones diarias + reset diario CENTRAL de tickets
        ├── modes/
        │   ├── daily.js        # Jefe Diario (3 tickets/día)
        │   ├── tower.js        # Torre Infinita (pisos crecientes)
        │   └── rogue.js        # El Sotobosque (8 salas, 2 tickets/día, buffs 1-de-3)
        └── social/
            └── social.js       # UI Arena PvP + Colonias (netEmit/netCall)
```

---

## 🧱 Arquitectura cliente

### Orden de `<script>` (CRÍTICO — globals clásicos, sin módulos)

```
socket.io.js → phaser
core/config.js → core/assets.js → core/audio.js → core/net.js → core/store.js
ui/ui.js → game/battle.js → game/phaser-setup.js → game/battle-scene.js
ui/ui-hud.js → ui/ui-gear.js → ui/autoequip.js → ui/ui-shop.js → ui/ui-look.js
ui/ui-stats.js → ui/ui-events.js → ui/ui-missions.js
modes/daily.js → modes/tower.js → modes/rogue.js → social/social.js
ui/ui-auth.js → game/main.js   (main.js SIEMPRE último)
```

Notas de orden: `net.js` antes que `store.js` (el `setInterval(persist,5000)` usa `netSendSave`);
`ui-shop.js`/`ui-look.js` **monkey-patchean `applyServerSave`** y deben correr antes de `ui-auth.js`
(quien lo invoca al loguear). `icons.js` lo carga `main.js` dinámicamente.

### Estado global (quién define qué)

| Global | Define | Uso |
|---|---|---|
| `S` | store.js | Save completo (ver §Save) |
| `authed` | store.js (let) | ui-auth la muta; persist/net la leen |
| `SETTINGS` | config.js | audio/volúmenes/velocidad/reduceFx/tutorial (localStorage aparte) |
| `socket`, `LB` | net.js | conexión + leaderboard broadcasteado |
| `squad`, `enemies`, `time`, `advance`, `shieldT` | battle.js | estado de combate |
| `W`, `H` | config.js (muta BattleScene) | viewport |
| `EL` | ui.js | caché de elementos del hot-path (0 `getElementById` por tick) |
| `PREP`, `STRIP_H` | assets.js | strips normalizadas (alto 160px) |
| `ANIM_KINDS` | phaser-setup.js | kinds de enemigos disponibles según sheets reales |
| `Audio` | audio.js | motor chiptune + SFX |
| `VFX`, `HOOKS` | battle.js (implementa BattleScene) | separación lógica→render |

### Flujo de guardado

1. `persist()` → `localStorage['le100_cache_v4']` + (si `authed`) `netSendSave(S)`.
2. Autoguardado: `setInterval(5s)` + `visibilitychange`/`beforeunload`/`pagehide`.
3. Server: throttle 2s por socket → `sanitizeSave()` → `U.save()`.
4. Login/registro devuelven `save` saneado → `applyServerSave()` (+ patches de shop/look).

---

## 📡 Protocolo Socket.IO

| Evento | Dir | Payload → Ack |
|---|---|---|
| `register` / `login` | C→S | `{name,pass}` → `{ok,name,save}` ó `{ok:false,err}` |
| `saveGame` | C→S | save (sin ack, throttle 2s) |
| `score` | C→S | `{name,stage}` (ranking) |
| `top` | S→C | lista top-10 etapas |
| `arenaInfo` | C→S | → `{ops[3 cercanos], top[10]}` |
| `arenaFight` | C→S | `opName` → `{win,msg}` |
| `colonyInfo` | C→S | → `{in,list,members,me}` |
| `colonyCreate/Join/Leave` | C→S | name/key/– → `{ok[,err]}` |
| `colonyDonate` | C→S | → `{ok,level}` |
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

---

## ⚔️ Sistemas y números clave

### Combate principal
- Etapas infinitas; **jefe cada 5** (timer 30s). Caer → −1 etapa y farmeo.
- Kills por etapa: 8 (jefe: 1). Capítulos cada 10 etapas (fondo+música): Bosque/Cueva/Pantano.
- Escuadrón: **Aguijón** (dps, etapa 1) · **Caparazón** (tank, 5) · **Hojita** (support, 10).
  Energía → ultimate con cut-in (dps: 3 golpes; tank: escudo 3s ×0.4; support: cura 30%).
- Avance por proximidad (`advance`), repliegue en jefe y al caer (re-entrada desde pantalla).

### Fórmulas (store.js ↔ sanitize/power espejo)

```
dps   = 5·1.3^dmg · (1+.1·adn) · (1+atk%/100) · (1+.02·(colonyLv−1)) · (1+.05·shopFury) · evFuria
maxHP = 100·1.22^vit · (1+hp%/100) · (1+.05·shopVita) · evVital
crit  = min(.75, .2 + crit%/100 + .02·shopCrit + evPrecisión) · critMult = 2.2 + critd%/100
veneno: cd = max(2, max(3, 7−.3·venom) − evTóxico) · dmg = dps·(2+.5·venom)·ev
goldKill(st) = ⌈3·1.18^st⌉ · (1+.25·fortune) · adnMult · (1+.05·shopFort) · evFiebre
eHP(st)=10·1.27^st · eDmg(st)=4·1.22^st · cost(k)=⌊base·mult^lv⌋ (evRacha ×0.8)
```

### Prestigio
`prTotal(x)=⌊3·√max(0,x−8)⌋`; ganancia = `prTotal(best)−prTotal(prBase)`; requiere `best≥10`.
Reset: oro, etapa, mejoras. Cada 🧬 = +10% daño y oro permanente.

### Equipo
- 4 slots · rarezas `[Común..Mítico]` pesos `[50,30,14,5,1]` (+luck) · 0–2 subs · lvl ≤99.
- Mejorar: `⌊20·1.35^lvl·(rar+1)⌋`  · Mochila 30 (llena → convierte a oro).

### Modos secundarios (tickets diarios)

| Modo | Tickets | Simulación | Premios |
|---|---|---|---|
| 🎯 Jefe Diario | 3 | `dps·30·1.4` vs `eHP(best+5)·12`, aguante `maxHP/(atk·.5)` | oro ×40/×8 + drop garantizado |
| 🗼 Torre |  (oro) | idem vs `eHP(best+f)·(6+f·.5)` | cada 3 pisos 🎒 · cada 10 +1🧬 |
| 🌀 Sotobosque | 2 | 8 salas, buffs 1-de-3 (`RL_BUFFS`) | salas/3 → drop · 8/8 → +1🧬 |
| ⚔️ Arena | 5 | server `powerOf` + ruido ±10% | ±pts + oro |
| 🐲 Jefe Colonia | 1/día/miembro | `dps·30` al boss `1e6·lvl·miembros` | claim de oro al matar |

### Colonias
Crear 10.000🪙 · máx 20 miembros · donar `1000·lvl`🪙 → +10xp · `lvl = 1+⌊xp/100⌋`
→ buff global +2% daño por nivel (`colonyLevel` cacheado en cada miembro).

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
horizontal** → `BootScene` registra spritesheet + anims (`ANIM_DEFS`).
**Robustez:** si falta un sheet → `prepareAll` avisa y sigue; `ANIM_KINDS`/`safePlay` usan solo lo
existente (el juego nunca crashea por arte faltante).

###  Biblia visual (guía de estilo para generaciones consistentes)

**Estilo global (TODO sheet de personaje/enemigo):**
- Chibi/kawaii pixel-art 16-bit, **2–2.5 cabezas** de alto (cabeza ≈ 45–50% del cuerpo).
- **Contorno negro grueso** (2–3px), cel-shading suave, **rubor rosado** en mejillas,
  ojos grandes brillantes con brillos blancos.
- Fondo **lavanda muy claro uniforme (≈ #EAE8F2)** — todos los canales >205 → compatible con `chroma()`.
- Sombra elíptica suave gris-lavanda bajo el personaje (queda como parte del blob, es correcto).
- Frames en **fila(s) horizontal(es) bien separados** (margen amplio entre blobs para `analyze()`).
- **Sin texto, sin watermark, sin borde sticker** (el borde blanco solo existe en `logo.png`).
- Altura del personaje de pie ≈ 60–75% del alto de la imagen (consistente entre sheets del mismo char).

**Paleta base (no variar entre generaciones):**

| Elemento | Colores |
|---|---|
| Cienpies cuerpo/cabeza | verde #7EC87E |
| Cienpies panza | crema #F5F0D0 (segmentada) |
| Cienpies patas | naranja #F5A040 |
| Cienpies capa | roja #C03030 (nudo al cuello) |
| Antenas | verdes con esfera blanca |
| Túnica humana | verde #3E8E5A |
| Correa/belt/brazaletes | cuero marrón #8B5A2B, hebilla gris |
| Botas | marrón #8B5A3B |
| Espada a la espalda | empuñadura marrón + guarda gris + hoja gris |
| Corona | oro #E8C050 con gemas rojas |

**Descripciones BASE de personajes (copiar VERBATIM en cada prompt):**
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

**Enemigos (base):**
- `beetle`: cabeza roja con colmillos blancos y ojos amarillos, caparazón púrpura brillante, patas marrón.
- `spider`: araña peluda azul oscuro, ojos cian brillantes, colmillos blancos.
- `wasp`: avispa marrón con abdomen rayado amarillo/negro, ojos rojos, alas celestes translúcidas.
- `scorpion`: escorpión púrpura con pinzas rojas, aguijón verde brillante, ojos amarillos.
- `boss`: bestia rojo-músculosa con armadura dorada con picos, corona con gemas, garras blancas (2 frames yoyo).

**Fondos (sin chroma, escena completa pixel-art nocturna):**
`bg` bosque con luna+hongos azules+luciérnagas · `bg_cave` cueva azul con cristales rosa/cian ·
`bg_swamp` árboles muertos+niebla verde+charcos tóxicos · `bg_tower` salón de piedra con estandartes
rojos y antorchas (modal Torre) · `bg_rogue` sendero de bosque con musgo, hongos y luciérnagas (modal Sotobosque).

**Íconos (`icons.png`):** pixel-art 16-bit con contorno negro sobre fondo claro, en 3 filas;
orden fila+columna = `ICON_NAMES` (coin·leaf·potion·venom / sword·shell / crown·heart·bolt·gem).

**🎯 Plantilla de prompt (Qwen-Image 3.0) para sheets nuevos:**

```
chibi pixel art sprite sheet, [DESCRIPCIÓN BASE DEL PERSONAJE], [N] frames in one horizontal row:
[POSES EN ORDEN DE ANIM], uniform very light lavender background (#EAE8F2), thick black outlines,
soft cel shading, pink blush cheeks, huge shiny eyes, soft ground shadow under each frame,
consistent character size and palette across frames, wide spacing between frames,
no text, no watermark, 16-bit style
```

**Reglas de consistencia (obligatorias):**
1. Pegar la descripción base **completa** del personaje (nunca resumida).
2. No cambiar ropa/paleta/accesorios entre sheets; solo cambian poses y expresiones.
3. Mismo fondo y misma escala que los sheets existentes del personaje.
4. Orden de frames = ventanas de `ANIM_DEFS` (dolor 0-2 primero, caída/muerte al final).
5. Antes de generar, usar como referencia visual los sheets existentes del mismo personaje
   (walk/attack) y replicar trazo, paleta y proporciones.

**Ejemplo aplicado (hurts generados, reproducibles):**
- `hero_human_a_hurt`: base human_a + "5 frames: clenching teeth in pain, clutching chest hurt,
  dazed stagger, falling back with X eyes, lying down with X eyes".
- `hero_human_c_hurt`: base human_c + mismas 5 poses. Ambos verificados contra `chroma`/`analyze`/`ANIM_DEFS`.

### Sheets (20)

| Archivo | Contenido | Frames | Ventanas/anim |
|---|---|---|---|
| `hero_walk.png` | Cienpies caminando | 4 | loop fps12 |
| `hero_idle.png` | Cienpies idle | 3 | loop fps3 |
| `hero_attack.png` | Cienpies ataque | 6 | one-shot fps14 |
| `hero_cast.png` | Escupir orbe veneno | 3 | one-shot fps10 |
| `hero_hurt.png` | Dolor + muerte | 6 | hurt 0-2 · death 3-5 |
| `enemy_beetle.png` | Escarabajo rojo/púrpura | 4 | loop fps7 |
| `enemy_spider.png` | Araña azul ojos cian | 4 | loop fps10 |
| `enemy_wasp.png` | Avispa ojos rojos | 4 | loop fps12 |
| `enemy_scorpion.png` | Escorpión púrpura | 4 | loop fps8 |
| `enemy_boss.png` | Rey bestia coronado | 2 | yoyo fps3 |
| `hero_human_a.png` | Castaño picado walk | 4 | loop fps10 |
| `hero_human_a_attack.png` | Castaño ataque | 4 | one-shot fps9 |
| `hero_human_a_hurt.png` | Castaño dolor + caída *(generado)* | 5 | hurt 0-2 · death 3-4 ✔ |
| `hero_human_b.png` | Elfa rubia walk | 4 | loop fps10 |
| `hero_human_b_attack.png` | Elfa ataque | 4 | one-shot fps9 |
| `hero_human_b_hurt.png` | Elfa dolor + muerte | 7 | hurt 0-2 · death 5-6 |
| `hero_human_c.png` | Mohawk azul walk | 5 | loop fps10 |
| `hero_human_c_attack.png` | Mohawk ataque | 4 | one-shot fps9 |
| `hero_human_c_hurt.png` | Mohawk dolor + caída *(generado)* | 5 | hurt 0-2 · death 3-4 ✔ |
| `acc_crown.png` | Corona overlay | 1 | estática |

### Fondos (5) + UI (2)

| Archivo | Uso |
|---|---|
| `bg.png` | Capítulo 1 Bosque Nocturno (luna, hongos, luciérnagas) |
| `bg_cave.png` | Capítulo 2 Cueva Cristal |
| `bg_swamp.png` | Capítulo 3 Pantano Tóxico |
| `bg_tower.png` | Fondo modal Torre (`#mTower .mcard`, CSS) |
| `bg_rogue.png` | Fondo modal Sotobosque (`#mRogue .mcard`, CSS) |
| `logo.png` | Logo chroma (pantalla de login) |
| `icons.png` | 10 íconos 3 filas → orden = `ICON_NAMES` ✔ |

### Arte generado (Qwen-Image 3.0)
`hero_human_a_hurt.png` y `hero_human_c_hurt.png`, generados con la Biblia Visual de esta sección
(prompt reproducible arriba). Guardar en `img/` con esos nombres exactos.

---

## 🧠 Informe estratégico (resumen del PDF de investigación)

- **Motor:** quedarse en **Phaser** hoy; **Godot** como candidata de migración a largo plazo (prototipo comparativo futuro). Unity descartada para web-first.
- **Rendimiento:** sprite atlases/strips (✅ ya implementado con PREP), batching de draw calls, `reduceFx`.
- **Personalización:** paperdoll por capas (✅ prototipo: form/hair/crown) con descubrimiento progresivo.
- **Retención:** cloud save formalizado, calendario de eventos temporales (✅ eventos semanales v1), recompensas frecuentes y específicas, UI responsive (✅ portrait).

---

## 🔧 Deuda técnica / optimizaciones detectadas (priorizadas)

**Alta**
1. `assets.js prepareAll()` carga 20 sheets **en serie** → `Promise.all` (boot ~3-4× más rápido).
2. `server/arena.js arenaInfo`: **2× `U.all()`** por llamada → 1.
3. `server/colonies.js`: `colonyInfo` hace 2× `C.get`; `colonyDonate` escribe **N miembros** por donación → derivar `colonyLevel` en lectura o `updateMany`.
4. Reset de tickets **triplicado** (`checkTickets`/`checkRlTickets`/`checkArenaTickets` + `checkMissions`) → unificar en `checkDailyResets()` en store.js.
5. Simulación de combate **duplicada** en daily/tower/rogue → extraer `modes/sim.js` (`simulateFight(...)`).
6. `index.html` sin reconstruir/validar (orden de scripts, ver §Arquitectura).

**Media**
7. `battle.js` toca DOM (`$('bossBar')`) dentro de lógica pura → mover a `HOOKS`.
8. Sesión no persistida: recargar obliga re-login → token en `localStorage` (net.js).
9. `autoequip.js` depende de `setTimeout(0)` tras click de `btnGear` → hook explícito `onGearOpen`.

**Baja / futuro**
10. Atlas unificado de enemigos + fondos (menos texture swaps).
11. Prototipo Godot de una escena (comparativa del informe).

---

## 🗺️ Roadmap

1. **Consolidación:** items Alta de deuda + reconstrucción de `index.html`. *(Arte: cerrado ✅ + Biblia Visual ✅)*
2. **Profundización:** eventos temporales v2, recompensas semanales de Arena/Colonias, cloud-save con indicador de sync en UI.
3. **Expansión:** más capas de paperdoll (armaduras como overlays — generar con la Biblia Visual), árbol de habilidades ramificado, calendario editorial de eventos.

---

## 📝 CHANGELOG

| Fecha | Cambio |
|---|---|
| 2026-08-17 | 📄 README creado: inventario completo del estado v3.1.0, protocolo, fórmulas y deuda técnica. |
| 2026-08-17 | 🎨 §Arte verificado (25/27): sheets/fondos/UI contra `ANIM_DEFS` e `ICON_NAMES` (icons.png = mapeo 1:1 ✔). |
| 2026-08-17 | 🎨 Generados `hero_human_a_hurt` y `hero_human_c_hurt` (Qwen-Image 3.0) → inventario 27/27 cerrado. |
| 2026-08-17 | 📖 §Biblia Visual agregada: estilo global, paletas, descripciones base por personaje, reglas de layout para el pipeline y plantilla de prompt para generaciones futuras consistentes. |

---

## 🤝 Metodología de trabajo (recordatorio)

- Todo cambio → **archivo completo** en la respuesta.
- Antes de cambiar → **revisar mejoras/optimizaciones** del archivo y su entorno.
- **Divide y vencerás:** módulos por dominio (core/game/ui/modes/social · server/*).
- Cada cambio → **actualizar §CHANGELOG** (y secciones afectadas) de este README.