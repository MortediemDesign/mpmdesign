# Finální audit živého webu – www.mpmdesign.cz

Datum: 2026-09-22. Provedeno proti produkčnímu webu (`https://www.mpmdesign.cz/`) po mergnutí PR #40–#44, ne proti lokálnímu repu – ověřuje, že se všechny schválené změny skutečně dostaly do produkce a nic se cestou nerozbilo.

## Souhrn: web je v pořádku, deploy je aktuální

Všechny nedávné P0/P1 opravy jsou živé a fungují přesně tak, jak byly domluvené. Nenašel jsem žádnou regresi. Zbývají jen dříve identifikované, dosud neřešené položky (Lemon Squeezy, robots.txt/sitemap, sjednocení blog článků) – žádná z nich není nová.

## Co jsem ověřil a je v pořádku

| Kontrola | Výsledek |
|---|---|
| HTTPS enforced (http→https redirect) | ✅ funguje na `mpmdesign.cz` i `www.mpmdesign.cz` |
| Apex → www redirect | ✅ `mpmdesign.cz` → `https://www.mpmdesign.cz/` (301) |
| Nová redukovaná navigace na všech 12 hlavních stránkách | ✅ Domů/Služby/Realizace/Konfigurátory/O nás/Kontakt + CTA "Poptat výrobu" – ověřeno přímo z živého HTML na `sluzby.html`, `portfolio.html`, `o-nas.html`, `kontakt.html`, `blog.html`, `eshop.html`, `tvorba-webu.html`, `klicenka.html`, `samolepky.html`, `gravirovani.html`, `ebook.html`, `kalkulacka.html` |
| `kalkulacka.html` – noindex + mimo hlavní nav | ✅ `<meta name="robots" content="noindex, nofollow">` živě přítomný, "Přihlášení" nikde v hlavní/mobilní navigaci (0 výskytů na `index.html`) |
| `[CENA] Kč` placeholder | ✅ 0 výskytů na `ebook.html` i `index.html` – nahrazeno reálnou cenou 299 Kč / 199 Kč |
| Homepage kontaktní formulář | ✅ `action="https://formsubmit.co/mpmdesign@outlook.cz"` živě funkční, stejně jako `kontakt.html` |
| Nová stránka `o-nas.html` | ✅ 200 OK, obsahuje 7 let praxe, IČO, adresu, fakticky správný obsah |
| Vizuální kontrola (screenshoty) | ✅ homepage, `sluzby.html`, `o-nas.html` – nová navigace i CTA tlačítko se renderují správně, žádné rozbité rozvržení |
| `python3 tools/check_site.py` na aktuálním `main` | ✅ "Site checks passed." |
| Nefunkční `assets/js/home-contact.js` | ✅ správně už neexistuje (404), nic na něj neodkazuje |
| Reálné konfigurátory (klicenka/samolepky/gravirovani) | ✅ žádná JS chyba při lokálním testu bez síťové nespolehlivosti sandboxu (viz níže) |

## Poznámka k metodice – jeden falešný poplach

Playwright v tomto sandboxu má nespolehlivé síťové připojení k živé doméně (`net::ERR_TOO_MANY_RETRIES` na několika stránkách, včetně jedné hlášené JS chyby `Cannot read properties of undefined (reading 'SHIPPING')` na `klicenka.html`). Ověřil jsem prostřednictvím `curl` i lokálního přehrání stránky, že `assets/js/pricing-public.js` je na produkci dostupný (HTTP 200) a `klicenka.html` se lokálně načte bez jediné JS chyby – jde tedy o artefakt nespolehlivé sandboxové sítě, ne o reálnou chybu webu.

## Nález: 4 blog články ještě nemají novou navigaci

Jediná skutečná nekonzistence, kterou audit najde: **4 statické blog články** (`blog/cnc-obrabeni-v-praxi.html`, `blog/budoucnost-3d-tisku.html`, `blog/laserove-gravirovani-vyuziti.html`, `blog/novinky-z-vyroby-1773567743975.html`) byly generovány jiným mechanismem (samostatná šablona v `scripts/generate_post.js` + ruční kopie) a **nebyly součástí rozsahu PR #44** (ten měnil jen sdílenou navigaci hlavních stránek). Živě tedy mají stále starou navigaci (Produkty/Portfolio, žádné Realizace/Konfigurátory/O nás, žádné CTA "Poptat výrobu"). Funkčně nic nerozbité – jen vizuálně nekonzistentní se zbytkem webu. Doporučuji stejnou úpravu, jakou jsem udělal na ostatních 14 stránkách, i zde – drobný, nízko-rizikový dodatečný úkol.

## Zbývající, dříve identifikované otevřené položky (beze změny, nejsou nové)

- Lemon Squeezy checkout URL pro e-book stále `href="#"` (P0-1b) – čeká na reálnou URL nebo rozhodnutí prodávat jinak.
- `robots.txt` a `sitemap.xml` stále chybí (404 živě potvrzeno).
- Vlastní branded `404.html` chybí (živě potvrzeno – generický 404).
- Referenční fotky (`assets/reference/*.jpg`) stále chybí (404 živě potvrzeno) – zobrazí se čitelný placeholder, jak bylo navrženo, není to rozbité, jen nedoplněné.
- Pole formulářů `kontakt.html` vs. `index.html` se stále drobně liší (`dtf` chybí v `kontakt.html` selectu).
- K3 (URL `samolepky.html`) a K5 (redirecty) zůstávají otevřené pro budoucí fázi, jak bylo domluveno.
