// otomatik bölümler: elle yapılan bölümlerden sonra LEVEL_COUNT'a kadar üretilir.
// her bölüm kendi numarasından türetilen sabit bir seed ile üretilir; herkes aynı bölümü görür.
// üreteci değiştirirsen üretilmiş bölümler de değişir (kazanılmış yıldızlar korunur).

const LEVEL_COUNT = 100;

// bot simülasyonuyla ölçülen hamle başına ortalama ilerleme (renk sayısına göre)
const RATE_COLOR = { 4: 0.83, 5: 0.6, 6: 0.43, 7: 0.35 };
const RATE_NEW_COLOR = 0.62;   // 5.–7. renkler başlangıç tahtasında yok, daha seyrek gelir
const RATE_SCORE = { 4: 38, 5: 31, 6: 25, 7: 20 };
const RATE_CRACK = { 4: 2.35, 5: 1.95, 6: 1.65, 7: 1.1 };   // kabuk/hamle ≈ crack olasılığı × bu

// zorluk: hedefler, oyuncunun beklenen üretiminin bu oranı kadar (ilk → son otomatik bölüm)
const DIFF_START = 0.82, DIFF_END = 0.95;
const GOAL_PENALTY = 0.06;   // her ek hedef, hepsi birden tutturulmalı diye biraz hafifletilir

// 5'li bloklar: blok başı rahat, blok sonu zor bölüm
const BLOCK_TUNE = [-0.07, -0.02, 0, 0.03, 0.08];

function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateLevel(i) {
  const rnd = mulberry32(i * 7919 + 2026);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const t = Math.min(1, (i - 10) / (LEVEL_COUNT - 11));   // 0 → 1 ilerleme

  const colors = i < 20 ? pick([4, 4, 5]) : i < 40 ? pick([4, 5, 5]) : i < 70 ? pick([5, 5, 6]) : i < 85 ? pick([5, 6, 6]) : pick([6, 6, 7]);
  const lv = { colors, goals: [] };
  if (rnd() < 0.5 + 0.4 * t) lv.lock = true;
  if (i >= 12 && rnd() < 0.3 + 0.4 * t) lv.link = true;
  if (rnd() < 0.35 + 0.25 * t) lv.crack = Math.round((0.12 + 0.12 * rnd()) * 100) / 100;

  // hedefler: farklı renkler, en fazla bir kabuk ve bir puan hedefi
  const goalCount = i < 20 ? pick([1, 2, 2]) : pick([1, 2, 2, 3]);
  const palette = Array.from({ length: colors }, (_, c) => c);
  if (lv.crack && rnd() < 0.6) lv.goals.push({ type: 'crack' });
  if (lv.goals.length < goalCount && rnd() < 0.25) lv.goals.push({ type: 'score' });
  while (lv.goals.length < goalCount) {
    const c = palette.splice(Math.floor(rnd() * palette.length), 1)[0];
    lv.goals.push({ type: 'color', c });
  }

  lv.moves = 18 + 3 * goalCount + Math.floor(rnd() * 8);

  // zorluk: oyuncunun hedef başına beklenen üretiminin ne kadarını istediğimiz
  let f = DIFF_START + (DIFF_END - DIFF_START) * t + BLOCK_TUNE[i % 5];
  f *= 1 - GOAL_PENALTY * (goalCount - 1);
  const slow = lv.crack ? 0.85 : 1;   // kabuklar renk ilerlemesini yavaşlatır
  for (const g of lv.goals) {
    if (g.type === 'color') {
      const rate = RATE_COLOR[colors] * slow * (g.c >= 4 ? RATE_NEW_COLOR : 1);
      g.n = Math.max(4, Math.round(rate * lv.moves * f));
    }
    else if (g.type === 'crack') g.n = Math.max(3, Math.round(lv.crack * RATE_CRACK[colors] * lv.moves * f));
    else g.n = Math.max(200, Math.round(RATE_SCORE[colors] * lv.moves * f / 50) * 50);
  }
  return lv;
}

for (let i = LEVELS.length; i < LEVEL_COUNT; i++) LEVELS.push(generateLevel(i));
