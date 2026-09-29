/*!
 * MPMDESIGN – výpočet ceny DTF potisku.
 *
 * Čistá funkce bez DOM – používá ji konfigurátor (dtf.html) i testy
 * (tests/dtf-calc.test.js). Ceny bere z ceníku (dtf-cenik.js).
 *
 * order = {
 *   qty: 10,                                   // celkem kusů textilu
 *   positions: [{ id: "hrud", size: "a4" }],   // místa potisku
 *   textile: { source: "ours", id: "tshirt-basic" } | { source: "customer" },
 *   graphics: "none" | "edit" | "custom",
 *   express: false,
 *   shipping: 0                                // Kč, mimo minimální zakázku
 * }
 */
(function (root) {
  "use strict";

  function tierFor(qty, pricing) {
    var tier = pricing.tiers[0];
    pricing.tiers.forEach(function (t) { if (qty >= t.minQty) tier = t; });
    return tier;
  }

  function validate(order, pricing) {
    var qty = order.qty;
    if (!(Number.isInteger(qty) && qty >= 1)) return "Zadejte počet kusů (alespoň 1).";
    if (qty > 10000) return "Pro více než 10 000 kusů nám prosím napište.";
    if (!order.positions || !order.positions.length) return "Vyberte alespoň jedno místo potisku.";
    for (var i = 0; i < order.positions.length; i++) {
      var p = order.positions[i];
      var pos = pricing.positions[p.id];
      if (!pos) return "Neznámé místo potisku.";
      if (!pricing.sizes[p.size]) return "Neznámá velikost potisku.";
      if (pos.sizes && pos.sizes.indexOf(p.size) === -1) {
        return pos.label + ": sem se vejde jen " + pricing.sizes[pos.sizes[0]].label.toLowerCase() + ".";
      }
    }
    var t = order.textile || {};
    if (t.source === "ours" && !textileById(t.id, pricing)) return "Vyberte textil.";
    if (t.source !== "ours" && t.source !== "customer") return "Vyberte, čí textil potiskujeme.";
    if (!pricing.graphics[order.graphics || "none"]) return "Neznámá volba grafiky.";
    return null;
  }

  function textileById(id, pricing) {
    return pricing.textiles.filter(function (x) { return x.id === id; })[0] || null;
  }

  function calculatePrice(order, pricing) {
    var error = validate(order, pricing);
    if (error) return { valid: false, error: error };

    var qty = order.qty;
    var tier = tierFor(qty, pricing);
    var ownTextile = order.textile.source === "customer";

    // 3. potisk za kus = součet všech míst v pásmu; 4. textil zákazníka +20 %
    var printBase = order.positions.reduce(function (sum, p) { return sum + tier.prices[p.size]; }, 0);
    var printPerPiece = Math.round(ownTextile ? printBase * (1 + pricing.customerTextileSurcharge) : printBase);
    var printTotal = printPerPiece * qty;

    var textile = ownTextile ? null : textileById(order.textile.id, pricing);
    var textilePerPiece = textile ? textile.price : 0;
    var textileTotal = textilePerPiece * qty;

    // 5. grafika jednorázově za celou zakázku
    var g = pricing.graphics[order.graphics || "none"];
    var graphics = g.price || 0;

    // 6. express na potisk i práci (grafiku), ne na textil
    var express = order.express ? Math.round((printTotal + graphics) * pricing.expressSurcharge) : 0;

    var subtotal = printTotal + textileTotal + graphics + express;
    // 7. dorovnání na minimální zakázku
    var minOrderTopUp = subtotal < pricing.minOrder ? pricing.minOrder - subtotal : 0;
    var goods = subtotal + minOrderTopUp;
    var shipping = Math.max(0, Math.round(order.shipping || 0));

    return {
      valid: true,
      qty: qty,
      tierMinQty: tier.minQty,
      printPerPiece: printPerPiece,
      printTotal: printTotal,
      textilePerPiece: textilePerPiece,
      textileTotal: textileTotal,
      graphics: graphics,
      graphicsFrom: !!g.from,
      express: express,
      subtotal: subtotal,
      minOrderTopUp: minOrderTopUp,
      goods: goods,
      shipping: shipping,
      total: goods + shipping,
      perPiece: Math.round(goods / qty)
    };
  }

  /* „Při X ks ušetříte Y Kč za kus" – jen když je zákazník blízko dalšího pásma. */
  function nextTierHint(order, pricing) {
    var current = calculatePrice(order, pricing);
    if (!current.valid) return null;
    var next = pricing.tiers.filter(function (t) { return t.minQty > order.qty; })[0];
    if (!next) return null;
    var gap = next.minQty - order.qty;
    if (gap > Math.max(5, Math.round(next.minQty * 0.4))) return null;
    var then = calculatePrice(Object.assign({}, order, { qty: next.minQty }), pricing);
    var saving = current.perPiece - then.perPiece;
    return saving > 0 ? { qty: next.minQty, savingPerPiece: saving } : null;
  }

  function formatCzk(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
  }

  var api = {
    calculatePrice: calculatePrice,
    nextTierHint: nextTierHint,
    tierFor: tierFor,
    formatCzk: formatCzk
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMDtf = api;
})(typeof window !== "undefined" ? window : null);
