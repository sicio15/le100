'use strict';
// ===== CÓDICE (LOTE 28): panel de zonas, bestiario, jefes y reliquias =====
// Es el sitio donde el lore se vuelve progresión: cada ficha da estrellas y cada
// estrella da daño permanente. Lo que no descubriste se muestra censurado, para
// que se note que falta.

let codexTab = 'zonas';
wire('btnCodex', 'click', () => { renderCodex(); $('mCodex').style.display = 'flex'; Audio.SFX.click(); });
wire('codexClose', 'click', () => { $('mCodex').style.display = 'none'; });

const stars = (n, max) => '<span class="cxStars">' + '★'.repeat(n) + '<i>' + '★'.repeat((max || 3) - n) + '</i></span>';

function cxHeader() {
  const c = codexStars();
  const pct = Math.round(codexProgress() * 100);
  return '<div class="cxTop">' +
    '<div class="cxProg"><div class="cxProgFill" style="width:' + pct + '%"></div>' +
      '<span>' + c.stars + ' / ' + c.maxStars + ' ★ · ' + pct + '%</span></div>' +
    '<div class="cxBonus">⚔️ +' + (c.damage * 100).toFixed(1) + '% daño permanente · ' +
      '🏺 ' + countRelics() + '/' + BOSSES.length + ' reliquias</div>' +
    '</div>' +
    '<div class="tabs cxTabs">' +
      ['zonas', 'bestiario', 'jefes', 'reliquias'].map(t =>
        '<button class="tab' + (codexTab === t ? ' sel' : '') + '" data-cx="' + t + '">' +
        t.toUpperCase() + '</button>').join('') +
    '</div>';
}

function cxZonas() {
  return ZONES.map((z, i) => {
    const seen = !!codex().zones[z.id];
    const b = zoneBoss(i);
    const beaten = (codex().bosses[b.id] || 0) > 0;
    if (!seen) {
      return '<div class="cxRow locked"><div class="cxIco">❔</div>' +
        '<div class="cxInfo"><b>Zona ' + (i + 1) + ' — ???</b>' +
        '<p>Etapas ' + (i * 10 + 1) + '–' + (i * 10 + 10) + '. Todavía no llegaste.</p></div></div>';
    }
    return '<div class="cxRow" style="--cc:' + z.color + '">' +
      '<div class="cxIco">' + b.ico + '</div>' +
      '<div class="cxInfo">' +
        '<b>Zona ' + (i + 1) + ' — ' + z.name + '</b>' +
        '<small>' + z.sub + ' · etapas ' + (i * 10 + 1) + '–' + (i * 10 + 10) + '</small>' +
        '<p>' + (ZONE_INTRO[z.id] || []).map(l => l.t).slice(0, 2).join(' ') + '</p>' +
        '<div class="cxMeta">' + (beaten ? '✅ Jefe derrotado: ' + b.name : '⚔️ Jefe pendiente: ' + b.name) + '</div>' +
      '</div>' +
      '<button class="claim" data-go="' + (i * 10 + 1) + '"' + (i * 10 + 1 > S.best ? ' disabled' : '') + '>IR</button>' +
    '</div>';
  }).join('');
}

function cxBestiario() {
  return BESTIARY.map(b => {
    const n = codex().kills[b.id] || 0;
    const st = bestiaryStars(b.id);
    const next = bestiaryNext(b.id);
    if (n === 0) {
      return '<div class="cxRow locked"><div class="cxIco">❔</div>' +
        '<div class="cxInfo"><b>???</b><p>Matá uno para abrir su ficha.</p></div></div>';
    }
    const url = (typeof portraitURL === 'function') ? portraitURL(b.sheet) : '';
    return '<div class="cxRow">' +
      '<div class="cxIco">' + (url ? '<img src="' + url + '" alt="">' : b.ico) + '</div>' +
      '<div class="cxInfo">' +
        '<b>' + b.ico + ' ' + b.n + '</b> ' + stars(st) +
        '<p>' + b.d + '</p>' +
        '<div class="cxMeta">💀 ' + fmt(n) + ' derrotados' +
          (next ? ' · próxima ★ a los ' + fmt(next) : ' · ficha completa') + '</div>' +
      '</div></div>';
  }).join('');
}

function cxJefes() {
  return BOSSES.map((b, i) => {
    const n = codex().bosses[b.id] || 0;
    const st = bossStars(b.id);
    const next = bossNext(b.id);
    if (n === 0) {
      const reached = S.best > i * 10;
      return '<div class="cxRow locked"><div class="cxIco">' + (reached ? b.ico : '❔') + '</div>' +
        '<div class="cxInfo"><b>' + (reached ? b.name : '???') + '</b>' +
        '<p>' + (reached ? 'Lo viste, pero todavía no lo derrotaste.' : 'Zona ' + (i + 1) + '. Sin descubrir.') + '</p></div></div>';
    }
    const abil = b.abilities.map(a => {
      const A = BOSS_ABILITIES[a];
      return '<span class="cxChip" data-tip="<b>' + A.n + '</b><br>' + A.d + '">' + A.ico + ' ' + A.n + '</span>';
    }).join('');
    return '<div class="cxRow" style="--cc:' + b.color + '">' +
      '<div class="cxIco">' + b.ico + '</div>' +
      '<div class="cxInfo">' +
        '<b>' + b.name + '</b> ' + stars(st) +
        '<small>' + b.title + ' · Zona ' + (b.zone + 1) + '</small>' +
        '<p>' + b.lore + '</p>' +
        '<div class="cxChips">' + abil + '</div>' +
        '<div class="cxMeta">👑 ' + n + ' victoria' + (n === 1 ? '' : 's') +
          (next ? ' · próxima ★ a las ' + next : ' · ficha completa') + '</div>' +
      '</div></div>';
  }).join('');
}

function cxReliquias() {
  return BOSSES.map(b => {
    const r = b.relic, have = hasRelic(r.id);
    return '<div class="cxRow' + (have ? '' : ' locked') + '" style="--cc:' + b.color + '">' +
      '<div class="cxIco">' + (have ? r.ico : '🔒') + '</div>' +
      '<div class="cxInfo">' +
        '<b>' + (have ? r.n : '???') + '</b>' +
        '<small>' + b.ico + ' ' + b.name + '</small>' +
        '<p>' + (have ? r.d : 'Derrotá a ' + b.name + ' en la zona ' + (b.zone + 1) + ' para conseguirla.') + '</p>' +
      '</div></div>';
  }).join('');
}

function renderCodex() {
  const box = $('codexBody'); if (!box) return;
  const body = codexTab === 'zonas' ? cxZonas()
    : codexTab === 'bestiario' ? cxBestiario()
    : codexTab === 'jefes' ? cxJefes()
    : cxReliquias();
  box.innerHTML = cxHeader() + '<div class="cxList">' + body + '</div>';
  box.querySelectorAll('[data-cx]').forEach(b => {
    b.onclick = () => { codexTab = b.dataset.cx; Audio.SFX.page(); renderCodex(); };
  });
  box.querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => { travelToStage(+b.dataset.go); $('mCodex').style.display = 'none'; };
  });
}

// Aviso cuando hay una ficha nueva sin mirar desde la última vez que se abrió
let lastCodexStars = -1;
setInterval(() => {
  const d = $('codexDot'); if (!d) return;
  const s = codexStars().stars;
  if (lastCodexStars < 0) { lastCodexStars = s; return; }
  if (s > lastCodexStars && $('mCodex').style.display !== 'flex') d.style.display = 'block';
  if ($('mCodex').style.display === 'flex') { d.style.display = 'none'; lastCodexStars = s; }
}, 2000);
