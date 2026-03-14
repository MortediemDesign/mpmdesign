# Portfolio obrázky

Do této složky nahrávejte fotografie realizací.

## Jak přidat nový obrázek
1. Nahrajte obrázek do této složky (např. `moje-zakazka.jpg`).
2. Otevřete `manifest.json`.
3. Přidejte nový záznam:

```json
{
  "file": "moje-zakazka.jpg",
  "title": "Název realizace",
  "description": "Krátký popis zakázky",
  "alt": "Alternativní text obrázku"
}
```

Po commitnutí na GitHub se portfolio na webu aktualizuje.
