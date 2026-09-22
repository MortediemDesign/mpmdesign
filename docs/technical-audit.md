# Technický audit – MPMDESIGN

Datum auditu: 2026-09-22. Zdroj: repository `MortediemDesign/mpmdesign`, větev `main` (commit `a50ac2c`). Všechna tvrzení níže jsou ověřená čtením kódu (odkazy `soubor:řádek`); nic není odhad.

## 1. Platforma a build

- Statický web (HTML/CSS/JS), **žádný build systém, žádný framework**. `package.json` obsahuje jen jednu závislost – `resend` (^3.2.0) pro serverless funkci.
- Hosting: **GitHub Pages** (`CNAME` → `www.mpmdesign.cz`), deploy přes `.github/workflows/deploy-pages.yml` (push na `main`/`master`/`work`).
- Validace při každém PR/push: `.github/workflows/validate-site.yml` spouští `tools/check_site.py` (kontrola existence odkazů, JSON validity, konzistence navigace).
- Vercel se používá jen pro jednu serverless funkci `api/order.mjs` (objednávky z konfigurátorů), ne pro hosting celého webu.
- **Chybí jakýkoli sitemap.xml a robots.txt** – v repozitáři nebyl nalezen ani jeden (`find . -iname "robots.txt" -o -iname "sitemap.xml"` = 0 výsledků). To znamená, že se search enginy musí spoléhat čistě na interní linky a GH Pages default chování.

## 2. Struktura stránek

18 HTML souborů celkem: 14 v rootu + 4 v `blog/`. Žádný router/CMS – každá stránka je samostatný `.html` soubor se zkopírovaným header/footer markupem (viz `check_nav_consistency()` v `tools/check_site.py:37-61`, která hlídá, že hlavní `<nav>` je bit-přesně identická na všech stránkách kromě `index.html`).

## 3. CSS/design systém

- Jeden sdílený soubor `assets/css/styles.css`, tokeny v `:root` (`styles.css:3-8`):
  ```
  --bg: #05070c; --navy: #1B4B9B; --accent: #F5921E; --text: #ffffff; --panel: rgba(27,75,155,0.16);
  ```
- Font "Space Grotesk" načten přes `@import url(fonts.googleapis.com...)` na 1. řádku `styles.css` – funguje, ale je to render-blocking `@import`, ne `<link rel="preload">/<link rel="stylesheet">`. Mírný dopad na výkon (LCP).
- Žádný design-token systém nad rámec 5 barevných proměnných (žádné `--space-*`, `--radius-*`, typografická škála apod.) – bude potřeba doplnit, pokud audit-brief vyžaduje formální design-token systém.
- Několik stránek (`klicenka.html`, `samolepky.html`, `gravirovani.html`, blog posty) má **inline `<style>` blok v `<head>`** navíc k `styles.css` – funguje to (tokeny se dědí přes `var(--accent)` atd.), ale je to fragmentované a ztěžuje globální změny.

## 4. JavaScript – přehled

Žádný bundler, vše jako samostatné `<script>` tagy:
- `assets/js/nav.js` – dropdown menu + hamburger (`initHamburger()`, guard `if (!toggle || !panel) return;`, bezpečně no-op na stránkách bez markupu).
- `assets/js/reveal.js` – lehký `IntersectionObserver` reveal, respektuje `prefers-reduced-motion`.
- `assets/js/home*.js` (hero, services, reference, contact) – jen na `index.html`, používá GSAP 3.12.5 + ScrollTrigger + MotionPathPlugin (cdnjs) + Lenis 1.3.26 (jsDelivr), vše přes CDN `<script>` tagy (žádný fallback při výpadku CDN).
- Konfigurátory (`klicenka.html`, `samolepky.html`, `gravirovani.html`) mají vlastní JS (`sticker-configurator.js`, `engraving-configurator.js`, `klicenka-assets/app.js` s Three.js) – funkční, nedotčeno v posledních "chrome-only" PR podle explicitního zadání uživatele.
- `assets/js/portfolio.js` – fetchuje `assets/images/portfolio/manifest.json` a renderuje galerii client-side (žádné SSR/statické HTML pro obrázky → prázdný DOM při vypnutém JS, horší pro crawlery bez JS renderování; Google to obvykle renderuje, ale je to riziko).
- `assets/js/blog.js` – fetchuje **`assets/blog.json`** (ne `assets/blog/posts.json`!) a renderuje seznam článků na `blog.html`. Viz sekce 6 – **v repu existují DVA různé zdroje dat pro blog**, což je reálné riziko rozjetí dat.

## 5. Formuláře a odesílání poptávek – KRITICKÝ NÁLEZ: dva nezávislé systémy

Web má **dvě různé, nezávislé implementace kontaktního formuláře** s jinými cíli:

1. **`kontakt.html`** (`kontakt.html:88`): `<form action="https://formsubmit.co/mpmdesign@outlook.cz" method="POST" enctype="multipart/form-data">`, s `<input type="hidden" name="_captcha" value="false">` (`kontakt.html:92`) – **anti-spam captcha je explicitně vypnutá**. Formulář reálně funguje (real endpoint), ale nemá žádnou ochranu proti spamu/botům a spoléhá se 100 % na klasický POST + redirect (`_next`), žádná JS validace navíc.
2. **`index.html`** (homepage): formulář `#contactForm` (`index.html:359-400`) je zpracován JS handlerem `assets/js/home-contact.js`, který odesílá `fetch()` na Formspree. **Endpoint není nastaven** – konstanta `FORMSPREE_ENDPOINT = 'https://formspree.io/f/VÁŠ_FORMULÁŘ'` (`home-contact.js:12`) je stále placeholder. Handler to detekuje (`home-contact.js:34`) a zobrazí zákazníkovi zprávu "Formulář zatím není napojený – napište prosím na mpmdesign@outlook.cz." – **tedy hlavní kontaktní formulář na homepage v produkci nefunguje a nikdy neodešle poptávku.** Toto je stejná třída P0 problému jako `[CENA] Kč` placeholder.

Důsledek: **homepage formulář ≠ kontakt.html formulář**, jiný cílový systém, jiné UX chování, jiná úroveň zabezpečení. To je přímý rozpor s bodem zadání "minimalizace konverzního trychtýře / jeden jasný kontaktní kanál" a nutně to bude třeba sjednotit.

## 6. Objednávky z konfigurátorů (klíčenka/samolepky/gravírování)

- `assets/js/config.js` definuje `window.MPM_CONFIG` (`orderMode: "vercel"`, `orderEndpoint: "https://mpmdesign.vercel.app/api/order"`, `orderEmail: "mpmdesign@outlook.cz"`). Podle komentáře v souboru (`config.js:18-19`): "Dokud není vyplněný ani jeden režim, konfigurátory objednávku neodešlou a zobrazí zákazníkovi kontaktní e-mail." `orderMode` je nastaven na `"vercel"` a endpoint vyplněný → **tento kanál je nakonfigurovaný** (na rozdíl od Formspree výše).
- Server-side handler `api/order.mjs` (Vercel serverless funkce): validuje pouze `customer.email`, `customer.name` a přítomnost `stlBase64`/`fileBase64` (`api/order.mjs:49-56`). **Neověřuje velikost přílohy, MIME typ, ani obsah** na serveru – limit velikosti je implicitně dán limitem Vercel serverless body (výchozí ~4.5 MB), ale v kódu není explicitní kontrola ani chybová hláška pro zákazníka při překročení. Používá `Resend` pro e-mail s přílohou.
- **TODO (nelze ověřit z repozitáře):** skutečná hodnota `RESEND_API_KEY`/`ORDER_TO_EMAIL`/`ORDER_FROM_EMAIL` a reálný limit velikosti nastavený na straně Vercel projektu (env proměnné, `maxDuration`, limit request body) – nejsou v repu (`vercel.json` neexistuje), musí se ověřit přímo ve Vercel dashboardu, než se do textů doplní konkrétní "max X MB".

## 7. "Interní kalkulačka" – KRITICKÝ BEZPEČNOSTNÍ NÁLEZ

`kalkulacka.html` je propagovaná jako "Přihlášení" a je **odkazovaná z úplně každé stránky webu** (hlavní nav i mobilní nav na všech 14 root stránkách + patička `sluzby.html`/`eshop.html` s textem "🔐 Interní sekce").

Autentizace je čistě klient-side a kryptograficky bezcenná:
- `kalkulacka.html:334`: `function hash(s){let h=0;for(...)...return h.toString(36);}` – triviální rolling hash, ne kryptografická funkce.
- `kalkulacka.html:335`: `const DEFAULT_PASS=hash('mpm2026');` – **výchozí heslo "mpm2026" je v čistém textu přímo v HTML zdroji stránky**, viditelné komukoliv přes "zobrazit zdroj".
- Přihlášení (`tryLogin()`, `kalkulacka.html:369-383`) porovnává hash zadaného heslo s `settings.passwordHash` uloženým v `localStorage` (`mpm_calc_settings`) nebo padá zpět na `DEFAULT_PASS`. Session flag `sessionStorage.setItem('mpm_session','true')` – žádné server-side ověření, žádný token, žádné rate-limitování pokusů.
- Veškerá cenová/nákladová data kalkulačky (ceny materiálů, tiskáren, dopravy – `settings` objekt) jsou uložena a čtena z `localStorage`, tedy jsou **plně stažitelná** kýmkoliv, kdo si otevře DevTools, bez ohledu na "přihlášení".

**Závěr:** tohle není bezpečnostní mechanismus, je to jen UI clona. Stránka je navíc veřejně indexovatelná (žádný `robots` meta tag, žádné `robots.txt` disallow). To je přímo v rozporu s požadavkem zadání "skryj interní Přihlášení/kalkulačku z veřejné navigace" – aktuální stav je opak: je vidět v navigaci na každé jedné stránce.

## 8. Automatizace / GitHub Actions (agenti)

4 workflow soubory v `.github/workflows/`:
1. `deploy-pages.yml` – standardní GH Pages deploy.
2. `validate-site.yml` – `tools/check_site.py` na push/PR.
3. `qa-agent.yml` – týdně (po 8:00) spouští `lycheeverse/lychee-action` na kontrolu odkazů, při chybě vytvoří GitHub Issue.
4. `instagram-sync.yml` – denně (3:00) spouští `scripts/sync_instagram.js` (stahuje fotky z Instagram Graph API do `assets/images/portfolio/`, vyžaduje `INSTAGRAM_ACCESS_TOKEN` secret; bez něj skript končí čistě bez chyby) a poté `scripts/update_portfolio.js` (přegeneruje `manifest.json` ze skutečných souborů ve složce – **toto je reálný, funkční mechanismus, ne placeholder**).
5. `portfolio-agent.yml` – spustí se při push do `assets/images/portfolio/**`, znovu zavolá `update_portfolio.js` a commitne `manifest.json`.

**Nález k `scripts/generate_post.js`:** tento skript existuje v repu a **umí vygenerovat nový blog článek s napevno zapsaným (hardcoded) titulkem a obsahem** – komentář v kódu to přímo přiznává (`generate_post.js:8-9`): *"V plné produkci bychom zde zavolali např. fetch('https://api.openai.com/...'), ale... simulujeme práci agenta tím, že pošleme pevný formát."* Титulek je vždy identický: `"Proč je 3D tisk a CNC výroba budoucností lokální produkce?"`. **Tento skript není zavěšený v žádném workflow** (žádná zmínka `generate_post` v `.github/workflows/`), ale už byl očividně spuštěn manuálně alespoň jednou – existuje živý výstup `blog/novinky-z-vyroby-1773567743975.html` + odpovídající záznam v `assets/blog.json`. Viz `copy-audit.md` pro dopad na duplicitní `<title>` tagy.

## 9. Přístupnost (rychlý technický nález, ne plný WCAG audit)

- Žádný "skip to content" link na žádné stránce (`grep -rl "skip" *.html` = 0 výsledků).
- `aria-label`/`role` atributy se používají jen zřídka (15 výskytů v celém webu, hlavně u hamburger tlačítka a dropdown menu) – formuláře, karty s `onclick` navigací (`sluzby.html:77-82`, celé `<article class="card" onclick="...">` bez `role="link"`/`tabindex`/klávesnicové obsluhy) nejsou plně přístupné klávesnicí.
- Všechny stránky mají `<html lang="cs">` (konzistentní, OK) a `<meta name="viewport">` (OK, 18/18 stránek).

## 10. Obrázky / alt texty

- 20 `<img>` tagů v HTML (mimo JS-generované), z toho 2 bez `alt` (`index.html:409`, `portfolio.html:83` – oba jsou `#lightbox-img`, tedy dynamicky měněný náhled, ne kritické, ale správně by měly mít alespoň `alt=""` pro validní HTML).
- Portfolio obrázky renderované z `manifest.json` mají `alt` pole vyplněné, ale automaticky odvozené z názvu souboru (`update_portfolio.js`: `generateTitleFromFilename()` nahrazuje pomlčky mezerami a capitalizuje první písmeno) – texty jsou funkční, ale strojově generované, ne ručně psané popisky.

## 11. Shrnutí – co je potřeba opravit (technická rovina)

| # | Nález | Závažnost |
|---|---|---|
| T1 | Homepage kontaktní formulář (Formspree) nefunkční – placeholder endpoint | P0 |
| T2 | `[CENA] Kč` placeholder v `ebook.html` a `index.html` | P0 |
| T3 | `kalkulacka.html` – veřejně odkazovaná, jen klient-side "autentizace", heslo v plaintextu ve zdroji | P0 (bezpečnost) |
| T4 | Dva nezávislé, nekonzistentní kontaktní formuláře (kontakt.html vs. index.html) | P1 |
| T5 | Chybí `robots.txt` a `sitemap.xml` | P1 |
| T6 | `kontakt.html` formulář má vypnutou captcha (`_captcha=false`) | P1 |
| T7 | `eshop.html` je prázdná stránka (jen H1, žádný obsah) ale je v hlavní navigaci a indexovatelná | P1 |
| T8 | Duplicitní/rozjetá data blogu (`assets/blog.json` vs. `assets/blog/posts.json`) | P2 |
| T9 | `generate_post.js` – nevyužívaný, ale nebezpečný skript (hardcoded fake AI obsah), už jednou spuštěný | P2 |
| T10 | Chybí skip-link, `onclick`-karty bez klávesnicové obsluhy | P2 (přístupnost) |
| T11 | Žádný explicitní limit/validace velikosti přílohy na serveru v `api/order.mjs` | P2 |
