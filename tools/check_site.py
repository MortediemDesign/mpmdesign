#!/usr/bin/env python3
import json
import re
from pathlib import Path

PAGES = [
    'index.html',
    'sluzby.html',
    'portfolio.html',
    'blog.html',
    'kontakt.html',
    'eshop.html',
    'o-nas.html',
]

# Stránky, které se v hlavní navigaci samy odkazují (mají tam vlastní
# položku a tedy i "active" stav). Blog a e-shop byly zadáním odsunuty
# mimo hlavní menu (jsou jen v patičce/mobile-nav-secondary), takže na
# nich žádná položka navigace není aktivní.
NAV_SELF_LINKED = {'sluzby.html', 'portfolio.html', 'kontakt.html', 'o-nas.html'}


def check_files_exist() -> None:
    for page in PAGES:
        text = Path(page).read_text(encoding='utf-8')
        for href in re.findall(r'href="([^"]+)"', text):
            if href.startswith(('http', '#', 'mailto:', 'tel:')):
                continue
            base_href = href.split('?')[0].split('#')[0]
            if not Path(base_href).exists():
                raise SystemExit(f'{page}: missing href target {href}')
        for src in re.findall(r'src="([^"]+)"', text):
            if src.startswith('http'):
                continue
            if not Path(src).exists():
                raise SystemExit(f'{page}: missing src target {src}')


def check_json() -> None:
    for file in ['assets/blog/posts.json', 'assets/images/portfolio/manifest.json']:
        json.loads(Path(file).read_text(encoding='utf-8'))


def check_nav_consistency() -> None:
    # index.html má od redesignu vlastní kotva-navigaci (Služby/Konfigurátory/
    # E-book/Reference/Kontakt), viz check_home_nav(). Ostatní stránky sdílí
    # jednotnou (zredukovanou) navigaci: Domů/Služby/Realizace/Konfigurátory
    # (Klíčenky/Samolepky/Laser)/O nás/Kontakt + CTA "Poptat výrobu". Blog,
    # E-book, E-shop a Tvorba webu jsou odsunuté mimo hlavní menu (jen
    # patička/mobile-nav-secondary) - viz implementation-checklist.md K1.
    expected = [
        'index.html', 'sluzby.html', 'portfolio.html', 'klicenka.html',
        'samolepky.html', 'gravirovani.html', 'o-nas.html', 'kontakt.html',
    ]
    for page in PAGES:
        if page == 'index.html':
            continue
        text = Path(page).read_text(encoding='utf-8')
        m = re.search(r'<nav>.*?</nav>', text, re.S)
        if not m:
            raise SystemExit(f'{page}: missing <nav>')
        nav = m.group(0)
        hrefs = re.findall(r'href="([^"]+)"', nav)
        # ignore externals a CTA s kotvou (#formular) - ta se do porovnání
        # nepočítá, protože nesměruje na samostatnou položku menu
        hrefs = [h for h in hrefs if h.endswith('.html')]
        if hrefs != expected:
            raise SystemExit(f'{page}: nav mismatch {hrefs} != {expected}')
        active = re.findall(r'<a class="active" href="([^"]+)"', nav)
        expected_active = [page] if page in NAV_SELF_LINKED else []
        if active != expected_active:
            raise SystemExit(f'{page}: expected active {expected_active}, got {active}')


def check_blog_articles() -> None:
    # Statické články v blog/ mají stejnou navigaci jako zbytek webu, jen
    # s prefixem ../ – a všechny jejich relativní odkazy musí existovat.
    expected = [
        'index.html', 'sluzby.html', 'portfolio.html', 'klicenka.html',
        'samolepky.html', 'gravirovani.html', 'o-nas.html', 'kontakt.html',
    ]
    for article in sorted(Path('blog').glob('*.html')):
        text = article.read_text(encoding='utf-8')
        if 'name="viewport"' not in text:
            raise SystemExit(f'{article}: missing viewport meta')
        m = re.search(r'<nav>.*?</nav>', text, re.S)
        if not m:
            raise SystemExit(f'{article}: missing <nav>')
        hrefs = [h.removeprefix('../') for h in re.findall(r'href="([^"]+)"', m.group(0))]
        hrefs = [h for h in hrefs if h.endswith('.html')]
        if hrefs != expected:
            raise SystemExit(f'{article}: nav mismatch {hrefs} != {expected}')
        for ref in re.findall(r'(?:href|src)="([^"]+)"', text):
            if ref.startswith(('http', '#', 'mailto:', 'tel:')):
                continue
            target = (article.parent / ref.split('?')[0].split('#')[0]).resolve()
            if not target.exists():
                raise SystemExit(f'{article}: missing target {ref}')


def check_home_nav() -> None:
    text = Path('index.html').read_text(encoding='utf-8')
    m = re.search(r'<nav class="home-nav".*?</nav>', text, re.S)
    if not m:
        raise SystemExit('index.html: missing home-nav')
    hrefs = re.findall(r'href="([^"]+)"', m.group(0))
    expected = ['#sluzby', '#konfiguratory', 'ebook.html', '#reference', '#kontakt']
    if hrefs != expected:
        raise SystemExit(f'index.html: home-nav mismatch {hrefs} != {expected}')

    # Odkazy na zbytek webu nesmí z hlavní stránky úplně zmizet – čekáme je
    # v mobilním menu (mobile-nav-secondary) i v patičce.
    for required in ('sluzby.html', 'portfolio.html', 'blog.html', 'eshop.html', 'o-nas.html', 'kalkulacka.html'):
        if f'href="{required}"' not in text:
            raise SystemExit(f'index.html: chybí odkaz na {required} (mobile-nav / patička)')


if __name__ == '__main__':
    check_files_exist()
    check_json()
    check_nav_consistency()
    check_blog_articles()
    check_home_nav()
    print('Site checks passed.')
