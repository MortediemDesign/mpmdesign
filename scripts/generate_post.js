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
    .post-content h2, .post-content h3 { margin-top: 2rem; color: #222; }
  </style>
</head>
<body>
  <header>
    <div class="container nav-wrap">
      <a class="brand" href="../index.html"><span>MPMDESIGN</span></a>
      <nav><ul><li><a href="../index.html">Domů</a></li><li><a href="../sluzby.html">Služby</a></li><li><a href="../portfolio.html">Portfolio</a></li><li><a href="../blog.html">Blog</a></li></ul></nav>
    </div>
  </header>
  <main class="container post-content">
    <a href="../blog.html" style="text-decoration:none;">&larr; Zpět na články</a>
    <h1 style="margin-top: 1rem;">${generatedArticle.title}</h1>
    <p style="color: grey;">Publikováno: ${generatedArticle.date}</p>
    <hr>
    <div>
      ${generatedArticle.content}
    </div>
  </main>
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
