// skor/hedef göstergeleri, kutlamalar ve bölüm haritası

// sınıfı yeniden ekleyerek CSS animasyonunu baştan oynatır
function bump(el, cls = 'bump') {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

let shownScore = 0;   // ekrandaki puan, gerçek puana doğru sayarak yaklaşır

function tickCounters() {
  if (shownScore === score) return;
  shownScore = score < shownScore ? score : Math.min(score, shownScore + Math.max(1, Math.ceil((score - shownScore) * 0.15)));
  $('score').textContent = shownScore;
}

function setStat(id, v) {
  const el = $(id);
  if (el.textContent === String(v)) return;
  el.textContent = v;
  bump(el.parentElement);
}

function updateUI() {
  // rekor anında kaydedilir: oyun yarıda bırakılsa ya da uygulama kapansa da kaybolmaz
  if (!level && score > best) {
    best = score;
    try { localStorage.setItem('boncuk_best', best); } catch (e) {}
  }
  if (score > shownScore) bump($('score').parentElement);
  else tickCounters();
  setStat('best', best);
  const left = level ? movesLeft() : moves;
  setStat('moves', left);
  $('movesStat').classList.toggle('low', !!level && left <= 5 && !gameOver);
  $('movesLabel').textContent = level ? 'Kalan' : 'Hamle';
  $('bestStat').style.display = level ? 'none' : '';
  $('undo').innerHTML = `↶<span class="lbl"> Geri al</span> (${undos})`;
  $('undo').disabled = busy || gameOver || undos <= 0 || history.length === 0;
  drawNext();
  drawGoals();
  updateBoosters();
}

function goalValue(i) {
  return level.goals[i].type === 'score' ? score : progress[i];
}
function goalsDone() {
  return level.goals.every((g, i) => goalValue(i) >= g.n);
}
function goalText(g) {
  if (g.type === 'color') return `${g.n} ${COLOR_NAMES[g.c]}`;
  if (g.type === 'crack') return `${g.n} kabuk kır`;
  return `${g.n} puan`;
}
function goalDot(g) {
  if (g.type === 'color') return `<span class="dot sym" style="background:${COLORS[g.c]}">${COLOR_SYMBOLS[g.c]}</span>`;
  if (g.type === 'crack') return `<span class="dot shell"></span>`;
  return `<span class="dot star">★</span>`;
}

// hedef çipleri bölüm başında bir kez kurulur; sonra yalnızca sayılar değişir (animasyonlar kesilmesin)
function drawGoals() {
  const el = $('goals');
  el.classList.toggle('show', !!level);
  if (!level) return;
  if (el._level !== level) {
    el._level = level;
    el.innerHTML = `<span class="lvl">Bölüm ${levelIdx + 1}</span>` + level.goals.map((g, i) =>
      `<span class="goal" data-i="${i}">${goalDot(g)}<span class="n"></span></span>`).join('');
  }
  level.goals.forEach((g, i) => {
    const chip = el.querySelector(`[data-i="${i}"]`), v = Math.min(goalValue(i), g.n);
    const done = v >= g.n;
    if (done && !chip.classList.contains('done')) bump(chip);
    chip.classList.toggle('done', done);
    chip.querySelector('.n').textContent = done ? '✓' : `${v} / ${g.n}`;
  });
}

// toplanan boncuk tahtadan hedef çipine uçar
function flyToGoal(x, y, i, color) {
  if (!animSpeed || reduceMotion) return;
  const chip = $('goals').querySelector(`[data-i="${i}"]`);
  if (!chip) return;
  const b = board.getBoundingClientRect(), t = chip.querySelector('.dot').getBoundingClientRect();
  const sx = b.left + x, sy = b.top + y;
  const dx = t.left + t.width / 2 - sx, dy = t.top + t.height / 2 - sy;
  const d = document.createElement('div');
  d.className = 'fly';
  d.style.cssText = `left:${sx}px;top:${sy}px;width:${geo.br * 2}px;height:${geo.br * 2}px;--c:${color}`;
  document.body.appendChild(d);
  const side = (Math.random() - 0.5) * 120;
  d.animate([
    { transform: 'translate(-50%,-50%) scale(1)' },
    { transform: `translate(calc(-50% + ${dx * 0.25 + side}px), calc(-50% + ${dy * 0.15 - 30}px)) scale(1.25)`, offset: 0.3 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45)` }
  ], { duration: 620 + Math.random() * 180, easing: 'cubic-bezier(.5,0,.75,.4)' }).onfinish = () => {
    d.remove();
    bump(chip);
  };
}

// bölüm başında hedefleri gösteren kart; dokununca ya da birkaç saniye sonra kapanır
let introTimer = 0;
function showIntro() {
  $('introTitle').textContent = `Bölüm ${levelIdx + 1}`;
  $('introGoals').innerHTML = level.goals.map(g =>
    `<div class="goal">${goalDot(g)}<span>${goalText(g)}</span></div>`).join('');
  $('introMoves').textContent = `${level.moves} hamle`;
  $('intro').classList.add('show');
  clearTimeout(introTimer);
  introTimer = setTimeout(hideIntro, 2600);
}
function hideIntro() {
  clearTimeout(introTimer);
  $('intro').classList.remove('show');
  resetHint();
}

function confetti() {
  if (!animSpeed || reduceMotion) return;
  for (let i = 0; i < 70; i++) {
    const d = document.createElement('i');
    d.className = 'confetti';
    d.style.cssText = `left:${Math.random() * 100}vw;background:${COLORS[i % COLORS.length]};` +
      `--dx:${(Math.random() - 0.5) * 200}px;--r:${(Math.random() - 0.5) * 1440}deg;` +
      `animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * 0.5}s`;
    document.body.appendChild(d);
    d.addEventListener('animationend', () => d.remove());
  }
}

// ---------- bölüm haritası: düğümler kıvrılan bir yol üstünde ----------

function buildMenu() {
  const el = $('levels');
  el.innerHTML = '';
  let current = null;   // açık olup henüz geçilmemiş ilk bölüm
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    const open = i === 0 || stars[i - 1] > 0;
    const st = stars[i] || 0;
    b.innerHTML = open ? `${i + 1}<small>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</small>` : '🔒';
    b.disabled = !open;
    if (st) b.classList.add('won');
    if (open && !st && !current) { current = b; b.classList.add('current'); }
    b.style.setProperty('--x', (Math.sin(i * 0.85) * 0.32).toFixed(3));
    b.title = lv.goals.map(goalText).join(', ');
    b.addEventListener('click', () => requestStart(i));
    el.appendChild(b);
  });
  return current;
}

// yol, düğümler yerleştikten sonra merkezlerinden geçen yumuşak bir eğri olarak çizilir
function drawMapPath() {
  const el = $('levels');
  const pts = [...el.querySelectorAll('button')].map(b => [b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2]);
  if (!pts.length) return;
  const curve = n => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < n; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], my = (y0 + y1) / 2;
      d += ` C${x0},${my} ${x1},${my} ${x1},${y1}`;
    }
    return d;
  };
  const doneN = el.querySelectorAll('button.won').length + 1;
  const svg = `<svg width="${el.scrollWidth}" height="${el.scrollHeight}" aria-hidden="true">
    <path d="${curve(pts.length)}" class="road"/>
    <path d="${curve(pts.length)}" class="dash"/>
    <path d="${curve(Math.min(doneN, pts.length))}" class="trail"/></svg>`;
  el.insertAdjacentHTML('afterbegin', svg);
}

function showMenu() {
  $('over').classList.remove('show');
  hideIntro();
  setAim(null);
  const current = buildMenu();
  const sv = loadSave();
  $('resumeBtn').hidden = !sv;
  if (sv) $('resumeBtn').innerHTML = '▶ Devam et<small>' +
    (sv.mode === 'level' ? `Bölüm ${sv.levelIdx + 1}` : `Sonsuz mod · ${sv.st.score} puan`) + '</small>';
  $('menu').classList.add('show');
  updateChest();
  drawMapPath();
  // bölüm çoksa sıradaki bölüm görünsün diye oraya kaydır
  const m = $('menu');
  m.scrollTop = 0;
  const top = current ? current.offsetTop + $('levels').offsetTop : 0;
  if (current && top > m.clientHeight * 0.6) m.scrollTop = top - m.clientHeight / 2;
  checkDaily();
}
