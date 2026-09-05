/*!
 * MPMDESIGN - minimalistický generátor QR kódů.
 * Režim byte (UTF-8), úroveň korekce M, verze 1-10 (do ~213 znaků).
 * Vrací matici modulů, kterou si konfigurátor vykreslí do SVG.
 */
(function (root) {
  "use strict";

  /* [EC slov na blok, bloků skupiny 1, dat na blok, bloků skupiny 2, dat na blok] */
  var EC_M = [null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  /* ---------- Galoisovo těleso GF(256) ---------- */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1, i;
    for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]; }

  function rsGenerator(n) {
    var g = [1], i, j, ng;
    for (i = 0; i < n; i++) {
      ng = new Array(g.length + 1);
      for (j = 0; j < ng.length; j++) ng[j] = 0;
      for (j = 0; j < g.length; j++) {
        ng[j] ^= g[j];
        ng[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = ng;
    }
    return g;
  }

  function rsEcc(data, n) {
    var g = rsGenerator(n), res = data.slice(), i, j, f;
    for (i = 0; i < n; i++) res.push(0);
    for (i = 0; i < data.length; i++) {
      f = res[i];
      if (f !== 0) for (j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], f);
    }
    return res.slice(data.length);
  }

  /* ---------- data ---------- */
  function utf8Bytes(text) {
    var out = [], s = unescape(encodeURIComponent(String(text))), i;
    for (i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
  }

  function capacity(v) {
    var e = EC_M[v];
    return e[1] * e[2] + e[3] * e[4];
  }

  function pickVersion(byteLen) {
    for (var v = 1; v <= 10; v++) {
      var head = 4 + (v < 10 ? 8 : 16);
      if (capacity(v) * 8 >= head + byteLen * 8) return v;
    }
    return 0;
  }

  function buildCodewords(bytes, v) {
    var bits = [], i, j;
    function push(val, len) { for (i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    push(4, 4);                              // režim byte
    push(bytes.length, v < 10 ? 8 : 16);
    for (j = 0; j < bytes.length; j++) push(bytes[j], 8);

    var total = capacity(v) * 8;
    for (i = 0; i < 4 && bits.length < total; i++) bits.push(0);   // ukončovač
    while (bits.length % 8 !== 0) bits.push(0);

    var cw = [], pad = [0xEC, 0x11], k = 0;
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }
    while (cw.length < capacity(v)) cw.push(pad[k++ % 2]);
    return cw;
  }

  /* Rozdělení do bloků, dopočet korekce a proložení. */
  function interleave(cw, v) {
    var e = EC_M[v], blocks = [], eccs = [], pos = 0, i, j;
    var counts = [];
    for (i = 0; i < e[1]; i++) counts.push(e[2]);
    for (i = 0; i < e[3]; i++) counts.push(e[4]);
    for (i = 0; i < counts.length; i++) {
      var data = cw.slice(pos, pos + counts[i]);
      pos += counts[i];
      blocks.push(data);
      eccs.push(rsEcc(data, e[0]));
    }
    var out = [], maxData = Math.max.apply(null, counts);
    for (j = 0; j < maxData; j++) {
      for (i = 0; i < blocks.length; i++) if (j < blocks[i].length) out.push(blocks[i][j]);
    }
    for (j = 0; j < e[0]; j++) {
      for (i = 0; i < eccs.length; i++) out.push(eccs[i][j]);
    }
    return out;
  }

  /* ---------- matice ---------- */
  function newGrid(size, val) {
    var g = [], r, c;
    for (r = 0; r < size; r++) { g.push([]); for (c = 0; c < size; c++) g[r].push(val); }
    return g;
  }

  function placeFunction(m, res, v) {
    var size = m.length, i, j, r, c;

    function set(x, y, val) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      m[y][x] = val; res[y][x] = 1;
    }
    function finder(x, y) {
      for (j = -1; j <= 7; j++) for (i = -1; i <= 7; i++) {
        var d = Math.max(Math.abs(i - 3), Math.abs(j - 3));
        set(x + i, y + j, d !== 2 && d <= 3 ? 1 : 0);
      }
    }
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7);

    for (i = 8; i < size - 8; i++) {                    // časovací pruhy
      var t = i % 2 === 0 ? 1 : 0;
      set(i, 6, t); set(6, i, t);
    }

    var al = ALIGN[v];                                   // zarovnávací značky
    for (r = 0; r < al.length; r++) for (c = 0; c < al.length; c++) {
      var ax = al[c], ay = al[r];
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === size - 7) ||
          (ax === size - 7 && ay === 6)) continue;
      for (j = -2; j <= 2; j++) for (i = -2; i <= 2; i++) {
        set(ax + i, ay + j, Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0);
      }
    }

    for (i = 0; i < 9; i++) {                            // místo pro formát
      if (i === 6) continue;                             // řádek/sloupec 6 patří časování
      set(i, 8, 0); set(8, i, 0);
    }
    for (i = 0; i < 8; i++) { set(size - 1 - i, 8, 0); set(8, size - 1 - i, 0); }
    set(8, size - 8, 1);                                 // vždy tmavý modul

    if (v >= 7) {                                        // informace o verzi
      var rem = v, bits;
      for (i = 0; i < 12; i++) rem = ((rem << 1) ^ (((rem >>> 11) & 1) * 0x1F25)) & 0x1FFF;
      bits = (v << 12) | (rem & 0xFFF);
      for (i = 0; i < 18; i++) {
        var b = (bits >>> i) & 1;
        set(Math.floor(i / 3), size - 11 + (i % 3), b);
        set(size - 11 + (i % 3), Math.floor(i / 3), b);
      }
    }
  }

  function placeData(m, res, cw) {
    var size = m.length, bit = 0, upward = true, col, r, c, y;
    for (col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col--;
      for (r = 0; r < size; r++) {
        y = upward ? size - 1 - r : r;
        for (c = 0; c < 2; c++) {
          var x = col - c;
          if (res[y][x]) continue;
          var v = bit < cw.length * 8 ? (cw[bit >> 3] >>> (7 - (bit & 7))) & 1 : 0;
          m[y][x] = v;
          bit++;
        }
      }
      upward = !upward;
    }
  }

  function maskFn(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function formatBits(mask) {
    var data = (0 << 3) | mask;            // úroveň M má bity 00
    var rem = data, i;
    for (i = 0; i < 10; i++) rem = ((rem << 1) ^ (((rem >>> 9) & 1) * 0x537)) & 0x7FF;
    return (((data << 10) | (rem & 0x3FF)) ^ 0x5412) & 0x7FFF;
  }

  function applyFormat(m, mask) {
    var size = m.length, bits = formatBits(mask), i, b;
    // m[radek][sloupec]; prvni kopie kolem leveho horniho hledacku
    for (i = 0; i <= 5; i++) { b = (bits >>> i) & 1; m[i][8] = b; }
    m[7][8] = (bits >>> 6) & 1;
    m[8][8] = (bits >>> 7) & 1;
    m[8][7] = (bits >>> 8) & 1;
    for (i = 9; i < 15; i++) m[8][14 - i] = (bits >>> i) & 1;

    // druha kopie: vpravo nahore a vlevo dole
    for (i = 0; i < 8; i++) m[8][size - 1 - i] = (bits >>> i) & 1;
    for (i = 8; i < 15; i++) m[size - 15 + i][8] = (bits >>> i) & 1;
    m[size - 8][8] = 1;
  }

  /* Trestné body podle normy - vybírá se maska s nejnižším součtem. */
  function penalty(m) {
    var size = m.length, score = 0, r, c, i, run, last, dark = 0;

    function line(get) {
      var s = 0, k, cur, len;
      for (k = 0; k < size; k++) {
        var arr = [];
        for (i = 0; i < size; i++) arr.push(get(k, i));
        cur = arr[0]; len = 1;
        for (i = 1; i < size; i++) {
          if (arr[i] === cur) { len++; } else { if (len >= 5) s += 3 + (len - 5); cur = arr[i]; len = 1; }
        }
        if (len >= 5) s += 3 + (len - 5);
        // vzor 1:1:3:1:1 s klidovou zónou
        var str = arr.join("");
        var pat1 = "10111010000", pat2 = "00001011101";
        for (i = 0; i + 11 <= size; i++) {
          var sub = str.substr(i, 11);
          if (sub === pat1 || sub === pat2) s += 40;
        }
      }
      return s;
    }
    score += line(function (r2, c2) { return m[r2][c2]; });
    score += line(function (c2, r2) { return m[r2][c2]; });

    for (r = 0; r < size - 1; r++) for (c = 0; c < size - 1; c++) {
      var v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /**
   * Vrátí { size, modules } pro zadaný text, nebo null když se text nevejde.
   * modules[r][c] === 1 znamená tmavý modul.
   */
  function matrix(text, forceMask) {
    var bytes = utf8Bytes(text);
    var v = pickVersion(bytes.length);
    if (!v) return null;
    var cw = interleave(buildCodewords(bytes, v), v);
    var size = 17 + 4 * v;
    var best = null, k;

    for (k = 0; k < 8; k++) {
      if (forceMask !== undefined && forceMask !== null && k !== forceMask) continue;
      var m = newGrid(size, 0), res = newGrid(size, 0);
      placeFunction(m, res, v);
      placeData(m, res, cw);
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
        if (!res[r][c] && maskFn(k, r, c)) m[r][c] ^= 1;
      }
      applyFormat(m, k);
      var p = penalty(m);
      if (!best || p < best.p) best = { p: p, m: m, mask: k };
    }
    return { size: size, modules: best.m, version: v, mask: best.mask };
  }

  var api = { matrix: matrix };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MPMQR = api;
})(typeof window !== "undefined" ? window : null);
