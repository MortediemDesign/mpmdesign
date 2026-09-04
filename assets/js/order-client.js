/*!
 * MPMDESIGN - odesílání objednávek z konfigurátorů.
 *
 * Objednávka VŽDY odchází na server, který ji přepošle e-mailem.
 * Zákazníkovi se nic nestahuje.
 *
 * Režim se nastavuje v assets/js/config.js (MPM_CONFIG.orderMode):
 *   "vercel"    - vlastní funkce api/order.js nasazená na Vercelu (doporučeno,
 *                 zvládne i velké STL modely)
 *   "web3forms" - služba web3forms.com, bez vlastního nasazování;
 *                 pozor na limit velikosti přílohy na volném tarifu
 */
(function (root) {
  "use strict";

  function cfg() { return root.MPM_CONFIG || {}; }

  var PRODUCT_NAMES = {
    klicenka: "Klíčenka",
    samolepky: "Samolepky",
    gravirovani: "Laserové gravírování"
  };

  // Chyba nastaveni webu - opakovani pokusu zakaznikovi nepomuze.
  function setupError(msg) {
    var e = new Error(msg);
    e.setup = true;
    return e;
  }

  function b64ToBlob(b64, type) {
    var bin = atob(b64);
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: type || "application/octet-stream" });
  }

  function summary(order) {
    var d = order.design || {}, p = order.pricing || {}, c = order.customer || {};
    var lines = [
      "Produkt: " + (PRODUCT_NAMES[order.product] || "Klíčenka"),
      "Zákazník: " + c.name + " <" + c.email + ">",
      "Počet kusů: " + (c.qty || 1),
      "Cena celkem: " + (p.total != null ? Math.round(p.total) + " Kč" : "neuvedeno"),
      "Doprava: " + (p.shippingName || "neuvedeno"),
      ""
    ];
    Object.keys(d).forEach(function (k) {
      if (d[k] !== null && d[k] !== undefined && d[k] !== "") lines.push(k + ": " + d[k]);
    });
    if (c.note) lines.push("", "Poznámka zákazníka: " + c.note);
    return lines.join("\n");
  }

  /**
   * order = { product, customer:{name,email,qty,note}, design, pricing,
   *           fileBase64, fileName, fileType, previewImageBase64 }
   * Vrací Promise. Při chybě vyhodí Error se srozumitelnou hláškou.
   */
  async function sendOrder(order) {
    var c = cfg();
    var mode = c.orderMode || (c.orderEndpoint ? "vercel" : "");

    if (!mode) {
      throw setupError(
        "Objednávkový formulář se právě dokončuje. Napiš nám prosím na " +
        (c.orderEmail || "náš e-mail") + " a domluvíme se."
      );
    }

    if (mode === "web3forms") {
      if (!c.web3formsKey) throw setupError("Objednávkový formulář se právě dokončuje.");
      var fd = new FormData();
      fd.append("access_key", c.web3formsKey);
      fd.append("subject", "Nová zakázka: " + (order.subjectHint || order.product));
      fd.append("from_name", "MPMDESIGN konfigurátor");
      fd.append("name", order.customer.name);
      fd.append("email", order.customer.email);
      fd.append("replyto", order.customer.email);
      fd.append("message", summary(order));
      if (order.fileBase64) {
        fd.append("attachment",
          b64ToBlob(order.fileBase64, order.fileType), order.fileName);
      }
      var r1 = await fetch("https://api.web3forms.com/submit", { method: "POST", body: fd });
      var j1 = await r1.json().catch(function () { return {}; });
      if (!r1.ok || j1.success === false) {
        throw new Error(j1.message || "server odmítl objednávku (" + r1.status + ")");
      }
      return true;
    }

    // režim "vercel" - vlastní endpoint, JSON
    if (!c.orderEndpoint) throw setupError("Objednávkový formulář se právě dokončuje.");
    var r2 = await fetch(c.orderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });
    if (!r2.ok) {
      var j2 = await r2.json().catch(function () { return {}; });
      throw new Error(j2.error || "server vrátil chybu " + r2.status);
    }
    return true;
  }

  root.MPMOrder = { sendOrder: sendOrder, summary: summary };
})(window);
