const fs = require('fs');
const path = require('path');

const PORTFOLIO_DIR = path.join(__dirname, '../assets/images/portfolio');
const MANIFEST_PATH = path.join(PORTFOLIO_DIR, 'manifest.json');

// Podporované formáty obrázků
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function generateTitleFromFilename(filename) {
  // Převede "moje-krasna-fotka.jpg" na "Moje krasna fotka"
  const nameWithoutExt = path.parse(filename).name;
  const withSpaces = nameWithoutExt.replace(/[-_]/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function updateManifest() {
  console.log('Spouštím agenta pro aktualizaci portfolia...');

  // Načíst existující manifest
  let currentManifest = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const data = fs.readFileSync(MANIFEST_PATH, 'utf8');
      currentManifest = JSON.parse(data);
    } catch (e) {
      console.warn('Nepodařilo se parsovat existující manifest.json, začínám s čistým štítem.');
    }
  }

  // Získat soubory ze složky s portfoliem rekurzivně
  let files = [];
  try {
    files = getFilesRecursively(PORTFOLIO_DIR);
  } catch (e) {
    console.error(`Složka ${PORTFOLIO_DIR} neexistuje! Vytvářím...`);
    fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
    files = [];
  }

  // Filtrovat jen obrázky
  const imageFiles = files.filter(file => {
    return SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()) && path.basename(file) !== 'manifest.json';
  });

  console.log(`Nalezeno ${imageFiles.length} obrázků ve složce portfolia a jejích podsložkách.`);

  // Mapa stávajících souborů pro rychlé vyhledávání
  const existingFilesMap = new Map();
  currentManifest.forEach(item => {
    existingFilesMap.set(item.file, item);
  });

  const newManifest = [];
  let addedCount = 0;

  // Průchod nalezených obrázků a tvorba nového manifestu
  imageFiles.forEach(file => {
    const relativePath = path.relative(PORTFOLIO_DIR, file).split(path.sep).join('/');
    
    if (existingFilesMap.has(relativePath)) {
      // Pokud už soubor existuje v manifestu, zachováme jeho aktuální data (mohla být upravena ručně) ale zkontrolujeme kategorii
      const existingItem = existingFilesMap.get(relativePath);
      // Extraktovat kategorii ze složky (např. 'cnc' z 'cnc/fotka.jpg')
      const dirname = path.dirname(relativePath);
      const category = dirname === '.' ? 'ostatni' : dirname.split('/')[0];
      existingItem.category = category;
      newManifest.push(existingItem);
    } else {
      // Nový soubor, vytvoříme pro něj základní metadata
      const basename = path.basename(file);
      const title = generateTitleFromFilename(basename);
      
      const dirname = path.dirname(relativePath);
      const category = dirname === '.' ? 'ostatni' : dirname.split('/')[0];

      newManifest.push({
        file: relativePath,
        category: category,
        title: title,
        description: `Ukázka práce: ${title}.`,
        alt: title
      });
      console.log(`[NOVÝ OBRÁZEK] Přidán nový záznam pro: ${relativePath} (kategorie: ${category})`);
      addedCount++;
    }
  });

  // Uložení aktualizovaného manifestu
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(newManifest, null, 2), 'utf8');
  console.log(`Manifest úspěšně aktualizován. ${addedCount > 0 ? `Přidáno ${addedCount} nových položek.` : 'Žádné nové položky k přidání.'}`);
}

updateManifest();

