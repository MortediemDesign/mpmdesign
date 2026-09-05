/*!
 * MPMDESIGN - sdilena cenova logika
 * Jediny zdroj pravdy pro vypocet cen (3D tisk, folie/samolepky, laser).
 * Pouziva ji interni kalkulacka (kalkulacka.html) i verejne konfiguratory.
 *
 * Pozor: sazby nize jsou NAKLADOVE. Verejny konfigurator by mel zobrazovat
 * jen vyslednou cenu, ne rozpad nakladu a marze.
 */
(function (root) {
  "use strict";

  var DEFAULT_RATES = {
    workHourlyRate: 350,
    defaultMarkup: 30,
    laserRatePerMin: 6,
    materials3d: [
      { id: "pla", name: "PLA filament", pricePerKg: 550 },
      { id: "petg", name: "PETG filament", pricePerKg: 600 },
      { id: "asa", name: "ASA UV", pricePerKg: 750 }
    ],
    printers3d: [
      { id: "stand", name: "Bambu Lab P1S/X1C", pricePerHour: 30 },
      { id: "big", name: "Velká 3D tiskárna", pricePerHour: 55 }
    ],
    materialsFoil: [
      { id: "monomer", name: "Monomer (lesk/mat)", pricePerM2: 250 },
      { id: "polymer", name: "Polymer (střední)", pricePerM2: 450 },
      { id: "car", name: "Lité auto-fólie", pricePerM2: 950 }
    ],
    materialsLaser: [
      { id: "custom", name: "Vlastní dodaný materiál", price: 0 },
      { id: "ply3", name: "Překližka 3mm A4", price: 45 },
      { id: "plexi3", name: "Plexi 3mm A4", price: 130 }
    ],
    // Prekliza 4 mm se kupuje po celych deskach, ne po arsich A4.
    laserPlywood4: {
      name: "Překližka 4 mm",
      boardWidthCm: 152.5,
      boardHeightCm: 152.5,
      pricePerBoard: 874
    },
    // Samolepici papir se ucetuje po CELYCH A4 arsich, ne za m2.
    // Pouzitelna plocha je mensi nez arch kvuli okrajum tiskarny.
    stickerPaperA4: {
      name: "Samolepicí papír A4 (tisk)",
      pricePerSheet: 10,
      usableWidthCm: 19,
      usableHeightCm: 27.7,
      gapCm: 0.2
    },
    shippingOptions: [
      { id: "osobni", name: "Osobní převzetí", price: 0 },
      { id: "zasilkovna_pob", name: "Zásilkovna (výdejní místo)", price: 85 },
      { id: "zasilkovna_dom", name: "Zásilkovna (na adresu)", price: 120 },
      { id: "posta", name: "Balík do ruky (ČP)", price: 110 },
      { id: "custom", name: "Vlastní doprava", price: 0 }
    ]
  };

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function finish(parts, marginPct, shipping, count) {
    var subtotal = parts.material + parts.machine + parts.labor;
    var margin = subtotal * (num(marginPct) / 100);
    var total = subtotal + margin + num(shipping);
    var pieces = count && count > 0 ? count : 1;
    return {
      material: parts.material,
      machine: parts.machine,
      labor: parts.labor,
      shipping: num(shipping),
      subtotal: subtotal,
      margin: margin,
      total: total,
      perPiece: total / pieces
    };
  }

  /* 3D tisk: hmotnost v gramech, cena filamentu za kg, cas tisku h+min. */
  function calc3D(i, rates) {
    var r = rates || DEFAULT_RATES;
    return finish({
      material: (num(i.weightG) * num(i.materialPricePerKg)) / 1000,
      machine: (num(i.printHours) + num(i.printMins) / 60) * num(i.printerRatePerHour),
      labor: (num(i.prepMins) / 60) * num(r.workHourlyRate)
    }, i.marginPct, i.shipping, num(i.count) || 1);
  }

  /* Folie/samolepky: rozmery v cm, cena materialu za m2, odpad v %. */
  function calcFoil(i, rates) {
    var r = rates || DEFAULT_RATES;
    var count = num(i.count) || 1;
    var area = ((num(i.widthCm) * num(i.heightCm)) / 10000) * count * (1 + num(i.wastePct) / 100);
    var out = finish({
      material: area * num(i.materialPricePerM2),
      machine: 0,
      labor: (num(i.prepMins) / 60) * num(r.workHourlyRate) + num(i.designCost)
    }, i.marginPct, i.shipping, count);
    out.area = area;
    return out;
  }

  /* Laser: cena materialu za kus, cas paleni na kus v minutach. */
  function calcLaser(i, rates) {
    var r = rates || DEFAULT_RATES;
    var count = num(i.count) || 1;
    return finish({
      material: num(i.materialUnitPrice) * count,
      machine: num(i.fireMinsPerPiece) * num(r.laserRatePerMin) * count,
      labor: (num(i.prepMinsPerPiece) * count) / 60 * num(r.workHourlyRate) + num(i.setupCost)
    }, i.marginPct, i.shipping, count);
  }

  function czk(v) {
    return Math.round(v) + " Kč";
  }

  var api = {
    DEFAULT_RATES: DEFAULT_RATES,
    calc3D: calc3D,
    calcFoil: calcFoil,
    calcLaser: calcLaser,
    czk: czk
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMPricing = api;
})(typeof window !== "undefined" ? window : null);
