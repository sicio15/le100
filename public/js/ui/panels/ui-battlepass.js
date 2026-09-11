'use strict';
// ===== BATTLE PASS / TEMPORADAS (LOTE 18) =====
wire('btnBattlePass', 'click', openBattlePass);
wire('bpClose', 'click', () => { $('mBattlePass').style.display = 'none'; });

function openBattlePass() {
  Audio.SFX.click();
  checkSeasonReset();
  renderBattlePass();
  $('mBattlePass').style.display = 'flex';
}

function renderBattlePass() {
  const box = $('bpBody'); if (!box) return;
  const daysLeft = Math.max(0, Math.ceil((SEASON_DURATION - (Date.now() - S.seasonStart)) / 86400000));
  const xpNeeded = xpForLevel(S.seasonLevel);
  const xpPct = Math.min(100, (S.seasonXp / xpNeeded) * 100);
  
  let html = '<div style="text-align:left;margin-bottom:12px;">' +
    '<h3 style="color:#ffd700;font-size:12px;">🎫 TEMPORADA #' + S.season + '</h3>' +
    '<p style="color:#8fa3c8;font-size:11px;">⏰ ' + daysLeft + ' días restantes</p>' +
    '<div style="background:rgba(0,0,0,.5);border-radius:8px;padding:4px;margin:8px 0;">' +
      '<div style="height:8px;background:linear-gradient(90deg,#ffd700,#ff9800);border-radius:4px;width:' + xpPct + '%;"></div>' +
    '</div>' +
    '<p style="font-size:10px;color:#fff;">Nivel <b>' + S.seasonLevel + '</b> / ' + SEASON_MAX_LEVEL + ' · XP: ' + S.seasonXp + ' / ' + xpNeeded +
      (S.hasPremiumPass ? ' · <b style="color:#7efcff">🎫 PREMIUM (+50% XP)</b>' : '') + '</p>';
  
  if (!S.hasPremiumPass) {
    html += '<button class="mbtn" id="bpBuy" style="width:100%;margin-top:8px;">🎫 COMPRAR PASE PREMIUM (' + PREMIUM_PASS_COST + ' 🧬)</button>';
  }
  html += '</div>';
  
  // Track de recompensas
  html += '<div style="max-height:50vh;overflow-y:auto;">';
  SEASON_REWARDS.forEach(r => {
    const unlocked = S.seasonLevel >= r.lvl;
    const claimedFree = S.seasonClaimed[r.lvl + '_free'];
    const claimedPremium = S.seasonClaimed[r.lvl + '_premium'];
    
    html += '<div class="mrow" style="border:1px solid ' + (unlocked ? '#ffd700' : 'rgba(255,255,255,.1)') + ';">' +
      '<div style="flex:1;">' +
        '<b style="color:' + (unlocked ? '#ffd700' : '#8fa3c8') + ';">Nivel ' + r.lvl + '</b><br>' +
        '<small style="color:#8fa3c8;">' +
          'Gratis: ' + (r.free.gold ? fmt(r.free.gold) + '🪙 ' : '') + (r.free.adn ? r.free.adn + '🧬 ' : '') + (r.free.item ? '🎒' : '') +
          (S.hasPremiumPass ? ' · Premium: ' + (r.premium.gold ? fmt(r.premium.gold) + '🪙 ' : '') + (r.premium.adn ? r.premium.adn + '🧬 ' : '') + (r.premium.skin ? '🎨' : '') + (r.premium.title ? '🏆' : '') : '') +
        '</small>' +
      '</div>';
    
    if (unlocked && !claimedFree) {
      html += '<button class="claim bpClaim" data-lvl="' + r.lvl + '" data-type="free">RECLAMAR</button>';
    } else if (claimedFree) {
      html += '<span style="color:#7bed9f;">✅</span>';
    }
    
    if (S.hasPremiumPass && unlocked && !claimedPremium) {
      html += '<button class="claim bpClaim" data-lvl="' + r.lvl + '" data-type="premium" style="margin-left:4px;">🎫</button>';
    } else if (S.hasPremiumPass && claimedPremium) {
      html += '<span style="color:#7efcff;margin-left:4px;">✅</span>';
    }
    
    html += '</div>';
  });
  html += '</div>';
  
  box.innerHTML = html;
  
  // Wire botones
  const buyBtn = $('bpBuy');
  if (buyBtn) buyBtn.onclick = () => { buyPremiumPass(); renderBattlePass(); };
  
  box.querySelectorAll('.bpClaim').forEach(btn => {
    btn.onclick = () => {
      claimSeasonReward(+btn.dataset.lvl, btn.dataset.type);
      renderBattlePass();
    };
  });
}

// Dot de notificación (niveles sin reclamar)
setInterval(() => {
  const dot = $('bpDot'); if (!dot) return;
  const hasUnclaimed = SEASON_REWARDS.some(r => {
    if (S.seasonLevel < r.lvl) return false;
    if (!S.seasonClaimed[r.lvl + '_free']) return true;
    if (S.hasPremiumPass && !S.seasonClaimed[r.lvl + '_premium']) return true;
    return false;
  });
  dot.style.display = hasUnclaimed ? 'block' : 'none';
}, 2000);