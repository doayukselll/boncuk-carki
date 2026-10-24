// sabitler, renkler, engel ayarları ve bölümler

const N = 4;          // halka sayısı (0 = en iç)
const S = 8;          // her halkadaki yuva sayısı
const COLORS = ['#e04b3c', '#20b2aa', '#f2b632', '#5aa83c', '#8e5bc9', '#f07c2a', '#e86aa6'];
const JOKER = -1;
const JOKER_CHANCE = 0.04;
const DANGER_FREE = 2;   // dış halkada bu kadar ya da daha az boşluk kalınca uyar
const COLOR_STEPS = [0, 400, 1200, 2500];  // puan eşikleri: 4, 5, 6, 7 renk

const COLOR_NAMES = ['kırmızı', 'turkuaz', 'sarı', 'yeşil', 'mor', 'turuncu', 'pembe'];
// renk körlüğü için her rengin sembolü (boncukta çizilen şeklin metin karşılığı)
const COLOR_SYMBOLS = ['▲', '■', '●', '◆', '✚', '★', '◯'];

// engeller: hangi hamleden itibaren, ne sıklıkla, kaç hamle sürer
const ENDLESS_CFG = {
  lockFrom: 8, lockEvery: 7, lockTurns: 3,
  crackFrom: 12, crackChance: 0.12,
  linkFrom: 18, linkEvery: 9, linkTurns: 5
};

// bölümler: hamle hakkı, renk sayısı, hedefler ve açık engeller
const LEVELS = [
  { moves: 15, colors: 3, goals: [{ type: 'color', c: 0, n: 6 }] },
  { moves: 18, colors: 4, goals: [{ type: 'color', c: 1, n: 8 }, { type: 'color', c: 2, n: 8 }] },
  { moves: 20, colors: 4, goals: [{ type: 'color', c: 0, n: 15 }] },
  { moves: 20, colors: 4, goals: [{ type: 'color', c: 3, n: 12 }], lock: true },
  { moves: 20, colors: 4, goals: [{ type: 'crack', n: 7 }], crack: 0.25 },
  { moves: 26, colors: 5, goals: [{ type: 'color', c: 0, n: 8 }, { type: 'color', c: 4, n: 8 }], lock: true },
  { moves: 24, colors: 4, goals: [{ type: 'score', n: 800 }], link: true },
  { moves: 28, colors: 5, goals: [{ type: 'color', c: 1, n: 14 }, { type: 'color', c: 3, n: 10 }], lock: true, link: true },
  { moves: 25, colors: 5, goals: [{ type: 'color', c: 2, n: 12 }, { type: 'crack', n: 4 }], crack: 0.15, lock: true },
  { moves: 32, colors: 5, goals: [{ type: 'color', c: 0, n: 10 }, { type: 'crack', n: 5 }, { type: 'score', n: 1000 }], crack: 0.18, lock: true, link: true }
];

function levelCfg(lv) {
  return {
    lockFrom: lv.lock ? 3 : Infinity, lockEvery: 6, lockTurns: 3,
    crackFrom: lv.crack ? 0 : Infinity, crackChance: lv.crack || 0,
    linkFrom: lv.link ? 4 : Infinity, linkEvery: 8, linkTurns: 5
  };
}
