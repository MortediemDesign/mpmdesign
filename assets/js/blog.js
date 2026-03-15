(async function loadBlog() {
  const list = document.getElementById('blogList');
  const detail = document.getElementById('blogDetail');
  if (!list || !detail) return;

  try {
    const response = await fetch('assets/blog/posts.json');
    if (!response.ok) throw new Error('Posts not found');
    const posts = await response.json();

    if (!Array.isArray(posts) || !posts.length) {
      list.innerHTML = '<p>Blog zatím neobsahuje žádné články.</p>';
      detail.innerHTML = '';
      return;
    }

    list.innerHTML = posts.map((post, index) => `
      <article class="card blog-card ${index === 0 ? 'active' : ''}" data-slug="${post.slug}">
        <small>${new Date(post.date).toLocaleDateString('cs-CZ')}</small>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <span class="accent">Číst článek</span>
      </article>
    `).join('');

    const renderDetail = (post) => {
      detail.innerHTML = `
        <article class="card blog-detail reveal">
          <small>${new Date(post.date).toLocaleDateString('cs-CZ')}</small>
          <h2>${post.title}</h2>
          <p>${post.content}</p>
        </article>
      `;
    };

    renderDetail(posts[0]);

    list.querySelectorAll('.blog-card').forEach((card) => {
      card.addEventListener('click', () => {
        const selected = posts.find((p) => p.slug === card.dataset.slug);
        if (!selected) return;
        list.querySelectorAll('.blog-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        renderDetail(selected);
      });
    });
  } catch {
    list.innerHTML = '<p>Nepodařilo se načíst blogové články.</p>';
    detail.innerHTML = '';
  }
})();
