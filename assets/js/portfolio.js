(async function loadPortfolio() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;

  try {
    const response = await fetch('assets/images/portfolio/manifest.json');
    if (!response.ok) throw new Error('Manifest nelze načíst');

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      grid.innerHTML = '<p>Zatím nejsou nahrané žádné obrázky.</p>';
      return;
    }

    grid.innerHTML = items.map((item) => `
      <figure>
        <img src="assets/images/portfolio/${item.file}" alt="${item.alt}">
        <figcaption>
          <strong>${item.title}</strong><br>
          <span>${item.description}</span>
        </figcaption>
      </figure>
    `).join('');
  } catch (error) {
    grid.innerHTML = '<p>Nepodařilo se načíst portfolio. Zkontrolujte manifest a názvy obrázků.</p>';
  }
})();
