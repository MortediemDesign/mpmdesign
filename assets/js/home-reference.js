/* ============================================================
   MPMDESIGN – sekce Reference: masonry galerie + lightbox.

   Sem doplňte skutečné fotky: nahrajte je do assets/reference/ a
   přepište položky v REFERENCE_ITEMS (file = cesta k souboru,
   title/desc = popisek zobrazený při najetí myší). Dokud soubor
   chybí, karta se sama zobrazí jako čitelný placeholder místo
   rozbitého obrázku.
   ============================================================ */
(function () {
  'use strict';

  var REFERENCE_ITEMS = [
    { file: 'assets/reference/cnc-1.jpg', title: 'CNC díl na míru', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/3d-tisk-1.jpg', title: '3D tisk prototypu', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/laser-1.jpg', title: 'Laserové gravírování', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/polep-1.jpg', title: 'Polep vozidla', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/samolepky-1.jpg', title: 'Samolepky na míru', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/dtf-1.jpg', title: 'DTF potisk trička', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/cnc-2.jpg', title: 'CNC výroba – detail', desc: 'Doplňte popis realizace' },
    { file: 'assets/reference/web-1.jpg', title: 'Web na míru', desc: 'Doplňte popis realizace' }
  ];

  var grid = document.getElementById('referenceGrid');
  if (!grid) return;

  grid.innerHTML = REFERENCE_ITEMS.map(function (item, i) {
    return (
      '<figure data-index="' + i + '">' +
        '<img src="' + item.file + '" alt="' + item.title + '" loading="lazy" decoding="async">' +
        '<figcaption class="reference-caption"><strong>' + item.title + '</strong><span>' + item.desc + '</span></figcaption>' +
      '</figure>'
    );
  }).join('');

  // Chybějící soubor -> čitelný placeholder místo rozbité ikony.
  grid.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () {
      img.closest('figure').classList.add('ref-missing');
    }, { once: true });
  });

  // Lightbox (stejné styly .lightbox jako na portfolio.html, jiná instance).
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  if (!lightbox || !lightboxImg) return;

  grid.addEventListener('click', function (e) {
    var figure = e.target.closest('figure');
    if (!figure || figure.classList.contains('ref-missing')) return;
    var img = figure.querySelector('img');
    if (!img) return;
    lightbox.style.display = 'flex';
    lightboxImg.src = img.src;
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
