/*!
 * MPMDESIGN – poptávka CNC frézování (cnc.html). Bez ceny: nabídku posílá Miguel.
 * Pracovní plocha stroje (Snapmaker Artisan): 400 × 400 mm.
 * Přílohy: upload-helpers.js, odeslání: order-client.js (stejná cesta jako ostatní konfigurátory).
 */
(function () {
  "use strict";

  var U = window.MPMUpload;
  var PLOCHA_MM = 400;
  var MAX_FILES = 8;
  var ALLOWED_EXT = ["dxf", "dwg", "step", "stp", "pdf", "svg", "stl", "jpg", "jpeg", "png"];

  function $(id) { return document.getElementById(id); }

  var state = { files: [], termin: "bezny", busy: false };

  function setStatus(msg, cls) {
    var s = $("status");
    s.textContent = msg;
    s.className = cls || "";
  }

  function selectedText(id) {
    var s = $(id);
    return s.options[s.selectedIndex].text;
  }

  function num(el) {
    var v = String(el.value).trim().replace(",", ".");
    return v === "" ? NaN : Number(v);
  }

  function fmt(n) { return String(n).replace(".", ","); }

  /* ---------- kontrola zadání ---------- */
  function readInput() {
    return { tloustka: num($("tloustka")), delka: num($("delka")), sirka: num($("sirka")), kusy: num($("kusy")) };
  }

  function validate(i) {
    if (!(i.tloustka > 0) || i.tloustka > 1000) return "Zadejte tloušťku materiálu v mm.";
    if (!(i.delka > 0 && i.sirka > 0)) return "Zadejte délku a šířku dílu v mm.";
    if (i.delka > PLOCHA_MM || i.sirka > PLOCHA_MM) {
      return "Díl je větší než pracovní plocha stroje 40 × 40 cm. Napište mi prosím, jestli jde rozdělit na menší části.";
    }
    if (!(Number.isInteger(i.kusy) && i.kusy >= 1 && i.kusy <= 10000)) return "Počet kusů zadejte jako celé číslo od 1 do 10 000.";
    return "";
  }

  function update() {
    var i = readInput();
    var err = validate(i);
    $("dil-error").textContent = err;
    $("dil-error").hidden = !err;
    // Maximální tloušťku výrobce neuvádí – nad 50 mm ji raději ověřím, neblokuji.
    var thick = i.tloustka > 50 && i.tloustka <= 1000;
    $("tloustka-note").hidden = !thick;
    $("tloustka-note").textContent = thick ? "U materiálu silnějšího než 50 mm ověřím, jestli ho stroj zvládne." : "";
    renderPreview(i, err);
    return err;
  }

  /* ---------- náhled: díl na pracovní ploše (jednotky = mm) ---------- */
  function renderPreview(i, err) {
    var P = PLOCHA_MM, parts = [];
    parts.push('<rect x="0" y="0" width="' + P + '" height="' + P + '" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-dasharray="8 6"/>');
    for (var g = 50; g < P; g += 50) {
      parts.push('<line x1="' + g + '" y1="0" x2="' + g + '" y2="' + P + '" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>');
      parts.push('<line x1="0" y1="' + g + '" x2="' + P + '" y2="' + g + '" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>');
    }
    parts.push('<text x="' + P + '" y="-10" text-anchor="end" font-size="16" fill="rgba(255,255,255,0.55)">pracovní plocha 400 × 400 mm</text>');
    if (i.delka > 0 && i.sirka > 0) {
      var w = Math.min(i.delka, P * 1.1), h = Math.min(i.sirka, P * 1.1);
      var over = i.delka > P || i.sirka > P;
      parts.push('<rect x="0" y="' + (P - h) + '" width="' + w + '" height="' + h + '" fill="' +
        (over ? "rgba(255,138,138,0.25)" : "rgba(245,146,30,0.3)") + '" stroke="' + (over ? "#ff8a8a" : "#F5921E") + '" stroke-width="3"/>');
      parts.push('<text x="' + w / 2 + '" y="' + (P - h - 8) + '" text-anchor="middle" font-size="18" fill="#fff">' + fmt(i.delka) + " mm</text>");
      parts.push('<text x="' + (w + 8) + '" y="' + (P - h / 2) + '" font-size="18" fill="#fff">' + fmt(i.sirka) + " mm</text>");
    }
    var label = err ? "" : fmt(i.kusy) + " ks, tloušťka " + fmt(i.tloustka) + " mm";
    parts.push('<text x="0" y="' + (P + 28) + '" font-size="18" fill="rgba(255,255,255,0.75)">' + label + "</text>");
    $("preview").innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -35 ' + (P + 240) + " " + (P + 80) +
      '" role="img" aria-label="Díl ' + fmt(i.delka) + " × " + fmt(i.sirka) + ' mm na pracovní ploše 400 × 400 mm">' + parts.join("") + "</svg>";
  }

  /* ---------- termín ---------- */
  document.querySelectorAll(".tab[data-termin]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      state.termin = tab.dataset.termin;
      document.querySelectorAll(".tab[data-termin]").forEach(function (t) {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-checked", t === tab ? "true" : "false");
      });
      $("datum-wrap").hidden = state.termin !== "specha";
    });
  });
  $("datum").min = new Date().toISOString().slice(0, 10);

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
        state.files.push(await U.prepare(picked[k], { allowed: ALLOWED_EXT, used: usedBytes(), maxPx: 2000 }));
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
    var datum = $("datum").value;
    return [
      ["Materiál", selectedText("material-select")],
      ["Tloušťka", fmt(i.tloustka) + " mm"],
      ["Rozměr dílu", fmt(i.delka) + " × " + fmt(i.sirka) + " mm"],
      ["Počet kusů", String(i.kusy)],
      ["Povrch", selectedText("povrch-select")],
      ["Hrany", selectedText("hrany-select")],
      ["Termín", state.termin === "specha"
        ? "spěchá" + (datum ? ", potřebuje do " + datum.split("-").reverse().join(". ") : "")
        : "běžný"],
      ["Popis dílu", $("popis").value.trim() || "bez popisu"]
    ];
  }

  $("cnc-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (state.busy) return;
    var err = update();
    if (err) { setStatus(err, "err"); return; }
    var i = readInput();

    var link = $("file-link").value.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setStatus("Odkaz na soubory musí začínat https://", "err"); return;
    }
    if (!state.files.length && !link && $("popis").value.trim().length < 10) {
      setStatus("Přiložte prosím výkres, vložte odkaz, nebo díl aspoň krátce popište.", "err"); return;
    }
    var datum = $("datum").value;
    if (state.termin === "specha" && datum && datum < $("datum").min) {
      setStatus("Termín nemůže být v minulosti.", "err"); return;
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
        product: "cnc",
        subjectHint: "CNC " + selectedText("material-select") + ", " + i.kusy + " ks",
        customer: {
          name: name, email: email, phone: $("cust-phone").value.trim(), qty: i.kusy, note: "", address: null
        },
        summary: summaryPairs(i),
        priceLines: [],
        priceNote: "",
        files: state.files.map(function (f) { return { name: f.name, type: f.type, base64: f.base64 }; }),
        fileLink: link,
        createdAt: new Date().toISOString()
      });
      setStatus("Hotovo, poptávka odešla. Shrnutí vám přijde e-mailem, cenovou nabídku pošlu do 24 hodin v pracovní dny.", "ok");
    } catch (ex) {
      console.error(ex);
      setStatus(ex.setup ? ex.message
        : "Poptávku se nepodařilo odeslat (" + ex.message + "). Zkuste to prosím znovu, nebo napište na mpmdesign@outlook.cz.", "err");
    } finally {
      btn.disabled = false;
    }
  });

  $("cnc-form").addEventListener("input", function (e) { if (e.target.type !== "file") update(); });
  update();
})();
