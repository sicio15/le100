// Constantes globales del juego
const TAU = Math.PI * 2;

const SKINS = [
    { name:'Veneno',   hue:120 }, { name:'Fuego',    hue:8   },
    { name:'Hielo',    hue:197 }, { name:'Oro',      hue:48  },
    { name:'Neón',     hue:310 }, { name:'Fantasma', hue:265 }
];

const AB_DEF = {
    dash:   { icon:'⚡',  key:'1', name:'DASH',   cd:180, dur:60  },
    shield: { icon:'🛡️', key:'2', name:'ESCUDO', cd:300, dur:180 },
    magnet: { icon:'🧲',  key:'3', name:'IMÁN',   cd:420, dur:300 },
    poison: { icon:'☠️',  key:'4', name:'VENENO', cd:600, dur:300 }
};

const FOOD_PAL = ['#ff6b6b', '#ffa502', '#7bed9f', '#70a1ff', '#ff7eb3'];