/*!
 * MPMDESIGN - konfigurátor samolepek.
 * Skládá náhled i výrobní SVG s řeznou konturou (CutContour) pro Graphtec/Roland.
 */
(function () {
  "use strict";

  var P = window.MPMPublicPricing;
  var CFG = window.MPM_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  var state = { mode: "text", imageDataUrl: null, imageName: null };

  /* ---------- naplnění číselníků ---------- */
  P.MATERIALS_STICKER.forEach(function (m, i) {
    var o = document.createElement("option");
    o.value = m.id; o.textContent = m.name;
    if (i === 0) o.selected = true;
    $("material-select").appendChild(o);
  });
  P.SHIPPING.forEach(function (s, i) {
    var o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name + (s.price ? " (" + s.price + " Kč)" : " (zdarma)");
    if (i === 0) o.selected = true;
    $("ship-select").appendChild(o);
  });

  /* ---------- přepínání text / obrázek ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (btn) {
    btn.addEventListener("click", function () {
      state.mode = btn.getAttribute("data-mode");
      Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
        b.classList.toggle("active", b === btn);
      });
      $("mode-text").style.display = state.mode === "text" ? "" : "none";
      $("mode-image").style.display = state.mode === "image" ? "" : "none";
      render();
    });
  });

  $("image-input").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setStatus("Obrázek je větší než 4 MB, zkus prosím menší soubor.", "err");
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      state.imageDataUrl = fr.result;
      state.imageName = f.name;
      setStatus("", "");
      render();
    };
    fr.readAsDataURL(f);
  });

  /* ---------- geometrie ---------- */
  function shapeEl(w, h, shape, attrs) {
    var a = attrs || "";
    if (shape === "circle") {
      var r = Math.min(w, h) / 2;
      return '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + r + '" ' + a + "/>";
    }
    if (shape === "ellipse") {
      return '<ellipse cx="' + w / 2 + '" cy="' + h / 2 + '" rx="' + w / 2 + '" ry="' + h / 2 + '" ' + a + "/>";
    }
    var rx = shape === "rounded" ? Math.min(w, h) * 0.12 : 0;
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + rx + '" ry="' + rx + '" ' + a + "/>";
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  /* Sestaví SVG v milimetrech. forProduction přidá řeznou konturu. */
  function buildSvg(forProduction) {
    var wMm = (parseFloat($("width-cm").value) || 1) * 10;
    var hMm = (parseFloat($("height-cm").value) || 1) * 10;
    var shape = $("shape-select").value;
    var margin = Math.min(wMm, hMm) * 0.1;
    var inner = "";

    if (state.mode === "image" && state.imageDataUrl) {
      inner = '<image href="' + state.imageDataUrl + '" x="' + margin + '" y="' + margin +
        '" width="' + (wMm - 2 * margin) + '" height="' + (hMm - 2 * margin) +
        '" preserveAspectRatio="xMidYMid meet"/>';
    } else if (state.mode === "image") {
      inner = '<text x="' + wMm / 2 + '" y="' + hMm / 2 + '" text-anchor="middle" ' +
        'dominant-baseline="central" font-family="Arial, sans-serif" font-size="' +
        (Math.min(wMm, hMm) * 0.09) + '" fill="#9aa5b1">Nahraj obrázek</text>';
    } else {
      var txt = $("sticker-text").value || " ";
      var maxW = wMm - 2 * margin;
      var fs = Math.min(hMm * 0.35, (maxW * 1.7) / Math.max(txt.length, 1));
      inner = '<text x="' + wMm / 2 + '" y="' + hMm / 2 + '" text-anchor="middle" ' +
        'dominant-baseline="central" font-family="' + esc($("sticker-font").value) +
        '" font-size="' + fs + '" fill="' + $("text-color").value +
        '" textLength="' + Math.min(maxW, fs * 0.62 * txt.length) +
        '" lengthAdjust="spacingAndGlyphs">' + esc(txt) + "</text>";
    }

    var bg = state.mode === "text" ? $("bg-color").value : "#ffffff";
    var cut = forProduction
      ? '\n  <g id="CutContour">' +
        shapeEl(wMm, hMm, shape, 'fill="none" stroke="#FF00FF" stroke-width="0.25"') +
        "</g>"
      : "\n  " + shapeEl(wMm, hMm, shape, 'fill="none" stroke="#FF00FF" stroke-width="' +
        Math.max(0.3, Math.min(wMm, hMm) * 0.006) + '" stroke-dasharray="2 1.5"');

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + wMm + 'mm" height="' + hMm +
      'mm" viewBox="0 0 ' + wMm + " " + hMm + '">\n' +
      "  <g id=\"artwork\">\n    " + shapeEl(wMm, hMm, shape, 'fill="' + bg + '"') +
      "\n    " + inner + "\n  </g>" + cut + "\n</svg>";
  }

  /* ---------- náhled + cena ---------- */
  function render() {
    $("preview").innerHTML = buildSvg(false);
    recalc();
  }

  function recalc() {
    var count = Math.max(1, parseInt($("count-input").value, 10) || 1);
    var r = P.sticker({
      materialId: $("material-select").value,
      widthCm: $("width-cm").value,
      heightCm: $("height-cm").value,
      count: count,
      shippingId: $("ship-select").value
    });
    $("price-total").textContent = P.czk(r.total);
    $("price-per-piece").textContent = count > 1 ? P.czk(r.perPiece) + " za kus" : " ";
    $("price-ship").textContent = r.shipping
      ? "včetně dopravy " + P.czk(r.shipping)
      : "osobní převzetí";
    state.price = r;
  }

  ["sticker-text", "width-cm", "height-cm", "count-input"].forEach(function (id) {
    $(id).addEventListener("input", render);
  });
  ["sticker-font", "text-color", "bg-color", "shape-select", "material-select", "ship-select"]
    .forEach(function (id) { $(id).addEventListener("change", render); });

  function setStatus(msg, cls) {
    var el = $("status");
    el.textContent = msg;
    el.className = cls || "";
  }

  /* ---------- odeslání objednávky ---------- */
  $("send").addEventListener("click", async function () {
    var name = $("cust-name").value.trim();
    var email = $("cust-email").value.trim();
    if (!name || !email) { setStatus("Vyplň prosím jméno a e-mail.", "err"); return; }
    if (state.mode === "image" && !state.imageDataUrl) {
      setStatus("Nahraj prosím obrázek, nebo přepni na režim Text.", "err"); return;
    }

    var btn = $("send");
    btn.disabled = true;
    setStatus("Připravuji objednávku…", "");

    try {
      var svg = buildSvg(true);
      var svgBase64 = btoa(unescape(encodeURIComponent(svg)));
      var count = Math.max(1, parseInt($("count-input").value, 10) || 1);
      var matSel = $("material-select");
      var design = {
        mode: state.mode,
        text: state.mode === "text" ? $("sticker-text").value : null,
        font: state.mode === "text" ? $("sticker-font").value : null,
        textColor: state.mode === "text" ? $("text-color").value : null,
        bgColor: state.mode === "text" ? $("bg-color").value : null,
        imageName: state.imageName,
        shape: $("shape-select").options[$("shape-select").selectedIndex].text,
        width_cm: parseFloat($("width-cm").value),
        height_cm: parseFloat($("height-cm").value),
        material: matSel.options[matSel.selectedIndex].text
      };
      var pricing = {
        total: state.price.total, perPiece: state.price.perPiece,
        shipping: state.price.shipping,
        shippingName: $("ship-select").options[$("ship-select").selectedIndex].text,
        currency: "CZK"
      };
      var safe = ((design.text || state.imageName || "samolepka") + "")
        .replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || "samolepka";

      await window.MPMOrder.sendOrder({
        product: "samolepky",
        subjectHint: "samolepky " + safe,
        customer: { name: name, email: email, qty: count, note: $("cust-note").value },
        design: design,
        pricing: pricing,
        fileBase64: svgBase64,
        fileName: safe + "_cutcontour.svg",
        fileType: "image/svg+xml",
        createdAt: new Date().toISOString()
      });
      setStatus("Hotovo! Objednávka odešla, ozveme se ti na e-mail.", "ok");
    } catch (err) {
      console.error(err);
      setStatus(err.setup ? err.message
        : "Objednávku se nepodařilo odeslat (" + err.message + "). Zkus to prosím znovu.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  render();
})();
