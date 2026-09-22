# Fotky pro sekci Reference na hlavní stránce

Tahle složka je zatím prázdná – dokud v ní fotky nejsou, karty v
sekci Reference (`index.html#reference`) se zobrazí jako čitelné
placeholdery (rámeček s ikonou), nic tedy nepůsobí rozbitě.

Jak doplnit skutečné fotky:

1. Nahrajte fotky do této složky (`assets/reference/`). Doporučený
   formát JPG/WebP, šířka cca 800–1200 px (kvůli rychlému načítání).
2. V `assets/js/home-reference.js` upravte pole `REFERENCE_ITEMS` –
   u každé položky nastavte `file` (cesta k nahrané fotce), `title`
   (krátký název) a `desc` (popisek, zobrazí se při najetí myší).

Pro plné portfolio se všemi realizacemi a filtrováním podle kategorie
slouží samostatná stránka `portfolio.html` (nedotčená tímto
redesignem) – tahle sekce na hlavní stránce je jen výběrová ukázka.
