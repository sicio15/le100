'use strict';
// ===== LORE (LOTE 28): historia, jefes, reliquias y bestiario =====
// El juego tenía 5 nombres de capítulo y un único "Rey Bestia" sin contexto.
// Acá vive TODO el texto: quién habla, qué se encuentra en cada zona, qué es
// cada jefe y por qué te importa matarlo. La ficha técnica de las zonas está en
// core/config.js (ZONES); los multiplicadores globales, en core/data.js.
//
// Nota de arquitectura: la definición de cada jefe mezcla números y narrativa a
// propósito. Partirla en dos archivos obligaba a editar dos sitios para tocar un
// solo enemigo, que es justo el error que arrastraban colonias/gremios.

// ----- Quién habla: retrato (sheet de assets.js) + color + nombre -----
const SPEAKERS = {
  aguijon: { n: 'Aguijón', sheet: 'hero_human_a_idle', color: '#ff6b81' },
  elara:   { n: 'Elara',   sheet: 'hero_human_b_idle', color: '#7efcff' },
  kael:    { n: 'Kael',    sheet: 'hero_human_c_idle', color: '#c86bfa' },
  larva:   { n: 'La Larva', sheet: 'hero_idle',        color: '#7bed9f' },
  narr:    { n: '',         sheet: null,               color: '#ffd700' }
};

// ===================== JEFES =====================
// `sprite` es el kind de animación que usa (todos existen ya como arte).
// `abilities` son mecánicas reales implementadas en game/bosses.js.
const BOSSES = [
  {
    id: 'escarabajo', zone: 0, name: 'Escarabajo Ancestral', title: 'El que no quiso irse',
    ico: '🪲', sprite: 'beetle', size: 3.4, tint: 0xc8e6a0, color: '#9ad46a',
    hpMul: 1.0, dmgMul: 1.0, abilities: ['shield', 'summon'],
    lore: 'Fue el primero en enterrarse cuando el bosque empezó a moverse, y el único que no volvió a salir. ' +
          'Su caparazón lleva tantas capas como inviernos aguantó. Golpearlo suena a golpear una puerta.',
    relic: { id: 'corteza', n: 'Corteza Viva', ico: '🪵', d: '+12% vida máxima', stat: 'hp', val: 0.12 },
    intro: [
      { w: 'narr', t: 'El suelo del claro está partido en seis pedazos iguales. Algo empujó desde abajo, hace mucho, y se quedó a mirar.' },
      { w: 'aguijon', t: 'Eso no es una roca.' },
      { w: 'kael', t: 'Es un escarabajo. O lo era. Lleva tanto tiempo quieto que el bosque le creció encima.' },
      { w: 'escarabajo', t: 'ME ENTERRÉ PARA NO VER LO QUE VENÍA. USTEDES LO TRAJERON DE VUELTA.' }
    ],
    enrage: [{ w: 'escarabajo', t: 'EL CAPARAZÓN NO ERA PARA PROTEGERME A MÍ.' }],
    defeat: [
      { w: 'escarabajo', t: 'Bien. Ahora les toca a ustedes… no ver.' },
      { w: 'elara', t: 'Dejó algo. Todavía está tibio.' }
    ]
  },
  {
    id: 'tejedora', zone: 1, name: 'Tejedora del Eco', title: 'La que repite',
    ico: '🕷️', sprite: 'spider', size: 3.4, tint: 0x9fe8ff, color: '#7efcff',
    hpMul: 1.15, dmgMul: 1.05, abilities: ['curse', 'volley'],
    lore: 'No teje seda: teje sonido. Cada hilo de su red guarda una frase dicha en estas cuevas, y ella las devuelve ' +
          'cuando le conviene. Los mineros que bajaron acá juraron oír a sus propios hijos llamándolos.',
    relic: { id: 'eco', n: 'Eco Fósil', ico: '🔔', d: '+10% daño', stat: 'dmg', val: 0.10 },
    intro: [
      { w: 'narr', t: 'La cueva devuelve cada paso con medio segundo de retraso. Después empieza a devolver pasos que nadie dio.' },
      { w: 'elara', t: '…¿escuchan eso?' },
      { w: 'tejedora', t: '«…escuchan eso?» «…escuchan eso?» «…escuchan eso?»' },
      { w: 'kael', t: 'No nos está imitando. Nos está aprendiendo.' }
    ],
    enrage: [{ w: 'tejedora', t: '«No nos está aprendiendo». «AHORA SÍ».' }],
    defeat: [
      { w: 'tejedora', t: '«…Aguijón.» «…Elara.» «…Kael.» Me los llevo puestos.' },
      { w: 'aguijon', t: 'Que se los lleve. Yo me quedo con esto.' }
    ]
  },
  {
    id: 'reina', zone: 2, name: 'Avispa Reina', title: 'Madre de la niebla',
    ico: '🐝', sprite: 'wasp', size: 3.8, tint: 0xd8ff8a, color: '#c8f04a',
    hpMul: 1.25, dmgMul: 1.15, abilities: ['drain', 'haste', 'summon'],
    lore: 'La niebla del pantano no es agua: es su nido en suspensión. Respirar acá es aceptar que ya sos parte del enjambre. ' +
          'La Reina no ataca para matar; ataca para sumar.',
    relic: { id: 'bilis', n: 'Bilis Real', ico: '🧪', d: '+30% daño de veneno', stat: 'venom', val: 0.30 },
    intro: [
      { w: 'narr', t: 'La niebla se abre en un pasillo perfecto. Alguien la está respirando.' },
      { w: 'larva', t: '♪ …' },
      { w: 'elara', t: 'La larva está temblando. Nunca tiembla.' },
      { w: 'reina', t: 'Traen una cría. Qué amables. Ya tenía lugar preparado.' }
    ],
    enrage: [{ w: 'reina', t: 'No hace falta que ganen. Sólo que respiren.' }],
    defeat: [
      { w: 'reina', t: 'El enjambre no era mío… yo también fui una cría que alguien trajo.' },
      { w: 'kael', t: 'La niebla se está yendo. Por primera vez veo el otro lado del pantano.' }
    ]
  },
  {
    id: 'reybestia', zone: 3, name: 'Rey Bestia', title: 'El que se coronó solo',
    ico: '👑', sprite: 'boss', size: 2.4, tint: 0xffffff, color: '#ff4757',
    hpMul: 1.45, dmgMul: 1.25, abilities: ['summon', 'slam', 'reflect'],
    lore: 'Nadie lo nombró rey. Construyó la torre, se sentó arriba y esperó a que el resto le dijera majestad para no ' +
          'tener que bajar a discutirlo. Funcionó durante cien etapas.',
    relic: { id: 'corona', n: 'Corona Astillada', ico: '👑', d: '+20% oro por kill', stat: 'gold', val: 0.20 },
    intro: [
      { w: 'narr', t: 'La torre no tiene escaleras. Tiene capas: cada piso está hecho de lo que vivía en el piso de abajo.' },
      { w: 'reybestia', t: 'Subieron. Todos suben. Ninguno baja.' },
      { w: 'aguijon', t: 'Vengo por la corona.' },
      { w: 'reybestia', t: 'La corona no es un premio, insecto. Es un peso. Y alguien tiene que sostenerlo.' }
    ],
    enrage: [{ w: 'reybestia', t: '¡SOSTUVE ESTA TORRE SOLO! ¿USTEDES QUÉ SOSTUVIERON?' }],
    defeat: [
      { w: 'reybestia', t: 'Ahora… la sostienen ustedes. Suerte.' },
      { w: 'elara', t: 'Aguijón, no la toques.' },
      { w: 'aguijon', t: 'Ya la toqué.' }
    ]
  },
  {
    id: 'obsidiana', zone: 4, name: 'Escorpión de Obsidiana', title: 'El guardián de la raíz',
    ico: '🦂', sprite: 'scorpion', size: 3.2, tint: 0xb28df0, color: '#c86bfa',
    hpMul: 1.6, dmgMul: 1.35, abilities: ['shield', 'slam', 'haste'],
    lore: 'Bajo el sotobosque hay una raíz que sostiene todas las zonas de arriba. Alguien la puso ahí. Alguien también ' +
          'puso a este escorpión a cuidarla, y le sacó la capacidad de preguntar por qué.',
    relic: { id: 'aguijon_neg', n: 'Aguijón Negro', ico: '🖤', d: '+15% daño crítico', stat: 'critd', val: 15 },
    intro: [
      { w: 'narr', t: 'Las raíces de acá abajo son más gruesas que la torre entera. Una late.' },
      { w: 'kael', t: 'Esto no creció así. Alguien lo plantó.' },
      { w: 'obsidiana', t: '…' },
      { w: 'elara', t: 'No va a hablar. Le sacaron esa parte.' }
    ],
    enrage: [{ w: 'narr', t: 'El escorpión no ruge: la raíz ruge por él.' }],
    defeat: [
      { w: 'obsidiana', t: '…gracias.' },
      { w: 'aguijon', t: 'Dijo algo.' },
      { w: 'kael', t: 'Dijo una sola cosa. Y era eso.' }
    ]
  },
  {
    id: 'cenizas', zone: 5, name: 'Rey de Cenizas', title: 'Lo que quedó de la corona',
    ico: '🔥', sprite: 'boss', size: 2.5, tint: 0xff9a5a, color: '#ffa726',
    hpMul: 1.8, dmgMul: 1.5, abilities: ['slam', 'drain', 'summon', 'haste'],
    lore: 'Aguijón tocó la corona. Esto es lo que pasa cuando el peso encuentra a alguien nuevo y el anterior todavía no ' +
          'terminó de soltarlo. El jardín se quemó en una sola noche y sigue floreciendo.',
    relic: { id: 'brasa', n: 'Brasa Eterna', ico: '🔥', d: '+12% daño y +10% oro', stat: 'dual', val: 0.12 },
    intro: [
      { w: 'narr', t: 'El jardín está en llamas desde hace semanas y las flores siguen abriéndose. Nada se consume del todo.' },
      { w: 'cenizas', t: 'Aguijón. Te queda bien.' },
      { w: 'aguijon', t: 'Yo no me puse nada.' },
      { w: 'cenizas', t: 'No hace falta ponérsela. Sólo hace falta tocarla.' }
    ],
    enrage: [{ w: 'cenizas', t: 'Mirá tus manos, insecto. Ya están del color correcto.' }],
    defeat: [
      { w: 'cenizas', t: 'Nos vemos en el espejo.' },
      { w: 'elara', t: 'Aguijón. Tus manos.' },
      { w: 'aguijon', t: 'Ya sé. Sigamos.' }
    ]
  },
  {
    id: 'prismatica', zone: 6, name: 'Tejedora Prismática', title: 'Tu reflejo llegó primero',
    ico: '💎', sprite: 'spider', size: 3.6, tint: 0xf0e0ff, color: '#e0c3fc',
    hpMul: 2.0, dmgMul: 1.6, abilities: ['reflect', 'curse', 'volley', 'shield'],
    lore: 'El abismo está tapizado de cristal y cada cara devuelve una versión tuya que tomó una decisión distinta. ' +
          'La Tejedora vive de esas versiones: las teje, las cuelga y las deja madurar.',
    relic: { id: 'prisma', n: 'Prisma Roto', ico: '🔮', d: '+8% crítico', stat: 'crit', val: 8 },
    intro: [
      { w: 'narr', t: 'En el cristal hay tres siluetas. Ninguna se mueve cuando ustedes se mueven.' },
      { w: 'elara', t: 'Esa de ahí soy yo con el arco roto.' },
      { w: 'kael', t: 'Y esa soy yo sin Elara al lado.' },
      { w: 'prismatica', t: 'Tengo miles. Las suyas son de las más nuevas. Todavía no decidieron nada.' }
    ],
    enrage: [{ w: 'prismatica', t: 'Elegí una. Vas a tener que pelearle igual.' }],
    defeat: [
      { w: 'prismatica', t: 'Rompiste el cristal. Ahora hay una sola versión de vos, y es la que hizo esto.' },
      { w: 'aguijon', t: 'Me sirve.' }
    ]
  },
  {
    id: 'vacio', zone: 7, name: 'El Vacío que Repta', title: 'Donde el mapa deja de dibujar',
    ico: '🕳️', sprite: 'boss', size: 3.0, tint: 0x9a7ae0, color: '#b388ff',
    hpMul: 2.4, dmgMul: 1.8, abilities: ['slam', 'curse', 'summon', 'drain', 'haste'],
    lore: 'No es un monstruo: es el borde. Todo lo que caminaste existe porque algo lo dibujó delante tuyo, y esto es ' +
          'lo que hay cuando el lápiz se levanta. Sigue reptando hacia atrás. Nunca deja de acercarse.',
    relic: { id: 'borde', n: 'Borde del Mapa', ico: '🗺️', d: '+20% daño y +20% vida', stat: 'dual2', val: 0.20 },
    intro: [
      { w: 'narr', t: 'Adelante no hay nada. No oscuridad: nada. El suelo termina en una línea que se está borrando sola.' },
      { w: 'kael', t: 'Acá se acaba el mapa.' },
      { w: 'vacio', t: 'No se acaba. Nunca empezó. Yo vine antes que el dibujo.' },
      { w: 'larva', t: '♪ ♪ ♪' },
      { w: 'elara', t: 'La larva está cantando. Le está cantando a ESO.' }
    ],
    enrage: [{ w: 'vacio', t: 'Cada paso que dieron lo dibujé yo para que llegaran acá.' }],
    defeat: [
      { w: 'vacio', t: 'Entonces sigan. A ver hasta dónde les dibujo.' },
      { w: 'narr', t: 'El mapa se extiende una etapa más. Después otra. No deja de extenderse.' }
    ]
  }
];
const bossDef = id => BOSSES.find(b => b.id === id) || BOSSES[0];
const zoneBoss = idx => bossDef(ZONES[Math.min(ZONES.length - 1, Math.max(0, idx))].boss);

// ===================== DIÁLOGO DE ENTRADA A ZONA =====================
// Se dispara una sola vez por zona, al cruzar de capítulo (cada 10 etapas).
const ZONE_INTRO = {
  bosque: [
    { w: 'narr', t: 'Etapa 1. El bosque todavía no sabe que se está moviendo.' },
    { w: 'aguijon', t: 'Cien etapas, dijeron. Cien y llegamos al borde del mapa.' },
    { w: 'larva', t: '♪' },
    { w: 'aguijon', t: 'Sí, vos también venís.' }
  ],
  cuevas: [
    { w: 'narr', t: 'El bosque termina en una boca de piedra que respira aire frío.' },
    { w: 'elara', t: 'Acá abajo mi arco no sirve de mucho. No hay distancia.' },
    { w: 'kael', t: 'Entonces hablá poco. Lo que digas se queda dando vueltas.' }
  ],
  pantano: [
    { w: 'narr', t: 'La niebla llega a la altura del pecho y no se mueve con el viento.' },
    { w: 'kael', t: 'No respiren hondo.' },
    { w: 'aguijon', t: 'Gracias, muy útil.' }
  ],
  torre: [
    { w: 'narr', t: 'La torre se ve desde el pantano. Desde acá se ve que no tiene final.' },
    { w: 'elara', t: 'Cada piso está hecho de bichos.' },
    { w: 'kael', t: 'De bichos que subieron.' }
  ],
  soto: [
    { w: 'narr', t: 'Debajo de la torre hay más mundo. Mucho más. Y está al revés.' },
    { w: 'aguijon', t: '¿Bajamos o subimos?' },
    { w: 'kael', t: 'Sí.' }
  ],
  ceniza: [
    { w: 'narr', t: 'Un jardín ardiendo sin consumirse. El calor no quema: pesa.' },
    { w: 'elara', t: 'Aguijón, dejá de rascarte las manos.' },
    { w: 'aguijon', t: 'No me las estoy rascando.' }
  ],
  cristal: [
    { w: 'narr', t: 'Las paredes del abismo son espejos y ninguno los muestra a ustedes tres.' },
    { w: 'kael', t: 'Somos cuatro en ese reflejo.' },
    { w: 'elara', t: 'No mires.' }
  ],
  vacio: [
    { w: 'narr', t: 'Etapa 71. Acá el mapa deja de dibujar y empieza a mirar.' },
    { w: 'larva', t: '♪ ♪' },
    { w: 'aguijon', t: 'Ya sé. Yo también lo escucho.' }
  ]
};
// A partir de la última zona el juego es infinito: una línea de cierre por vuelta.
const ENDLESS_LINES = [
  { w: 'narr', t: 'El borde retrocede otro tramo. Sigan.' },
  { w: 'vacio', t: 'Más.' },
  { w: 'aguijon', t: 'Más.' }
];

// ===================== BESTIARIO =====================
// Cada bicho normal tiene ficha propia. Descubrirlas da daño permanente
// (la lógica y los umbrales viven en core/codex.js + core/data.js).
const BESTIARY = [
  { id: 'beetle',   n: 'Escarabajo de Corteza', ico: '🪲', sheet: 'enemy_beetle',
    d: 'Lento, duro y testarudo. Camina en línea recta porque nunca aprendió que había otra opción. ' +
       'Si lo dejás llegar, empuja.' },
  { id: 'spider',   n: 'Araña de Hilo Corto',   ico: '🕷️', sheet: 'enemy_spider',
    d: 'Teje trampas del tamaño justo para una pata. No quiere comerte: quiere que te quedes quieto un rato.' },
  { id: 'wasp',     n: 'Avispa Mensajera',      ico: '🐝', sheet: 'enemy_wasp',
    d: 'Rapidísima y frágil. No pelea: entrega. Cada vez que matás una, la niebla del pantano se entera.' },
  { id: 'scorpion', n: 'Escorpión de Arena',    ico: '🦂', sheet: 'enemy_scorpion',
    d: 'Aguanta más de lo que parece y pega una sola vez, fuerte. Los viejos del bosque dicen que cuenta tus pasos.' }
];
const bestiaryOf = id => BESTIARY.find(b => b.id === id) || null;
