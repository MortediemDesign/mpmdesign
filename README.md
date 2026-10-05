# Web pro CNC výrobu, 3D tisk, gravírování a samolepky

Statický web připravený pro **GitHub Pages**.

## Publikace na GitHub Pages
1. Nahrajte projekt do repozitáře na GitHub.
2. Otevřete **Settings → Pages**.
3. V části **Build and deployment** zvolte:
   - Source: **Deploy from a branch**
   - Branch: **main** (nebo aktuální větev) / root
4. Uložte a počkejte na publikaci.

## Úprava loga
- Logo je načtené ze souboru `logo2.svg` v kořeni projektu.

## Portfolio obrázky
- Obrázky nahrávejte do `assets/images/portfolio/`.
- Seznam obrázků pro web spravujte v `assets/images/portfolio/manifest.json`.

## Struktura stránek
- `index.html` – hlavní stránka
- `sluzby.html` – služby
- `tvorba-webu.html` – tvorba webu na míru
- `portfolio.html` – portfolio
- `kontakt.html` – kontakt
- `eshop.html` – příprava na budoucí e-shop
- `ebook.html` – prodejní stránka e-booku o Vectricu

## Hlavní stránka (index.html)

Hlavní stránka má vlastní tmavé schéma (`assets/css/home.css`) a
animace (`assets/js/home*.js`), postavené kolem myšlenky "ze
surového materiálu hotový výrobek". Sekce po sobě: Hero (CNC
frézuje logo), Služby (horizontální scroll), upoutávka na e-book,
Konfigurátory, Reference a Kontakt. Animace běží přes GSAP +
ScrollTrigger + MotionPathPlugin (cdnjs) a plynulý scroll přes Lenis
(jsDelivr); vše respektuje `prefers-reduced-motion` a je zjednodušené
na mobilu.

**Co je potřeba doplnit ručně:**
- **Reference** – berou se automaticky z portfolia
  (`assets/images/portfolio/manifest.json`): výběr 9 fotek, střídavě
  z jednotlivých kategorií. Počet se mění v `REFERENCE_COUNT`
  v `assets/js/home-reference.js`.
- **E-book – ukázka zdarma** – nahrajte PDF jako
  `assets/ebook/ukazka-zdarma.pdf`; blok „Ukázková kapitola zdarma“ se na
  `ebook.html` pak zobrazí sám.
- **E-book – platba** – dokud je `CHECKOUT_URL` v `assets/js/ebook.js`
  prázdná, tlačítka „Objednat e-book“ vedou na poptávkový formulář. Po
  vložení odkazu na pokladnu (např. Lemon Squeezy) se z nich stane
  „Koupit e-book“. Pak upravte i odpovědi v sekci Časté dotazy.
- **Hero animace ze snímků z Blenderu** (volitelné) – viz
  `assets/hero-frames/README.md`. Dokud tam snímky nejsou, běží
  výchozí SVG verze (fréza kreslí skutečné logo).
