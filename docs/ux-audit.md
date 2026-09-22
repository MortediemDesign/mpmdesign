# UX audit – MPMDESIGN

Formát dle zadání: problém → dopad → doporučení → priorita. Založeno na skutečném kódu, ne na dojmu.

## 1. Homepage – hlavní kontaktní formulář nefunguje

**Problém:** `#contactForm` na `index.html` (sekce `#kontakt`) je navázán na `assets/js/home-contact.js`, který má needitovaný placeholder Formspree endpoint. Návštěvník vyplní formulář, klikne odeslat a dostane text "Formulář zatím není napojený – napište prosím na mpmdesign@outlook.cz."
**Dopad:** Nejdůležitější konverzní bod webu (poptávka z homepage) v produkci nikdy neodešle data. Uživatel musí ručně přepsat vše do e-mailu – masivní ztráta konverzí, přesný opak hlavního cíle zadání ("přivést návštěvníka k odeslání kvalitní poptávky").
**Doporučení:** Buď dosadit reálný Formspree endpoint, nebo (jednodušeji a konzistentněji) přesměrovat homepage formulář na stejný, již funkční mechanismus jako `kontakt.html` (`formsubmit.co`), a zvážit sjednocení na jeden formulářový systém pro celý web.
**Priorita:** P0.

## 2. Dvě odlišná kontaktní UX na dvou různých místech

**Problém:** `kontakt.html` má formulář s klasickým POST + `_next` redirectem (celá stránka se reloadne/redirectne s `?success=true`), homepage má JS `fetch()` s inline stavovou zprávou bez reloadu. Pole se také liší (homepage má navíc `phone`, jinou sadu hodnot v `service` selectu – např. `dtf` je jen na homepage, ne na `kontakt.html`).
**Dopad:** Nekonzistentní chování a nekonzistentní nabídka služeb v selectu matoucí pro uživatele, kteří si obě cesty porovnají; těžší údržba (2 místa k opravě při každé změně).
**Doporučení:** Sjednotit na jeden formulář/komponentu (stejná pole, stejný `service` seznam, stejné UX chování) a jeden backend.
**Priorita:** P1.

## 3. `eshop.html` je prázdná stránka v hlavní navigaci

**Problém:** Stránka má jen `<h1>Příprava na e-shop</h1>` a prázdnou `<section class="grid">`. Přesto je v hlavní navigaci úplně všech core stránek a je plně indexovatelná.
**Dopad:** Návštěvník, který klikne na "E-shop" z nabídky (viditelná, prominentní položka menu), narazí na prázdnou stránku bez vysvětlení, bez data spuštění, bez CTA zpět. Působí to jako rozbitý/nedokončený web, poškozuje důvěru.
**Doporučení:** Buď doplnit jasné sdělení "E-shop připravujeme, mezitím...", CTA na kontakt/konfigurátory, nebo dočasně odstranit z hlavní navigace, dokud nebude reálný obsah (v souladu s bodem zadání "neprezentovat nedokončené funkce jako hotové").
**Priorita:** P1.

## 4. Přetížená hlavní navigace, žádná jasná hierarchie CTA

**Problém:** Sdílená navigace (`check_nav_consistency()` vzorec) obsahuje 8 položek: Domů, Služby, dropdown Produkty (4 podpoložky), Portfolio, Kontakt, Blog, E-book, E-shop, + "Přihlášení". To je 12 klikatelných cílů v jednom menu, žádná z nich není vizuálně odlišena jako primární CTA ("Poptat výrobu").
**Dopad:** Vysoká kognitivní zátěž, žádné vodítko, kam má nerozhodnutý návštěvník kliknout jako první – rozptyluje se pozornost mezi blog/e-book/e-shop (podpůrný obsah) a hlavní konverzní cíl (poptávka).
**Doporučení:** Zadání navrhuje redukci na Služby / Realizace / Konfigurátory / O nás / Kontakt + jasně odlišené primární CTA tlačítko. To je zásadní změna IA oproti aktuálnímu stavu (viz `implementation-checklist.md`, konfliktní bod K1).
**Priorita:** P1.

## 5. Homepage nemá stejnou navigaci jako zbytek webu

**Problém:** `index.html` používá vlastní kotva-navigaci (`Služby/Konfigurátory/E-book/Reference/Kontakt`, anchor linky na sekce téže stránky), zatímco všechny ostatní stránky mají klasickou multi-page navigaci popsanou výše. Sekundární odkazy (Portfolio/Blog/E-shop/Přihlášení) na homepage existují jen v mobilním menu a v patičce, ne v hlavní desktopové navigaci.
**Dopad:** Nekonzistentní mentální model – uživatel, který přijde na homepage a pak proklikne na jinou stránku, uvidí úplně jinou navigační strukturu. Ztěžuje se orientace a návrat.
**Doporučení:** Sjednotit navigaci nebo alespoň zajistit, že klíčové položky (Realizace/Portfolio, Kontakt) jsou vždy na stejném místě/stejně pojmenované napříč celým webem.
**Priorita:** P1 (souvisí přímo s IA redesignem v zadání).

## 6. "Přihlášení" (interní kalkulačka) prominentně v navigaci na každé stránce

**Problém:** Viz technical-audit.md – kalkulačka je odkazovaná úplně všude, i když je to čistě interní nástroj s minimální ochranou.
**Dopad:** Zavádí návštěvníky (co to je? je to pro mě?), zabírá místo v menu, které by mohlo být primární CTA, a zvyšuje viditelnost interních cenových dat.
**Doporučení:** Přesunout mimo hlavní/mobilní navigaci (např. jen přímý odkaz uložený v záložkách/bez veřejné navigace) a zabezpečit lépe než jen client-side heslo.
**Priorita:** P0/P1 (bezpečnostní i UX rozměr).

## 7. Karty služeb na `sluzby.html` používají `onclick` na `<article>` bez klávesnicové obsluhy

**Problém:** `<article class="card" onclick="window.location.href='...'" style="cursor: pointer;">` – funguje jen myší/touch, ne přes klávesnici (žádný `tabindex`, žádný `role="link"`, žádný `keydown` handler), a screen reader ho nepřečte jako interaktivní prvek.
**Dopad:** Uživatelé závislí na klávesnici/screen readeru nemají signál, že karta je klikatelná, ani možnost ji aktivovat – bariéra přístupnosti (WCAG 2.2 AA požaduje operovatelnost klávesnicí).
**Doporučení:** Nahradit `<article onclick>` obalujícím `<a href>` nebo doplnit `tabindex="0"`, `role="link"`, `keydown` handler pro Enter/Space.
**Priorita:** P2.

## 8. E-book i homepage teaser ukazují neplatnou cenu

**Problém:** `[CENA] Kč` – viz technical-audit T2.
**Dopad:** Přímo blokuje konverzi/nákup e-booku; působí nedokončeně/neprofesionálně na obou místech, kde se zobrazuje (hero i CTA sekce e-booku, plus homepage teaser).
**Doporučení:** Doplnit reálnou cenu, nebo dočasně skrýt celý cenový blok a nahradit CTA "Napište si o cenu" / kontaktním odkazem, dokud cena není finální.
**Priorita:** P0.

## 9. Blog má obsahovou strukturu, která nekomunikuje autorství/kvalitu

**Problém:** Jeden ze 4 živých blog postů je strojově vygenerovaná šablona se stejným titulkem/obsahem, jaký generátor produkuje pokaždé (viz technical-audit sekce 8). Vizuálně nerozlišitelný od ručně psaných postů.
**Dopad:** Riziko, že návštěvník narazí na generický/neinformativní obsah vydávaný za redakční článek – poškozuje důvěryhodnost blogu jako celku.
**Doporučení:** Buď smazat/nepublikovat automaticky generovaný obsah bez lidské redakce, nebo `generate_post.js` napojit na skutečnou LLM generaci s lidskou kontrolou před publikací – v žádném případě nenechat automatický skript publikovat fixní šablonový text jako "novinku".
**Priorita:** P2 (obsahové riziko, ne technický blocker).

## 10. Souhrn priorit

| # | Nález | Priorita |
|---|---|---|
| U1 | Homepage formulář neodesílá poptávky | P0 |
| U2 | `[CENA] Kč` na e-booku i homepage | P0 |
| U3 | Kalkulačka veřejně v navigaci, slabá ochrana | P0/P1 |
| U4 | Dva nekonzistentní kontaktní formuláře | P1 |
| U5 | Prázdný, ale viditelný `eshop.html` | P1 |
| U6 | Přetížené menu bez jasné primární CTA | P1 |
| U7 | Nekonzistentní navigace homepage vs. zbytek webu | P1 |
| U8 | Nepřístupné `onclick`-karty na `sluzby.html` | P2 |
| U9 | Nerozlišený strojově generovaný blog obsah | P2 |
