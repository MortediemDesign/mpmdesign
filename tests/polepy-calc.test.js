// Spuštění: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const CENIK = require("../assets/js/polepy-cenik.js");
const { estimateRange } = require("../assets/js/polepy-calc.js");

test("osobní auto, loga a texty, montáž u nás, hotová grafika", () => {
  // výroba 800–3000 + montáž 400–1000 = 1200–4000
  const r = estimateRange({ typ: "vozidlo", vuz: "osobni", rozsah: "loga", montaz: "u_nas", grafika: "mam" }, CENIK);
  assert.deepEqual([r.od, r.do], [1200, 4000]);
});

test("jen dodání fólie bez montáže a s návrhem grafiky", () => {
  // výroba 800–3000 + grafika 600–1800 = 1400–4800
  const r = estimateRange({ typ: "vozidlo", vuz: "osobni", rozsah: "loga", montaz: "jen_folie", grafika: "navrh" }, CENIK);
  assert.deepEqual([r.od, r.do], [1400, 4800]);
});

test("celopolep jen s montáží, nákladní celopolep individuálně", () => {
  assert.equal(estimateRange({ typ: "vozidlo", vuz: "dodavka", rozsah: "celopolep", montaz: "jen_folie" }, CENIK).valid, false);
  const r = estimateRange({ typ: "vozidlo", vuz: "dodavka", rozsah: "celopolep", montaz: "u_nas", grafika: "mam" }, CENIK);
  assert.deepEqual([r.od, r.do], [35000, 60000]);
  assert.equal(estimateRange({ typ: "vozidlo", vuz: "nakladni", rozsah: "celopolep", montaz: "u_nas" }, CENIK).individualne, true);
});

test("nákladní auto: konkurence uvádí jen „od“ → bez horní hranice", () => {
  const r = estimateRange({ typ: "vozidlo", vuz: "nakladni", rozsah: "loga", montaz: "u_nas", grafika: "mam" }, CENIK);
  assert.equal(r.od, 10000);
  assert.equal(r.do, null);
});

test("výloha 200 × 150 cm, one-way, s laminací a montáží", () => {
  // 3 m² × (650–1290 + laminace 250–300 + montáž 200) = 3300–5370 → 3300–5400
  const r = estimateRange({
    typ: "vyloha", sirkaCm: 200, vyskaCm: 150, material: "oneway", laminace: true, montaz: "u_nas", grafika: "mam"
  }, CENIK);
  assert.equal(r.plochaM2, 3);
  assert.deepEqual([r.od, r.do], [3300, 5400]);
});

test("malá cedule se dorovná na minimální zakázku 590 Kč", () => {
  const r = estimateRange({ typ: "cedule", sirkaCm: 30, vyskaCm: 20, material: "mat", laminace: false, montaz: "jen_folie", grafika: "mam" }, CENIK);
  assert.deepEqual([r.od, r.do], [590, 590]);
});

test("odrazivá fólie má laminaci v ceně, one-way ne na stěnu, nesmyslné rozměry", () => {
  const base = { typ: "cedule", sirkaCm: 100, vyskaCm: 100, material: "odraziva", montaz: "jen_folie", grafika: "mam" };
  assert.deepEqual(
    [estimateRange({ ...base, laminace: true }, CENIK).od, estimateRange({ ...base, laminace: false }, CENIK).od],
    [700, 700] // 1 m² × 750 Kč, spodní hranice se zaokrouhluje dolů na stovky
  );
  assert.equal(estimateRange({ ...base, typ: "stena", material: "oneway" }, CENIK).valid, false);
  assert.equal(estimateRange({ ...base, sirkaCm: 0 }, CENIK).valid, false);
  assert.equal(estimateRange({ ...base, sirkaCm: 99999 }, CENIK).valid, false);
});
