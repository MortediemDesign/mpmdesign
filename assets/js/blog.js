(async function loadBlog() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  try {
    const response = await fetch('assets/blog.json');
    if (!response.ok) throw new Error('Blog data nelze načíst');

    const items = await response.json();
    if (!Array.isArray(items) || !items.length) {
      grid.innerHTML = '<p>Zatím zde nejsou žádné články.</p>';
      return;
    }

    grid.innerHTML = items.map((item) => `
      <article class="card">
        ${item.image ? `<img src="assets/images/blog/${item.image}" alt="${item.title}" style="max-width: 100%; border-radius: 8px;">` : ''}
        <h3 style="margin-top: 1rem;">${item.title}</h3>
        <p style="font-size: 0.9em; color: #666;">${item.date}</p>
        <p>${item.summary}</p>
        <a href="blog/${item.slug}.html" class="cta" style="padding: 0.5rem 1rem; font-size: 0.9em;">Číst více</a>
      </article>
    `).join('');
  } catch (error) {
    grid.innerHTML = '<p>Rozhraní blogu se v tuto chvíli načítá.</p>';
  }
})();
