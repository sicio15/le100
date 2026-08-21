'use strict';
// ===== SEASON: Battle Pass / Temporadas =====
function checkSeasonReset() {
  const now = Date.now();
  if (now - S.seasonStart >= SEASON_DURATION) {
    S.season++; S.seasonXp = 0; S.seasonLevel = 1; S.seasonClaimed = {}; S.seasonStart = now;
    toast('🎫 ¡Nueva temporada #' + S.season + '!'); Audio.SFX.levelup(); persist();
  }
}
const xpForLevel = lvl => 100 + (lvl - 1) * 50;
function addSeasonXp(amount) {
  if (S.hasPremiumPass) amount = Math.floor(amount * 1.5);
  S.seasonXp += amount;
  while (S.seasonLevel < SEASON_MAX_LEVEL && S.seasonXp >= xpForLevel(S.seasonLevel)) {
    S.seasonXp -= xpForLevel(S.seasonLevel);
    S.seasonLevel++;
    toast('🎫 ¡Nivel ' + S.seasonLevel + '!'); Audio.SFX.levelup();
  }
  persist();
}
function claimSeasonReward(lvl, type) {
  const key = lvl + '_' + type;
  if (S.seasonClaimed[key]) return toast('❌ Ya reclamado');
  if (S.seasonLevel < lvl) return toast('❌ Nivel insuficiente');
  if (type === 'premium' && !S.hasPremiumPass) return toast('❌ Necesitás el pase premium');
  const reward = SEASON_REWARDS[lvl - 1][type];
  S.seasonClaimed[key] = 1;
  if (reward.gold) { S.gold += reward.gold; toast('+' + fmt(reward.gold) + ' 🪙'); }
  if (reward.adn) { S.adn += reward.adn; toast('+' + reward.adn + ' 🧬'); }
  if (reward.item) dropItem(reward.item.rarity);
  if (reward.skin) { S.shop.skins.push(reward.skin); toast('🎨 Skin: ' + reward.skin); }
  if (reward.title) toast('🏆 Título: ' + reward.title);
  Audio.SFX.coin(); persist();
}
function buyPremiumPass() {
  if (S.hasPremiumPass) return toast('✅ Ya tenés el pase premium');
  if (S.adn < PREMIUM_PASS_COST) return toast('❌ Necesitás ' + PREMIUM_PASS_COST + ' 🧬');
  S.adn -= PREMIUM_PASS_COST;
  S.hasPremiumPass = true;
  toast('🎫 ¡Pase premium activado!'); Audio.SFX.levelup(); persist();
}