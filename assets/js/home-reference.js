/* ============================================================
   MPMDESIGN – sekce Reference: masonry galerie + lightbox.

   Fotky se berou z portfolia (assets/images/portfolio/manifest.json,
   generuje scripts/update_portfolio.js), takže stačí nahrát fotku do
   portfolia a objeví se i tady. Na úvodní stránce je výběr REFERENCE_COUNT
   fotek, střídavě z jednotlivých kategorií, ať je vidět víc druhů práce.
   Popisek je název kategorie – názvy souborů (a z nich generované titulky
   v manifestu) zatím u části fotek neodpovídají obsahu.
   ============================================================ */
(function () {
  'use strict';

  var MANIFEST = 'assets/images/portfolio/manifest.json';
  var BASE = 'assets/images/portfolio/';
  var REFERENCE_COUNT = 9;
  var CATEGORY_NAMES = {
    'cnc': 'CNC obrábění',
    '3d-tisk': '3D tisk',
    'laser': 'Laserové gravírování',
    'polepy': 'Polepy',
    'grafika': 'Grafické práce'
  };

  var grid = document.getElementById('referenceGrid');
  if (!grid) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Kategorie se střídají (1. z každé, pak 2. z každé…), pořadí uvnitř
  // kategorie zůstává podle manifestu.
  function pick(items, count) {
    var groups = {}, order = [];
    items.forEach(function (item) {
      var cat = item.category || 'ostatni';
      if (!groups[cat]) { groups[cat] = []; order.push(cat); }
      groups[cat].push(item);
    });
    var out = [];
    for (var round = 0; out.length < count; round++) {
      var added = false;
      order.forEach(function (cat) {
        if (out.length < count && groups[cat][round]) { out.push(groups[cat][round]); added = true; }
      });
      if (!added) break;
    }
    return out;
  }

  function render(items) {
    grid.innerHTML = items.map(function (item) {
      var label = CATEGORY_NAMES[item.category] || 'Realizace';
      return (
        '<figure>' +
          '<img src="' + esc(encodeURI(BASE + item.file)) + '" alt="Ukázka práce: ' + esc(label) + '" loading="lazy" decoding="async">' +
          '<figcaption class="reference-caption"><strong>' + esc(label) + '</strong></figcaption>' +
        '</figure>'
      );
    }).join('');

    // Fotka, která v portfoliu chybí, se z výběru tiše vynechá.
    grid.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () { img.closest('figure').remove(); }, { once: true });
    });
  }

  fetch(MANIFEST)
    .then(function (r) {
      if (!r.ok) throw new Error('manifest ' + r.status);
      return r.json();
    })
    .then(function (items) {
      if (Array.isArray(items) && items.length) render(pick(items, REFERENCE_COUNT));
    })
    .catch(function (err) {
      // Bez manifestu zůstane jen tlačítko na celé portfolio.
      console.warn('Reference: ' + err.message);
    });

  // Lightbox (stejné styly .lightbox jako na portfolio.html, jiná instance).
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  if (!lightbox || !lightboxImg) return;

  grid.addEventListener('click', function (e) {
    var figure = e.target.closest('figure');
    var img = figure && figure.querySelector('img');
    if (!img) return;
    lightbox.style.display = 'flex';
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
      lightbox.style.display = 'none';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { lightbox.style.display = 'none'; }
  });
})();
