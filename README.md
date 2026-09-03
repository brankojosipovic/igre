# Igre za kolonu

Dvadeset jedna igra za telefon, za čekanje u koloni: sudoku, soliter, kolona, aparat,
švercer, tetris, avioni, cigle, bića, tablić, jamb, geo, pikado, bilijar, kuća, teren,
mapa, čoveče ne ljuti se, riziko, basket i rumi.

**Adresa:** https://brankojosipovic.github.io/igre/

- Rade **bez interneta** — prvo otvaranje uz signal sačuva sve na telefon (`sw.js`).
- Do četvoro igrača **u sobi preko interneta** — svako na svom telefonu, bez naloga
  i bez servera sa naše strane (`mreza.js`, javni MQTT brokeri).
- Svaka igra pamti **deset najboljih rezultata**, ima moderan ili retro zvuk, ocenu i
  predlog, i svoj broj verzije (dugme 🏆 u zaglavlju).
- Zajednička **statistika igranja** na `statistika.html`.

Nema koraka za izgradnju: svaka igra je jedan HTML fajl, zajednički deo je `igre.js`.
Objavljuje se sa grane `main` preko GitHub Pages (`.github/workflows/pages.yml`).

Igre su nastale uz [Border Wait](https://brankojosipovic.github.io/border-wait/),
pregled čekanja na graničnim prelazima, i od septembra 2026. žive odvojeno.

## Prava

© 2026 Branko Josipović. **Sva prava zadržana.** Ovo nije softver otvorenog koda:
igranje na objavljenoj adresi je slobodno, a kopiranje, preuzimanje (ručno ili
programski), prerada i objavljivanje koda nisu dozvoljeni bez pisane dozvole autora.
Videti [LICENSE](LICENSE).
