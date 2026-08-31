/**
 * Generátor veřejného ceníku.
 *
 * Vezme NÁKLADOVÝ model z assets/js/pricing.js, aplikuje předpoklady níže
 * a zapíše assets/js/pricing-public.js s hotovými PRODEJNÍMI cenami.
 * Veřejný soubor neobsahuje nákladové sazby, hodinovku ani marži.
 *
 * Spuštění:  node scripts/build-public-pricing.js
 * Po každé změně sazeb v pricing.js je potřeba tenhle skript spustit znovu.
 */
const fs = require("fs");
const path = require("path");
const P = require("../assets/js/pricing.js");
const R = P.DEFAULT_RATES;

/* ------------------------------------------------------------------ *
 * PŘEDPOKLADY pro samoobslužné objednávky přes web.
 * Tohle jsou jediná místa, kde se rozhoduje o veřejné ceně - uprav zde.
 * ------------------------------------------------------------------ */
const A = {
  margin: R.defaultMarkup,        // %, přebírá se z pricing.js

  sticker: {
    prepMins: 15,                 // příprava dat + nastavení plotru na zakázku
    wastePct: 15,                 // odpad fólie
    minOrderCzk: 150              // minimální cena zakázky bez dopravy
  },

  keychain: {
    materialId: "petg",           // z čeho se klíčenky tisknou
    printerId: "stand",
    densityGPerCm3: 1.27,         // PETG
    fillFactor: 0.55,             // stěny + výplň, ne plný objem
    printHoursPer10g: 0.5,
    setupMins: 10,                // příprava zakázky (jednorázově)
    perPieceMins: 2,              // manipulace na kus
    heightRatio: 0.36             // výška = 0.36 x šířka (drží konfigurátor)
  }
};

const mat = (list, id) => list.find(m => m.id === id);
const withMargin = v => v * (1 + A.margin / 100);
const r2 = v => Math.round(v * 100) / 100;

/* --- samolepky: prodejní cena za m2 + jednorázový setup --- */
const stickerMaterials = R.materialsFoil.map(m => ({
  id: m.id,
  name: m.name,
  sellPerM2: r2(withMargin(m.pricePerM2))
}));
const stickerSetupFee = r2(withMargin((A.sticker.prepMins / 60) * R.workHourlyRate));

/* --- klíčenky: prodejní cena za kus + jednorázový setup --- */
const kMat = mat(R.materials3d, A.keychain.materialId);
const kPrinter = mat(R.printers3d, A.keychain.printerId);
const keychainSetupFee = r2(withMargin((A.keychain.setupMins / 60) * R.workHourlyRate));
const keychainPerPieceLabor = r2(withMargin((A.keychain.perPieceMins / 60) * R.workHourlyRate));
// cena materiálu+tisku na 1 gram, už s marží
const gramCost = kMat.pricePerKg / 1000
  + (A.keychain.printHoursPer10g / 10) * kPrinter.pricePerHour;
const keychainSellPerGram = r2(withMargin(gramCost));

const out = `/*!
 * MPMDESIGN - VEŘEJNÝ ceník pro konfigurátory.
 *
 * !!! TENTO SOUBOR SE GENERUJE - needituj ho ručně !!!
 * Zdroj: assets/js/pricing.js + scripts/build-public-pricing.js
 * Přegenerování:  node scripts/build-public-pricing.js
 *
 * Obsahuje pouze PRODEJNÍ ceny. Nákladové sazby, hodinovka ani marže
 * tu schválně nejsou - tento soubor si stáhne každý návštěvník webu.
 * Vygenerováno: ${new Date().toISOString().slice(0, 10)}
 */
(function (root) {
  "use strict";

  var MATERIALS_STICKER = ${JSON.stringify(stickerMaterials, null, 2).replace(/\n/g, "\n  ")};

  var SHIPPING = ${JSON.stringify(
    R.shippingOptions.map(s => ({ id: s.id, name: s.name, price: s.price })).filter(s => s.id !== "custom"),
    null, 2
  ).replace(/\n/g, "\n  ")};

  var STICKER = { setupFee: ${stickerSetupFee}, wastePct: ${A.sticker.wastePct}, minOrder: ${A.sticker.minOrderCzk} };
  var KEYCHAIN = {
    sellPerGram: ${keychainSellPerGram},
    setupFee: ${keychainSetupFee},
    perPieceLabor: ${keychainPerPieceLabor},
    densityGPerCm3: ${A.keychain.densityGPerCm3},
    fillFactor: ${A.keychain.fillFactor},
    heightRatio: ${A.keychain.heightRatio}
  };

  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function ship(id) {
    var s = SHIPPING.filter(function (o) { return o.id === id; })[0];
    return s ? s.price : 0;
  }

  /* Samolepky: rozměry v cm. Vrací jen výslednou cenu. */
  function sticker(i) {
    var count = Math.max(1, parseInt(i.count, 10) || 1);
    var m = MATERIALS_STICKER.filter(function (o) { return o.id === i.materialId; })[0]
      || MATERIALS_STICKER[0];
    var area = (num(i.widthCm) * num(i.heightCm)) / 10000 * count * (1 + STICKER.wastePct / 100);
    var goods = Math.max(STICKER.minOrder, area * m.sellPerM2 + STICKER.setupFee);
    var shipping = ship(i.shippingId);
    return {
      total: goods + shipping,
      goods: goods,
      shipping: shipping,
      perPiece: goods / count,
      areaM2: area,
      materialName: m.name
    };
  }

  /* Klíčenky: rozměry v mm. Vrací jen výslednou cenu. */
  function keychain(i) {
    var count = Math.max(1, parseInt(i.count, 10) || 1);
    var w = num(i.widthMm), t = num(i.thicknessMm);
    var volumeCm3 = (w * (w * KEYCHAIN.heightRatio) * t) / 1000;
    var grams = volumeCm3 * KEYCHAIN.fillFactor * KEYCHAIN.densityGPerCm3;
    var goods = KEYCHAIN.setupFee
      + count * (grams * KEYCHAIN.sellPerGram + KEYCHAIN.perPieceLabor);
    var shipping = ship(i.shippingId);
    return {
      total: goods + shipping,
      goods: goods,
      shipping: shipping,
      perPiece: goods / count,
      grams: grams
    };
  }

  function czk(v) { return Math.round(v) + " Kč"; }

  var api = {
    MATERIALS_STICKER: MATERIALS_STICKER,
    SHIPPING: SHIPPING,
    sticker: sticker,
    keychain: keychain,
    czk: czk
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMPublicPricing = api;
})(typeof window !== "undefined" ? window : null);
`;

const target = path.join(__dirname, "..", "assets", "js", "pricing-public.js");
fs.writeFileSync(target, out.replace(/\r?\n/g, "\r\n"), "utf8");
console.log("zapsano:", target);
console.log("  samolepky setup:", stickerSetupFee, "Kc | min:", A.sticker.minOrderCzk);
stickerMaterials.forEach(m => console.log("   -", m.name, m.sellPerM2, "Kc/m2"));
console.log("  klicenky: ", keychainSellPerGram, "Kc/g | setup", keychainSetupFee, "| na kus", keychainPerPieceLabor);
