/*!
 * MPMDESIGN - konfigurátor samolepek.
 * Skládá náhled i výrobní SVG s řeznou konturou (CutContour) pro Graphtec/Roland.
 */
(function () {
  "use strict";

  var P = window.MPMPublicPricing;
  var CFG = window.MPM_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  // Logo Instagramu (viewBox 0 0 24 24) - stejná cesta jako v patičce webu.
  var IG_PATH = "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.169a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z";

  var state = { mode: "text", imageDataUrl: null, imageName: null, price: null };

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

  function noBg() { return state.mode === "text" && $("no-bg").checked; }

  /* ---------- přepínání režimů ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (btn) {
    btn.addEventListener("click", function () {
      state.mode = btn.getAttribute("data-mode");
      Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
        b.classList.toggle("active", b === btn);
      });
      $("mode-text").style.display = state.mode === "text" ? "" : "none";
      $("mode-instagram").style.display = state.mode === "instagram" ? "" : "none";
      $("mode-image").style.display = state.mode === "image" ? "" : "none";
      syncConstraints();
      render();
    });
  });

  /* Papír je jen pro tisk s podkladem - nejde kombinovat s řezaným textem. */
  function syncConstraints() {
    var cut = noBg();
    $("bg-color-wrap").style.display = cut ? "none" : "";
    $("no-bg-wrap").style.display = state.mode === "text" ? "" : "none";

    var sel = $("material-select");
    Array.prototype.forEach.call(sel.options, function (o) {
      var m = P.material(o.value);
      var blocked = cut && m.requiresBackground;
      o.disabled = blocked;
      o.textContent = m.name + (blocked ? " – jen s podkladem" : "");
    });
    if (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].disabled) {
      sel.value = P.MATERIALS_STICKER[0].id;
      setStatus("Na samolepicí papír se tiskne s podkladem – přepnul jsem materiál na fólii.", "");
    }
  }

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

  function textEl(txt, wMm, hMm, margin, font, fill, extra) {
    var maxW = wMm - 2 * margin;
    var fs = Math.min(hMm * 0.35, (maxW * 1.7) / Math.max(txt.length, 1));
    return '<text x="' + wMm / 2 + '" y="' + hMm / 2 + '" text-anchor="middle" ' +
      'dominant-baseline="central" font-family="' + esc(font) + '" font-size="' + fs +
      '" fill="' + fill + '" textLength="' + Math.min(maxW, fs * 0.62 * txt.length) +
      '" lengthAdjust="spacingAndGlyphs" ' + (extra || "") + ">" + esc(txt) + "</text>";
  }

  function instagramEl(handle, wMm, hMm, margin, fill) {
    var innerW = wMm - 2 * margin, innerH = hMm - 2 * margin;
    var logo = Math.min(innerH, innerW * 0.3);
    var gap = logo * 0.25;
    var scale = logo / 24;
    var tx = margin + logo + gap;
    var maxW = wMm - margin - tx;
    var fs = Math.min(logo * 0.62, (maxW * 1.7) / Math.max(handle.length, 1));
    return '<g transform="translate(' + margin + ',' + ((hMm - logo) / 2) + ') scale(' + scale + ')">' +
        '<path d="' + IG_PATH + '" fill="' + fill + '"/></g>' +
      '<text x="' + tx + '" y="' + hMm / 2 + '" dominant-baseline="central" ' +
        'font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="' + fs +
        '" fill="' + fill + '" textLength="' + Math.min(maxW, fs * 0.6 * handle.length) +
        '" lengthAdjust="spacingAndGlyphs">' + esc(handle) + "</text>";
  }

  /* Sestaví SVG v milimetrech. forProduction přidá řeznou konturu. */
  function buildSvg(forProduction) {
    var wMm = (parseFloat($("width-cm").value) || 1) * 10;
    var hMm = (parseFloat($("height-cm").value) || 1) * 10;
    var shape = $("shape-select").value;
    var margin = Math.min(wMm, hMm) * 0.1;
    var cutStroke = forProduction
      ? 'fill="none" stroke="#FF00FF" stroke-width="0.25"'
      : 'fill="none" stroke="#FF00FF" stroke-width="' +
        Math.max(0.3, Math.min(wMm, hMm) * 0.006) + '" stroke-dasharray="2 1.5"';
    var inner = "", bgEl = "", cutEl = "";

    if (state.mode === "image") {
      inner = state.imageDataUrl
        ? '<image href="' + state.imageDataUrl + '" x="' + margin + '" y="' + margin +
          '" width="' + (wMm - 2 * margin) + '" height="' + (hMm - 2 * margin) +
          '" preserveAspectRatio="xMidYMid meet"/>'
        : '<text x="' + wMm / 2 + '" y="' + hMm / 2 + '" text-anchor="middle" ' +
          'dominant-baseline="central" font-family="Arial, sans-serif" font-size="' +
          (Math.min(wMm, hMm) * 0.09) + '" fill="#9aa5b1">Nahraj obrázek</text>';
      bgEl = shapeEl(wMm, hMm, shape, 'fill="#ffffff"');
      cutEl = shapeEl(wMm, hMm, shape, cutStroke);

    } else if (state.mode === "instagram") {
      inner = instagramEl($("ig-handle").value || "@mpmdesign.cz", wMm, hMm, margin, $("ig-color").value);
      bgEl = shapeEl(wMm, hMm, shape, 'fill="' + $("ig-bg-color").value + '"');
      cutEl = shapeEl(wMm, hMm, shape, cutStroke);

    } else {
      var txt = $("sticker-text").value || " ";
      var cut = noBg();
      inner = textEl(txt, wMm, hMm, margin, $("sticker-font").value, $("text-color").value);
      bgEl = cut ? "" : shapeEl(wMm, hMm, shape, 'fill="' + $("bg-color").value + '"');
      // Bez podkladu kopíruje řezná kontura přímo písmena.
      cutEl = cut
        ? textEl(txt, wMm, hMm, margin, $("sticker-font").value, "none", cutStroke.replace('fill="none" ', ""))
        : shapeEl(wMm, hMm, shape, cutStroke);
    }

    var cutWrap = forProduction ? '\n  <g id="CutContour">' + cutEl + "</g>" : "\n  " + cutEl;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + wMm + 'mm" height="' + hMm +
      'mm" viewBox="0 0 ' + wMm + " " + hMm + '">\n' +
      '  <g id="artwork">\n    ' + bgEl + "\n    " + inner + "\n  </g>" + cutWrap + "\n</svg>";
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
    state.price = r;

    if (r.error === "too-big") {
      $("price-total").textContent = "–";
      $("price-per-piece").textContent = "Na arch A4 se tenhle rozměr nevejde";
      $("price-ship").textContent = "max " + r.maxSideCm + " cm";
      $("send").disabled = true;
      return;
    }
    $("send").disabled = false;
    $("price-total").textContent = P.czk(r.total);
    $("price-per-piece").textContent = count > 1 ? P.czk(r.perPiece) + " za kus" : " ";
    $("price-ship").textContent = r.kind === "sheet"
      ? r.sheets + "× arch A4 (" + r.perSheet + " ks na arch)"
      : (r.shipping ? "včetně dopravy " + P.czk(r.shipping) : "osobní převzetí");
  }

  /* ---------- adresa jen při doručení ---------- */
  function syncAddress() {
    var needs = $("ship-select").value !== "osobni";
    $("address-wrap").style.display = needs ? "" : "none";
    return needs;
  }

  ["sticker-text", "width-cm", "height-cm", "count-input", "ig-handle"].forEach(function (id) {
    $(id).addEventListener("input", render);
  });
  ["sticker-font", "text-color", "bg-color", "shape-select", "material-select",
   "ig-color", "ig-bg-color"].forEach(function (id) {
    $(id).addEventListener("change", render);
  });
  $("no-bg").addEventListener("change", function () { syncConstraints(); render(); });
  $("ship-select").addEventListener("change", function () { syncAddress(); render(); });

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
      setStatus("Nahraj prosím obrázek, nebo přepni na jiný režim.", "err"); return;
    }

    var address = null;
    if (syncAddress()) {
      var street = $("addr-street").value.trim();
      var city = $("addr-city").value.trim();
      var zip = $("addr-zip").value.trim();
      if (!street || !city || !zip) {
        setStatus("Pro doručení vyplň prosím ulici, město i PSČ.", "err"); return;
      }
      address = { street: street, city: city, zip: zip };
    }

    var btn = $("send");
    btn.disabled = true;
    setStatus("Připravuji objednávku…", "");

    try {
      var svg = buildSvg(true);
      var svgBase64 = btoa(unescape(encodeURIComponent(svg)));
      var count = Math.max(1, parseInt($("count-input").value, 10) || 1);
      var matSel = $("material-select");
      var cut = noBg();
      var motif = state.mode === "text" ? $("sticker-text").value
        : state.mode === "instagram" ? $("ig-handle").value
        : state.imageName;
      var design = {
        mode: state.mode,
        text: state.mode === "text" ? $("sticker-text").value : null,
        instagram: state.mode === "instagram" ? $("ig-handle").value : null,
        font: state.mode === "text" ? $("sticker-font").value : null,
        textColor: state.mode === "text" ? $("text-color").value
          : state.mode === "instagram" ? $("ig-color").value : null,
        bgColor: cut ? "bez podkladu (řezaný text)"
          : state.mode === "instagram" ? $("ig-bg-color").value
          : state.mode === "text" ? $("bg-color").value : null,
        imageName: state.imageName,
        shape: cut ? "kontura kopíruje text"
          : $("shape-select").options[$("shape-select").selectedIndex].text,
        width_cm: parseFloat($("width-cm").value),
        height_cm: parseFloat($("height-cm").value),
        material: matSel.options[matSel.selectedIndex].text.replace(" – jen s podkladem", ""),
        vyroba: state.price.kind === "sheet"
          ? state.price.sheets + "× arch A4, " + state.price.perSheet + " ks na arch"
          : "plocha " + state.price.areaM2.toFixed(3) + " m² včetně odpadu",
        pozor: cut ? "Řezaný text – v grafice je nutné převést text na křivky." : null
      };
      var pricing = {
        total: state.price.total, perPiece: state.price.perPiece,
        shipping: state.price.shipping,
        shippingName: $("ship-select").options[$("ship-select").selectedIndex].text,
        currency: "CZK"
      };
      var safe = ((motif || "samolepka") + "")
        .replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || "samolepka";

      await window.MPMOrder.sendOrder({
        product: "samolepky",
        subjectHint: "samolepky " + safe,
        customer: {
          name: name, email: email, qty: count,
          note: $("cust-note").value, address: address
        },
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

  syncConstraints();
  syncAddress();
  render();
})();
