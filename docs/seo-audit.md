# SEO audit – MPMDESIGN

Podrobná tabulka je v `url-inventory.md`. Tento dokument shrnuje nálezy do kategorií a priorit podle SEO sekcí zadání.

## 1. Technické SEO (checklist ze zadání)

| Kontrola | Stav | Detail |
|---|---|---|
| `robots.txt` | ❌ chybí | Nenalezen v repu. |
| `sitemap.xml` | ❌ chybí | Nenalezen v repu, žádný generátor. |
| `canonical` tagy | ❌ chybí na 0/18 stránkách | – |
| HTTPS | pravděpodobně ano (GitHub Pages custom domain + `CNAME` = `www.mpmdesign.cz`) | **TODO – nelze ověřit z repa**: je potřeba zkontrolovat v GitHub Pages Settings, zda je zapnuté "Enforce HTTPS", a zda apex `mpmdesign.cz` 301-redirectuje na `www.mpmdesign.cz` (nebo naopak) – to se řeší v registrátorovi domény/DNS, ne v kódu. |
| Redirecty / redirect chain | není co ověřit – žádný `_redirects`/`vercel.json`/GH Pages redirect konfigurace v repu | Pokud se při P1 změní IA (nová navigace, nové URL), musí se u každé změněné/zrušené URL doplnit 301 – momentálně žádný mechanismus na statickém GH Pages hostingu pro to není připraven (GH Pages nativně neumí server-side redirecty; řešilo by se přes meta-refresh/JS redirect stránky nebo Cloudflare/Vercel v front of GH Pages). **Toto je rozhodnutí, které je nutné probrat s uživatelem před P1**, protože ovlivňuje volbu hostingu/proxy.
| 404 stránka | ❌ chybí vlastní `404.html` | GH Pages defaultně zobrazí generic GitHub 404, ne brandovanou stránku s navigací zpět. |
| Duplicitní/osiřelé stránky | ✅ nalezeno | 4 blog articles se stejným `<title>`; `eshop.html` je fakticky prázdná stránka, ale indexovatelná; 3 blog sluhy v `assets/blog/posts.json` nemají odpovídající `.html` (potenciální budoucí 404, pokud by se `blog.js` přepnul na čtení z `posts.json`). |

## 2. On-page SEO – co chybí systematicky

- **Meta description**: chybí na `sluzby.html`, `portfolio.html`, `blog.html`, `kontakt.html`, `eshop.html` a na všech 4 blog článcích (0/4). Přítomná je na `index.html`, `tvorba-webu.html`, `klicenka.html`, `samolepky.html`, `gravirovani.html`, `ebook.html`, obou právních stránkách (9/18).
- **Title tagy**: 5 stránek sdílí generický vzorec "CNC a 3D výroba | X" bez lokality/klíčových slov navíc; 4 blog stránky mají identický, k obsahu nesedící title.
- **H1**: každá stránka má přesně 1 `<h1>` (dobře, žádná stránka s 0 nebo 2+ H1), kromě `kalkulacka.html` (interní nástroj, 0 H1 – v pořádku, není to indexovaný obsah).
- **Nadpisová hierarchie H2/H3**: nebyla auditována do hloubky na každé stránce jednotlivě – **TODO při P2**: ověřit u nových service-page šablon, že H2/H3 jdou v logickém pořadí (audit-brief to explicitně požaduje jako P2 položku).

## 3. Strukturovaná data (schema.org)

Aktuálně existuje **jen jeden blok** v celém webu: `index.html` obsahuje `LocalBusiness` + vnořenou `PostalAddress` (potvrzeno gřepem `"@type"` napříč všemi HTML soubory). Chybí:
- `WebSite` (s `SearchAction`, pokud bude interní search),
- `Service` pro každou budoucí service-page,
- `BreadcrumbList` pro service pages a blog,
- `Article`/`BlogPosting` pro blog posty,
- `Product` pro e-book (ale **pouze pokud bude reálná cena** – zadání explicitně zakazuje falešné/placeholder ceny ve structured data).

Žádné falešné `AggregateRating`/`Review` schema nebyly nalezeny (dobrá zpráva – nic není potřeba mazat), ale to je i proto, že žádné recenze na webu momentálně nejsou.

## 4. Open Graph / social

- `og:*` tagy existují jen na `index.html` a `ebook.html`. Chybí na zbylých 16 stránkách (žádný `og:image`, `og:url` ani na těch dvou, kde `og:type`/`og:title`/`og:description` jsou).
- Bez `og:image` se při sdílení na Facebooku/LinkedIn/WhatsAppu zobrazí buď nic, nebo náhodný obrázek – to přímo ovlivňuje kliky ze sociálních sítí (relevantní k "cíl: kvalitní poptávka").

## 5. Lokální SEO

- Firma je fyzická OSVČ v Ostrově u Karlových Varů (adresa `Lidická 1018, 363 01 Ostrov`, IČO 24859931 – konzistentně uvedeno v patičce všech stránek a v `LocalBusiness` schema na homepage).
- `LocalBusiness` schema má `areaServed` a `address` (obsah polí nebyl detailně vypsán v tomto průchodu – **TODO**: ověřit přesný obsah JSON-LD blocku a doplnit/zkontrolovat `openingHours`, `telephone`, `geo` souřadnice, pokud chybí).
- Cílové lokální dotazy (např. "CNC frézování Karlovy Vary", "3D tisk na zakázku Ostrov") **nejsou v repu nikde cíleně použity** v title/H1/description – žádná stránka v současné podobě explicitně cílí na lokální search intent kromě obecné zmínky adresy v patičce a kontaktu.
- Zadání explicitně zakazuje "doorway stránky pouze pro SEO" – žádné takové stránky v repu nejsou (dobrá zpráva, nic není potřeba mazat/konsolidovat z tohoto důvodu).

## 6. Obrázky a alt texty

- Portfolio obrázky (24 ks) mají `alt` vyplněný, ale strojově odvozený z názvu souboru přes `generateTitleFromFilename()` (nahrazení pomlček mezerami + capitalize) – funkční, ale generický, ne popisný ("Bridlicova deska gravirovani narsil pan prstenu" je spíš popisek souboru než přirozený alt text).
- 2 `<img>` tagy bez `alt` (oba jsou dynamický `#lightbox-img`, technicky nekritické, ale HTML validita).

## 7. Priorita oprav (SEO rovina)

| # | Nález | Priorita |
|---|---|---|
| S1 | Chybí `robots.txt` + `sitemap.xml` | P1 |
| S2 | Chybí `canonical` na všech 18 stránkách | P1 |
| S3 | Duplicitní title na 4 blog stránkách | P1 |
| S4 | Chybí meta description na 6 stránkách (5 core + celý blog) | P1 |
| S5 | `eshop.html` – prázdná, ale indexovatelná stránka | P1 (buď obsah, nebo `noindex` + jasné sdělení "připravujeme") |
| S6 | `kalkulacka.html` – veřejně indexovatelná interní stránka | P0 (bezpečnost i SEO) |
| S7 | Chybí `og:image`/`og:url` napříč webem | P2 |
| S8 | Chybí `BreadcrumbList`/`Service`/`Article` structured data | P2 |
| S9 | Chybí vlastní `404.html` | P2 |
| S10 | Chybí cílení na lokální search dotazy v textech | P2/P3 (souvisí s novým copy z P1) |
