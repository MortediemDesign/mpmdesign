/*!
 * MPMDESIGN – ceník DTF potisku textilu.
 *
 * Zdroj: zadání od Miguela (dtf-kalkulacka-zadani.md, 29. 9. 2026).
 * Ceny jsou KONEČNÉ – Miguel není plátce DPH.
 * Změna ceny = úprava tohoto souboru, kód konfigurátoru se nemění.
 */
(function (root) {
  "use strict";

  var CENIK = {
    currency: "Kč",
    vatPayer: false,

    // Kategorie velikosti potisku – motiv se musí vejít do daného rozměru.
    sizes: {
      logo: { label: "Logo do 10 × 10 cm", maxCm: [10, 10] },
      a5: { label: "A5 (do 15 × 21 cm)", maxCm: [15, 21] },
      a4: { label: "A4 (do 21 × 30 cm)", maxCm: [21, 30] },
      a3: { label: "A3 (do 30 × 42 cm)", maxCm: [30, 42] }
    },

    // Cena jednoho potisku za kus; pásmo určuje CELKOVÝ počet kusů textilu.
    tiers: [
      { minQty: 1, prices: { logo: 119, a5: 159, a4: 219, a3: 329 } },
      { minQty: 5, prices: { logo: 79, a5: 109, a4: 169, a3: 259 } },
      { minQty: 20, prices: { logo: 59, a5: 89, a4: 139, a3: 219 } },
      { minQty: 50, prices: { logo: 45, a5: 75, a4: 119, a3: 199 } }
    ],

    minOrder: 300,
    customerTextileSurcharge: 0.2, // potisk na textil zákazníka +20 %
    expressSurcharge: 0.5, // express +50 % na potisk a grafiku, ne na textil

    graphics: {
      none: { label: "Mám hotová tisková data", price: 0 },
      edit: { label: "Úprava grafiky (pozadí, vektorizace)", price: 250 },
      custom: { label: "Grafika na míru", price: 600, from: true, note: "cena po domluvě, od 600 Kč (600 Kč/h)" }
    },

    // Místa potisku. Rukáv je úzký, proto na něj jde jen logo.
    positions: {
      hrud: { label: "Hruď" },
      zada: { label: "Záda" },
      rukav_l: { label: "Levý rukáv", sizes: ["logo"] },
      rukav_p: { label: "Pravý rukáv", sizes: ["logo"] },
      vlastni: { label: "Jiné umístění" }
    },

    // ZÁSTUPNÉ POLOŽKY – sortiment a ceny textilu doplní Miguel.
    textiles: [
      { id: "tshirt-basic", label: "Tričko Basic", price: 119, sizes: ["S", "M", "L", "XL", "XXL"], colors: ["bílá", "černá", "šedá", "navy"] },
      { id: "hoodie", label: "Mikina s kapucí", price: 449, sizes: ["S", "M", "L", "XL", "XXL"], colors: ["černá", "šedá", "navy"] }
    ]
    // Doprava se bere z pricing-public.js (SHIPPING), stejně jako u ostatních konfigurátorů.
  };

  if (typeof module === "object" && module.exports) module.exports = CENIK;
  if (root) root.MPM_DTF_CENIK = CENIK;
})(typeof window !== "undefined" ? window : null);
