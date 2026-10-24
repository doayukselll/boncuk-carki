// ses ve titreşim

// ---------- ses ve titreşim ----------
// tüm sesler Web Audio ile anında sentezlenir; dosya yok

let muted = false;
try { muted = localStorage.getItem('boncuk_muted') === '1'; } catch (e) {}
let actx = null, noiseBuf = null;

function audio() {
  if (muted || !animSpeed) return null;
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, dur, { type = 'sine', vol = 0.18, at = 0, slide = 0 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.25, freq = 2000, q = 1, at = 0 } = {}) {
  const a = audio();
  if (!a) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + at;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t); src.stop(t + dur + 0.02);
}

// Capacitor uygulamasında (iOS dahil) yerel Haptics eklentisi; tarayıcıda navigator.vibrate
const haptics = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
  ? window.Capacitor.Plugins.Haptics : null;

function vibrate(pattern) {
  if (muted || !animSpeed) return;
  if (haptics) {
    // desen: [titreşim, ara, titreşim, ...] ms; her titreşimi süresine göre hafif/orta/güçlü darbeye çevir
    const p = Array.isArray(pattern) ? pattern : [pattern];
    let at = 0;
    p.forEach((ms, i) => {
      if (i % 2 === 0) {
        const style = ms <= 20 ? 'LIGHT' : ms <= 45 ? 'MEDIUM' : 'HEAVY';
        setTimeout(() => haptics.impact({ style }).catch(() => {}), at);
      }
      at += ms;
    });
    return;
  }
  if (!navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

// pentatonik dizi: kombolar tırmandıkça nota yükselir
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const note = step => 523.25 * Math.pow(2, PENTA[Math.min(step, PENTA.length - 1)] / 12);

const sfx = {
  snap() { tone(950, 0.04, { type: 'triangle', vol: 0.07 }); },
  pop(combo) {
    const f = note(combo - 1);
    tone(f, 0.22, { vol: 0.2 });
    tone(f * 2, 0.12, { type: 'triangle', vol: 0.06, at: 0.01 });
    vibrate(15);
  },
  combo(combo) {
    for (let i = 0; i < Math.min(combo, 5); i++) tone(note(combo + i), 0.12, { type: 'triangle', vol: 0.1, at: 0.06 * i });
    vibrate([20, 40, 30]);
  },
  crack() {
    noise(0.09, { vol: 0.35, freq: 3200, q: 0.8 });
    tone(140, 0.12, { type: 'triangle', vol: 0.15, slide: 0.6 });
    vibrate(30);
  },
  locked() {
    tone(130, 0.09, { type: 'square', vol: 0.08 });
    tone(110, 0.12, { type: 'square', vol: 0.08, at: 0.11 });
    vibrate([40, 50, 40]);
  },
  lockOn() {
    tone(330, 0.08, { type: 'square', vol: 0.06 });
    noise(0.06, { vol: 0.2, freq: 5000, q: 2, at: 0.06 });
    tone(220, 0.15, { type: 'triangle', vol: 0.12, at: 0.06 });
    vibrate(35);
  },
  unlock() {
    tone(440, 0.08, { type: 'triangle', vol: 0.1 });
    tone(660, 0.14, { type: 'triangle', vol: 0.1, at: 0.07 });
  },
  link() {
    tone(300, 0.35, { type: 'sine', vol: 0.12, slide: 1.8 });
    tone(540, 0.35, { type: 'sine', vol: 0.08, slide: 0.55, at: 0.05 });
    vibrate(25);
  },
  win() {
    [0, 4, 7, 12].forEach((s, i) => tone(523.25 * Math.pow(2, s / 12), 0.3, { type: 'triangle', vol: 0.14, at: i * 0.11 }));
    [0, 4, 7].forEach(s => tone(1046.5 * Math.pow(2, s / 12), 0.7, { vol: 0.07, at: 0.48 }));
    vibrate([50, 60, 50, 60, 150]);
  },
  lose() {
    [7, 4, 0].forEach((s, i) => tone(392 * Math.pow(2, (s - 7) / 12), 0.28, { type: 'triangle', vol: 0.12, at: i * 0.16 }));
    tone(196, 0.6, { type: 'sine', vol: 0.1, at: 0.48, slide: 0.7 });
    vibrate(250);
  }
};

function updateSoundBtn() { $('soundBtn').textContent = muted ? '🔇' : '🔊'; }
