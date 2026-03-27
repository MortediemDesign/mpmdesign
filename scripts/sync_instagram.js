const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
if (!TOKEN) {
  console.log("Agent Instagramu nemá klíč. Skript končí bez chyb, je potřeba vložit INSTAGRAM_ACCESS_TOKEN.");
  process.exit(0);
}

const PORTFOLIO_DIR = path.join(__dirname, '../assets/images/portfolio');
// Používáme limit=20 pro stažení nedávných postů
const URL = `https://graph.instagram.com/me/media?fields=id,caption,media_url,media_type,thumbnail_url,permalink&limit=20&access_token=${TOKEN}`;

// Mapování hashtagů na konkrétní názvy složek v našem webovém portfoliu
const categoryRules = [
  { tags: ['#cnc', '#obrabeni'], folder: 'cnc' },
  { tags: ['#3dtisk', '#3d-tisk', '#3dprint', '#tisk'], folder: '3d-tisk' },
  { tags: ['#laser', '#gravirovani', '#engraving'], folder: 'laser' },
  { tags: ['#polepy', '#samolepky', '#reklama'], folder: 'polepy' },
  { tags: ['#grafika', '#design'], folder: 'grafika' }
];

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
       if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
         // Handle redirects gracefully (sometimes returned by IG CDN)
         downloadImage(response.headers.location, dest).then(resolve).catch(reject);
         return;
       }
       response.pipe(file);
       file.on('finish', () => {
         file.close(resolve);
       });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function processCaption(caption) {
  if (!caption) return null;
  const lowerCaption = caption.toLowerCase();
  for (const rule of categoryRules) {
    if (rule.tags.some(tag => lowerCaption.includes(tag))) {
      return rule.folder;
    }
  }
  return null;
}

async function syncInstagram() {
  try {
    const response = await fetch(URL);
    const data = await response.json();
    
    if (data.error) {
      console.error("Chyba API Instagramu:", data.error.message);
      process.exit(1);
    }
    
    if (!data.data || data.data.length === 0) {
      console.log("Nenalezeny žádné příspěvky.");
      process.exit(0);
    }
    
    let downloadedCount = 0;
    
    for (const post of data.data) {
       // Zajímá nás jen fotka nebo album (Carousel)
       if (post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM') {
         const folder = processCaption(post.caption);
         if (folder) {
           const targetDir = path.join(PORTFOLIO_DIR, folder);
           if (!fs.existsSync(targetDir)) {
             fs.mkdirSync(targetDir, { recursive: true });
           }
           
           const filename = `ig_${post.id}.jpg`;
           const destPath = path.join(targetDir, filename);
           
           if (!fs.existsSync(destPath)) {
             console.log(`Stahuji novou fotku pro kategorii '${folder}': ${filename}`);
             await downloadImage(post.media_url, destPath);
             downloadedCount++;
           }
         }
       }
    }
    
    console.log(`Zpracování Instagramu je hotovo. Staženo: ${downloadedCount} fotek.`);
  } catch (error) {
    console.error("Chyba synchronizace IG:", error);
    process.exit(1);
  }
}

syncInstagram();
