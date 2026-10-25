// oyun durumu, başlatma, kayıt, engeller ve oyun mantığı

const board = document.getElementById('board');
const ctx = board.getContext('2d');
const nextc = document.getElementById('nextc');
const nctx = nextc.getContext('2d');
const $ = id => document.getElementById(id);

let grid, offs, queue, score, moves, undos, history, busy, gameOver, particles, nid;
let warned = false;             // "dolmak üzere" uyarısı gösterildi mi (tahta rahatlayınca sıfırlanır)
let locks, link, shake, seen;   //locks[r] = kalan kilit hamlesi; link = { r, t } → r ile r+1 ters bağlı
let mode = 'endless', levelIdx = 0, level = null, cfg = ENDLESS_CFG;
let progress = [];              // bölüm hedeflerinin sayaçları (hedef sırasıyla)
let best = 0, bestAtStart = 0, stars = [];
try { best = +localStorage.getItem('boncuk_best') || 0; } catch (e) {}
try { stars = JSON.parse(localStorage.getItem('boncuk_stars')) || []; } catch (e) {}

let geo = { cx: 0, cy: 0, R: 0, hub: 0, w: 0, br: 0 };
let drag = null;

let animSpeed = 1;   // 0 = animasyonsuz (otomatik testler için)
const wait = ms => animSpeed ? new Promise(r => setTimeout(r, ms * animSpeed)) : Promise.resolve();

function colorCount() {
  if (level) return level.colors;
  let n = 4;
  for (let i = 1; i < COLOR_STEPS.length; i++) if (score >= COLOR_STEPS[i]) n = 4 + i;
  return n;
}
function randColor() {
  return Math.random() < JOKER_CHANCE ? JOKER : Math.floor(Math.random() * colorCount());
}
function randItem() {
  const c = randColor();
  const hp = c !== JOKER && moves >= cfg.crackFrom && Math.random() < cfg.crackChance ? 2 : 1;
  return { c, hp };
}
function makeBead(c, r, hp = 1) { return { id: nid++, c, r, hp, vr: r, pop: 0, sc: 1 }; }

// idx: bölüm numarası (0'dan); verilmezse sonsuz mod
function startGame(idx) {
  mode = idx === undefined ? 'endless' : 'level';
  levelIdx = idx || 0;
  level = mode === 'level' ? LEVELS[levelIdx] : null;
  cfg = level ? levelCfg(level) : ENDLESS_CFG;
  progress = level ? level.goals.map(() => 0) : [];
  $('menu').classList.remove('show');
  clearSave();
  newGame();
  if (level) showIntro();
}

function newGame() {
  nid = 1;
  grid = Array.from({ length: N }, () => Array(S).fill(null));
  offs = Array(N).fill(0);
  locks = Array(N).fill(0); link = null; shake = Array(N).fill(0); seen = {};
  score = 0; moves = 0; undos = 3; history = []; bestAtStart = best;
  busy = false; gameOver = false; particles = []; warned = false;
  resetHint();
  // başlangıç: iç iki halka dolu, üçüncü yarı dolu; hazır eşleşme olmasın
  for (let s = 0; s < S; s++) {
    const h = s % 2 === 0 ? 3 : 2;
    for (let r = 0; r < h; r++) {
      let c;
      do { c = Math.floor(Math.random() * Math.min(4, colorCount())); }
      while (r >= 2 && grid[r - 1][s].c === c && grid[r - 2][s].c === c);
      grid[r][s] = makeBead(c, r);
    }
  }
  queue = [randItem(), randItem(), randItem()];
  $('over').classList.remove('show');
  updateUI();
}

function snapshot() {
  return {
    grid: grid.map(row => row.map(b => b ? { c: b.c, hp: b.hp } : null)),
    queue: queue.slice(), score, moves, progress: progress.slice(),
    locks: locks.slice(), link: link ? { ...link } : null
  };
}
function restore(st) {
  grid = st.grid.map((row, r) => row.map(o => o === null ? null : makeBead(o.c, r, o.hp)));
  queue = st.queue.slice(); score = st.score; moves = st.moves; progress = st.progress.slice();
  locks = st.locks.slice(); link = st.link ? { ...st.link } : null;
  offs = Array(N).fill(0);
  resetHint();
}

// ---------- kayıt: süren oyun her hamleden sonra saklanır, menüden devam edilir ----------

function saveGame() {
  if (gameOver || moves === 0) { clearSave(); return; }
  const sv = { mode, levelIdx, st: snapshot(), undos, history, seen, bestAtStart };
  try { localStorage.setItem('boncuk_save', JSON.stringify(sv)); } catch (e) {}
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem('boncuk_save')); } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem('boncuk_save'); } catch (e) {}
}

function resumeGame() {
  const sv = loadSave();
  if (!sv) return;
  mode = sv.mode; levelIdx = sv.levelIdx;
  level = mode === 'level' ? LEVELS[levelIdx] : null;
  cfg = level ? levelCfg(level) : ENDLESS_CFG;
  $('menu').classList.remove('show');
  newGame();
  try {
    restore(sv.st);
    undos = sv.undos; history = sv.history; seen = sv.seen; bestAtStart = sv.bestAtStart;
  } catch (e) {   // bozuk ya da eski biçimli kayıt: yeni oyunla devam
    clearSave();
    progress = level ? level.goals.map(() => 0) : [];
    newGame();
  }
  updateUI();
}

// kayıtlı oyun varken yeni oyun başlatmadan önce sor
function requestStart(idx) {
  if (!loadSave()) { startGame(idx); return; }
  showResult('Yeni oyun başlasın mı?', null, 'Kayıtlı oyunun silinecek.',
    'Yeni oyun', () => startGame(idx), 'Vazgeç');
}

// ters bağlı halkanın eşi (yoksa -1)
function partnerOf(r) {
  if (!link) return -1;
  if (link.r === r) return r + 1;
  if (link.r + 1 === r) return r - 1;
  return -1;
}

function introduce(key, text) {
  if (seen[key]) return;
  seen[key] = true;
  floatText(text, '#9fd3ff');
}

// her hamlenin başında süreleri azalt
function tickObstacles() {
  for (let r = 0; r < N; r++) if (locks[r] > 0 && --locks[r] === 0) sfx.unlock();
  if (link && --link.t <= 0) link = null;
}

// her hamlenin sonunda yeni engel ekle
function spawnObstacles() {
  if (moves >= cfg.lockFrom && moves % cfg.lockEvery === 0 && !locks.some(l => l > 0)) {
    const free = [];
    for (let r = 0; r < N; r++) if (partnerOf(r) < 0) free.push(r);
    if (free.length) {
      locks[free[Math.floor(Math.random() * free.length)]] = cfg.lockTurns;
      introduce('lock', 'Yeni engel: Kilitli halka!');
      sfx.lockOn();
    }
  }
  if (moves >= cfg.linkFrom && moves % cfg.linkEvery === 0 && !link) {
    const pairs = [];
    for (let r = 0; r < N - 1; r++) if (!locks[r] && !locks[r + 1]) pairs.push(r);
    if (pairs.length) {
      link = { r: pairs[Math.floor(Math.random() * pairs.length)], t: cfg.linkTurns };
      introduce('link', 'Yeni engel: Ters bağlı halkalar!');
      sfx.link();
    }
  }
}

// ---------- ipucu: oyuncu bir süre hamle yapmazsa eşleşme getiren bir çevirme gösterilir ----------

let hint, idleSince = 0;   // hint: undefined = henüz aranmadı, null = yok
function resetHint() { hint = undefined; idleSince = performance.now(); }

function findHint() {
  for (const k of [1, -1, 2, -2, 3, -3, 4]) for (let r = 0; r < N; r++) {
    if (locks[r] > 0) continue;
    const q = partnerOf(r);
    rotateRing(r, k); if (q >= 0) rotateRing(q, -k);
    const ok = findMatches().size > 0;
    rotateRing(r, -k); if (q >= 0) rotateRing(q, k);
    if (ok) return { r, k };
  }
  return null;
}

// ---------- oyun mantığı ----------

function rotateRing(r, k) {
  k = ((k % S) + S) % S;
  if (!k) return false;
  const old = grid[r];
  const nw = Array(S).fill(null);
  for (let s = 0; s < S; s++) nw[(s + k) % S] = old[s];
  grid[r] = nw;
  return true;
}

// her ışında (merkezden dışa) ardışık 3+ uyumlu boncuk
function findMatches() {
  const hit = new Set();
  for (let s = 0; s < S; s++) {
    for (let a = 0; a < N; a++) {
      let col = null, b = a;
      while (b < N && grid[b][s]) {
        const c = grid[b][s].c;
        if (c !== JOKER) {
          if (col === null) col = c;
          else if (c !== col) break;
        }
        b++;
      }
      if (b - a >= 3) for (let r = a; r < b; r++) hit.add(grid[r][s]);
    }
  }
  return hit;
}

// boncuklar merkeze doğru düşer
function gravity() {
  for (let s = 0; s < S; s++) {
    const col = [];
    for (let r = 0; r < N; r++) if (grid[r][s]) col.push(grid[r][s]);
    for (let r = 0; r < N; r++) {
      grid[r][s] = col[r] || null;
      if (col[r]) col[r].r = r;
    }
  }
}

async function cascade(combo) {
  for (;;) {
    const m = findMatches();
    if (!m.size) return combo;
    combo++;
    const gained = m.size * 10 * combo;
    score += gained;
    const hitRings = new Set();
    let anyPop = false, anyCrack = false, sx = 0, sy = 0;
    for (const b of m) {
      hitRings.add(b.r);
      const cracked = b.hp > 1;
      if (cracked) anyCrack = true; else anyPop = true;
      const [x, y] = beadXY(b);
      sx += x; sy += y;
      if (cracked) { b.hp--; b.crackT = 1; burst(b, '#9a8f7a'); }
      else { b.pop = 0.001; burst(b); }
      if (level) level.goals.forEach((g, i) => {
        if (g.type === 'crack' ? cracked : g.type === 'color' && !cracked && b.c === g.c) {
          progress[i]++;
          flyToGoal(x, y, i, cracked ? '#9a8f7a' : COLORS[b.c]);
        }
      });
    }
    scorePop(sx / m.size, sy / m.size, '+' + gained, combo);
    // kilitli halkada patlama kilidi bir azaltır
    for (const r of hitRings) if (locks[r] > 0 && --locks[r] === 0) sfx.unlock();
    if (anyPop) sfx.pop(combo);
    if (anyCrack) sfx.crack();
    if (combo > 1) { comboBanner(combo); sfx.combo(combo); }
    updateUI();
    await wait(280);
    for (let r = 0; r < N; r++) for (let s = 0; s < S; s++)
      if (grid[r][s] && m.has(grid[r][s]) && grid[r][s].pop > 0) grid[r][s] = null;
    gravity();
    await wait(200);
  }
}

async function afterMove(snap) {
  busy = true;
  history.push(snap);
  if (history.length > 10) history.shift();
  moves++;
  tickObstacles();
  updateUI();
  await wait(130);
  let combo = await cascade(0);
  if (level && goalsDone()) { winLevel(); return; }

  // yeni boncuk(lar) dış halkadan girer
  const count = spawnCount();
  for (let i = 0; i < count; i++) {
    const empties = [];
    for (let s = 0; s < S; s++) if (!grid[N - 1][s]) empties.push(s);
    if (!empties.length) { endGame(); return; }
    const s = empties[Math.floor(Math.random() * empties.length)];
    const it = queue.shift();
    const b = makeBead(it.c, N - 1, it.hp);
    b.vr = N + 0.6; b.sc = 0;
    grid[N - 1][s] = b;
    if (it.hp > 1) introduce('crack', 'Yeni engel: Çatlak boncuk!');
    queue.push(randItem());
  }
  gravity();
  updateUI();
  await wait(260);
  await cascade(combo);
  spawnObstacles();

  // tahta tamamen doluysa ve hiç boşluk yoksa bir sonraki girişte biter; uyar
  busy = false;
  resetHint();
  updateUI();
  if (level) {
    if (goalsDone()) { winLevel(); return; }
    if (moves >= level.moves) { endGame('Hamle bitti!'); return; }
  }
  const free = outerFree();
  if (!free) floatText('Çark dolu! Bir eşleşme yap!', '#ff8a7a');
  else if (free <= DANGER_FREE && !warned) floatText('Dikkat: çark dolmak üzere!', '#ff8a7a');
  warned = free <= DANGER_FREE;
  saveGame();
}

// sonsuz modda yavaş akış; bölümlerde hedefe yetecek kadar boncuk gelsin diye tahta seyrekse daha çok
function spawnCount() {
  if (!level) return moves % 3 === 0 ? 2 : 1;
  let filled = 0;
  for (const row of grid) for (const b of row) if (b) filled++;
  return Math.max(2, Math.min(4, 20 - filled));
}

// dış halkadaki boş yuva sayısı; 0 ise bir sonraki girişte oyun biter
function outerFree() {
  let n = 0;
  for (let s = 0; s < S; s++) if (!grid[N - 1][s]) n++;
  return n;
}

function showResult(title, starCount, text, mainLabel, mainAction, menuLabel = 'Menü') {
  $('overMenu').textContent = menuLabel;
  $('overTitle').textContent = title;
  // yıldızlar tek tek, sesle düşer
  $('overStars').innerHTML = starCount === null ? '' : [0, 1, 2].map(i =>
    `<span class="${i < starCount ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.28}s">★</span>`).join('');
  for (let i = 0; i < (starCount || 0); i++) setTimeout(() => sfx.star(i), 350 + i * 280);
  $('finalText').textContent = text;
  $('overMain').textContent = mainLabel;
  $('overMain').onclick = mainAction;
  $('over').classList.add('show');
  $('over').classList.toggle('win', !!starCount);
}

function endGame(title = 'Çark doldu!') {
  gameOver = true; busy = false;
  clearSave();
  sfx.lose();
  updateUI();
  if (level) {
    const left = level.goals.map((g, i) => g.n - Math.min(goalValue(i), g.n)).reduce((a, b) => a + b, 0);
    showResult(title, null, `Hedefe ${left} kaldı. Bir daha dene!`, 'Tekrar dene', () => startGame(levelIdx));
    return;
  }
  const record = score > bestAtStart ? ' · Yeni rekor!' : ` · Rekor: ${best}`;
  showResult(title, null, `Puan: ${score} · Hamle: ${moves}${record}`, 'Tekrar oyna', () => startGame());
}

function winLevel() {
  gameOver = true; busy = false;
  clearSave();
  const ratio = (level.moves - moves) / level.moves;
  const st = ratio >= 0.3 ? 3 : ratio >= 0.1 ? 2 : 1;
  stars[levelIdx] = Math.max(stars[levelIdx] || 0, st);
  try { localStorage.setItem('boncuk_stars', JSON.stringify(stars)); } catch (e) {}
  sfx.win();
  confetti();
  updateUI();
  const last = levelIdx === LEVELS.length - 1;
  showResult(last ? 'Tüm bölümler bitti!' : 'Bölüm tamam!', st,
    `${level.moves - moves} hamle kaldı · Puan: ${score}`,
    last ? 'Sonsuz mod' : 'Sonraki bölüm',
    () => last ? startGame() : startGame(levelIdx + 1));
}
