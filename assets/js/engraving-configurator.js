/*!
 * MPMDESIGN - konfigurátor laserového gravírování.
 * Skládá náhled i výrobní SVG: vrstva Engrave (gravírování) + CutContour (řez).
 */
(function () {
  "use strict";

  var P = window.MPMPublicPricing;
  var QR = window.MPMQR;
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    productId: P.PRODUCTS_LASER[0].id,
    photoDataUrl: null,
    photoName: null,
    price: null
  };

  /* Pevné texty NFC tabulky - měnitelný je nadpis, horní řádek, web a odkaz. */
  var NFC_INSTR = ["PŘILOŽTE TELEFON K NFC NEBO NASKENUJTE QR KÓD",
    "A OHODNOŤTE NÁS."];
  var NFC_THANKS = ["Díky vaší zpětné vazbě můžeme být",
    "každý den o něco lepší. Děkujeme!"];

  var DEFAULT_TEXTS = {
    klicenka: ["MPMDESIGN", ""],
    podtacek: ["MPMDESIGN", ""],
    hodiny: ["MPMDESIGN", "Ostrov"],
    foto: ["", ""],
    nfc: ["RECENZI", "mojefirma.cz"]
  };

  /* ---------- pomocné ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function product() { return P.laserProduct(state.productId); }

  function rgb(hex) {
    var h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255];
  }

  /* Vzhled materiálu v náhledu - výrobní SVG je vždy černobílé. */
  function look(id) {
    if (id === "plexi3") {
      // Plexi: gravírování je matně bílé, proto světlá kresba na tmavším podkladu.
      return { fill: "#9fb5c6", base: "#9fb5c6", stroke: "#7b93a6",
        burn: "#f4fafd", burnOpacity: 0.95, grain: 0 };
    }
    if (id === "custom") {
      return { fill: "#d9d3c8", base: "#d9d3c8", stroke: "#aca496",
        burn: "#43403a", burnOpacity: 0.9, grain: 0 };
    }
    return { fill: "url(#wood)", base: "#cfa972", stroke: "#a07c4c",
      burn: "#3a2209", burnOpacity: 0.93, grain: 1 };
  }

  /* Text na střed s omezenou šířkou - textLength drží text uvnitř tvaru. */
  function textEl(txt, cx, cy, maxW, fs, fill, font, weight, letter) {
    txt = String(txt == null ? "" : txt).trim();
    if (!txt) return "";
    var len = Math.max(txt.length, 1);
    var size = Math.min(fs, (maxW * 1.75) / len);
    var tl = Math.min(maxW, size * 0.62 * len);
    return '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central"' +
      ' font-family="' + esc(font) + '" font-size="' + size + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") +
      (letter ? ' letter-spacing="' + letter + '"' : "") +
      ' fill="' + fill + '" textLength="' + tl + '" lengthAdjust="spacingAndGlyphs">' +
      esc(txt) + "</text>";
  }

  function starPath(cx, cy, r) {
    var d = "", i, a, rr, x, y;
    for (i = 0; i < 10; i++) {
      a = (Math.PI / 5) * i - Math.PI / 2;
      rr = i % 2 === 0 ? r : r * 0.44;
      x = cx + rr * Math.cos(a);
      y = cy + rr * Math.sin(a);
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
    }
    return d + "Z";
  }

  function starsRow(cx, cy, r, gap, fill) {
    var out = "", i, step = r * 2 + gap, start = cx - step * 2;
    for (i = 0; i < 5; i++) out += '<path d="' + starPath(start + step * i, cy, r) + '" fill="' + fill + '"/>';
    return out;
  }

  /* QR kód jako jedna cesta - jeden objekt navíc do gravírování. */
  function qrEl(text, x, y, side, fill) {
    var q = QR && text ? QR.matrix(text) : null;
    if (!q) return null;
    var m = side / q.size, d = "", r, c;
    for (r = 0; r < q.size; r++) {
      for (c = 0; c < q.size; c++) {
        if (!q.modules[r][c]) continue;
        var px = x + c * m, py = y + r * m;
        d += "M" + px.toFixed(3) + "," + py.toFixed(3) +
          "h" + m.toFixed(3) + "v" + m.toFixed(3) + "h" + (-m).toFixed(3) + "Z";
      }
    }
    return '<path d="' + d + '" fill="' + fill + '" shape-rendering="crispEdges"/>';
  }

  /* ---------- geometrie produktu ---------- */
  function dims() {
    var p = product();
    var w = num($("width-mm").value) || p.widthMm;
    var h = p.shape === "circle" ? w : (num($("height-mm").value) || p.heightMm);
    return { w: w, h: h };
  }

  function outlinePath(w, h, shape) {
    if (shape === "circle") {
      var r = Math.min(w, h) / 2;
      return '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + r + '"';
    }
    var rx = shape === "rounded" ? Math.min(w, h) * 0.14 : 0;
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + rx + '" ry="' + rx + '"';
  }

  /* ---------- gravírovaný obsah podle produktu ---------- */
  function engraveArt(w, h, burn) {
    var id = state.productId;
    var font = $("font-select").value;
    var l1 = $("line1").value;
    var l2 = $("line2").value;
    var out = "";

    if (id === "hodiny") {
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
      for (var i = 0; i < 12; i++) {
        var a = (Math.PI / 6) * i - Math.PI / 2;
        var big = i % 3 === 0;
        var r1 = R * (big ? 0.74 : 0.80), r2 = R * 0.88;
        out += '<line x1="' + (cx + r1 * Math.cos(a)) + '" y1="' + (cy + r1 * Math.sin(a)) +
          '" x2="' + (cx + r2 * Math.cos(a)) + '" y2="' + (cy + r2 * Math.sin(a)) +
          '" stroke="' + burn + '" stroke-width="' + (R * (big ? 0.045 : 0.022)) +
          '" stroke-linecap="round"/>';
      }
      out += textEl(l1, cx, cy - R * 0.34, R * 1.0, R * 0.17, burn, font, "bold");
      out += textEl(l2, cx, cy + R * 0.40, R * 0.9, R * 0.11, burn, font, null);
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * 0.035) + '" fill="' + burn + '"/>';
      return out;
    }

    if (id === "nfc") {
      // Rozvržení podle vzorové tabulky: výzva, nadpis, instrukce, QR,
      // poděkování, hvězdičky a web dole.
      var m = Math.min(w, h) * 0.09;
      var innerW = w - 2 * m;
      var url = $("nfc-url").value.trim();
      var stars = $("show-stars").checked;

      out += textEl($("nfc-top").value, w / 2, h * 0.115, innerW * 0.62, h * 0.042,
        burn, font, null);
      out += textEl(l1, w / 2, h * 0.195, innerW, h * 0.115, burn, font, "bold");
      out += textEl(NFC_INSTR[0], w / 2, h * 0.268, innerW, h * 0.030, burn, font, null);
      out += textEl(NFC_INSTR[1], w / 2, h * 0.303, innerW * 0.55, h * 0.030, burn, font, null);

      var side = Math.min(innerW * 0.70, h * 0.32);
      var qx = (w - side) / 2, qy = h * 0.53 - side / 2;
      var qr = qrEl(url, qx, qy, side, burn);
      out += qr || ('<rect x="' + qx + '" y="' + qy + '" width="' + side + '" height="' + side +
        '" fill="none" stroke="' + burn + '" stroke-width="' + (side * 0.02) +
        '" stroke-dasharray="' + (side * 0.06) + '"/>' +
        textEl("QR z odkazu", w / 2, h * 0.50, side * 0.8, side * 0.11, burn, font, null));

      out += textEl(NFC_THANKS[0], w / 2, h * 0.745, innerW * 0.92, h * 0.033, burn, font, null);
      out += textEl(NFC_THANKS[1], w / 2, h * 0.783, innerW * 0.92, h * 0.033, burn, font, null);
      if (stars) out += starsRow(w / 2, h * 0.845, h * 0.026, h * 0.018, burn);
      out += textEl(l2, w / 2, h * 0.915, innerW * 0.7, h * 0.036, burn, font, null);
      return out;
    }

    if (id === "foto") {
      var pm = Math.min(w, h) * 0.06;
      var capH = l1.trim() ? h * 0.16 : 0;
      var iw = w - 2 * pm, ih = h - 2 * pm - capH;
      out += state.photoDataUrl
        ? '<image href="' + state.photoDataUrl + '" x="' + pm + '" y="' + pm +
          '" width="' + iw + '" height="' + ih + '" preserveAspectRatio="xMidYMid slice"' +
          ' filter="url(#engraveLook)"/>'
        : '<rect x="' + pm + '" y="' + pm + '" width="' + iw + '" height="' + ih +
          '" fill="none" stroke="' + burn + '" stroke-width="' + (Math.min(w, h) * 0.006) +
          '" stroke-dasharray="' + (Math.min(w, h) * 0.03) + '"/>' +
          textEl("Nahraj fotku", w / 2, pm + ih / 2, iw * 0.55, h * 0.08, burn, font, null);
      if (capH) out += textEl(l1, w / 2, h - pm - capH * 0.45, w * 0.8, capH * 0.62, burn, font, "bold");
      return out;
    }

    if (id === "klicenka") {
      var hole = Math.min(w, h) * 0.11;
      var left = hole * 3.4;
      var tw = w - left - Math.min(w, h) * 0.14;
      var tcx = left + tw / 2;
      if (l2.trim()) {
        out += textEl(l1, tcx, h * 0.38, tw, h * 0.30, burn, font, "bold");
        out += textEl(l2, tcx, h * 0.68, tw, h * 0.20, burn, font, null);
      } else {
        out += textEl(l1, tcx, h / 2, tw, h * 0.40, burn, font, "bold");
      }
      return out;
    }

    // podtácek
    var R2 = Math.min(w, h) / 2;
    out += '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + (R2 * 0.86) +
      '" fill="none" stroke="' + burn + '" stroke-width="' + (R2 * 0.025) + '"/>';
    if (l2.trim()) {
      out += textEl(l1, w / 2, h / 2 - R2 * 0.18, R2 * 1.30, R2 * 0.26, burn, font, "bold");
      out += textEl(l2, w / 2, h / 2 + R2 * 0.26, R2 * 1.15, R2 * 0.15, burn, font, null);
    } else {
      out += textEl(l1, w / 2, h / 2, R2 * 1.35, R2 * 0.28, burn, font, "bold");
    }
    return out;
  }

  /* Řezaný otvor (klíčenka) - patří do CutContour, ne do gravírování. */
  function holeEl(w, h, attrs) {
    if (!product().hole) return "";
    var r = Math.min(w, h) * 0.11;
    return '<circle cx="' + (r * 1.5) + '" cy="' + (h / 2) + '" r="' + r + '" ' + attrs + "/>";
  }

  /* Fotka: převod do stupňů šedi, zvýšení kontrastu a rozpad do 6 hladin -
     laser vypaluje po hladinách, hladká fotka na dřevě nevznikne. */
  function photoFilter(forProduction, lk) {
    var levels = 6, i, dark, light, vals = [], ch = ["R", "G", "B"], out = "";
    dark = forProduction ? [0, 0, 0] : rgb(lk.burn === "#f4fafd" ? "#f4fafd" : "#33200a");
    light = forProduction ? [1, 1, 1] : rgb(lk.base);
    // U plexi je gravírování světlejší než materiál, u dřeva tmavší.
    for (i = 0; i < 3; i++) {
      var a = dark[i], b = light[i], t = [];
      for (var k = 0; k < levels; k++) t.push((a + ((b - a) * k) / (levels - 1)).toFixed(3));
      vals.push('<feFunc' + ch[i] + ' type="discrete" tableValues="' + t.join(" ") + '"/>');
    }
    out = '<filter id="engraveLook"><feColorMatrix type="saturate" values="0"/>' +
      '<feComponentTransfer>' +
        '<feFuncR type="linear" slope="1.35" intercept="-0.18"/>' +
        '<feFuncG type="linear" slope="1.35" intercept="-0.18"/>' +
        '<feFuncB type="linear" slope="1.35" intercept="-0.18"/>' +
      "</feComponentTransfer>" +
      "<feComponentTransfer>" + vals.join("") + "</feComponentTransfer></filter>";
    return out;
  }

  /* ---------- sestavení SVG ---------- */
  function buildSvg(forProduction) {
    var d = dims(), w = d.w, h = d.h;
    var p = product();
    var lk = look($("material-select").value);
    var burn = forProduction ? "#000000" : lk.burn;
    var cutStroke = forProduction
      ? 'fill="none" stroke="#FF00FF" stroke-width="0.25"'
      : 'fill="none" stroke="#FF00FF" stroke-width="' +
        Math.max(0.3, Math.min(w, h) * 0.006) + '" stroke-dasharray="2 1.5"';

    var defs =
      '<defs>' +
        '<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#dcb888"/><stop offset="55%" stop-color="#cfa972"/>' +
          '<stop offset="100%" stop-color="#c0965c"/></linearGradient>' +
        // Jemná kresba dřeva - svislé linky, jen do náhledu.
        '<pattern id="grain" width="' + (Math.max(w, h) * 0.045) + '" height="10" ' +
          'patternUnits="userSpaceOnUse">' +
          '<rect width="' + (Math.max(w, h) * 0.004) + '" height="10" fill="#000000" ' +
          'opacity="0.035"/></pattern>' +
        photoFilter(forProduction, lk) +
      "</defs>";

    var body = forProduction
      ? ""
      : outlinePath(w, h, p.shape) + ' fill="' + lk.fill + '" stroke="' + lk.stroke +
        '" stroke-width="' + Math.max(0.2, Math.min(w, h) * 0.004) + '"/>' +
        (lk.grain ? outlinePath(w, h, p.shape) + ' fill="url(#grain)" stroke="none"/>' : "") +
        holeEl(w, h, 'fill="#1b1f24" opacity="0.55"');

    var art = '<g id="Engrave"' + (forProduction ? "" : ' opacity="' + lk.burnOpacity + '"') + ">" +
      engraveArt(w, h, burn) + "</g>";
    var cut = '<g id="CutContour">' + outlinePath(w, h, p.shape) + " " + cutStroke + "/>" +
      holeEl(w, h, cutStroke) + "</g>";

    // Výrobní SVG je v milimetrech, náhled se roztáhne na celou plochu rámečku.
    var size = forProduction
      ? 'width="' + w + 'mm" height="' + h + 'mm"'
      : 'width="100%" height="100%"';
    return '<svg xmlns="http://www.w3.org/2000/svg" ' + size +
      ' viewBox="0 0 ' + w + " " + h + '">\n  ' + defs + "\n  " +
      body + "\n  " + art + "\n  " + cut + "\n</svg>";
  }

  /* ---------- ovládání ---------- */
  function setStatus(msg, cls) {
    var el = $("status");
    el.textContent = msg;
    el.className = cls || "";
  }

  P.PRODUCTS_LASER.forEach(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tab" + (p.id === state.productId ? " active" : "");
    b.setAttribute("data-product", p.id);
    b.textContent = p.name;
    b.addEventListener("click", function () {
      state.productId = p.id;
      Array.prototype.forEach.call(document.querySelectorAll("#product-tabs .tab"), function (x) {
        x.classList.toggle("active", x === b);
      });
      applyProduct(true);
      render();
    });
    $("product-tabs").appendChild(b);
  });

  P.MATERIALS_LASER.forEach(function (m, i) {
    var o = document.createElement("option");
    o.value = m.id;
    o.textContent = m.name;
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

  /* Přepnutí produktu: rozměry, popisky a viditelnost polí. */
  function applyProduct(resetTexts) {
    var p = product();
    var circle = p.shape === "circle";

    $("width-mm").value = p.widthMm;
    $("width-mm").min = p.minMm;
    $("width-mm").max = p.maxMm;
    $("width-label").textContent = circle ? "Průměr (mm)" : "Šířka (mm)";
    $("height-wrap").style.display = circle ? "none" : "";
    if (!circle) {
      $("height-mm").value = p.heightMm;
      $("height-mm").min = p.minMm;
      $("height-mm").max = p.maxMm;
    }

    $("photo-wrap").style.display = p.needsPhoto ? "" : "none";
    $("nfc-wrap").style.display = p.id === "nfc" ? "" : "none";
    $("line1-label").textContent = p.id === "nfc" ? "Nadpis"
      : p.id === "foto" ? "Popisek pod fotkou (volitelné)" : "Hlavní text";
    $("line2-wrap").style.display = p.id === "foto" ? "none" : "";
    $("line2-label").textContent = p.id === "nfc" ? "Web dole na tabulce"
      : "Druhý řádek (volitelné)";

    if (resetTexts) {
      $("line1").value = DEFAULT_TEXTS[p.id][0];
      $("line2").value = DEFAULT_TEXTS[p.id][1];
    }
    $("product-note").textContent = p.extraName
      ? "V ceně je i " + p.extraName + "."
      : p.needsPhoto
        ? "Fotku převedeme do stupňů šedi a vypálíme do materiálu."
        : "Gravírování je trvalé, nevybledne ani se nesloupne.";
  }

  function render() {
    $("preview").innerHTML = buildSvg(false);
    var p = product(), d = dims();
    $("preview-hint").textContent = p.name + " " +
      (p.shape === "circle" ? "⌀ " + d.w : d.w + " × " + d.h) + " mm – " +
      "vyznačená kresba je gravírování, růžová linka je řez.";
    recalc();
  }

  function recalc() {
    var d = dims();
    var count = Math.max(1, parseInt($("count-input").value, 10) || 1);
    var r = P.laser({
      productId: state.productId,
      materialId: $("material-select").value,
      widthMm: d.w,
      heightMm: d.h,
      count: count,
      shippingId: $("ship-select").value
    });
    state.price = r;
    $("price-total").textContent = P.czk(r.total);
    $("price-per-piece").textContent = count > 1 ? P.czk(r.perPiece) + " za kus" : " ";
    $("price-ship").textContent = r.shipping
      ? "včetně dopravy " + P.czk(r.shipping)
      : "osobní převzetí";
  }

  function syncAddress() {
    var needs = $("ship-select").value !== "osobni";
    $("address-wrap").style.display = needs ? "" : "none";
    return needs;
  }

  $("photo-input").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setStatus("Fotka je větší než 4 MB, zkus prosím menší soubor.", "err");
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      state.photoDataUrl = fr.result;
      state.photoName = f.name;
      setStatus("", "");
      render();
    };
    fr.readAsDataURL(f);
  });

  ["line1", "line2", "nfc-top", "nfc-url", "width-mm", "height-mm", "count-input"]
    .forEach(function (id) { $(id).addEventListener("input", render); });
  ["font-select", "material-select"].forEach(function (id) {
    $(id).addEventListener("change", render);
  });
  $("show-stars").addEventListener("change", render);
  $("ship-select").addEventListener("change", function () { syncAddress(); render(); });

  /* ---------- odeslání objednávky ---------- */
  $("send").addEventListener("click", async function () {
    var p = product();
    var name = $("cust-name").value.trim();
    var email = $("cust-email").value.trim();
    if (!name || !email) { setStatus("Vyplň prosím jméno a e-mail.", "err"); return; }
    if (p.needsPhoto && !state.photoDataUrl) {
      setStatus("Nahraj prosím fotku, kterou máme vygravírovat.", "err"); return;
    }
    if (!p.needsPhoto && !$("line1").value.trim()) {
      setStatus("Vyplň prosím text, který se má gravírovat.", "err"); return;
    }
    if (p.id === "nfc" && $("nfc-url").value.trim() && !QR.matrix($("nfc-url").value.trim())) {
      setStatus("Odkaz je moc dlouhý na QR kód, zkus prosím kratší.", "err"); return;
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
      var d = dims();
      var svg = buildSvg(true);
      var svgBase64 = btoa(unescape(encodeURIComponent(svg)));
      var count = Math.max(1, parseInt($("count-input").value, 10) || 1);
      var matSel = $("material-select");
      var design = {
        produkt: p.name,
        text: $("line1").value || null,
        text2: p.id === "foto" ? null : ($("line2").value || null),
        horniRadek: p.id === "nfc" ? $("nfc-top").value : null,
        odkazQR: p.id === "nfc" ? ($("nfc-url").value.trim() || "bez QR kódu") : null,
        font: $("font-select").value,
        hvezdicky: p.id === "nfc" ? ($("show-stars").checked ? "ano" : "ne") : null,
        imageName: state.photoName,
        tvar: p.shape === "circle" ? "kruh" : p.shape === "rounded" ? "zaoblený obdélník" : "obdélník",
        rozmer: p.shape === "circle" ? "průměr " + d.w + " mm" : d.w + " × " + d.h + " mm",
        material: matSel.options[matSel.selectedIndex].text,
        prislusenstvi: p.extraName || null,
        vyroba: "plocha " + (state.price.areaCm2 || 0).toFixed(1) + " cm² na kus",
        pozor: p.needsPhoto
          ? "Fotka se převádí do stupňů šedi – kontrastní snímky vycházejí nejlépe."
          : "Gravírovaný text je v SVG textový objekt, před výrobou převést na křivky."
      };
      var pricing = {
        total: state.price.total,
        perPiece: state.price.perPiece,
        shipping: state.price.shipping,
        shippingName: $("ship-select").options[$("ship-select").selectedIndex].text,
        currency: "CZK"
      };
      var safe = (($("line1").value || state.photoName || p.id) + "")
        .replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || "gravirovani";

      await window.MPMOrder.sendOrder({
        product: "gravirovani",
        subjectHint: p.name + " " + safe,
        customer: {
          name: name, email: email, qty: count,
          note: $("cust-note").value, address: address
        },
        design: design,
        pricing: pricing,
        fileBase64: svgBase64,
        fileName: safe + "_gravirovani.svg",
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

  applyProduct(true);
  syncAddress();
  render();
})();
