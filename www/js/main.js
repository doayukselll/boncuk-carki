// giriş olayları ve açılış

// ---------- giriş ----------

function pointerInfo(e) {
  const rect = board.getBoundingClientRect();
  const x = e.clientX - rect.left - geo.cx, y = e.clientY - rect.top - geo.cy;
  return { d: Math.hypot(x, y), a: Math.atan2(y, x) };
}

board.addEventListener('pointerdown', e => {
  if (busy || gameOver) return;
  resetHint();
  const p = pointerInfo(e);
  if (p.d < geo.hub * 0.8 || p.d > geo.R + geo.w * 0.5) return;
  const ring = Math.max(0, Math.min(N - 1, Math.floor((p.d - geo.hub) / geo.w)));
  if (locks[ring] > 0) {
    shake[ring] = 1;
    sfx.locked();
    floatText(`Kilitli! ${locks[ring]} hamle`, '#ff8a7a');
    return;
  }
  drag = { ring, last: p.a, start: offs[ring], acc: 0, snap: snapshot() };
  board.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = pointerInfo(e);
  let d = p.a - drag.last;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  drag.acc += d; drag.last = p.a;
  offs[drag.ring] = drag.start + drag.acc / (2 * Math.PI / S);
  const q = partnerOf(drag.ring);
  if (q >= 0) offs[q] = -offs[drag.ring];
});
function endDrag() {
  if (!drag) return;
  const r = drag.ring, snap = drag.snap, q = partnerOf(r);
  const k = Math.round(offs[r]);
  offs[r] -= k;
  drag = null;
  if (!rotateRing(r, k)) return;
  if (q >= 0) { rotateRing(q, -k); offs[q] += k; }
  sfx.snap();
  afterMove(snap);
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

$('undo').addEventListener('click', () => {
  if (busy || gameOver || undos <= 0 || !history.length) return;
  undos--;
  restore(history.pop());
  updateUI();
  saveGame();
});
$('overMenu').addEventListener('click', showMenu);
// süren oyun her hamleden sonra kaydedildiği için menüye dönmek bir şey kaybettirmez
$('menuBtn').addEventListener('click', () => { if (!busy) showMenu(); });
$('resumeBtn').addEventListener('click', resumeGame);
$('soundBtn').addEventListener('click', () => {
  muted = !muted;
  try { localStorage.setItem('boncuk_muted', muted ? '1' : '0'); } catch (e) {}
  updateSoundBtn();
  sfx.snap();
});
updateSoundBtn();

// PWA: çevrimdışı çalışma (yalnızca http/https üzerinden; dosyadan açınca ve uygulama içinde gerekmez)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !haptics) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
$('endlessBtn').addEventListener('click', () => requestStart());
$('intro').addEventListener('pointerdown', hideIntro);
window.addEventListener('resize', () => {
  resize();
  if ($('menu').classList.contains('show')) { buildMenu(); drawMapPath(); }
});

newGame();
resize();
showMenu();
loop();
