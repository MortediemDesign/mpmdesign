// Spuštění: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const CENIK = require("../assets/js/dtf-cenik.js");
const { calculatePrice, nextTierHint, formatCzk } = require("../assets/js/dtf-calc.js");

const tricko = { source: "ours", id: "tshirt-basic" }; // 119 Kč/ks
const vlastni = { source: "customer" };

test("1 ks A4 na hruď, naše tričko", () => {
  // pásmo 1+: A4 219 + tričko 119 = 338 (nad minimem 300)
  const r = calculatePrice({ qty: 1, positions: [{ id: "hrud", size: "a4" }], textile: tricko }, CENIK);
  assert.equal(r.printPerPiece, 219);
  assert.equal(r.textileTotal, 119);
  assert.equal(r.minOrderTopUp, 0);
  assert.equal(r.total, 338);
  assert.equal(r.perPiece, 338);
});

test("25 ks: logo na hruď + A3 na záda, naše tričko", () => {
  // pásmo 20+: logo 59 + A3 219 = 278/ks; potisk 25 × 278 = 6950; textil 25 × 119 = 2975
  const r = calculatePrice({
    qty: 25,
    positions: [{ id: "hrud", size: "logo" }, { id: "zada", size: "a3" }],
    textile: tricko
  }, CENIK);
  assert.equal(r.tierMinQty, 20);
  assert.equal(r.printPerPiece, 278);
  assert.equal(r.printTotal, 6950);
  assert.equal(r.textileTotal, 2975);
  assert.equal(r.total, 9925);
  assert.equal(r.perPiece, 397);
});

test("vlastní textil zákazníka: potisk +20 %, textil 0 Kč", () => {
  // pásmo 5+: A4 169 × 1,2 = 202,8 → 203 Kč/ks; 10 × 203 = 2030
  const r = calculatePrice({ qty: 10, positions: [{ id: "hrud", size: "a4" }], textile: vlastni }, CENIK);
  assert.equal(r.printPerPiece, 203);
  assert.equal(r.textileTotal, 0);
  assert.equal(r.total, 2030);
});

test("dorovnání na minimální zakázku 300 Kč", () => {
  // 1 ks logo na vlastní textil: 119 × 1,2 = 142,8 → 143; dorovnání 157
  const r = calculatePrice({ qty: 1, positions: [{ id: "hrud", size: "logo" }], textile: vlastni }, CENIK);
  assert.equal(r.subtotal, 143);
  assert.equal(r.minOrderTopUp, 157);
  assert.equal(r.goods, 300);
  assert.equal(r.total, 300);
});

test("express +50 % na potisk a grafiku, ne na textil", () => {
  // pásmo 5+: A5 109 × 5 = 545; úprava grafiky 250; express 0,5 × 795 = 397,5 → 398
  // textil 5 × 119 = 595; celkem 545 + 595 + 250 + 398 = 1788
  const r = calculatePrice({
    qty: 5, positions: [{ id: "hrud", size: "a5" }], textile: tricko, graphics: "edit", express: true
  }, CENIK);
  assert.equal(r.printTotal, 545);
  assert.equal(r.graphics, 250);
  assert.equal(r.express, 398);
  assert.equal(r.textileTotal, 595);
  assert.equal(r.total, 1788);
});

test("doprava se přičítá až po minimální zakázce a nemění cenu za kus", () => {
  const r = calculatePrice({ qty: 1, positions: [{ id: "hrud", size: "logo" }], textile: vlastni, shipping: 85 }, CENIK);
  assert.equal(r.goods, 300);
  assert.equal(r.total, 385);
  assert.equal(r.perPiece, 300);
});

test("nesmyslné vstupy neprojdou", () => {
  const base = { positions: [{ id: "hrud", size: "a4" }], textile: tricko };
  assert.equal(calculatePrice({ ...base, qty: 0 }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: -3 }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: 2.5 }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: NaN }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: 1, positions: [] }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: 1, positions: [{ id: "rukav_l", size: "a3" }] }, CENIK).valid, false);
  assert.equal(calculatePrice({ ...base, qty: 1, textile: { source: "ours", id: "neni" } }, CENIK).valid, false);
});

test("nápověda k dalšímu pásmu", () => {
  const order = { qty: 3, positions: [{ id: "hrud", size: "a4" }], textile: tricko };
  // 3 ks: 219 + 119 = 338/ks; 5 ks: 169 + 119 = 288/ks → úspora 50 Kč/ks
  assert.deepEqual(nextTierHint(order, CENIK), { qty: 5, savingPerPiece: 50 });
  // 50+ je poslední pásmo
  assert.equal(nextTierHint({ ...order, qty: 60 }, CENIK), null);
});

test("formát ceny 1 234 Kč", () => {
  assert.equal(formatCzk(1234), "1 234 Kč");
  assert.equal(formatCzk(99.6), "100 Kč");
});
