# Implementační checklist + konfliktní analýza – MPMDESIGN

Tento dokument je poslední krok auditu (bod 57 zadání) a **předchází jakékoli implementaci**. Nejdřív konflikty (musí se rozhodnout před P1), pak úkoly P0–P4.

---

## ČÁST A – Konflikty mezi zadáním a už odevzdaným stavem webu

V posledních 5 mergnutých PR (#34–#39) byl na žádost uživatele ("Líbí se mi to. Udělej tak zbytek webu.") postaven kompletní redesign homepage a vizuální restyle celého webu. Nové zadání ("AUDIT A IMPLEMENTAČNÍ ZADÁNÍ") na několika místech chce jinou informační architekturu, než jaká byla právě schválena a nasazena. Tyto rozpory je nutné vyřešit rozhodnutím uživatele, ne tichým přepsáním – audit je jen popisuje.

### K1 – Hlavní navigace: 5 položek dle zadání vs. 8+ položek aktuálního stavu

- **Zadání chce:** Služby, Realizace, Konfigurátory, O nás, Kontakt + jasné primární CTA "Poptat výrobu".
- **Aktuální stav:** `sluzby.html` navigační vzorec = Domů, Služby, dropdown Produkty (Klíčenky/Samolepky/Gravírování/Tvorba webu), Portfolio, Kontakt, Blog, E-book, E-shop, Přihlášení (`tools/check_site.py:41-45`, `check_nav_consistency()`). Homepage má JINOU navigaci (anchor-based: Služby/Konfigurátory/E-book/Reference/Kontakt).
- **Rozpor:** Zadání chce redukci a přejmenování ("Realizace" místo "Portfolio"), democi Blog/E-book/E-shop z hlavní nav, a úplně odstranění "Přihlášení" z veřejné nav (viz K4). Aktuální stav je pravý opak – bohatší, ne redukovaná nav, a "Přihlášení" je všude.
- **Potřebné rozhodnutí:** Přejmenovat "Portfolio" → "Realizace" globálně (mění se `tools/check_site.py`, každá stránka)? Přesunout Blog/E-book/E-shop kam (patička? sekundární nav?)? Toto přímo měří proti právě odsouhlasenému homepage redesignu, který zavedl "Konfigurátory" jako vlastní homepage sekci – ta zůstává v souladu se zadáním (Konfigurátory jsou v novém 5položkovém menu taky).

### K2 – Homepage struktura: e-book teaser a konfigurátory jako plnohodnotné sekce vs. "neprezentovat nedokončené jako hotové"

- **Aktuální stav:** Homepage (fáze 3–4 předchozího redesignu) má samostatnou sekci `#ebook-teaser` a `#konfiguratory` jako hlavní obsahové bloky homepage.
- **Rozpor:** E-book má `[CENA] Kč` placeholder (T2/C4) – to je přímo to, co zadání zakazuje ("nikdy nesmí být na produkčním webu placeholder"). Sekce samotná (e-book jako produkt) ale zůstává legitimní, jen s vyřešenou cenou.
- **Potřebné rozhodnutí:** Jakmile se P0 (cena e-booku) vyřeší, K2 zmizí sama – toto je závislost, ne skutečný designový konflikt.

### K3 – Nové service-page URL vs. existující užší konfigurátory

- **Zadání chce:** Samostatné prodejní/informační stránky `/cnc-frezovani`, `/3d-tisk`, `/laser`, `/samolepky`, `/polepy`, `/dtf`, `/tvorba-webu` (ta poslední už existuje), každá se strukturou hero → Co vyrábíme → Materiály → Technické parametry → proces objednávky → Realizace → FAQ → CTA.
- **Aktuální stav:** `klicenka.html`, `samolepky.html`, `gravirovani.html` jsou úzké **produktové konfigurátory** (navrhni si konkrétní klíčenku/samolepku/rytinu a hned objednej), ne obecné informační/prodejní stránky o technologii. `samolepky.html` už "obsadila" URL, kterou by nová informační stránka `/samolepky` chtěla použít.
- **Rozpor:** Toto je reálný, nezanedbatelný konflikt URL-namespace. Nová stránka "Samolepky" (informační/prodejní, dle zadání) a existující `samolepky.html` (funkční konfigurátor) nemohou mít stejné URL, pokud mají mít různý obsah/účel.
- **Potřebné rozhodnutí (na uživateli):** Buď (a) nová informační service page nahradí obsah `samolepky.html` a samotný konfigurátor se přesune na jiné URL (např. `/konfigurator-samolepky.html`, s odkazem z nové stránky), nebo (b) konfigurátor zůstane na `/samolepky.html` a nová informační stránka dostane jiné URL (např. `/vyroba-samolepek.html`). Totéž platí zrcadlově pro `/laser` vs. `gravirovani.html` a `/3d-tisk` vs. `klicenka.html` (klíčenka je jen jeden konkrétní 3D tištěný produkt, ne celá kategorie 3D tisku).
- **Doporučení auditu:** varianta (a) – informační stránka na hlavním URL slouží SEO/konverzi (nová IA), konfigurátor se linkuje jako CTA "Vyzkoušet konfigurátor" uvnitř ní. Nutno ale potvrdit s uživatelem, protože měnit URL již indexovaných stránek (`samolepky.html`, `gravirovani.html`) bez 301 přímo porušuje zadání ("pokud URL existují a jsou indexované, neměň je bez důvodu / při změně 301").

### K4 – Interní kalkulačka v navigaci

- **Zadání chce:** skrýt interní přihlášení/kalkulačku z veřejné navigace.
- **Aktuální stav:** "Přihlášení" → `kalkulacka.html` je v hlavní i mobilní nav na všech 14 root stránkách (`check_home_nav()` v `tools/check_site.py:74-78` to dokonce aktivně vyžaduje jako povinnou kontrolu!).
- **Rozpor:** Přímý, jasný – **řešení je jasné a bez nutnosti rozhodování uživatele**: odstranit z veřejné nav, upravit `check_site.py`, aby to nevyžadoval. Zařazeno do P0 (bezpečnostní rozměr) níže.

### K5 – GitHub Pages (statický hosting) vs. požadavek na 301 redirecty při změně URL

- **Zadání chce:** při jakékoli změně URL nastavit 301 redirect, nikdy ne redirect chain.
- **Aktuální stav:** Čistý GitHub Pages hosting neumí server-side 301 (žádný `_redirects` mechanismus jako Netlify, žádný `vercel.json` routing – Vercel se používá jen pro `api/order.mjs`, ne pro celý web).
- **Rozpor:** Technické omezení platformy. Jediné reálné cesty na GH Pages: (1) HTML meta-refresh/JS redirect stránka na starém URL (ne opravdové HTTP 301, horší pro SEO ale funkční), nebo (2) přesunout celý hosting pod Vercel/Cloudflare Pages, které 301 umí nativně.
- **Potřebné rozhodnutí (na uživateli):** Pokud se v P1 mění URL (viz K3), je nutné explicitně vybrat řešení pro redirecty – toto sahá nad rámec "jen upravit obsah" a je infrastrukturní rozhodnutí.

---

## ČÁST B – Implementační plán podle priorit

Postupuje se striktně P0 → P1 → P2/P3 → P4, po každé fázi běží `python3 tools/check_site.py` + manuální kontrola konzoly/broken links (lychee už běží týdně přes `qa-agent.yml`, lze spustit i manuálně).

### P0 – musí být hotové, blokuje vše ostatní

| # | Úkol | Poznámka |
|---|---|---|
| P0-1 | Odstranit `[CENA] Kč` z `ebook.html` (2×) a `index.html` (1×) | **Hotovo**: reálná cena dodána uživatelem (299 Kč, sleva 100 Kč → 199 Kč), doplněna na obou místech se zobrazenou původní i zlevněnou cenou. |
| P0-1b | **Nový nález při implementaci P0-1**: tlačítka "Koupit e-book" / "Stáhnout ukázku zdarma" na `ebook.html` mají `href="#"` (Lemon Squeezy overlay skript `assets.lemonsqueezy.com/lemon.js` je načtený, ale bez reálné product/checkout URL nemůže nic otevřít) | Nevyřešeno – vyžaduje od uživatele reálnou Lemon Squeezy product URL (nebo rozhodnutí nepoužívat Lemon Squeezy a prodávat e-book přes kontaktní formulář/e-mail místo automatického checkoutu) |
| P0-2 | Zprovoznit homepage kontaktní formulář | Buď reálný Formspree endpoint, nebo sjednotit s `kontakt.html` mechanismem (viz K-related U4) |
| P0-3 | Odstranit "Přihlášení"/`kalkulacka.html` z veřejné navigace na všech stránkách | Vyžaduje úpravu `tools/check_site.py` (`check_home_nav` už to nebude vyžadovat) |
| P0-4 | Zabezpečit/`noindex` `kalkulacka.html` | Minimálně `<meta name="robots" content="noindex,nofollow">`; ideálně i skutečné zabezpečení nad rámec client-side hash (mimo rozsah statického webu – doporučeno alespoň HTTP Basic Auth přes hosting, pokud dostupné) |
| P0-5 | Zapnout "Enforce HTTPS" a ověřit apex→www redirect na GitHub Pages | Nelze ověřit z repa, nutná manuální kontrola v Settings |

### P1 – nová struktura, copy, hlavní IA (po vyřešení konfliktů K1–K5 s uživatelem)

- Nová hlavní navigace (K1) + primární CTA "Poptat výrobu" konzistentně napříč webem.
- Nové service pages dle zvolené varianty řešení K3, se strukturou ze zadání; sekce "Technické parametry" jako `TODO`, dokud uživatel nedodá reálná čísla (C8).
- Nová stránka `/o-nas`.
- Sekce "Proč MPMDESIGN" – postavená na faktech, které dodá uživatel (C1/C5).
- Sekce "Jak to funguje" (5 kroků procesu objednávky).
- Sjednocení kontaktního formuláře na jeden systém (U4).
- Oprava duplicitních/nesedících title tagů (S3/S4/C2/C3) – toto lze udělat mechanicky bez čekání na rozhodnutí uživatele, je vhodné zařadit hned na začátek P1.
- Rozhodnutí + řešení pro `eshop.html` (U3/S5).
- Redirecty pro změněná URL (K5) – podle zvolené technické varianty.

### P2/P3 – SEO metadata, structured data, výkon, přístupnost

- `robots.txt` + `sitemap.xml`.
- `canonical` na všech stránkách.
- Meta description na zbývajících stránkách.
- `og:image`/`og:url` napříč webem.
- `BreadcrumbList`, `Service`, `Article` structured data na nových/existujících stránkách.
- Vlastní `404.html`.
- Přístupnost: skip-link, oprava `onclick`-karet na `sluzby.html` (U8), kontrola kontrastu/WCAG 2.2 AA na nových sekcích.
- Výkon: zvážit `<link rel="preload">`/`<link rel="stylesheet">` místo `@import` pro Google Font; ověřit Core Web Vitals po nasazení (nelze měřit reálná čísla bez nasazeného produkčního webu – **TODO měření po P1**).

### P4 – jen pokud to po předchozích fázích ještě dává smysl

- Rozšíření e-shopu/blogu/e-booku (dle zadání "NEPŘIDÁVEJ nové funkce jen proto, aby web působil větší" – tato fáze se dělá jen pokud existuje konkrétní obchodní důvod, ne automaticky).
- Rozhodnutí o `generate_post.js` – buď smazat, nebo přepojit na reálné LLM API s lidskou kontrolou před publikací (T9/U9).
- Konsolidace `assets/blog.json` vs `assets/blog/posts.json` na jeden zdroj pravdy (T8).

---

## ČÁST C – Otázky na uživatele (nutné odpovědi před P1)

1. **K1**: Souhlasí s redukcí hlavní navigace na Služby/Realizace/Konfigurátory/O nás/Kontakt, i když to znamená přejmenovat "Portfolio"→"Realizace" a odsunout Blog/E-book/E-shop mimo hlavní menu (kam – patička? sekundární nav?)?
2. **K3**: Pro nové service-page URL (`/samolepky`, `/laser`, `/3d-tisk`) – nová informační stránka převezme hlavní URL a stávající konfigurátor se přesune jinam, nebo naopak?
3. **K5**: Pokud se URL budou měnit, jak řešit 301 na GitHub Pages (meta-refresh stránka vs. přesun hostingu)?
4. **P0-1**: Jaká je reálná cena e-booku (nebo se má cenový blok dočasně skrýt)?
5. **P0-2**: Sjednotit homepage formulář na `formsubmit.co` (stejně jako `kontakt.html`, rychlé), nebo dodat reálný Formspree endpoint?
6. **P1 (C1/C5/C8)**: Jaká konkrétní fakta (roky praxe, technické parametry strojů, počet realizací) může uživatel dodat pro hero/"Proč MPMDESIGN"/technické sekce nových service pages?

Dokud nejsou body 1–3 rozhodnuté, nedoporučuje se začínat P1 (mění se IA a URL napříč webem) – P0 lze ale začít okamžitě, protože nezávisí na těchto rozhodnutích.
