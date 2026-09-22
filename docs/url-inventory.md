# Inventura URL – MPMDESIGN

Všechny URL jsou relativní k `https://www.mpmdesign.cz/`. Sloupec "Stav" = ověřený reálný stav v repu (ne návrh).

| URL | Title (aktuální) | H1 | Meta description | Canonical | Indexovatelná | Stav |
|---|---|---|---|---|---|---|
| `/index.html` (`/`) | "MPMDESIGN – ze surového materiálu hotový výrobek \| CNC, 3D tisk, laser" | "Ze surového materiálu hotový výrobek" | ✅ vyplněná | ❌ chybí | ano (žádný robots meta) | Live, ale hlavní kontaktní formulář nefunkční (viz technical-audit T1), obsahuje `[CENA] Kč` placeholder |
| `/sluzby.html` | "CNC a 3D výroba \| Služby" (generický, stejný vzorec na 5 stránkách) | "Moje služby" | ❌ chybí | ❌ chybí | ano | Live, funkční, karty vedou na `kontakt.html?sluzba=X` |
| `/portfolio.html` | "CNC a 3D výroba \| Portfolio" | "Ukázky realizací" | ❌ chybí | ❌ chybí | ano | Live, reálná galerie (24 fotek v `manifest.json`, client-side render) |
| `/blog.html` | "CNC a 3D výroba \| Blog" | "Novinky a články" | ❌ chybí | ❌ chybí | ano | Live, client-side render z `assets/blog.json` |
| `/kontakt.html` | "CNC a 3D výroba \| Kontakt" | "Kontaktujte mě" | ❌ chybí | ❌ chybí | ano | Live, funkční formulář (formsubmit.co), captcha vypnutá |
| `/eshop.html` | "CNC a 3D výroba \| E-shop" | "Příprava na e-shop" | ❌ chybí | ❌ chybí | ano | **Prázdná stránka** – jen hero, žádný obsah v `<section class="grid">` |
| `/tvorba-webu.html` | "Tvorba webu na míru \| MPMDESIGN" | "Tvorba webu na míru" | ✅ vyplněná | ❌ chybí | ano | Live, plnohodnotný obsah |
| `/klicenka.html` | "Navrhni si klíčenku \| MPMDESIGN" | "Navrhni si klíčenku" | ✅ vyplněná | ❌ chybí | ano | Live, funkční 3D konfigurátor + objednávka (Vercel API) |
| `/samolepky.html` | "Konfigurátor samolepek \| MPMDESIGN" | "Samolepky na míru" | ✅ vyplněná | ❌ chybí | ano | Live, funkční konfigurátor |
| `/gravirovani.html` | "Konfigurátor laserového gravírování \| MPMDESIGN" | "Laserové gravírování" | ✅ vyplněná | ❌ chybí | ano | Live, funkční konfigurátor |
| `/ebook.html` | "E-book Vectric: 19 kapitol pro CNC tvorbu \| MPMDESIGN" | "Vectric CNC Design Software – průvodce pro začátečníky" | ✅ vyplněná | ❌ chybí | ano | Live, ale **obsahuje `[CENA] Kč` placeholder na 2 místech** (řádek 65 a 220) – produkt se nedá reálně koupit |
| `/kalkulacka.html` | "Interní kalkulačka \| MPMDESIGN" | žádný `<h1>` | ❌ chybí | ❌ chybí | **ano (bez ochrany!)** | Interní nástroj, veřejně odkazovaný ze všech stránek, jen client-side pseudo-heslo, měl by být `noindex` a mimo hlavní nav |
| `/obchodni-podminky.html` | "Obchodní podmínky \| MPMDESIGN" | "Obchodní podmínky" | ✅ vyplněná | ❌ chybí | ano | Live, právní obsah |
| `/ochrana-osobnich-udaju.html` | "Ochrana osobních údajů \| MPMDESIGN" | "Ochrana osobních údajů" | ✅ vyplněná | ❌ chybí | ano | Live, právní obsah |
| `/blog/jak-vznika-cnc-zakazka` | – | – | – | – | – | **V `assets/blog/posts.json` je záznam, ale odpovídající `.html` soubor v `blog/` NEEXISTUJE.** Odkaz z `blog.js`/`assets/blog.json` na tento slug by dal 404 – ověřit, který zdroj (`blog.json` vs `posts.json`) je skutečně živý (viz technical-audit T8). |
| `/blog/3d-tisk-kdy-se-vyplati` | – | – | – | – | – | Stejný nález jako výše – jen v `posts.json`, ne v `blog.json`, žádný `.html` soubor. |
| `/blog/laser-gravirovani-a-samolepky` | – | – | – | – | – | Stejný nález jako výše. |
| `/blog/laserove-gravirovani-vyuziti.html` | "Proč je 3D tisk a CNC výroba budoucností lokální produkce? \| Blog MPMDESIGN" (**ŠPATNÝ – neodpovídá obsahu**) | "Laserové gravírování: Osobní dotek i profesionální značení" | ❌ chybí | ❌ chybí | ano | Live, ale title tag nesedí k obsahu |
| `/blog/cnc-obrabeni-v-praxi.html` | totožný špatný title jako výše | "CNC obrábění v praxi: Přesnost, která tvoří rozdíl" | ❌ chybí | ❌ chybí | ano | Live, title nesedí k obsahu |
| `/blog/budoucnost-3d-tisku.html` | totožný špatný title jako výše | "Budoucnost je teď: Co všechno dokáže profesionální 3D tisk" | ❌ chybí | ❌ chybí | ano | Live, title nesedí k obsahu |
| `/blog/novinky-z-vyroby-1773567743975.html` | "Proč je 3D tisk a CNC výroba budoucností lokální produkce? \| Blog MPMDESIGN" (correct pro tento soubor – je to zdroj duplicity) | "Proč je 3D tisk a CNC výroba budoucností lokální produkce?" | ❌ chybí | ❌ chybí | ano | Live, **strojově/šablonově vygenerovaný obsah** (`scripts/generate_post.js`), netransparentní slug s timestampem v URL |

## Souhrnné technické SEO nálezy (napříč všemi 18 URL)

- **0/18** stránek má `<link rel="canonical">`.
- **0/18** stránek má `<meta name="robots">`.
- **4/18** shodné duplicitní `<title>` u blogových článků (viz výše).
- **5** stránek (`sluzby`, `portfolio`, `blog`, `kontakt`, `eshop`) sdílí identický vzorec title "CNC a 3D výroba | X" a **žádná z nich nemá meta description**.
- Žádný `robots.txt`, žádný `sitemap.xml` v celém repozitáři.
- Žádná stránka nemá strukturovaná data typu `BreadcrumbList`, `Service`, `Article`, `Product` nebo `WebSite` – jediný strukturovaný blok v celém webu je `LocalBusiness` na `index.html`.
- Nové URL požadované zadáním (`/cnc-frezovani`, `/3d-tisk`, `/laser`, `/samolepky`, `/polepy`, `/dtf`, `/tvorba-webu` [už existuje jako `/tvorba-webu.html`], `/o-nas`) **v repozitáři zatím neexistují** – je nutné je nově vytvořit, ne přejmenovat. `tvorba-webu.html` již existuje a je funkční, jen na jiném URL patternu (`.html` přípona, ne clean URL) – GitHub Pages bez serverside rewrite obecně vyžaduje `.html` příponu nebo adresářový trik (`/cnc-frezovani/index.html`), což je potřeba rozhodnout před implementací P1.
