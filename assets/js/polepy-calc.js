/*!
 * MPMDESIGN – orientační rozpětí ceny polepu (polepy.html, tests/polepy-calc.test.js).
 *
 * input = {
 *   typ: "vozidlo" | "vyloha" | "cedule" | "stena",
 *   vuz: "osobni" | "dodavka" | "nakladni",     // jen vozidlo
 *   rozsah: "loga" | "castecny" | "celopolep",   // jen vozidlo
 *   sirkaCm: 120, vyskaCm: 80,                   // jen plochy
 *   material: "mat" | "lesk" | "oneway" | "odraziva",
 *   laminace: true,
 *   montaz: "u_nas" | "u_zakaznika" | "jen_folie",
 *   grafika: "mam" | "navrh"
 * }
 * Vrací { valid, od, do (null = jen „od“), individualne, plochaM2 }.
 */
(function (root) {
  "use strict";

  function add(a, b) { return [a[0] + b[0], a[1] == null || b[1] == null ? null : a[1] + b[1]]; }
  function times(r, k) { return [r[0] * k, r[1] == null ? null : r[1] * k]; }

  function estimateRange(i, c) {
    var grafika = i.grafika === "navrh" ? c.grafika.navrh : [0, 0];
    var range;

    if (i.typ === "vozidlo") {
      var vuz = c.vozidla[i.vuz];
      if (!vuz) return { valid: false, error: "Vyberte typ vozidla." };
      if (!c.rozsahy[i.rozsah]) return { valid: false, error: "Vyberte rozsah polepu." };
      var r = vuz[i.rozsah];
      if (!r) return { valid: true, individualne: true };
      if (r.celkem) {
        if (i.montaz === "jen_folie") {
          return { valid: false, error: "Celopolep dodáváme jen s montáží." };
        }
        range = r.celkem.slice();
      } else {
        range = i.montaz === "jen_folie" ? r.vyroba.slice() : add(r.vyroba, r.montaz);
      }
      range = add(range, grafika);
    } else if (c.plochy.typy[i.typ]) {
      var w = Number(i.sirkaCm), h = Number(i.vyskaCm);
      var max = c.plochy.maxStranaCm;
      if (!(w > 0 && h > 0)) return { valid: false, error: "Zadejte šířku a výšku v cm." };
      if (w > max || h > max) {
        return { valid: false, error: "U ploch nad " + max / 100 + " m na stranu nám prosím napište, nacením individuálně." };
      }
      var m = c.plochy.materialy[i.material];
      if (!m) return { valid: false, error: "Vyberte materiál." };
      if (m.jenTypy && m.jenTypy.indexOf(i.typ) === -1) {
        return { valid: false, error: m.label + " se hodí jen na okna a výlohy." };
      }
      var area = (w * h) / 10000;
      var perM2 = m.m2.slice();
      if (i.laminace && !m.laminaceVcetne) perM2 = add(perM2, c.plochy.laminace.m2);
      if (i.montaz !== "jen_folie") perM2 = add(perM2, c.plochy.montaz.m2);
      range = add(times(perM2, area), grafika);
      range.plochaM2 = area;
    } else {
      return { valid: false, error: "Vyberte, co chcete polepit." };
    }

    var od = Math.max(c.minOrder, Math.floor(range[0] / 100) * 100);
    var dO = range[1] == null ? null : Math.max(c.minOrder, Math.ceil(range[1] / 100) * 100);
    return { valid: true, individualne: false, od: od, do: dO, plochaM2: range.plochaM2 || null };
  }

  var api = { estimateRange: estimateRange };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMPolepy = api;
})(typeof window !== "undefined" ? window : null);
