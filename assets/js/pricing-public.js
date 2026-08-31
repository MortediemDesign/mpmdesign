/*!
 * MPMDESIGN - VEŘEJNÝ ceník pro konfigurátory.
 *
 * !!! TENTO SOUBOR SE GENERUJE - needituj ho ručně !!!
 * Zdroj: assets/js/pricing.js + scripts/build-public-pricing.js
 * Přegenerování:  node scripts/build-public-pricing.js
 *
 * Obsahuje pouze PRODEJNÍ ceny. Nákladové sazby, hodinovka ani marže
 * tu schválně nejsou - tento soubor si stáhne každý návštěvník webu.
 * Vygenerováno: 2026-08-31
 */
(function (root) {
  "use strict";

  var MATERIALS_STICKER = [
    {
      "id": "monomer",
      "name": "Monomer (lesk/mat)",
      "sellPerM2": 325
    },
    {
      "id": "polymer",
      "name": "Polymer (střední)",
      "sellPerM2": 585
    },
    {
      "id": "car",
      "name": "Lité auto-fólie",
      "sellPerM2": 1235
    }
  ];

  var SHIPPING = [
    {
      "id": "osobni",
      "name": "Osobní převzetí",
      "price": 0
    },
    {
      "id": "zasilkovna_pob",
      "name": "Zásilkovna (výdejní místo)",
      "price": 85
    },
    {
      "id": "zasilkovna_dom",
      "name": "Zásilkovna (na adresu)",
      "price": 120
    },
    {
      "id": "posta",
      "name": "Balík do ruky (ČP)",
      "price": 110
    }
  ];

  var STICKER = { setupFee: 113.75, wastePct: 15, minOrder: 150 };
  var KEYCHAIN = {
    sellPerGram: 2.73,
    setupFee: 75.83,
    perPieceLabor: 15.17,
    densityGPerCm3: 1.27,
    fillFactor: 0.55,
    heightRatio: 0.36
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
