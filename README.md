# Web pro CNC výrobu, 3D tisk, gravírování a samolepky

Statický web připravený pro **GitHub Pages**.

## Automatické nasazení (doporučeno)
Repo obsahuje workflow `.github/workflows/deploy-pages.yml`, který po pushi automaticky nasadí web na GitHub Pages.

### Jednorázové nastavení na GitHubu
1. Otevřete repozitář na GitHubu.
2. Jděte do **Settings → Pages**.
3. V části **Build and deployment** nastavte **Source: GitHub Actions**.
4. Pushněte změny do větve `main` (nebo větve, kterou workflow sleduje).

## Publikace přes branch (alternativa)
Pokud nechcete GitHub Actions:
1. Otevřete **Settings → Pages**.
2. V **Build and deployment** zvolte:
   - Source: **Deploy from a branch**
   - Branch: `main` (nebo aktuální větev) / root

## Když se změny nepropisují (nejčastější důvody)
- Nebyl proveden `git push` na GitHub (změna je jen lokálně).
- V Pages je špatně nastavený Source (branch vs GitHub Actions).
- Probíhá deploy a je potřeba 1–3 minuty počkat.
- Prohlížeč drží cache (zkuste tvrdý refresh `Ctrl+F5` / `Cmd+Shift+R`).
- Chyba ve workflow běhu (zkontrolujte záložku **Actions**).

## Úprava loga
- Logo je načtené ze souboru `logo2.svg` v kořeni projektu.

## Portfolio obrázky
- Obrázky nahrávejte do `assets/images/portfolio/`.
- Seznam obrázků pro web spravujte v `assets/images/portfolio/manifest.json`.

## Struktura stránek
- `index.html` – hlavní stránka
- `sluzby.html` – služby
- `portfolio.html` – portfolio
- `kontakt.html` – kontakt
- `eshop.html` – příprava na budoucí e-shop
