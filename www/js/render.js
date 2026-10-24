// efektler ve çizim

// ---------- efektler ----------

const floaters = [];
function floatText(t, color = '#f2b632') { floaters.push({ t, color, life: 1 }); }

function ringOff(r) {
  return offs[r] + Math.sin(shake[r] * 30) * 0.12 * shake[r];
}
function beadPos(b, s) {
  const ang = (s + ringOff(b.r)) * 2 * Math.PI / S - Math.PI / 2;
  const rad = geo.hub + (b.vr + 0.5) * geo.w;
  return [geo.cx + Math.cos(ang) * rad, geo.cy + Math.sin(ang) * rad];
}
function burst(b, color) {
  for (let r = 0; r < N; r++) for (let s = 0; s < S; s++) if (grid[r][s] === b) {
    const [x, y] = beadPos(b, s);
    const col = color || (b.c === JOKER ? '#2f7bff' : COLORS[b.c]);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col });
    }
  }
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
    if (b.sc < 1) b.sc = Math.min(1, b.sc + 0.08);
    let rad = geo.br * b.sc, alpha = 1;
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

  // parçacıklar
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= 0.03;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life + 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

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
}

function drawNext() {
  nctx.clearRect(0, 0, nextc.width, nextc.height);
  queue.forEach((it, i) => {
    const x = 28 + i * 64, y = 28, r = i === 0 ? 22 : 16, a = i === 0 ? 1 : 0.6;
    drawBead(nctx, it.c, x, y, r, a);
    if (it.hp > 1) drawShell(nctx, x, y, r, a);
  });
}

function loop() {
  for (let r = 0; r < N; r++) {
    if (shake[r] > 0) shake[r] = Math.max(0, shake[r] - 0.04);
    if (drag && (drag.ring === r || partnerOf(drag.ring) === r)) continue;
    offs[r] *= 0.7;
    if (Math.abs(offs[r]) < 0.002) offs[r] = 0;
  }
  draw();
  requestAnimationFrame(loop);
}
