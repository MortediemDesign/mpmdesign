/*!
 * MPMDESIGN – konfigurátor polepů (polepy.html).
 * Ceny: polepy-cenik.js, výpočet rozpětí: polepy-calc.js, přílohy: upload-helpers.js,
 * odeslání: order-client.js (stejná cesta jako ostatní konfigurátory).
 */
(function () {
  "use strict";

  var CENIK = window.MPM_POLEPY_CENIK;
  var P = window.MPMPolepy;
  var U = window.MPMUpload;
  var MAX_FILES = 8;
  var ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "svg"];

  function $(id) { return document.getElementById(id); }

  function czk(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
  }

  var state = { files: [], range: null, busy: false }; // files: { name, type, base64, bytes, previewUrl }

  function setStatus(msg, cls) {
    var s = $("status");
    s.textContent = msg;
    s.className = cls || "";
  }

  function option(value, text) {
    var o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    return o;
  }

  function selectedText(id) {
    var s = $(id);
    return s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : "";
  }

  function fillSelects() {
    Object.keys(CENIK.vozidla).forEach(function (k) { $("vuz-select").appendChild(option(k, CENIK.vozidla[k].label)); });
    Object.keys(CENIK.rozsahy).forEach(function (k) { $("rozsah-select").appendChild(option(k, CENIK.rozsahy[k])); });
    Object.keys(CENIK.plochy.materialy).forEach(function (k) {
      $("material-select").appendChild(option(k, CENIK.plochy.materialy[k].label));
    });
  }

  function readInput() {
    return {
      typ: $("typ-select").value,
      vuz: $("vuz-select").value,
      rozsah: $("rozsah-select").value,
      sirkaCm: String($("sirka").value).trim() === "" ? NaN : Number($("sirka").value),
      vyskaCm: String($("vyska").value).trim() === "" ? NaN : Number($("vyska").value),
      material: $("material-select").value,
      laminace: $("laminace").checked,
      montaz: $("montaz-select").value,
      grafika: $("grafika-select").value
    };
  }

  /* ---------- provázání voleb ---------- */
  function syncControls() {
    var typ = $("typ-select").value;
    var vozidlo = typ === "vozidlo";
    $("vozidlo-wrap").hidden = !vozidlo;
    $("plocha-wrap").hidden = vozidlo;
    $("cedule-note").hidden = typ !== "cedule";

    // One-way vision jen na sklo (výlohy, okna vozidel).
    var mats = CENIK.plochy.materialy;
    Array.prototype.forEach.call($("material-select").options, function (o) {
      var m = mats[o.value];
      o.disabled = !vozidlo && !!m.jenTypy && m.jenTypy.indexOf(typ) === -1;
    });
    if ($("material-select").selectedOptions[0].disabled) $("material-select").value = "mat";

    var mat = mats[$("material-select").value];
    $("laminace").disabled = !!mat.laminaceVcetne;
    if (mat.laminaceVcetne) $("laminace").checked = true;
    $("material-note").textContent = vozidlo
      ? "U vozidel je materiál v rozpětí započtený, konkrétní fólii doporučím podle vozu."
      : mat.laminaceVcetne ? "Odrazivá fólie má laminaci v ceně."
        : $("material-select").value === "oneway" ? "Zvenku je vidět grafika, zevnitř je výhled zachovaný." : "";

    // Celopolep bez montáže nedodáváme.
    var celo = vozidlo && $("rozsah-select").value === "celopolep";
    var jen = $("montaz-select").querySelector('option[value="jen_folie"]');
    jen.disabled = celo;
    if (celo && $("montaz-select").value === "jen_folie") $("montaz-select").value = "u_nas";
    $("misto-wrap").hidden = $("montaz-select").value !== "u_zakaznika";
  }

  /* ---------- cena ---------- */
  function rangeText(r) {
    if (r.individualne) return "individuálně";
    if (r.do == null) return "od " + czk(r.od);
    if (r.od === r.do) return czk(r.od);
    return czk(r.od) + " – " + czk(r.do);
  }

  function detailText(i, r) {
    if (r.individualne) return "Celopolep nákladního auta naceňuji individuálně – pošlete prosím fotky, ozvu se s nabídkou.";
    var parts = [];
    if (i.typ === "vozidlo") {
      parts.push(i.rozsah === "celopolep" ? "Včetně montáže." : i.montaz === "jen_folie" ? "Výroba fólie bez montáže." : "Výroba fólie a montáž.");
    } else {
      parts.push("Plocha " + r.plochaM2.toFixed(2).replace(".", ",") + " m².");
      parts.push(i.montaz === "jen_folie" ? "Bez montáže." : "Včetně montáže.");
    }
    if (i.grafika === "navrh") parts.push("Včetně návrhu grafiky.");
    if (r.od === CENIK.minOrder) parts.push("Minimální zakázka je " + czk(CENIK.minOrder) + ".");
    return parts.join(" ");
  }

  function update() {
    syncControls();
    var i = readInput();
    var r = P.estimateRange(i, CENIK);
    state.range = r;
    var err = $("price-error");
    if (!r.valid) {
      $("price-total").textContent = "–";
      $("price-detail").textContent = "";
      err.textContent = r.error;
      err.hidden = false;
    } else {
      $("price-total").textContent = rangeText(r);
      $("price-detail").textContent = detailText(i, r);
      err.hidden = true;
    }
    $("plocha-note").textContent = i.typ !== "vozidlo" && i.sirkaCm > 0 && i.vyskaCm > 0
      ? "Plocha " + (i.sirkaCm * i.vyskaCm / 10000).toFixed(2).replace(".", ",") + " m²" : "";
    renderPreview(i);
  }

  /* ---------- náhled: schéma ---------- */
  var BODY = {
    osobni: {
      vb: "0 0 200 72",
      body: "M8,54 L8,42 Q10,35 28,33 L58,30 Q72,15 96,14 L128,14 Q146,15 160,30 L184,33 Q192,35 192,44 L192,54 Z",
      windows: ["M68,30 Q79,19 96,18 L110,18 L110,30 Z", "M114,18 L128,18 Q141,19 151,30 L114,30 Z"],
      wheels: [[45, 55, 10], [158, 55, 10]],
      loga: [[72, 36, 34, 10], [150, 36, 26, 8]],
      castecny: [[112, 10, 90, 50]]
    },
    dodavka: {
      vb: "0 0 200 74",
      body: "M8,58 L8,40 Q8,30 18,26 L40,13 Q44,9 52,9 L186,9 Q192,9 192,15 L192,58 Z",
      windows: ["M22,28 L42,15 L54,15 L54,28 Z"],
      wheels: [[40, 59, 10], [160, 59, 10]],
      loga: [[70, 20, 70, 16]],
      castecny: [[60, 30, 140, 30], [120, 5, 80, 30]]
    },
    nakladni: {
      vb: "0 0 200 76",
      body: "M8,60 L8,30 Q8,22 16,20 L38,18 Q46,18 46,24 L46,60 Z M50,4 L192,4 L192,56 L50,56 Z",
      windows: ["M14,24 L38,22 L40,34 L14,34 Z"],
      wheels: [[28, 62, 9], [148, 62, 9], [172, 62, 9]],
      loga: [[80, 16, 80, 24]],
      castecny: [[50, 0, 150, 60]]
    }
  };

  function rects(list, clip) {
    return list.map(function (r) {
      return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] +
        '" fill="rgba(245,146,30,0.45)" stroke="#F5921E" stroke-width="0.6" clip-path="url(#' + clip + ')"/>';
    }).join("");
  }

  function vehicleSvg(i) {
    var v = BODY[i.vuz];
    var parts = ['<defs><clipPath id="vuz-clip"><path d="' + v.body + '"/></clipPath></defs>'];
    parts.push('<path d="' + v.body + '" fill="#2a3550" stroke="#9aa4b8" stroke-width="0.8"/>');
    if (i.rozsah === "celopolep") {
      parts.push('<path d="' + v.body + '" fill="rgba(245,146,30,0.45)" stroke="#F5921E" stroke-width="0.8"/>');
    } else {
      parts.push(rects(v[i.rozsah], "vuz-clip"));
    }
    v.windows.forEach(function (w) { parts.push('<path d="' + w + '" fill="#7f93b8" opacity="0.8"/>'); });
    v.wheels.forEach(function (w) {
      parts.push('<circle cx="' + w[0] + '" cy="' + w[1] + '" r="' + w[2] + '" fill="#111" stroke="#9aa4b8" stroke-width="1"/>');
      parts.push('<circle cx="' + w[0] + '" cy="' + w[1] + '" r="' + (w[2] * 0.45) + '" fill="#5b6475"/>');
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + v.vb + '" role="img" aria-label="Schéma polepu: ' +
      CENIK.vozidla[i.vuz].label + ", " + CENIK.rozsahy[i.rozsah].toLowerCase() + '">' + parts.join("") + "</svg>";
  }

  // Plochy v měřítku (jednotky = cm) vedle postavy 175 cm pro představu.
  function surfaceSvg(i) {
    var w = i.sirkaCm, h = i.vyskaCm;
    if (!(w > 0 && h > 0 && w <= CENIK.plochy.maxStranaCm && h <= CENIK.plochy.maxStranaCm)) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" role="img" aria-label="Zadejte rozměry">' +
        '<text x="100" y="42" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.6)">Zadejte rozměry v cm</text></svg>';
    }
    var lift = i.typ === "vyloha" ? 40 : i.typ === "cedule" ? Math.max(0, 200 - h) : 0; // výloha nad soklem, cedule ve výšce očí
    var person = 175, gap = 40, pad = Math.max(w, h, person) * 0.08;
    var fullH = Math.max(h + lift, person);
    var W = 45 + gap + w, H = fullH;
    var groundY = H;
    var x = 45 + gap, y = groundY - lift - h;
    var fs = Math.max(W, H) * 0.035;
    var frame = i.typ === "vyloha" ? "#9aa4b8" : i.typ === "stena" ? "#6f7682" : "#c9ced8";
    var parts = [];
    parts.push('<line x1="' + (-pad) + '" y1="' + groundY + '" x2="' + (W + pad) + '" y2="' + groundY +
      '" stroke="rgba(255,255,255,0.35)" stroke-width="' + fs * 0.15 + '"/>');
    // postava
    var s = person / 175;
    parts.push('<g fill="rgba(255,255,255,0.35)" transform="translate(0,' + (groundY - person) + ') scale(' + s + ')">' +
      '<circle cx="22" cy="12" r="11"/><rect x="8" y="26" width="28" height="70" rx="10"/>' +
      '<rect x="10" y="90" width="11" height="85" rx="5"/><rect x="23" y="90" width="11" height="85" rx="5"/></g>');
    parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="rgba(245,146,30,0.35)" stroke="' +
      frame + '" stroke-width="' + fs * 0.2 + '"/>');
    parts.push('<text x="' + (x + w / 2) + '" y="' + (y - fs * 0.5) + '" text-anchor="middle" font-size="' + fs +
      '" fill="#fff">' + w + " cm</text>");
    parts.push('<text x="' + (x + w + fs * 0.4) + '" y="' + (y + h / 2) + '" font-size="' + fs + '" fill="#fff">' + h + " cm</text>");
    parts.push('<text x="22" y="' + (groundY + fs * 1.3) + '" text-anchor="middle" font-size="' + fs * 0.8 +
      '" fill="rgba(255,255,255,0.6)">175 cm</text>');
    var vb = [-pad, -pad - fs * 1.5, W + pad * 2 + fs * 4, H + pad * 2 + fs * 3].join(" ");
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="Schéma plochy ' +
      w + " × " + h + ' cm vedle postavy 175 cm">' + parts.join("") + "</svg>";
  }

  function renderPreview(i) {
    $("preview").innerHTML = i.typ === "vozidlo" ? vehicleSvg(i) : surfaceSvg(i);
    $("preview-hint").textContent = i.typ === "vozidlo"
      ? "Schéma – vyznačená plocha je orientační, skutečný rozsah domluvíme podle vozu."
      : "Schéma v měřítku, postava pro představu měří 175 cm.";
  }

  /* ---------- soubory ---------- */
  function usedBytes() {
    return state.files.reduce(function (s, f) { return s + f.bytes; }, 0);
  }

  function renderFileList() {
    var ul = $("file-list");
    ul.innerHTML = "";
    state.files.forEach(function (f, k) {
      var li = document.createElement("li");
      var info = document.createElement("span");
      info.textContent = f.name + " (" + U.formatSize(f.bytes) + ")";
      var del = document.createElement("button");
      del.type = "button";
      del.textContent = "Odebrat";
      del.addEventListener("click", function () {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        state.files.splice(k, 1);
        renderFileList();
      });
      li.appendChild(info);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $("file-input").addEventListener("change", async function (e) {
    var picked = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    state.busy = true;
    $("send").disabled = true;
    setStatus("Připravuji soubory…", "");
    var problems = [];
    for (var k = 0; k < picked.length; k++) {
      if (state.files.length >= MAX_FILES) { problems.push("Nahrát jde nejvýš " + MAX_FILES + " souborů."); break; }
      try {
        state.files.push(await U.prepare(picked[k], { allowed: ALLOWED_EXT, used: usedBytes() }));
      } catch (err) {
        problems.push(err.message);
      }
    }
    state.busy = false;
    $("send").disabled = false;
    renderFileList();
    setStatus(problems.join(" "), problems.length ? "err" : "");
  });

  /* ---------- odeslání ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function summaryPairs(i) {
    var out = [["Typ", selectedText("typ-select")]];
    if (i.typ === "vozidlo") {
      out.push(["Vozidlo", CENIK.vozidla[i.vuz].label]);
      out.push(["Rozsah", CENIK.rozsahy[i.rozsah]]);
    } else {
      out.push(["Rozměr", i.sirkaCm + " × " + i.vyskaCm + " cm (" + (i.sirkaCm * i.vyskaCm / 10000).toFixed(2).replace(".", ",") + " m²)"]);
    }
    out.push(["Materiál", CENIK.plochy.materialy[i.material].label]);
    out.push(["Laminace", i.laminace ? "ano" : "ne"]);
    out.push(["Montáž", selectedText("montaz-select")]);
    if (i.montaz === "u_zakaznika") out.push(["Místo montáže", $("misto").value.trim()]);
    out.push(["Grafika", selectedText("grafika-select")]);
    return out;
  }

  $("polepy-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (state.busy) return;
    update();
    var r = state.range;
    if (!r || !r.valid) { setStatus(r ? r.error : "Zkontrolujte prosím zadání.", "err"); return; }
    var i = readInput();

    var link = $("file-link").value.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setStatus("Odkaz na soubory musí začínat https://", "err"); return;
    }
    if (i.montaz === "u_zakaznika" && !$("misto").value.trim()) {
      setStatus("Napište prosím, kde má montáž proběhnout.", "err"); return;
    }
    var name = $("cust-name").value.trim();
    var email = $("cust-email").value.trim();
    if (!name) { setStatus("Vyplňte prosím jméno.", "err"); return; }
    if (!EMAIL_RE.test(email)) { setStatus("Vyplňte prosím platný e-mail, pošlu na něj nabídku.", "err"); return; }

    var btn = $("send");
    btn.disabled = true;
    setStatus("Odesílám poptávku…", "");
    try {
      await window.MPMOrder.sendOrder({
        product: "polepy",
        subjectHint: "Polep – " + selectedText("typ-select"),
        customer: {
          name: name, email: email, phone: $("cust-phone").value.trim(), qty: 1,
          note: $("cust-note").value.trim(), address: null
        },
        summary: summaryPairs(i),
        priceLines: [["Orientační cena", rangeText(r)], ["Rozpis", detailText(i, r)]],
        priceNote: "Cena je orientační. Konečná cena závisí na tvaru a stavu povrchu, závaznou nabídku pošlu po prohlídce nebo z fotek." +
          (i.montaz === "u_zakaznika" ? " Dojezd mimo Ostrov v ceně není." : "") + " Nejsem plátce DPH.",
        files: state.files.map(function (f) { return { name: f.name, type: f.type, base64: f.base64 }; }),
        fileLink: link,
        createdAt: new Date().toISOString()
      });
      setStatus("Hotovo, poptávka odešla. Shrnutí vám přijde e-mailem, závaznou nabídku pošlu po prohlídce nebo z fotek.", "ok");
    } catch (err) {
      console.error(err);
      setStatus(err.setup ? err.message
        : "Poptávku se nepodařilo odeslat (" + err.message + "). Zkuste to prosím znovu, nebo napište na mpmdesign@outlook.cz.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  $("polepy-form").addEventListener("input", function (e) { if (e.target.type !== "file") update(); });
  $("polepy-form").addEventListener("change", function (e) { if (e.target.type !== "file") update(); });

  fillSelects();
  update();
})();
