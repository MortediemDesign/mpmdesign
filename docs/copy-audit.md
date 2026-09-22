# Copy audit – MPMDESIGN

Zadání striktně zakazuje vymýšlet nová fakta (ceny, technické parametry, reference, zákazníky). Tento dokument tedy u "navrhované" varianty textu **nevyplňuje** žádné konkrétní číslo/parametr, který nebyl ověřen v repozitáři – místo toho je označen `TODO`. Cílem je ukázat, KDE a PROČ se text musí změnit, ne dodat finální copy bez podkladů.

## 1. Homepage hero

**Aktuální stav** (`index.html`): title "MPMDESIGN – ze surového materiálu hotový výrobek", H1 "Ze surového materiálu hotový výrobek", meta description zmiňuje CNC frézování, 3D tisk, laserové gravírování, polepy a reklamní grafiku, DTF potisk textilu, samolepky, tvorbu webů.
**Nález:** Copy je metaforické ("ze surového materiálu vzniká hotový výrobek") a funguje jako koncept homepage animace, ale neobsahuje žádné konkrétní číslo/fakt (roky praxe, počet zakázek, lokalita v H1) – zadání chce fakticky konkrétní copy, ne obecnou metaforu jako první věc, kterou návštěvník vidí.
**Doporučení:** Doplnit pod H1 nebo do subheadline konkrétní, ověřitelný fakt (např. lokalita "Ostrov u Karlových Varů", rozsah služeb) – **TODO**: přesné znění a to, zda se doplní roky praxe/počet realizací, musí dodat uživatel/majitel firmy, nelze si to vymyslet.
**Priorita:** P1.

## 2. Duplicitní generické title tagy

**Aktuální stav:** `sluzby.html`, `portfolio.html`, `blog.html`, `kontakt.html`, `eshop.html` mají shodný vzorec "CNC a 3D výroba | X".
**Nález:** Nevyužívá se prostor pro klíčová slova ani odlišení jednotlivých stránek; "CNC a 3D výroba" se opakuje 5×, což je jak SEO problém (viz seo-audit.md), tak copy problém (nepůsobí to jako promyšlený obsah, ale jako needitovaná šablona).
**Doporučení:** Každá stránka potřebuje unikátní, popisný title odrážející její konkrétní obsah (např. `kontakt.html` by mohl mít v title zmíněný way kontaktu nebo lokalitu). Konkrétní finální znění – **TODO při P1/implementaci**, mimo rozsah čistého auditu.
**Priorita:** P1.

## 3. Blog – title neodpovídá obsahu na 3 ze 4 stránek

**Aktuální stav:** `blog/laserove-gravirovani-vyuziti.html`, `blog/cnc-obrabeni-v-praxi.html`, `blog/budoucnost-3d-tisku.html` mají `<title>` zkopírovaný z `blog/novinky-z-vyroby-*.html` ("Proč je 3D tisk a CNC výroba budoucností lokální produkce?"), ačkoliv jejich H1 a obsah je o něčem jiném.
**Dopad:** V Google search results a při sdílení na sociálních sítích se u 3 různých článků zobrazí stejný, nepravdivý název – klasický "copy-paste bug", ne úmyslné rozhodnutí.
**Doporučení:** U každého článku nastavit `<title>` shodný s jeho skutečným H1 (mechanická oprava, žádná nová fakta nejsou potřeba – H1 už existuje a je správný).
**Priorita:** P1 (jednoduchá, rychlá oprava s reálným SEO/UX dopadem).

## 4. `[CENA] Kč` placeholder

**Aktuální stav:** `ebook.html:65`, `ebook.html:220`, `index.html:230`.
**Nález:** Přímý rozpor s explicitním pravidlem zadání "Nikdy nesmí být na produkčním webu placeholder". Nelze vymyslet náhradní cenu.
**Doporučení:** Vyžádat od uživatele reálnou cenu e-booku. Pokud cena ještě není finální, nahradit blok jasným CTA ("Napište si o cenu" / "Poptat" → kontakt), ne fixní čárou "[CENA] Kč".
**Priorita:** P0 – **vyžaduje vstup od uživatele/majitele**, nelze vyřešit čistě copywriting úpravou bez reálného čísla.

## 5. Chybějící "Proč MPMDESIGN" / benefity sekce

**Aktuální stav:** Na homepage ani jiné stránce není samostatná sekce shrnující konkrétní, faktické benefity (např. lokalita, rychlost, rozsah technologií na jednom místě). Existující copy je rozptýlené v hero/services sekcích.
**Nález:** Zadání požaduje sekci "Proč MPMDESIGN" postavenou čistě na faktech (bez superlativ typu "nejlepší", "nejkvalitnější").
**Doporučení:** Sestavit sekci z **již ověřených faktů** (které technologie firma reálně nabízí, adresa, kontaktní responzivita) – **TODO**: konkrétní čísla (doba realizace, roky na trhu, počet obsloužených zákazníků) musí dodat uživatel, audit je nemůže odhadnout ani vymyslet.
**Priorita:** P1.

## 6. Žádné falešné recenze/testimonialy – ověřeno, že aktuální stav je v pořádku

**Nález:** Grepem přes celý repozitář nebyly nalezeny žádné blokové citace/recenze/hodnocení zákazníků na žádné stránce ani v žádném JSON souboru. `assets/js/home-reference.js` používá jen fotky reálných projektů (aktuálně placeholder soubory, které chybí – zobrazí se čitelná "chybí fotka" karta, ne fake recenze).
**Doporučení:** Nic měnit copy-wise; jen doplnit reálné fotky referencí (technický úkol, ne copywriting) a případně krátké faktické popisky k nim (materiál, technologie, ne subjektivní hodnocení "zákazník byl nadšený", pokud to nejsou jejich vlastní citované slova).
**Priorita:** P2 (žádné porušení pravidla nenalezeno, jen chybějící obsah k doplnění).

## 7. CTA texty – nekonzistentní formulace

**Aktuální stav:** Různé CTA texty na různých místech: "Odeslat poptávku" (index.html tlačítko), "Odeslat e-mail s poptávkou" (kontakt.html tlačítko), karty na `sluzby.html` vedou přes `onclick` bez viditelného CTA textu (celá karta je klikatelná, ale nic neříká "Poptat").
**Nález:** Zadání požaduje standardizaci CTA copy (konkrétně zmiňuje jednotné "Poptat výrobu" jako primární CTA napříč webem).
**Doporučení:** Sjednotit na jednu formulaci primárního CTA tlačítka na všech místech, kde vede na poptávkový formulář.
**Priorita:** P1.

## 8. Technické parametry výroby – aktuálně nikde na webu explicitně popsané

**Nález:** Žádná stránka (`sluzby.html`, konfigurátory) neobsahuje sekci "Technické parametry" (např. max. rozměr obrobku, tolerance CNC, objem tiskové komory 3D tiskárny, výkon laseru). Nová service-page struktura ze zadání tuto sekci vyžaduje s explicitní instrukcí "pokud údaj není znám, označit TODO, nevkládat falešnou hodnotu".
**Doporučení:** Před psaním nových service-page šablon (P1) je nutné buď získat tato čísla od uživatele/majitele stroje, nebo nechat sekci jako `TODO` placeholder ve struktuře stránky (ne ve viditelném textu se závorkou `[...]`, ale jako interní komentář/needitovaná sekce, dokud nejsou data k dispozici) – to je jasný vstupní požadavek pro P1, ne něco, co audit může sám vyplnit.
**Priorita:** P1 (blokuje kvalitu nových service pages, pokud data nedodá uživatel).

## 9. Souhrn

| # | Nález | Priorita | Vyžaduje vstup od uživatele? |
|---|---|---|---|
| C1 | Homepage hero bez konkrétních faktů | P1 | Ano (čísla/roky praxe) |
| C2 | 5× duplicitní generický title | P1 | Ne (mechanická oprava) |
| C3 | 3 blog title neodpovídají obsahu | P1 | Ne (H1 už existuje správně) |
| C4 | `[CENA] Kč` placeholder (2 stránky) | P0 | Ano (reálná cena) |
| C5 | Chybí "Proč MPMDESIGN" sekce | P1 | Ano (konkrétní fakta) |
| C6 | Fake recenze | – | Není nalezeno porušení |
| C7 | Nekonzistentní CTA texty | P1 | Ne (standardizace existujícího) |
| C8 | Chybí technické parametry výroby | P1 | Ano (technická data od uživatele) |
