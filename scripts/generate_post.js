const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../blog');
const ASSETS_DIR = path.join(__dirname, '../assets');
const BLOG_MANIFEST = path.join(ASSETS_DIR, 'blog.json');

// Tento agent generuje nový článek.
// V plné produkci bychom zde zavolali např. fetch('https://api.openai.com/...'), 
// ale jelikož nemáme v prostředí uživatelčino API klíč (a mohlo by to stát peníze/kredity),
// simulujeme práci agenta tím, že pošleme pevný formát. Můžete tento skript nahradit skutečným voláním k LLM.

async function createPost() {
  console.log("📝 Agent Copywriter: Zjišťuji témata a připravuji článek...");
  
  // Simulace čekání na AI
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newPostId = Date.now().toString();
  const slug = `novinky-z-vyroby-${newPostId}`;
  const date = new Date().toLocaleDateString('cs-CZ');

  const generatedArticle = {
    id: newPostId,
    title: `Proč je 3D tisk a CNC výroba budoucností lokální produkce?`,
    date: date,
    slug: slug,
    summary: "Dnes se podíváme na to, jak moderní technologie ovlivňují tvorbu prototypů a proč byste měli zvážit přesnou výrobu i pro váš projekt.",
    content: `
      <h2>Vliv technologií na dnešní výrobu</h2>
      <p>Ať už potřebujete náhradní díl k roletě, nebo přesný mechanismus z hliníku, technologie 3D tisku a CNC obrábění udělaly v posledních letech ohromný skok kupředu.</p>
      <h3>Rychlost a personalizace</h3>
      <p>Hlavní výhoda spočívá v extrémní rychlosti. Co se dříve muselo dovážet s dodací lhůtou týdnů, jsme dnes schopni navrhnout, vysoustružit či vytisknout během několika dnů a to přesně na míru vaší potřebě.</p>
    `
  };

  // 1. Zapsat novou fyzickou stránku do /blog/složky
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>${generatedArticle.title} | Blog MPMDESIGN</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <style>
    .post-content { max-width: 800px; margin: 2rem auto; line-height: 1.6; }
    .post-content h2, .post-content h3 { margin-top: 2rem; color: var(--accent); }
    .post-content p { color: var(--text); }
  </style>
</head>
<body>
  <header>
    <div class="container nav-wrap">
      <a class="brand" href="../index.html">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        <span>MPMDESIGN</span>
      </a>
      <nav>
        <ul>
          <li><a href="../index.html">Domů</a></li>
          <li><a href="../sluzby.html">Služby</a></li>
          <li><a href="../portfolio.html">Portfolio</a></li>
          <li><a href="../kontakt.html">Kontakt</a></li>
          <li><a class="active" href="../blog.html">Blog</a></li>
          <li><a href="../eshop.html">E-shop</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main class="container post-content">
    <a href="../blog.html" style="text-decoration:none; display: inline-block; margin-bottom: 2rem;" class="cta">&larr; Zpět na články</a>
    <h1 style="color: var(--accent);">${generatedArticle.title}</h1>
    <p style="color: grey;">Publikováno: ${generatedArticle.date}</p>
    <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 2rem 0;">
    <div>
      ${generatedArticle.content}
    </div>
  </main>

  <footer>
    <div class="container footer-content">
      <div class="copyright">© 2026 MPMDESIGN | CNC výroba • 3D tisk • Gravírování • Polepy</div>
      <div class="social-links">
        <a href="https://instagram.com/mpmdesign.cz" target="_blank" rel="noopener noreferrer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.169a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          Instagram
        </a>
        <a href="https://www.facebook.com/share/1AsAUKm6Nn/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </a>
      </div>
    </div>
    <div class="container legal-bar">
      <span>Miguel Pérez Morales · IČO 24859931 · Lidická 1018, 363 01 Ostrov · zapsán v živnostenském rejstříku vedeném Městským úřadem Ostrov</span>
      <span><a href="../obchodni-podminky.html">Obchodní podmínky</a> · <a href="../ochrana-osobnich-udaju.html">Ochrana osobních údajů</a></span>
    </div>
  </footer>
</body>
</html>
  `;

  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, {recursive: true});
  fs.writeFileSync(path.join(BLOG_DIR, `${slug}.html`), htmlTemplate, 'utf8');

  // 2. Přidat ho do indexu blogu (blog.json)
  let manifest = [];
  if (fs.existsSync(BLOG_MANIFEST)) {
    try {
      manifest = JSON.parse(fs.readFileSync(BLOG_MANIFEST, 'utf8'));
    } catch (e) {}
  }
  
  manifest.unshift({
    title: generatedArticle.title,
    date: generatedArticle.date,
    summary: generatedArticle.summary,
    slug: generatedArticle.slug,
    image: null
  });

  fs.writeFileSync(BLOG_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ Zveřejněn nový článek: ${generatedArticle.title}`);
}

createPost();
