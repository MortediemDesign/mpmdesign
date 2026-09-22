# Sekvence snímků pro hero animaci (volitelné)

Tahle složka je zatím prázdná – hero na hlavní stránce běží ve výchozí
SVG variantě (fréza kreslí skutečné logo, viz `assets/js/home-hero.js`).

Až budete mít z Blenderu vyrenderovanou sekvenci snímků:

1. Exportujte snímky jako **WebP**, pojmenované `frame-0001.webp`,
   `frame-0002.webp`, … (4místné číslo, viz `HERO_FRAMES.pad`).
2. Nahrajte je do této složky (`assets/hero-frames/`).
3. V `assets/js/home-hero.js` upravte `HERO_FRAMES.count` na skutečný
   počet snímků.
4. Přepněte `HERO_MODE` z `'svg'` na `'frames'` (konstanta úplně
   nahoře v souboru).

Pokud snímky chybí nebo se nenačtou, skript se automaticky vrátí na
SVG verzi – hero se tedy nikdy nezobrazí rozbitý.

Doporučení pro rychlé načítání: krátká sekvence (60–120 snímků),
šířka cca 1200–1600 px, komprimovaný WebP (kvalita cca 70–80).
