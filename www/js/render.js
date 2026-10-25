// efektler ve çizim

// ---------- efektler ----------

const floaters = [];
function floatText(t, color = '#f2b632') { floaters.push({ t, color, life: 1 }); }

const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const waves = [];      // patlayan boncuktan yayılan halka
const pops = [];       // eşleşmenin üstünde yükselen "+puan"
let banner = null;     // ortada beliren kombo övgüsü
let quake = 0;         // ekran sarsıntısı (0..1)

const PRAISE = ['', '', 'Güzel!', 'Harika!', 'Muhteşem!', 'İnanılmaz!'];
const PRAISE_COLORS = ['', '', '#9fd3ff', '#7be07b', '#f2b632', '#ff7ad1'];

function scorePop(x, y, t, combo) { pops.push({ x, y, t, life: 1, big: combo > 1 }); }
function comboBanner(combo) {
  const i = Math.min(combo, PRAISE.length - 1);
  banner = { t: PRAISE[i], sub: `Kombo x${combo}`, col: PRAISE_COLORS[i], life: 1 };
  if (!reduceMotion) quake = Math.min(1, 0.25 + combo * 0.15);
}

const easeOutBack = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

// ipucu halkası, dönüş yönüne doğru kısa aralıklarla kıpırdar
function hintWiggle(r) {
  if (!hint || drag) return 0;
  const sign = r === hint.r ? 1 : partnerOf(hint.r) === r ? -1 : 0;
  if (!sign) return 0;
  const t = (performance.now() - idleSince) % 1600;
  return t < 600 ? Math.sin(t / 600 * Math.PI * 3) * 0.09 * Math.sign(hint.k) * sign : 0;
}

function ringOff(r) {
  return offs[r] + Math.sin(shake[r] * 30) * 0.12 * shake[r] + hintWiggle(r);
}
function beadPos(b, s) {
  const ang = (s + ringOff(b.r)) * 2 * Math.PI / S - Math.PI / 2;
  const rad = geo.hub + (b.vr + 0.5) * geo.w;
  return [geo.cx + Math.cos(ang) * rad, geo.cy + Math.sin(ang) * rad];
}
function beadXY(b) {
  for (let s = 0; s < S; s++) if (grid[b.r][s] === b) return beadPos(b, s);
  return [geo.cx, geo.cy];
}
function burst(b, color) {
  const [x, y] = beadXY(b);
  const col = color || (b.c === JOKER ? '#2f7bff' : COLORS[b.c]);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col, sz: 2 + Math.random() * 3 });
  }
  waves.push({ x, y, life: 1, col });
}

// ---------- çizim ----------

function resize() {
  const wrap = $('wrap');
  const size = Math.min(wrap.clientWidth, wrap.clientHeight, 560);
  const dpr = window.devicePixelRatio || 1;
  board.style.width = size + 'px';
  board.style.height = size + 'px';
  board.width = size * dpr;
  board.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  geo.cx = size / 2; geo.cy = size / 2;
  geo.R = size / 2 * 0.9;
  geo.hub = geo.R * 0.2;
  geo.w = (geo.R - geo.hub) / N;
  const innerArc = 2 * Math.PI * (geo.hub + 0.5 * geo.w) / S;
  geo.br = Math.min(geo.w * 0.4, innerArc * 0.4);
}

// taş kabuk: rengi görünür bırakan yarı saydam örtü + çatlaklar
function drawShell(ctx, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,190,170,0.18)'; ctx.fill();
  ctx.lineWidth = r * 0.26; ctx.strokeStyle = '#9a8f7a'; ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.08); ctx.strokeStyle = 'rgba(30,25,20,0.8)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r * 0.5); ctx.lineTo(x - r * 0.15, y - r * 0.05);
  ctx.lineTo(x - r * 0.35, y + r * 0.3); ctx.lineTo(x + r * 0.1, y + r * 0.75);
  ctx.moveTo(x - r * 0.15, y - r * 0.05); ctx.lineTo(x + r * 0.45, y - r * 0.35);
  ctx.lineTo(x + r * 0.75, y - r * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawPadlock(x, y, s, n) {
  ctx.save();
  ctx.fillStyle = '#f4ead5'; ctx.strokeStyle = '#f4ead5';
  ctx.lineWidth = s * 0.18;
  ctx.beginPath(); ctx.arc(x, y - s * 0.25, s * 0.32, Math.PI, 0); ctx.stroke();
  ctx.fillRect(x - s * 0.5, y - s * 0.25, s, s * 0.8);
  ctx.fillStyle = '#1d3a66';
  ctx.font = `bold ${Math.round(s * 0.65)}px Segoe UI, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, x, y + s * 0.17);
  ctx.restore();
}

function drawBead(ctx, c, x, y, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (c === JOKER) {
    // nazar boncuğu
    const rings = ['#1f4fd1', '#ffffff', '#5fb4ff', '#0b0b1a'];
    const sizes = [1, 0.7, 0.48, 0.24];
    rings.forEach((col, i) => {
      ctx.beginPath(); ctx.arc(x, y, r * sizes[i], 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    });
  } else {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffffcc');
    g.addColorStop(0.25, COLORS[c]);
    g.addColorStop(1, shade(COLORS[c], -0.35));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    drawSymbol(ctx, c, x, y, r * 0.42);
  }
  ctx.restore();
}

// rengi şekille de belli eden işaret; s = yarıçap
function drawSymbol(ctx, c, x, y, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.strokeStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  switch (c) {
    case 0:   // üçgen
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.92, y + s * 0.65); ctx.lineTo(x - s * 0.92, y + s * 0.65);
      break;
    case 1:   // kare
      ctx.rect(x - s * 0.72, y - s * 0.72, s * 1.44, s * 1.44);
      break;
    case 2:   // dolu daire
      ctx.arc(x, y, s * 0.7, 0, Math.PI * 2);
      break;
    case 3:   // eşkenar dörtgen
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.75, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.75, y);
      break;
    case 4:   // artı
      ctx.rect(x - s, y - s * 0.3, s * 2, s * 0.6);
      ctx.rect(x - s * 0.3, y - s, s * 0.6, s * 2);
      break;
    case 5:   // yıldız
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? s * 0.45 : s;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      break;
    case 6:   // halka
      ctx.lineWidth = s * 0.38;
      ctx.arc(x, y, s * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      return;
  }
  ctx.closePath();
  ctx.fill();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

function drawStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 - Math.PI / 2;
    const rr = i % 2 ? r * 0.55 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function draw() {
  const { cx, cy, R, hub, w } = geo;
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.save();
  if (quake > 0) ctx.translate((Math.random() - 0.5) * quake * 10, (Math.random() - 0.5) * quake * 10);

  // halka zeminleri
  for (let r = N - 1; r >= 0; r--) {
    ctx.beginPath(); ctx.arc(cx, cy, hub + (r + 1) * w, 0, Math.PI * 2);
    const active = drag && (drag.ring === r || partnerOf(drag.ring) === r);
    ctx.fillStyle = active ? 'rgba(242,182,50,0.16)' : (r % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)');
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,234,213,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // dış halka dolmak üzere: nabız gibi atan kırmızı bant ve boş yuvalarda halka
  const free = outerFree();
  if (!gameOver && free <= DANGER_FREE) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    ctx.beginPath();
    ctx.arc(cx, cy, hub + N * w, 0, Math.PI * 2);
    ctx.arc(cx, cy, hub + (N - 1) * w, 0, Math.PI * 2, true);
    ctx.fillStyle = `rgba(224,75,60,${0.12 + 0.18 * pulse})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,138,122,${0.4 + 0.5 * pulse})`; ctx.lineWidth = 2;
    for (let s = 0; s < S; s++) if (!grid[N - 1][s]) {
      const a = (s + offs[N - 1]) * 2 * Math.PI / S - Math.PI / 2, rad = hub + (N - 0.5) * w;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, geo.br, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // kilitli halkalar: koyu bant
  for (let r = 0; r < N; r++) if (locks[r] > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, hub + (r + 1) * w, 0, Math.PI * 2);
    ctx.arc(cx, cy, hub + r * w, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(10,15,25,0.45)'; ctx.fill();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(244,234,213,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, hub + (r + 1) * w - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, hub + r * w + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  // ters bağlı halkalar: mor sınır
  if (link) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hub + (link.r + 2) * w, 0, Math.PI * 2);
    ctx.arc(cx, cy, hub + link.r * w, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(176,124,255,0.12)'; ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#b07cff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, hub + (link.r + 1) * w, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // yardımcı nişan modu: çarkın kenarı altın renkte atar
  if (aiming) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.save();
    ctx.shadowColor = '#f2b632'; ctx.shadowBlur = 20 * pulse;
    ctx.strokeStyle = `rgba(242,182,50,${0.5 + 0.5 * pulse})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, hub + N * w + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // ipucu: önerilen halka yumuşakça parlar
  if (hint) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    ctx.save();
    ctx.shadowColor = '#fff3c4'; ctx.shadowBlur = 18 * pulse;
    ctx.strokeStyle = `rgba(255,243,196,${0.25 + 0.45 * pulse})`; ctx.lineWidth = 3;
    for (const r of [hint.r, partnerOf(hint.r)]) if (r >= 0) {
      ctx.beginPath(); ctx.arc(cx, cy, hub + (r + 1) * w - 2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, hub + r * w + 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // ışınlar
  ctx.strokeStyle = 'rgba(244,234,213,0.07)'; ctx.lineWidth = geo.br * 2.2;
  ctx.lineCap = 'round';
  for (let s = 0; s < S; s++) {
    const a = s * 2 * Math.PI / S - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (hub + w * 0.5), cy + Math.sin(a) * (hub + w * 0.5));
    ctx.lineTo(cx + Math.cos(a) * (hub + w * (N - 0.5)), cy + Math.sin(a) * (hub + w * (N - 0.5)));
    ctx.stroke();
  }
  // göbek: çini yıldız
  ctx.beginPath(); ctx.arc(cx, cy, hub, 0, Math.PI * 2);
  ctx.fillStyle = '#1d3a66'; ctx.fill();
  drawStar(cx, cy, hub * 0.85); ctx.fillStyle = '#20b2aa'; ctx.fill();
  drawStar(cx, cy, hub * 0.45); ctx.fillStyle = '#f4ead5'; ctx.fill();

  // boncuklar
  for (let r = 0; r < N; r++) for (let s = 0; s < S; s++) {
    const b = grid[r][s];
    if (!b) continue;
    b.vr += (b.r - b.vr) * 0.25;
    // düşüş bitince küçük bir sekme
    if (Math.abs(b.r - b.vr) > 0.05) b.falling = true;
    else if (b.falling) { b.falling = false; b.land = 1; }
    if (b.sc < 1) b.sc = Math.min(1, b.sc + 0.07);
    let rad = geo.br * easeOutBack(b.sc), alpha = 1;
    if (b.land > 0) { rad *= 1 + 0.16 * Math.sin(b.land * Math.PI); b.land = Math.max(0, b.land - 0.09); }
    if (b.pop > 0) { b.pop = Math.min(1, b.pop + 0.07); rad *= 1 + b.pop * 0.5; alpha = 1 - b.pop; }
    const [x, y] = beadPos(b, s);
    drawBead(ctx, b.c, x, y, rad, alpha);
    if (b.hp > 1) drawShell(ctx, x, y, rad, alpha);
    if (b.crackT > 0) {   // kabuk kırılırken kısa parlama
      b.crackT -= 0.05;
      drawShell(ctx, x, y, rad * (1 + (1 - b.crackT) * 0.4), Math.max(0, b.crackT));
    }
  }

  // engel işaretleri: yuvaların arasına (yarım adım) çizilir
  const half = Math.PI / S;
  for (let r = 0; r < N; r++) if (locks[r] > 0) {
    const a = -Math.PI / 2 + half, rad = hub + (r + 0.5) * w;
    drawPadlock(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, geo.br * 1.1, locks[r]);
  }
  if (link) {
    ctx.save();
    ctx.font = `bold ${Math.round(geo.br * 1.3)}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rad = hub + (link.r + 1) * w;
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + half + (i * 2 + 1) * 2 * half;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      ctx.beginPath(); ctx.arc(x, y, geo.br * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = '#b07cff'; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(i === 0 ? link.t : '⇄', x, y + 1);
    }
    ctx.restore();
  }

  // şok dalgaları
  for (let i = waves.length - 1; i >= 0; i--) {
    const v = waves[i];
    v.life -= 0.06;
    if (v.life <= 0) { waves.splice(i, 1); continue; }
    ctx.globalAlpha = v.life * 0.8; ctx.strokeStyle = v.col; ctx.lineWidth = 3 * v.life + 1;
    ctx.beginPath(); ctx.arc(v.x, v.y, geo.br * (1 + (1 - v.life) * 1.6), 0, Math.PI * 2); ctx.stroke();
  }
  // parçacıklar
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy = p.vy * 0.93 + 0.12; p.life -= 0.028;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, (p.sz || 3) * p.life + 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // +puan yazıları
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.life -= 0.018;
    if (p.life <= 0) { pops.splice(i, 1); continue; }
    const age = 1 - p.life, sc = age < 0.12 ? easeOutBack(age / 0.12) : 1;
    const size = Math.max(1, Math.round(geo.br * (p.big ? 1.3 : 1) * sc));
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    ctx.font = `900 ${size}px Segoe UI, sans-serif`;
    const y = p.y - age * geo.w * 0.9;
    ctx.lineWidth = Math.max(2, size * 0.18); ctx.strokeStyle = 'rgba(15,27,46,0.85)';
    ctx.strokeText(p.t, p.x, y);
    ctx.fillStyle = p.big ? '#f2b632' : '#fff'; ctx.fillText(p.t, p.x, y);
  }
  ctx.globalAlpha = 1;

  // kombo övgüsü: büyüyerek gelir, kısa durur, yükselip söner
  if (banner) {
    banner.life -= 0.014;
    if (banner.life <= 0) banner = null;
    else {
      const age = 1 - banner.life;
      const sc = age < 0.18 ? easeOutBack(age / 0.18) : 1;
      const size = Math.max(1, Math.round(R * 0.2 * sc));
      ctx.save();
      ctx.globalAlpha = Math.min(1, banner.life * 3);
      ctx.translate(cx, cy - Math.max(0, age - 0.6) * R * 0.3);
      ctx.rotate(-0.06);
      ctx.font = `900 ${size}px Segoe UI, sans-serif`;
      ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#0f1b2e'; ctx.strokeText(banner.t, 0, 0);
      ctx.fillStyle = banner.col; ctx.fillText(banner.t, 0, 0);
      ctx.font = `800 ${Math.round(size * 0.38)}px Segoe UI, sans-serif`;
      ctx.lineWidth = size * 0.1; ctx.strokeText(banner.sub, 0, size * 0.72);
      ctx.fillStyle = '#fff'; ctx.fillText(banner.sub, 0, size * 0.72);
      ctx.restore();
    }
  }
  ctx.textBaseline = 'alphabetic';

  // yazılar
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= 0.012;
    if (f.life <= 0) { floaters.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = f.color; ctx.font = `bold ${Math.round(geo.R * 0.1)}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(f.t, cx, cy - R * 0.55 - (1 - f.life) * 30 + i * geo.R * 0.13);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawNext() {
  nctx.clearRect(0, 0, nextc.width, nextc.height);
  queue.forEach((it, i) => {
    const x = 28 + i * 64, y = 28, r = i === 0 ? 22 : 16, a = i === 0 ? 1 : 0.6;
    drawBead(nctx, it.c, x, y, r, a);
    if (it.hp > 1) drawShell(nctx, x, y, r, a);
  });
}

// menüdeki dönen çark logosu
const logo = document.getElementById('logo');
const lctx = logo.getContext('2d');
function drawLogo() {
  const sz = logo.width, c = sz / 2, t = performance.now() / 1000;
  lctx.clearRect(0, 0, sz, sz);
  for (let k = 0; k < 2; k++) {
    const rad = sz * (k ? 0.4 : 0.25), n = k ? 10 : 6, dir = k ? 1 : -1.4;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * 0.4 * dir;
      drawBead(lctx, (i + k * 3) % 7, c + Math.cos(a) * rad, c + Math.sin(a) * rad, sz * (k ? 0.075 : 0.07));
    }
  }
  drawBead(lctx, JOKER, c, c, sz * 0.1 * (1 + 0.05 * Math.sin(t * 3)));
}

function loop() {
  if (quake > 0) quake = Math.max(0, quake - 0.05);
  // oyuncu 10 sn hamle yapmazsa ipucu
  const idle = hintsOn && !busy && !gameOver && !drag && !aiming && !$('menu').classList.contains('show') &&
    !$('intro').classList.contains('show') && performance.now() - idleSince > 10000;
  if (idle && hint === undefined) hint = findHint();
  if (!idle && hint) hint = undefined;
  tickCounters();
  if ($('menu').classList.contains('show')) drawLogo();
  for (let r = 0; r < N; r++) {
    if (shake[r] > 0) shake[r] = Math.max(0, shake[r] - 0.04);
    if (drag && (drag.ring === r || partnerOf(drag.ring) === r)) continue;
    offs[r] *= 0.7;
    if (Math.abs(offs[r]) < 0.002) offs[r] = 0;
  }
  draw();
  requestAnimationFrame(loop);
}
