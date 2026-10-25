// yardımcılar: envanter, kullanım, yıldız sandığı, günlük ödül ve oyun içi ödüller

const BOOSTERS = {
  hammer: { icon: '🔨', name: 'Çekiç', tip: 'Kırılacak boncuğa dokun', aim: true },
  ray:    { icon: '⚡', name: 'Işın', tip: 'Temizlenecek ışına dokun', aim: true },
  bomb:   { icon: '🎨', name: 'Renk bombası', tip: 'Patlatılacak renkten bir boncuğa dokun', aim: true },
  eye:    { icon: '🧿', name: 'Nazar' },
  swap:   { icon: '🔀', name: 'Değiştir' },
  key:    { icon: '🔑', name: 'Anahtar' },
  moves:  { icon: '➕', name: '+5 hamle' }   // çubukta yok; hamle bitince önerilir
};
const BAR = ['hammer', 'ray', 'bomb', 'eye', 'swap', 'key'];

// sandıktan çıkma ağırlıkları: güçlü olan daha nadir
const CHEST_POOL = { hammer: 4, swap: 4, eye: 3, ray: 3, key: 2, moves: 2, bomb: 1 };
const CHEST_STARS = 10;   // her bu kadar yıldızda bir sandık
const CHEST_ITEMS = 3;
// 7 günlük giriş serisi; seri bozulursa 1. günden başlar
const DAILY = [
  { swap: 1 }, { hammer: 1 }, { eye: 1, swap: 1 }, { ray: 1 },
  { hammer: 1, key: 1 }, { moves: 1 }, { bomb: 1, ray: 1, hammer: 1 }
];
const PRIZE_STEP = 1000;               // sonsuz modda her bu kadar puanda bir ödül
const PRIZE_POOL = ['hammer', 'swap', 'eye'];

let inv = {}, rewards = { chests: 0, daily: '', streak: 0 };
try { inv = JSON.parse(localStorage.getItem('boncuk_inv')) || {}; } catch (e) {}
try { rewards = { ...rewards, ...JSON.parse(localStorage.getItem('boncuk_rewards')) }; } catch (e) {}
let aiming = null;   // nişan alan yardımcı (hammer/ray/bomb) ya da null

function saveInv() {
  try { localStorage.setItem('boncuk_inv', JSON.stringify(inv)); } catch (e) {}
}
function saveRewards() {
  try { localStorage.setItem('boncuk_rewards', JSON.stringify(rewards)); } catch (e) {}
}
function grant(items) {
  for (const k in items) inv[k] = (inv[k] || 0) + items[k];
  saveInv();
  updateBoosters();
}
function useItem(k) {
  inv[k]--;
  saveInv();
}

// ---------- çubuk ----------

function buildBoosterBar() {
  $('boosters').innerHTML = BAR.map(k =>
    `<button data-k="${k}" title="${BOOSTERS[k].name}">${BOOSTERS[k].icon}<b></b></button>`).join('');
  $('boosters').querySelectorAll('button').forEach(b => b.addEventListener('click', () => onBooster(b.dataset.k)));
  updateBoosters();
}

function usable(k) {
  if (k === 'key') return locks.some(l => l > 0) || !!link;
  if (k === 'eye') return queue[0].c !== JOKER;
  return true;
}

function updateBoosters() {
  const bar = $('boosters');
  if (!bar.firstChild || !grid) return;
  if ((busy || gameOver) && aiming) setAim(null);
  bar.querySelectorAll('button').forEach(b => {
    const k = b.dataset.k, n = inv[k] || 0;
    b.querySelector('b').textContent = n || '+';
    b.classList.toggle('empty', !n);
    b.classList.toggle('active', aiming === k);
    b.disabled = busy || gameOver || (n > 0 && !usable(k));
  });
}

function setAim(k) {
  aiming = k;
  $('aimTip').textContent = k ? BOOSTERS[k].tip : '';
  $('aimTip').classList.toggle('show', !!k);
  updateBoosters();
}

function onBooster(k) {
  if (busy || gameOver) return;
  if (!inv[k]) { floatText('Sandıktan ve günlük ödülden kazanılır', '#9fd3ff'); return; }
  if (BOOSTERS[k].aim) { setAim(aiming === k ? null : k); return; }
  setAim(null);
  if (k === 'eye') queue[0] = { c: JOKER, hp: 1 };
  else if (k === 'swap') queue = queue.map(() => randItem());
  else if (k === 'key') { locks.fill(0); link = null; sfx.unlock(); }
  useItem(k);
  sfx.booster();
  floatText(`${BOOSTERS[k].icon} ${BOOSTERS[k].name}!`, '#9fd3ff');
  resetHint();
  updateUI();
  saveGame();
}

// nişan modunda tahtaya dokunma: hedefi bul ve patlat; çark dışına dokunmak iptal eder
function aimAt(p) {
  if (p.d < geo.hub || p.d > geo.hub + N * geo.w) { setAim(null); return; }
  const r = Math.min(N - 1, Math.floor((p.d - geo.hub) / geo.w));
  const s = ((Math.round((p.a + Math.PI / 2) * S / (2 * Math.PI)) % S) + S) % S;
  const b = grid[r][s], k = aiming;
  let set;
  if (k === 'ray') set = grid.map(row => row[s]).filter(Boolean);
  else if (!b) return;
  else if (k === 'hammer') set = [b];
  else if (b.c === JOKER) { floatText('Bir renk seç', '#ff8a7a'); return; }
  else set = grid.flat().filter(o => o && o.c === b.c);
  if (!set.length) return;
  setAim(null);
  useItem(k);
  blast(set, k);
}

async function blast(set, k) {
  busy = true;
  sfx.booster();
  const cracks = set.filter(hitBead).length;
  score += set.length * 10;
  if (cracks) sfx.crack();
  if (cracks < set.length) sfx.pop(1);
  if (!reduceMotion) quake = k === 'hammer' ? 0.3 : 0.8;
  updateUI();
  await wait(280);
  removePopped();
  gravity();
  await wait(200);
  await cascade(0);
  busy = false;
  resetHint();
  checkPrizes();
  updateUI();
  if (level && goalsDone()) { winLevel(); return; }
  saveGame();
}

// hamle bitince, elde varsa +5 hamleyle devam
function offerExtraMoves() {
  const n = inv.moves || 0;
  if (!n) return;
  const btn = $('overExtra');
  btn.hidden = false;
  btn.textContent = `➕ 5 hamleyle devam et (${n})`;
  btn.onclick = () => {
    useItem('moves');
    bonusMoves += 5;
    gameOver = false;
    $('over').classList.remove('show');
    sfx.booster();
    floatText('+5 hamle!', '#7be07b');
    updateUI();
    saveGame();
  };
}

// ---------- oyun içi ödüller ----------

function prize() {
  const k = PRIZE_POOL[Math.floor(Math.random() * PRIZE_POOL.length)];
  grant({ [k]: 1 });
  floatText(`🎁 +1 ${BOOSTERS[k].name}`, '#7be07b');
  const b = $('boosters').querySelector(`[data-k="${k}"]`);
  if (b) bump(b);
}
function checkPrizes() {
  if (level) return;
  while (score >= prizeAt) { prizeAt += PRIZE_STEP; prize(); }
}

// ---------- yıldız sandığı ve günlük ödül ----------

function totalStars() { return stars.reduce((a, b) => a + (b || 0), 0); }

function updateChest() {
  const have = totalStars() - rewards.chests * CHEST_STARS;
  const ready = have >= CHEST_STARS;
  $('chestBtn').classList.toggle('ready', ready);
  $('chestBtn').querySelector('.bar i').style.width = Math.min(100, have / CHEST_STARS * 100) + '%';
  $('chestBtn').querySelector('.cnt').textContent = ready ? 'Aç!' : `${have}/${CHEST_STARS} ★`;
}

function rollChest() {
  const items = {}, keys = Object.keys(CHEST_POOL);
  const total = keys.reduce((a, k) => a + CHEST_POOL[k], 0);
  for (let i = 0; i < CHEST_ITEMS; i++) {
    let x = Math.random() * total;
    const k = keys.find(k => (x -= CHEST_POOL[k]) < 0);
    items[k] = (items[k] || 0) + 1;
  }
  return items;
}

function openChest() {
  if (totalStars() - rewards.chests * CHEST_STARS < CHEST_STARS) {
    bump($('chestBtn'), 'nope');
    floatText('Bölümlerden yıldız topla', '#9fd3ff');
    return;
  }
  rewards.chests++;
  saveRewards();
  const items = rollChest();
  grant(items);
  showReward('Yıldız sandığı', `${CHEST_STARS} yıldız topladın!`, items);
}

function checkDaily() {
  const today = new Date().toDateString();
  if (rewards.daily === today) return;
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  rewards.streak = rewards.daily === yesterday ? rewards.streak % DAILY.length + 1 : 1;
  rewards.daily = today;
  saveRewards();
  const items = DAILY[rewards.streak - 1];
  grant(items);
  const days = DAILY.map((_, i) =>
    `<span class="${i < rewards.streak - 1 ? 'past' : i === rewards.streak - 1 ? 'today' : ''}">${i + 1}</span>`).join('');
  showReward('Günlük ödül', `${rewards.streak}. gün · Her gün gel, ödül büyüsün!`, items, days);
}

function showReward(title, sub, items, days = '') {
  $('rewardTitle').textContent = title;
  $('rewardSub').textContent = sub;
  $('rewardDays').innerHTML = days;
  $('rewardItems').innerHTML = Object.keys(items).map((k, i) =>
    `<div class="item" style="animation-delay:${0.55 + i * 0.15}s"><span class="ic">${BOOSTERS[k].icon}</span>` +
    `<b>x${items[k]}</b><small>${BOOSTERS[k].name}</small></div>`).join('');
  $('reward').classList.add('show');
  setTimeout(() => sfx.reward(), 500);
}
