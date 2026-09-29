/*!
 * MPMDESIGN – konfigurátor DTF potisku (dtf.html).
 * Ceny: dtf-cenik.js, výpočet: dtf-calc.js, doprava: pricing-public.js,
 * odeslání: order-client.js (stejná cesta jako ostatní konfigurátory).
 */
(function () {
  "use strict";

  var CENIK = window.MPM_DTF_CENIK;
  var D = window.MPMDtf;
  var czk = D.formatCzk;
  var MAX_FILES_BYTES = 3000000; // base64 ~ ×1,33 → pod limitem Vercelu ~4,3 MB
  var MAX_FILES = 5;
  var ALLOWED_EXT = ["png", "pdf", "svg"];
  var SHIP_IDS = ["osobni", "zasilkovna_pob", "zasilkovna_dom"];
  var SHIRT_COLORS = { "bílá": "#f2f2f2", "černá": "#1d1d1f", "šedá": "#8b9099", "navy": "#1f2d4d" };

  function $(id) { return document.getElementById(id); }

  var state = {
    source: "ours",
    positions: [{ id: "hrud", size: "a4" }],
    files: [], // { file, ext, px: {w, h} | null, url }
    price: null
  };

  function setStatus(msg, cls) {
    var s = $("status");
    s.textContent = msg;
    s.className = cls || "";
  }

  /* ---------- naplnění voleb z ceníku ---------- */
  function option(value, text) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    return o;
  }

  function currentTextile() {
    return CENIK.textiles.filter(function (t) { return t.id === $("textile-select").value; })[0];
  }

  function fillTextiles() {
    CENIK.textiles.forEach(function (t) {
      $("textile-select").appendChild(option(t.id, t.label + " – " + czk(t.price)));
    });
    fillTextileDetail();
  }

  function fillTextileDetail() {
    var t = currentTextile();
    var colorSel = $("color-select");
    var keepColor = colorSel.value;
    colorSel.innerHTML = "";
    t.colors.forEach(function (c) { colorSel.appendChild(option(c, c)); });
    if (t.colors.indexOf(keepColor) !== -1) colorSel.value = keepColor;

    var grid = $("size-grid");
    var old = {};
    grid.querySelectorAll("input").forEach(function (i) { old[i.dataset.size] = i.value; });
    grid.innerHTML = "";
    t.sizes.forEach(function (s, idx) {
      var wrap = document.createElement("div");
      var id = "size-" + s;
      wrap.innerHTML = '<label for="' + id + '">' + s + "</label>";
      var inp = document.createElement("input");
      inp.type = "number";
      inp.id = id;
      inp.min = "0";
      inp.max = "10000";
      inp.step = "1";
      inp.inputMode = "numeric";
      inp.dataset.size = s;
      inp.value = old[s] != null ? old[s] : (idx === 1 ? "1" : "0");
      wrap.appendChild(inp);
      grid.appendChild(wrap);
    });
  }

  function fillStatic() {
    Object.keys(CENIK.graphics).forEach(function (k) {
      var g = CENIK.graphics[k];
      var price = g.price ? (g.from ? " – od " : " – ") + czk(g.price) : "";
      $("graphics-select").appendChild(option(k, g.label + price));
    });
    window.MPMPublicPricing.SHIPPING
      .filter(function (s) { return SHIP_IDS.indexOf(s.id) !== -1; })
      .forEach(function (s) {
        var name = s.id === "osobni" ? "Osobní odběr v Ostrově" : s.name;
        $("ship-select").appendChild(option(s.id, name + (s.price ? " – " + czk(s.price) : "")));
      });
    var today = new Date();
    $("deadline").min = today.toISOString().slice(0, 10);
  }

  /* ---------- místa potisku ---------- */
  function sizesFor(posId) {
    return CENIK.positions[posId].sizes || Object.keys(CENIK.sizes);
  }

  function renderPositions() {
    var box = $("positions");
    box.innerHTML = "";
    var used = state.positions.map(function (p) { return p.id; });
    state.positions.forEach(function (p, i) {
      var row = document.createElement("div");
      row.className = "pos-row";

      var posSel = document.createElement("select");
      posSel.setAttribute("aria-label", "Místo potisku " + (i + 1));
      Object.keys(CENIK.positions).forEach(function (id) {
        if (id === p.id || used.indexOf(id) === -1) posSel.appendChild(option(id, CENIK.positions[id].label));
      });
      posSel.value = p.id;
      posSel.addEventListener("change", function () {
        p.id = posSel.value;
        if (sizesFor(p.id).indexOf(p.size) === -1) p.size = sizesFor(p.id)[0];
        renderPositions();
        update();
      });

      var sizeSel = document.createElement("select");
      sizeSel.setAttribute("aria-label", "Velikost potisku " + (i + 1));
      sizesFor(p.id).forEach(function (s) { sizeSel.appendChild(option(s, CENIK.sizes[s].label)); });
      sizeSel.value = p.size;
      sizeSel.addEventListener("change", function () { p.size = sizeSel.value; update(); });

      row.appendChild(posSel);
      row.appendChild(sizeSel);
      if (state.positions.length > 1) {
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn-icon";
        del.setAttribute("aria-label", "Odebrat místo potisku");
        del.textContent = "×";
        del.addEventListener("click", function () {
          state.positions.splice(i, 1);
          renderPositions();
          update();
        });
        row.appendChild(del);
      }
      box.appendChild(row);
    });
    $("add-position").disabled = state.positions.length >= Object.keys(CENIK.positions).length;
  }

  $("add-position").addEventListener("click", function () {
    var used = state.positions.map(function (p) { return p.id; });
    var free = Object.keys(CENIK.positions).filter(function (id) { return used.indexOf(id) === -1; })[0];
    if (!free) return;
    state.positions.push({ id: free, size: sizesFor(free).indexOf("a4") !== -1 ? "a4" : sizesFor(free)[0] });
    renderPositions();
    update();
  });

  /* ---------- objednávka a cena ---------- */
  function readInt(el) {
    var v = String(el.value).trim();
    return /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
  }

  function sizeCounts() {
    var out = [];
    $("size-grid").querySelectorAll("input").forEach(function (i) {
      var n = readInt(i);
      if (n > 0) out.push({ size: i.dataset.size, n: n });
    });
    return out;
  }

  function currentQty() {
    if (state.source === "customer") return readInt($("qty-input"));
    var inputs = $("size-grid").querySelectorAll("input");
    var total = 0;
    for (var k = 0; k < inputs.length; k++) {
      var v = String(inputs[k].value).trim();
      if (v === "") continue;
      var n = readInt(inputs[k]);
      if (isNaN(n)) return NaN;
      total += n;
    }
    return total;
  }

  function shippingPrice() {
    var s = window.MPMPublicPricing.SHIPPING.filter(function (o) { return o.id === $("ship-select").value; })[0];
    return s ? s.price : 0;
  }

  function buildOrder() {
    return {
      qty: currentQty(),
      positions: state.positions.map(function (p) { return { id: p.id, size: p.size }; }),
      textile: state.source === "customer" ? { source: "customer" } : { source: "ours", id: $("textile-select").value },
      graphics: $("graphics-select").value,
      express: $("express").checked,
      shipping: shippingPrice()
    };
  }

  function line(label, value) {
    var li = document.createElement("li");
    li.innerHTML = "<span></span><span></span>";
    li.firstChild.textContent = label;
    li.lastChild.textContent = value;
    return li;
  }

  function priceLinesFor(r) {
    var out = [["Potisk", czk(r.printPerPiece) + " × " + r.qty + " ks = " + czk(r.printTotal)]];
    if (r.textileTotal) out.push(["Textil", czk(r.textilePerPiece) + " × " + r.qty + " ks = " + czk(r.textileTotal)]);
    if (r.graphics) out.push(["Grafika", (r.graphicsFrom ? "od " : "") + czk(r.graphics)]);
    if (r.express) out.push(["Express +50 %", czk(r.express)]);
    if (r.minOrderTopUp) out.push(["Dorovnání na minimální zakázku", czk(r.minOrderTopUp)]);
    out.push(["Doprava", r.shipping ? czk(r.shipping) : "zdarma (osobní odběr)"]);
    return out;
  }

  function update() {
    $("address-wrap").hidden = $("ship-select").value === "osobni";
    var order = buildOrder();
    var r = D.calculatePrice(order, CENIK);
    state.price = r;

    var list = $("price-lines");
    list.innerHTML = "";
    var hint = $("price-hint");
    if (!r.valid) {
      $("price-total").textContent = "–";
      $("price-per-piece").textContent = r.error;
      hint.hidden = true;
    } else {
      priceLinesFor(r).forEach(function (l) { list.appendChild(line(l[0], l[1])); });
      $("price-total").textContent = (r.graphicsFrom ? "od " : "") + czk(r.total);
      $("price-per-piece").textContent = czk(r.perPiece) + " za kus bez dopravy";
      var h = D.nextTierHint(order, CENIK);
      hint.hidden = !h;
      if (h) hint.textContent = "Při " + h.qty + " ks ušetříte " + czk(h.savingPerPiece) + " za kus.";
    }
    checkResolution();
    renderPreview();
  }

  /* ---------- soubory a kontrola rozlišení ---------- */
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function totalBytes() {
    return state.files.reduce(function (s, f) { return s + f.file.size; }, 0);
  }

  function largestSize() {
    var best = null;
    state.positions.forEach(function (p) {
      var s = CENIK.sizes[p.size].maxCm;
      if (!best || s[0] * s[1] > best.cm[0] * best.cm[1]) best = { key: p.size, cm: s };
    });
    return best;
  }

  // DPI při vyplnění zvolené velikosti (box se natočí podle orientace motivu).
  function dpiFor(px, cm) {
    var landscape = px.w >= px.h;
    var boxW = landscape ? Math.max(cm[0], cm[1]) : Math.min(cm[0], cm[1]);
    var boxH = landscape ? Math.min(cm[0], cm[1]) : Math.max(cm[0], cm[1]);
    var cmPerPx = Math.min(boxW / px.w, boxH / px.h);
    return Math.round(2.54 / cmPerPx);
  }

  function checkResolution() {
    var biggest = largestSize();
    state.files.forEach(function (f) {
      f.dpi = f.px && biggest ? dpiFor(f.px, biggest.cm) : null;
      f.dpiFor = biggest ? biggest.key.toUpperCase() : "";
    });
    renderFileList();
  }

  function renderFileList() {
    var ul = $("file-list");
    ul.innerHTML = "";
    state.files.forEach(function (f, i) {
      var li = document.createElement("li");
      var info = document.createElement("span");
      var sz = f.file.size < 1048576
        ? Math.max(1, Math.round(f.file.size / 1024)) + " kB"
        : (f.file.size / 1048576).toFixed(1).replace(".", ",") + " MB";
      info.textContent = f.file.name + " (" + sz + ")";
      if (f.dpi) {
        var d = document.createElement("span");
        d.className = f.dpi < 150 ? "warn bad" : f.dpi < 300 ? "warn" : "note";
        d.style.display = "block";
        d.textContent = f.dpi < 150
          ? "Při " + f.dpiFor + " vyjde " + f.dpi + " DPI – motiv bude na tisku měkký, pošlete prosím větší soubor."
          : f.dpi < 300
            ? "Při " + f.dpiFor + " vyjde " + f.dpi + " DPI – použitelné, doporučujeme 300 DPI."
            : "Při " + f.dpiFor + " vyjde " + f.dpi + " DPI – v pořádku.";
        info.appendChild(d);
      }
      var del = document.createElement("button");
      del.type = "button";
      del.textContent = "Odebrat";
      del.addEventListener("click", function () {
        if (f.url) URL.revokeObjectURL(f.url);
        state.files.splice(i, 1);
        update();
      });
      li.appendChild(info);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function imageSize(url) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve({ w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = function () { resolve(null); };
      im.src = url;
    });
  }

  $("file-input").addEventListener("change", async function (e) {
    var picked = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    var problems = [];
    for (var k = 0; k < picked.length; k++) {
      var file = picked[k];
      var ext = extOf(file.name);
      if (ALLOWED_EXT.indexOf(ext) === -1) { problems.push(file.name + ": podporujeme jen PNG, PDF a SVG."); continue; }
      if (!file.size) { problems.push(file.name + ": soubor je prázdný."); continue; }
      if (state.files.length >= MAX_FILES) { problems.push("Nahrát jde nejvýš " + MAX_FILES + " souborů."); break; }
      if (totalBytes() + file.size > MAX_FILES_BYTES) {
        problems.push(file.name + ": soubory by dohromady přesáhly 3 MB. Pošlete ho prosím odkazem nebo e-mailem.");
        continue;
      }
      var entry = { file: file, ext: ext, px: null, url: null };
      if (ext === "png" || ext === "svg") {
        entry.url = URL.createObjectURL(file);
        if (ext === "png") entry.px = await imageSize(entry.url);
      }
      state.files.push(entry);
    }
    setStatus(problems.join(" "), problems.length ? "err" : "");
    update();
  });

  function readBase64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(",")[1] || ""); };
      fr.onerror = function () { reject(new Error("soubor " + file.name + " nejde načíst")); };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- náhled: tričko v měřítku (jednotky SVG = cm) ---------- */
  var SHIRT = "M22,6 Q35,{n} 48,6 L61,9 L70,24 L62,29 L61,27 L61,80 L9,80 L9,27 L8,29 L0,24 L9,9 Z";
  var AREAS = {
    hrud: { side: 0, cx: 35, top: 15 },
    zada: { side: 1, cx: 35, top: 13 },
    rukav_l: { side: 0, cx: 65, cy: 17.5, rot: 55 },
    rukav_p: { side: 0, cx: 5, cy: 17.5, rot: -55 }
  };

  function renderPreview() {
    var ns = "http://www.w3.org/2000/svg";
    var color = state.source === "customer" ? "#5b6475" : (SHIRT_COLORS[$("color-select").value] || "#8b9099");
    var dark = ["#1d1d1f", "#1f2d4d", "#5b6475"].indexOf(color) !== -1;
    var img = state.files.filter(function (f) { return f.url; })[0];
    var parts = [];
    [0, 1].forEach(function (side) {
      var x0 = side * 78;
      parts.push('<g transform="translate(' + x0 + ',0)">');
      parts.push('<path d="' + SHIRT.replace("{n}", side ? "9" : "14") + '" fill="' + color +
        '" stroke="' + (dark ? "#9aa4b8" : "#6f7682") + '" stroke-width="0.5"/>');
      parts.push('<text x="35" y="86" text-anchor="middle" font-size="3.2" fill="rgba(255,255,255,0.7)">' +
        (side ? "Záda" : "Předek") + "</text>");
      state.positions.forEach(function (p, i) {
        var a = AREAS[p.id];
        if (!a || a.side !== side) return;
        var cm = CENIK.sizes[p.size].maxCm;
        var w = cm[0], h = cm[1];
        var cx = a.cx, cy = a.cy != null ? a.cy : a.top + h / 2;
        var tf = a.rot ? ' transform="rotate(' + a.rot + " " + cx + " " + cy + ')"' : "";
        parts.push("<g" + tf + ">");
        parts.push('<rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h +
          '" fill="rgba(245,146,30,0.18)" stroke="#F5921E" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>');
        if (img && i === 0) {
          parts.push('<image href="' + img.url + '" x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w +
            '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>');
        }
        parts.push('<text x="' + cx + '" y="' + (cy + h / 2 - 1.2) + '" text-anchor="middle" font-size="' +
          (w < 12 ? 2.2 : 3) + '" fill="' + (dark ? "#fff" : "#222") + '">' + p.size.toUpperCase() + "</text>");
        parts.push("</g>");
      });
      parts.push("</g>");
    });
    var custom = state.positions.some(function (p) { return p.id === "vlastni"; });
    if (custom) {
      parts.push('<text x="74" y="92" text-anchor="middle" font-size="2.8" fill="#F5921E">' +
        "Jiné umístění – upřesněte prosím v poznámce</text>");
    }
    $("preview").innerHTML = '<svg xmlns="' + ns + '" viewBox="-2 0 152 ' + (custom ? 95 : 90) +
      '" role="img" aria-label="Náhled potisku na tričku">' + parts.join("") + "</svg>";
  }

  /* ---------- tabulka ceníku ---------- */
  function renderPriceTable() {
    var tiers = CENIK.tiers;
    var head = "<tr><th>Velikost potisku</th>" + tiers.map(function (t, i) {
      var next = tiers[i + 1];
      return "<th>" + (next ? t.minQty + "–" + (next.minQty - 1) : t.minQty + "+") + " ks</th>";
    }).join("") + "</tr>";
    var body = Object.keys(CENIK.sizes).map(function (k) {
      return "<tr><td>" + CENIK.sizes[k].label + "</td>" +
        tiers.map(function (t) { return "<td>" + czk(t.prices[k]) + "</td>"; }).join("") + "</tr>";
    }).join("");
    $("price-table").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
    var g = CENIK.graphics;
    [
      "Minimální zakázka " + czk(CENIK.minOrder) + ", menší zakázku dorovnáme.",
      "Potisk na vlastní textil +" + Math.round(CENIK.customerTextileSurcharge * 100) + " %.",
      "Express +" + Math.round(CENIK.expressSurcharge * 100) + " % na potisk a grafiku (ne na textil).",
      g.edit.label + ": " + czk(g.edit.price) + ". " + g.custom.label + ": " + g.custom.note + ".",
      "Nejsem plátce DPH, všechny ceny jsou konečné."
    ].forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      $("price-notes").appendChild(li);
    });
  }

  /* ---------- přepínání textilu ---------- */
  document.querySelectorAll(".tab[data-source]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      state.source = tab.dataset.source;
      document.querySelectorAll(".tab[data-source]").forEach(function (t) {
        t.classList.toggle("active", t === tab);
      });
      $("textile-ours").hidden = state.source !== "ours";
      $("textile-customer").hidden = state.source !== "customer";
      update();
    });
  });

  $("textile-select").addEventListener("change", function () { fillTextileDetail(); update(); });
  $("dtf-form").addEventListener("input", function (e) {
    if (e.target.type !== "file") update();
  });
  $("dtf-form").addEventListener("change", function (e) {
    if (e.target.tagName === "SELECT" && e.target.closest("#positions")) return;
    if (e.target.type !== "file") update();
  });

  /* ---------- odeslání ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function summaryPairs(r) {
    var t = currentTextile();
    var out = [];
    if (state.source === "customer") {
      out.push(["Textil", "vlastní textil zákazníka"]);
    } else {
      out.push(["Textil", t.label + ", barva " + $("color-select").value]);
      out.push(["Velikosti", sizeCounts().map(function (s) { return s.size + ": " + s.n + " ks"; }).join(", ")]);
    }
    out.push(["Počet kusů", String(r.qty)]);
    out.push(["Potisk", state.positions.map(function (p) {
      return CENIK.positions[p.id].label + " – " + CENIK.sizes[p.size].label;
    }).join("; ")]);
    out.push(["Grafika", CENIK.graphics[$("graphics-select").value].label]);
    var dpi = state.files.filter(function (f) { return f.dpi; });
    if (dpi.length) {
      out.push(["Rozlišení motivu", dpi.map(function (f) { return f.file.name + ": " + f.dpi + " DPI při " + f.dpiFor; }).join("; ")]);
    }
    if ($("send-by-mail").checked) out.push(["Grafika e-mailem", "zákazník pošle na mpmdesign@outlook.cz"]);
    out.push(["Požadovaný termín", $("deadline").value ? $("deadline").value.split("-").reverse().join(". ") : "neuveden"]);
    out.push(["Express", $("express").checked ? "ano (+50 %)" : "ne"]);
    out.push(["Doprava", $("ship-select").options[$("ship-select").selectedIndex].text]);
    return out;
  }

  $("dtf-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    update();
    var r = state.price;
    if (!r || !r.valid) { setStatus(r ? r.error : "Zkontrolujte prosím zadání.", "err"); return; }

    var graphics = $("graphics-select").value;
    var link = $("file-link").value.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setStatus("Odkaz na soubory musí začínat https://", "err"); return;
    }
    if (!state.files.length && !link && !$("send-by-mail").checked && graphics !== "custom") {
      setStatus("Přiložte prosím motiv, vložte odkaz, nebo zaškrtněte, že ho pošlete e-mailem.", "err"); return;
    }
    var deadline = $("deadline").value;
    if (deadline && deadline < $("deadline").min) {
      setStatus("Požadovaný termín nemůže být v minulosti.", "err"); return;
    }
    var name = $("cust-name").value.trim();
    var email = $("cust-email").value.trim();
    if (!name) { setStatus("Vyplňte prosím jméno.", "err"); return; }
    if (!EMAIL_RE.test(email)) { setStatus("Vyplňte prosím platný e-mail, pošleme na něj potvrzení.", "err"); return; }
    var address = null;
    if ($("ship-select").value !== "osobni") {
      var street = $("addr-street").value.trim(), city = $("addr-city").value.trim(), zip = $("addr-zip").value.trim();
      if (!street || !city || !zip) { setStatus("Pro doručení vyplňte prosím ulici, město i PSČ.", "err"); return; }
      address = { street: street, city: city, zip: zip };
    }

    var btn = $("send");
    btn.disabled = true;
    setStatus("Odesílám objednávku…", "");
    try {
      var files = [];
      for (var k = 0; k < state.files.length; k++) {
        var f = state.files[k];
        files.push({ name: f.file.name, type: f.file.type || "application/octet-stream", base64: await readBase64(f.file) });
      }
      var priceLines = priceLinesFor(r).concat([
        ["Celkem", (r.graphicsFrom ? "od " : "") + czk(r.total)],
        ["Za kus bez dopravy", czk(r.perPiece)]
      ]);
      await window.MPMOrder.sendOrder({
        product: "dtf",
        subjectHint: "DTF potisk " + r.qty + " ks",
        customer: {
          name: name, email: email, phone: $("cust-phone").value.trim(), qty: r.qty,
          note: $("cust-note").value.trim(), address: address
        },
        summary: summaryPairs(r),
        priceLines: priceLines,
        priceNote: "Nejsem plátce DPH, ceny jsou konečné." +
          (r.graphicsFrom ? " Grafika na míru se účtuje podle skutečného času, od 600 Kč." : ""),
        files: files,
        fileLink: link,
        createdAt: new Date().toISOString()
      });
      setStatus("Hotovo, objednávka odešla. Shrnutí vám přijde e-mailem a ozvu se s potvrzením.", "ok");
    } catch (err) {
      console.error(err);
      setStatus(err.setup ? err.message
        : "Objednávku se nepodařilo odeslat (" + err.message + "). Zkuste to prosím znovu, nebo napište na mpmdesign@outlook.cz.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  fillTextiles();
  fillStatic();
  renderPositions();
  renderPriceTable();
  update();
})();
