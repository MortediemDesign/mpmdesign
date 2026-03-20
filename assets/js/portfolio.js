(async function loadPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  const filtersContainer = document.getElementById('portfolioFilters');
  if (!grid) return;

  try {
    const response = await fetch('assets/images/portfolio/manifest.json');
    if (!response.ok) throw new Error('Manifest nelze načíst');

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      grid.innerHTML = '<p>Zatím nejsou nahrané žádné obrázky.</p>';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get('category') || 'all';

    if (filtersContainer) {
      const categories = ['all', ...new Set(items.map(item => item.category || 'ostatni'))];
      const categoryNames = {
        'all': 'Vše',
        'cnc': 'CNC Obrábění',
        '3d-tisk': '3D Tisk',
        'laser': 'Laserové Gravírování',
        'polepy': 'Výroba Polepů',
        'ostatni': 'Ostatní'
      };

      filtersContainer.innerHTML = categories.map(cat => `
        <button class="filter-btn ${cat === initialCategory ? 'active' : ''}" data-category="${cat}">
          ${categoryNames[cat] || cat.toUpperCase()}
        </button>
      `).join('');

      filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          renderGrid(e.target.getAttribute('data-category'));
        });
      });
    }

    function renderGrid(filterCat) {
      const filtered = filterCat === 'all' ? items : items.filter(item => (item.category || 'ostatni') === filterCat);
      if (filtered.length === 0) {
        grid.innerHTML = '<p>V této kategorii zatím nejsou žádné fotky. Přidejte složku se správným názvem do assets/images/portfolio.</p>';
        return;
      }
      grid.innerHTML = filtered.map((item) => `
        <figure>
          <img src="assets/images/portfolio/${item.file}" alt="${item.alt}">
          <figcaption>
            <strong>${item.title}</strong><br>
            <span>${item.description}</span>
          </figcaption>
        </figure>
      `).join('');
    }

    renderGrid(initialCategory);

  } catch (error) {
    grid.innerHTML = '<p>Nepodařilo se načíst portfolio. Zkontrolujte manifest a názvy obrázků.</p>';
  }
})();
