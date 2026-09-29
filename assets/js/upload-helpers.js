/*!
 * MPMDESIGN – příprava příloh pro poptávky (polepy.html, cnc.html).
 *
 * Server (Vercel) přijme požadavek jen do ~4,5 MB a base64 soubory nafoukne
 * o třetinu, proto hlídáme součet příloh do BUDGET bajtů. Fotky z mobilu
 * (běžně 3–10 MB) se v prohlížeči zmenší na JPEG, pro posouzení povrchu
 * nebo výkresu to stačí. Ostatní soubory (PDF, DXF…) se posílají beze změny.
 */
(function (root) {
  "use strict";

  var BUDGET = 3000000;
  var MAX_IMAGE_INPUT = 25 * 1024 * 1024; // větší fotku ani nezkoušíme dekódovat
  var RESIZE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
  var KEEP_UNDER = 500 * 1024; // malé obrázky necháme, jak jsou (třeba PNG s průhledností)

  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function formatSize(bytes) {
    return bytes < 1048576
      ? Math.max(1, Math.round(bytes / 1024)) + " kB"
      : (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
  }

  function readBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(",")[1] || ""); };
      fr.onerror = function () { reject(new Error("soubor nejde načíst")); };
      fr.readAsDataURL(blob);
    });
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { resolve({ im: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      im.src = url;
    });
  }

  function toJpeg(im, maxPx, quality) {
    var scale = Math.min(1, maxPx / Math.max(im.naturalWidth, im.naturalHeight));
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.naturalWidth * scale));
    c.height = Math.max(1, Math.round(im.naturalHeight * scale));
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; // JPEG nemá průhlednost
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(im, 0, 0, c.width, c.height);
    return new Promise(function (resolve) { c.toBlob(resolve, "image/jpeg", quality); });
  }

  /**
   * Připraví soubor k odeslání.
   * opts = { allowed: ["pdf", …], used: bajty už připravených příloh, maxPx, quality }
   * Vrací Promise<{ name, type, base64, bytes, previewUrl }>, při problému
   * vyhodí Error se srozumitelnou hláškou pro zákazníka.
   */
  async function prepare(file, opts) {
    opts = opts || {};
    var ext = extOf(file.name);
    var left = BUDGET - (opts.used || 0);
    var tooBig = file.name + ": přílohy by dohromady přesáhly 3 MB. Vložte ho prosím jako odkaz (Úschovna, Google Drive), nebo pošlete na mpmdesign@outlook.cz.";

    if (opts.allowed && opts.allowed.indexOf(ext) === -1) {
      throw new Error(file.name + ": tento typ souboru nepodporujeme (" + opts.allowed.join(", ").toUpperCase() + ").");
    }
    if (!file.size) throw new Error(file.name + ": soubor je prázdný.");

    if (RESIZE_EXT.indexOf(ext) !== -1 && file.size > KEEP_UNDER) {
      if (file.size > MAX_IMAGE_INPUT) {
        throw new Error(file.name + ": fotka má přes " + formatSize(MAX_IMAGE_INPUT) + ", vložte ji prosím jako odkaz.");
      }
      var loaded = null;
      try { loaded = await loadImage(file); } catch (e) { loaded = null; }
      if (loaded) {
        var blob = await toJpeg(loaded.im, opts.maxPx || 1600, opts.quality || 0.82);
        if (blob && blob.size <= left) {
          return {
            name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
            type: "image/jpeg",
            base64: await readBase64(blob),
            bytes: blob.size,
            previewUrl: loaded.url
          };
        }
        URL.revokeObjectURL(loaded.url);
        throw new Error(tooBig);
      }
      // HEIC umí dekódovat jen Safari – jinde pošleme originál, pokud se vejde.
      if (ext !== "heic" && ext !== "heif") throw new Error(file.name + ": obrázek nejde otevřít, je možná poškozený.");
      if (file.size > left) {
        throw new Error(file.name + ": fotku HEIC tento prohlížeč neumí zmenšit a je moc velká. " +
          "Pošlete ji prosím jako JPG nebo odkazem.");
      }
    }

    if (file.size > left) throw new Error(tooBig);
    var isImg = RESIZE_EXT.indexOf(ext) !== -1 && ext !== "heic" && ext !== "heif";
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      base64: await readBase64(file),
      bytes: file.size,
      previewUrl: isImg || ext === "svg" ? URL.createObjectURL(file) : null
    };
  }

  root.MPMUpload = { BUDGET: BUDGET, extOf: extOf, formatSize: formatSize, prepare: prepare };
})(window);
