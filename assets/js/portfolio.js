(async function loadPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  const filtersContainer = document.getElementById('portfolioFilters');
  if (!grid) return;

  const categoryNames = {
    'all': 'Vše',
    'cnc': 'CNC obrábění',
    '3d-tisk': '3D tisk',
    'laser': 'Laserové gravírování',
    'polepy': 'Polepy',
    'grafika': 'Grafické práce'
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  // Lightbox – kliknutí na fotku ji zvětší, zavírá se křížkem, kliknutím vedle nebo klávesou Esc.
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  if (lightbox && lightboxImg) {
    grid.addEventListener('click', (e) => {
      const img = e.target.closest('figure') && e.target.closest('figure').querySelector('img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.style.display = 'flex';
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) lightbox.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') lightbox.style.display = 'none';
    });
  }

  try {
    const response = await fetch('assets/images/portfolio/manifest.json');
    if (!response.ok) throw new Error('Manifest nelze načíst');

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      grid.innerHTML = '<p>Zatím nejsou nahrané žádné fotky.</p>';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get('category') || 'all';

    if (filtersContainer) {
      const categories = ['all', ...new Set(items.map(item => item.category || 'ostatni'))]
        .filter(cat => cat !== 'ostatni');

      filtersContainer.innerHTML = categories.map(cat => `
        <button type="button" class="filter-btn ${cat === initialCategory ? 'active' : ''}" data-category="${esc(cat)}">
          ${esc(categoryNames[cat] || cat)}
        </button>
      `).join('');

      filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          renderGrid(e.currentTarget.getAttribute('data-category'));
        });
      });
    }

    function renderGrid(filterCat) {
      const filtered = filterCat === 'all' ? items : items.filter(item => (item.category || 'ostatni') === filterCat);
      if (filtered.length === 0) {
        grid.innerHTML = '<p>V této kategorii zatím nejsou žádné fotky.</p>';
        return;
      }
      grid.innerHTML = filtered.map((item) => {
        const label = categoryNames[item.category] || 'Realizace';
        const title = item.title || label;
        return `
        <figure>
          <img src="${esc(encodeURI('assets/images/portfolio/' + item.file))}" alt="${esc(item.alt || title)}" loading="lazy" decoding="async">
          <figcaption><strong>${esc(title)}</strong><span>${esc(label)}</span></figcaption>
        </figure>`;
      }).join('');
    }

    renderGrid(initialCategory);

  } catch (error) {
    grid.innerHTML = '<p>Fotky se nepodařilo načíst. Zkuste prosím stránku obnovit.</p>';
  }
})();
