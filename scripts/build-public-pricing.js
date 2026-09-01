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
    wastePct: 15,                 // odpad fólie (netýká se papíru - ten se účtuje po arších)
    minOrderCzk: 150              // minimální cena zakázky bez dopravy
  },

  keychain: {
    materialId: "petg",
    printerId: "stand",
    densityGPerCm3: 1.27,
    fillFactor: 0.55,
    printHoursPer10g: 0.5,
    setupMins: 10,
    perPieceMins: 2,
    heightRatio: 0.36
  }
};

const mat = (list, id) => list.find(m => m.id === id);
const withMargin = v => v * (1 + A.margin / 100);
const r2 = v => Math.round(v * 100) / 100;

/* --- samolepky: řezané fólie (za m2) + tištěný papír (za A4 arch) --- */
const stickerMaterials = R.materialsFoil.map(m => ({
  id: m.id,
  name: m.name,
  kind: "area",
  sellPerM2: r2(withMargin(m.pricePerM2))
}));

const paper = R.stickerPaperA4;
stickerMaterials.push({
  id: "papir_a4",
  name: paper.name,
  kind: "sheet",
  sellPerSheet: r2(withMargin(paper.pricePerSheet)),
  usableWidthCm: paper.usableWidthCm,
  usableHeightCm: paper.usableHeightCm,
  gapCm: paper.gapCm,
  requiresBackground: true      // tisk nedává smysl u řezaného textu bez podkladu
});

const stickerSetupFee = r2(withMargin((A.sticker.prepMins / 60) * R.workHourlyRate));

/* --- klíčenky --- */
const kMat = mat(R.materials3d, A.keychain.materialId);
const kPrinter = mat(R.printers3d, A.keychain.printerId);
const keychainSetupFee = r2(withMargin((A.keychain.setupMins / 60) * R.workHourlyRate));
const keychainPerPieceLabor = r2(withMargin((A.keychain.perPieceMins / 60) * R.workHourlyRate));
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
  function material(id) {
    return MATERIALS_STICKER.filter(function (o) { return o.id === id; })[0]
      || MATERIALS_STICKER[0];
  }

  /* Kolik kusů w x h cm se vejde na jeden arch (zkouší i otočení o 90 stupňů). */
  function perSheet(m, w, h) {
    function fit(a, b) {
      var cols = Math.floor((m.usableWidthCm + m.gapCm) / (a + m.gapCm));
      var rows = Math.floor((m.usableHeightCm + m.gapCm) / (b + m.gapCm));
      return cols > 0 && rows > 0 ? cols * rows : 0;
    }
    return Math.max(fit(w, h), fit(h, w));
  }

  /* Samolepky: rozměry v cm. Vrací jen výslednou cenu. */
  function sticker(i) {
    var count = Math.max(1, parseInt(i.count, 10) || 1);
    var m = material(i.materialId);
    var w = num(i.widthCm), h = num(i.heightCm);
    var shipping = ship(i.shippingId);
    var goods, extra = {};

    if (m.kind === "sheet") {
      var per = perSheet(m, w, h);
      if (!per) {
        return { error: "too-big", maxSideCm: Math.max(m.usableWidthCm, m.usableHeightCm),
          materialName: m.name, total: 0, goods: 0, shipping: shipping, perPiece: 0 };
      }
      var sheets = Math.ceil(count / per);
      goods = Math.max(STICKER.minOrder, sheets * m.sellPerSheet + STICKER.setupFee);
      extra.sheets = sheets;
      extra.perSheet = per;
    } else {
      var area = (w * h) / 10000 * count * (1 + STICKER.wastePct / 100);
      goods = Math.max(STICKER.minOrder, area * m.sellPerM2 + STICKER.setupFee);
      extra.areaM2 = area;
    }

    return {
      total: goods + shipping,
      goods: goods,
      shipping: shipping,
      perPiece: goods / count,
      materialName: m.name,
      kind: m.kind,
      areaM2: extra.areaM2,
      sheets: extra.sheets,
      perSheet: extra.perSheet
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
    material: material,
    perSheet: perSheet,
    czk: czk
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMPublicPricing = api;
})(typeof window !== "undefined" ? window : null);
`;

const target = path.join(__dirname, "..", "assets", "js", "pricing-public.js");
fs.writeFileSync(target, out.replace(/\r?\n/g, "\r\n"), "utf8");
console.log("zapsano:", target);
stickerMaterials.forEach(m => console.log("  -", m.name,
  m.kind === "sheet" ? m.sellPerSheet + " Kc/arch" : m.sellPerM2 + " Kc/m2"));
console.log("  setup samolepky:", stickerSetupFee, "| min:", A.sticker.minOrderCzk);
