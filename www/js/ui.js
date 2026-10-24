// skor/hedef göstergeleri ve bölüm menüsü

function updateUI() {
  // rekor anında kaydedilir: oyun yarıda bırakılsa ya da uygulama kapansa da kaybolmaz
  if (!level && score > best) {
    best = score;
    try { localStorage.setItem('boncuk_best', best); } catch (e) {}
  }
  $('score').textContent = score;
  $('best').textContent = best;
  $('moves').textContent = level ? level.moves - moves : moves;
  $('movesLabel').textContent = level ? 'Kalan' : 'Hamle';
  $('bestStat').style.display = level ? 'none' : '';
  $('undo').innerHTML = `↶<span class="lbl"> Geri al</span> (${undos})`;
  $('undo').disabled = busy || gameOver || undos <= 0 || history.length === 0;
  drawNext();
  drawGoals();
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

function drawGoals() {
  const el = $('goals');
  el.classList.toggle('show', !!level);
  if (!level) return;
  el.innerHTML = `<span class="lvl">Bölüm ${levelIdx + 1}</span>` + level.goals.map((g, i) => {
    const v = Math.min(goalValue(i), g.n);
    let dot;
    if (g.type === 'color') dot = `<span class="dot sym" style="background:${COLORS[g.c]}">${COLOR_SYMBOLS[g.c]}</span>`;
    else if (g.type === 'crack') dot = `<span class="dot shell"></span>`;
    else dot = `<span class="dot star">★</span>`;
    return `<span class="goal${v >= g.n ? ' done' : ''}">${dot}${v} / ${g.n}</span>`;
  }).join('');
}

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
    if (open && !st && !current) { current = b; b.classList.add('current'); }
    b.title = lv.goals.map(goalText).join(', ');
    b.addEventListener('click', () => requestStart(i));
    el.appendChild(b);
  });
  return current;
}
function showMenu() {
  $('over').classList.remove('show');
  const current = buildMenu();
  const sv = loadSave();
  $('resumeBtn').hidden = !sv;
  if (sv) $('resumeBtn').innerHTML = '▶ Devam et<small>' +
    (sv.mode === 'level' ? `Bölüm ${sv.levelIdx + 1}` : `Sonsuz mod · ${sv.st.score} puan`) + '</small>';
  $('menu').classList.add('show');
  // bölüm çoksa sıradaki bölüm görünsün diye oraya kaydır
  $('menu').scrollTop = 0;
  if (current && current.offsetTop > $('menu').clientHeight * 0.6)
    $('menu').scrollTop = current.offsetTop - $('menu').clientHeight / 2;
}
