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
]


def check_files_exist() -> None:
    for page in PAGES:
        text = Path(page).read_text(encoding='utf-8')
        for href in re.findall(r'href="([^"]+)"', text):
            if href.startswith(('http', '#', 'mailto:', 'tel:')):
                continue
            if not Path(href).exists():
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
    expected = ['index.html', 'sluzby.html', 'portfolio.html', 'blog.html', 'kontakt.html', 'eshop.html']
    for page in PAGES:
        text = Path(page).read_text(encoding='utf-8')
        m = re.search(r'<nav>.*?</nav>', text, re.S)
        if not m:
            raise SystemExit(f'{page}: missing <nav>')
        nav = m.group(0)
        hrefs = re.findall(r'href="([^"]+)"', nav)
        # ignore externals if any future addition
        hrefs = [h for h in hrefs if h.endswith('.html')]
        if hrefs != expected:
            raise SystemExit(f'{page}: nav mismatch {hrefs} != {expected}')
        active = re.findall(r'<a class="active" href="([^"]+)"', nav)
        if active != [page]:
            raise SystemExit(f'{page}: expected single active link to itself, got {active}')


if __name__ == '__main__':
    check_files_exist()
    check_json()
    check_nav_consistency()
    print('Site checks passed.')
