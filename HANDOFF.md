<!-- © 2026 Branko Josipović. Sva prava zadržana. -->

# Predaja posla (handoff)

Stanje na dan **3. 9. 2026.**, posle objave `igre-sajt-v69`.
Ovo je sve što novoj sesiji treba da nastavi rad bez pitanja.

---

## 1. Šta je ovo i gde živi

| | |
|---|---|
| Sajt | <https://brankojosipovic.github.io/igre/> |
| Repozitorijum | `brankojosipovic/igre`, radi se **direktno na `main`** |
| Stara adresa | <https://brankojosipovic.github.io/border-wait/> — samo preusmerenja, vidi §8 |
| Vlasnik / jezik | Branko Josipović; **ceo UI je na srpskom** (ćirilica se ne koristi, latinica sa dijakriticima) |
| Prava | `LICENSE` — sva prava zadržana, zabranjeno i ručno i programsko kopiranje koda |

Publika su ukućani i prijatelji, na telefonima (uglavnom iPhone). Sve mora da radi
**bez interneta** posle prve posete i **na 320 px širine**.

---

## 2. Kako je sve složeno

**Bez build-a. Bez npm-a u repozitorijumu. Bez framework-a.** Jedan samostalan
`.html` po igri, ES5-ish JavaScript u `<script>` tagu, `<style>` u glavi. Sve što je
zajedničko stoji u par `.js` fajlova koje svaka igra uveze običnim `<script src>`.

```
index.html            spisak igara (bio je igre.html pre preseljenja)
pomoc.html            velika strana sa uputstvima za sve
statistika.html       vlasnički pregled statistike (§5)
igre.js               ZAJEDNIČKI DEO — najvažniji fajl, ~1500 linija
mreza.js              sobe preko MQTT-a
cet.js                ćaskanje u sobi
svet.js, riziko.js    podaci o karti sveta (generisani, vidi scripts/)
sw.js                 service worker, offline
manifest.webmanifest  PWA
icons/                ikonice po igri
24 × <igra>.html      same igre
```

Igre koje **imaju sobu** (mrežnu igru za više telefona) — njih 12:
`jamb tablic bilijar pikado geo mapa basket riziko rumi teren covece cigle`.

Ostale su za jednog igrača: `sudoku solitaire kolona aparat svercer tetris avioni
stvorenja kuca`.

---

## 3. `igre.js` — šta sve nudi

Sve je u jednoj IIFE; na `window` izlazi samo ono što je nabrojano.

| Ime | Šta radi |
|---|---|
| `GAMES` | spisak igara za donju traku (id, href, emoji, ime) |
| `PRAVILA` | tekst pravila po igri → dugme ❔ u zaglavlju (`window.PRAVILA_IGRE`) |
| `VERZIJE` | **verzija po igri**, ispisuje se u podnožju („Basket v1.2"). Podigni je kad menjaš tu igru. |
| `TOPLISTE` + `window.TOP` | najboljih deset po igri i po režimu; `TOP.upisi(igra, id, vrednost)`. Panel je dugme 🏆. |
| `SFX` (`window.SFX`) | ceo zvuk, bez audio fajlova. Vidi §4. |
| `GLAS` | izgovor na engleskom (pikado, bilijar) preko `speechSynthesis` |
| `IGRAC` (`window.IGRAC`) | ime igrača (👤), pamti se u `localStorage` |
| `STAT` (`window.STAT`) | statistika igranja — broj partija, vreme, najbolji rezultati; objavljuje se preko MQTT-a kao *retained* poruka, čita je `statistika.html` |
| `UTISAK` (`window.UTISAK`, `window.UTISAK_SLOJ`) | zvezdice i komentar, ide uz statistiku |
| `KOD` (`window.KOD`) | **kopiranje koda sobe**, vidi §6 |
| `SWPomoc` | provera verzije service workera, `tvrdoOsvezi()` |
| `build()` | sastavlja donju traku, ubacuje dugmad ❔ 🏆 🔊 🏠 u zaglavlje svake igre, upisuje verziju, pokreće merenje vremena i praćenje kodova |
| `poruciNaEkranu(html)` | kratka poruka preko ekrana (`.zvukPoruka`, `z-index: 95`) — koristi se za sve potvrde |

`build()` prepoznaje igru po **imenu fajla** (`location.pathname`). Koren sajta (`""`)
se tretira kao `index.html`.

### Kako se dodaje nova igra
1. Novi `<igra>.html` po ugledu na postojeću (kopiraj zaglavlje, `:root` promenljive, `<script src="igre.js">`).
2. Upiši je u `GAMES`, `VERZIJE`, po potrebi `PRAVILA` i `TOPLISTE` u `igre.js`.
3. Dodaj `./<igra>.html` i `./icons/<igra>-180.png` u `CORE` u `sw.js` i **podigni `VERSION`**.
4. Dodaj karticu na `index.html` i odeljak u `pomoc.html`.

---

## 4. Zvuk

Tonovi se **sklapaju u kodu**, nema mp3/wav fajlova u repozitorijumu.

- `tone({f, to, d, v, type, at, atk, filter})` i `noise({...})` su osnova; `SFX.tick/tap/good/bad/card/coin/win/jackpot/...` su gotovi zvuci, plus posebni za bilijar, basket, rumi, pikado.
- **Dva stila**, biraju se dugmetom u 🏆 panelu i na spisku igara: `moderno` (WebAudio oscilatori) i `retro` (pravougaoni talas po polustepenima, jednobitni šum). `SFX.stil()` / `SFX.stil("retro")`.
- **Rezervni put bez WebAudio** (dodato v68): ako u pregledaču nema ni `AudioContext` ni `webkitAudioContext` — što se dešava u **Zaključanom režimu na iPhonu**, i to odjednom u svim pregledačima jer svi koriste WebKit — igre same sklope mali 8-bitni WAV i puste ga preko `new Audio(data:...)`. Grublje, ali se čuje. `SFX.stanje()` vraća `{ukljucen, kanal, stil, webaudio, rezerva, govor}`.
- `SFX.prekidac()` je jedno dugme za svuda: gasi/pali, pusti tri probna tona i napiše šta je zatekao. Kad ništa ne prolazi, uputi na Zaključani režim i ispiše `wa=/rez=/kanal=/stil=`.
- iOS otvara zvučni kanal tek na prvi dodir — zato `otkljucaj()` visi na `pointerdown/touchend/mousedown/keydown` u `capture` fazi.

**Naučeno na teži način:** korisnik je javio „ovaj pregledač ne ume da pušta zvuk" u
Chrome-u i Safari-ju istovremeno. Uzrok nije bio sajt nego Lockdown Mode. Kad izveštaj
zvuči nemoguće, prvo proveri da li poruka može da dođe samo iz jednog uslova, pa taj
uslov ispiši korisniku na ekran.

---

## 5. Sobe (`mreza.js`) i statistika

- **MQTT preko WebSocket-a**, javni brokeri, samo *broadcast* — nema servera koji čuva stanje. Kod sobe je 5 znakova (`[A-Z0-9]`).
- API: `Mreza.napravi()`, `Mreza.pridruzi(kod, {poruka, status})`, `Mreza.posalji(obj)`, `Mreza.drustvo()`, `Mreza.jaSam()`, `Mreza.kod()`, `Mreza.uloga()`, `Mreza.povezan()`, `Mreza.zatvori()`, `Mreza.podrzana()`.
- **Statistika** koristi *retained* poruke: `Mreza.objaviTablu(tema, obj)` / `Mreza.citajTablu(prefiks, naStavku, rok)`. Svaki telefon objavi svoj sažetak, `statistika.html` skupi najnovije po uidu. Šalje se automatski, bez pitanja i bez prekidača — tako je vlasnik izričito hteo; u `pomoc.html` (odeljak „statistika") piše šta se šalje.
- **Zamke koje su već rešene — ne vraćaj ih:**
  - `Mreza.posalji` sme da gleda `rel.ziv()`, **ne** `spojen()` — `spojen()` je netačno `false` baš tokom ponovnog priključivanja.
  - prazna soba **ne sme** da resetuje `objavljen` (davalo je lažno „povezan").
  - u igrama gating radi na `Mreza.kod()`, **ne** na `Mreza.povezan()`.
  - `sedim()` / `uSobi()` čuvari moraju da puste čekaonicu i kad se partija nastavlja (`&& !nastavljam`), a u Jambu `sedim()` mora da zahteva i `postava`.
  - Iz menija se **mora** moći vratiti u sobu (`meniSobe()`), a ☰ ne sme da ruši sobu. Kod sobe stoji u zaglavlju kao 🌐 čip celu partiju.
  - **Soba se pamti uz partiju.** Rumi (i Jamb/Tablić/Pikado/Bilijar po istom obrascu) čuva u `localStorage` i `{kod, uloga, moj, postava}`, pa posle ubijene stranice meni nudi „↩ Nastavi partiju (KOD)" i ista soba se otvara **istim kodom** (`Mreza.napravi({kod})`). Ekran čekanja na nastavak **ne sme** da nudi „▶ Kreni" — to bi podelilo nove pločice.
  - Kad neko primi „evo" od nepoznatog, **odgovara svojim „evo"** — tako se nađu i dvoje koji se vraćaju a niko ne zove „zdravo" (domaćin koji je ponovo otvorio staru sobu). Ne vrti se u krug jer se odgovara samo na nepoznatog.
  - **Prazna soba nije prekinuta soba.** Telefon koji ode u drugu aplikaciju obori WebSocket i broker objavi njegovu oporuku „ode". Zato se posle praznjenja sobe čeka `MILOST` (90 s) pa se tek onda javlja `prekinuto`; ko sam pritisne „Izađi iz sobe" šalje `{__:"ode", svesno:1}` i prekid ide odmah. Kad se strana vrati u prvi plan (`visibilitychange`/`pageshow`/`focus`/`online`), `mreza.js` sam zove `Mreza.ozivi()` — pretplata se obnovi i pošalje se „evo". Igre uz poruku o prekidu treba da nude ↻ koje zove `Mreza.ozivi()`.

---

## 6. Kopiranje koda sobe (najnovije)

Svaka kutija sa kodom nosi klasu **`.kodBox`**. `igre.js` ima `MutationObserver` koji
svaku takvu kutiju sa sadržajem `[A-Z0-9]{4,10}` automatski opremi:

- kutija postane dugme (`role=button`, `user-select: all`) — dodir kopira,
- ispod nje se ubaci `.kodAlat` sa „📋 Kopiraj kod" i, ako telefon ima `navigator.share`, „📤 Pošalji" (šalje kod **i vezu ka igri**).

Kopiranje ide prvo kroz `navigator.clipboard.writeText`, pa kroz staru selekciju +
`document.execCommand("copy")` (jedini put u nekim zaključanim pregledačima).

**Zato: nova soba treba samo `class="kodBox"` na kutiju sa kodom i ništa više.**
Pojedinačna dugmad za kopiranje su namerno izbačena iz Jamba, Tablića, Bilijara,
Pikada i Gea da ne stoje dva ista.

---

## 7. Testovi — pročitaj ovo prvo

⚠️ **Testovi NISU u repozitorijumu.** Postoje samo u scratchpad direktorijumu ove
sesije: **36 fajlova, ~9800 linija**, i **izgubiće se kad se kontejner oslobodi**.

```
$SP/t2/*.test.js      # 36 suita: po igri + zajednički (ui, dno, kes, hub,
                      # toplista, stat, pamti, nastavak, mreza, relej,
                      # citljivost, zvuk, rezerva, kod, …)
$SP/node_modules      # playwright (preko /opt/node22), mqtt, mqtt-packet, ws
```

Kako rade: Playwright + headless Chromium, mali `http.createServer` koji servira
`$SP/igre`, i **ručno napisan MQTT broker** (`mqtt-packet` + `ws`) za sobe. Svaka igra
izvozi `window.X` (npr. `window.C` za čoveče, `window.B` za basket) da test može da
zove logiku direktno.

**Zamke pri puštanju:**
- Puštaj **jedan po jedan**, sa pauzom — suite se bore za portove; pikado i nastavak
  padnu bez razloga kad idu jedna za drugom. **Jedan pad se ponovi pre nego što se
  poveruje.**
- Za sobe: `addInitScript(() => { window.__BROKERI_TEST = [{ime:'b1', url:'ws://127.0.0.1:PORT/mqtt'}] })`
  **i** posle `goto` obavezno `addScriptTag({url: '.../mqtt.min.js'})` — `mreza.js`
  inače vuče mqtt sa CDN-a, a mreža je u testu zatvorena.
- Bilijar i pikado prvo pitaju „Koja igra?" pa tek onda daju kod sobe.

**Preporuka:** odluči da li testovi idu u repozitorijum (npr. `testovi/`, uz napomenu
u `LICENSE`) ili u privatni repozitorijum. Ovako su na jednu sesiju od nestanka.

---

## 8. Objava

`.github/workflows/pages.yml`: `checkout` → `configure-pages` (**bez** `enablement`,
token radne mašine ne sme da pravi Pages sajt) → `upload-pages-artifact` (`path: .`) →
`deploy-pages`. Izvor je jednom ručno podešen na *GitHub Actions* u Settings → Pages.

**Svaka objava mora da podigne `VERSION` u `sw.js`** — inače telefoni ostaju na starom.
Trenutno `igre-sajt-v69`.

Ime keša je namerno `igre-sajt-vNN`, a **ne** staro `igre-vNN`: oba sajta su na istom
domenu i dele skladište kešova. Stari radnik na `border-wait` adresi je kill-switch —
briše **samo** imena `/^igre-v\d+$/`, odjavi sebe i osveži otvorene kartice. Sve stare
adrese (`igre.html`, `rumi.html`, …) tamo su `meta refresh` + `location.replace`
preusmerenja na novi sajt.

---

## 9. Konvencije koje treba držati

- **Srpski u svemu**: UI, komentari u kodu, poruke commit-a. Komentar objašnjava *zašto*, ne *šta*.
- **Verzija igre se podiže** kad se ta igra menja (`VERZIJE` u `igre.js`).
- **Canvas**: uvek množi sa `devicePixelRatio`, paleta se čita iz teme (svetla/tamna).
- **Prvo 320 px**: zaglavlje se skuplja na ≤430/390/340 px; donja traka ispod 460 px pokazuje samo sličice.
- **Ništa se ne briše samo od sebe** — prekinuta partija se pamti i nastavlja („▶ Nastavi partiju").
- **Emoji su rizik**: 🎛 🎵 🕹 ★ su se pojavljivali kao prazni kvadratići na telefonu. Proveri na slici ekrana; `★` je trebalo `★︎` (U+FE0E).
- Commit-i: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` i `Claude-Session: <url>`.

---

## 10. Radna okolina (bitno!)

- **Izlazni proxy blokira `github.io` i `api.github.com`.** `curl` i `WebFetch` na živi
  sajt **ne rade**. Objava se proverava **isključivo** preko GitHub MCP alata
  (`actions_list`, `actions_get`). Ne troši vreme na `Monitor` koji anketira API.
- `chromium` je na `/opt/pw-browsers/chromium*`, playwright na `/opt/node22/lib/node_modules/playwright`.
- Border Wait deo (`brankojosipovic/border-wait`) se razvija na branši
  `claude/sudoku-mobile-app-msxnr2`, pa se spaja u `main`
  (`git merge --no-ff`). Repozitorijum `igre` radi direktno na `main`.

---

## 11. Šta je urađeno u prethodnim sesijama (skraćeno)

`v58` novi dizajn Čoveče · `v59` top liste + retro/moderan zvuk + verzija po igri ·
`v60` čelična lopta u Ciglama · `v61` jasnija poruka o skupu u Rumiju ·
`v62` statistika, ocene i predlozi + `statistika.html` · `v63` Rumi javlja problem
odmah dok se slaže · `v64` Rumi soba nije ćorsokak · `v65` isto u svih deset ostalih
igara sa sobom · `v67` **preseljenje u sopstveni repozitorijum**, LICENSE, preusmerenja,
naslov samo „Igre" · `v68` rezervni zvuk bez WebAudio + razdvojeni kešovi ·
`v69` **kopiranje i deljenje koda sobe u svih 12 igara sa sobom** ·
`v72` **tri skina** (Klasik / Neon / Papir) za sve igre ·
`v71` Rumi: partija u sobi se pamti uz kod, pa se ista soba otvara istim kodom posle ubijene stranice ·
`v70` Rumi: izvučena pločica se vidi i imenuje, „Vrati" skida po jedan korak,
„Poredaj" radi dok protivnik igra, i soba preživi domaćina koji ode u drugu
aplikaciju (izmena je u `mreza.js`, dakle važi za sve igre sa sobom).

---

## 12. Skinovi

Postoje **tri**, biraju se na spisku igara (dugme uz zvuk) i u 🏆 panelu svake
igre; pamte se u `localStorage: igre.skin` i važe **za sve igre odjednom**:
`klasik` (bez atributa), `neon`, `papir`.

Kako radi: `igre.js` na samom početku (pre prvog crtanja, da ne trepne) ubaci
`<style id="skinStil">` i stavi `data-skin` na `<html>`. Boje se prepisuju sa
jačeg mesta nego što ih igre definišu:

| igra definiše | skin prepisuje |
|---|---|
| `:root { --bg… }` | `html[data-skin="neon"]` |
| `[data-theme="light"] { --bg… }` (na `body`) | `html[data-skin="neon"] [data-theme="light"]` |

Drugi red je **obavezan**: promenljive se nasleđuju, pa definicija na `body`
pobeđuje onu na `html` bez obzira na specifičnost — mora se pogoditi isti
element. Zato **svaki skin ima i tamnu i svetlu varijantu**; tema i skin su
odvojeni.

Skinovan je zajednički set (`--bg --panel --panel-2 --ink --ink-dim --line
--gold --good --bad --shadow`) plus `--filc` (sto u Rumiju, Bilijaru,
Tabliću). **Nije** skinovano ono što igre crtaju po platnu ukucanim bojama —
za to bi trebalo prvo tokenizovati (vidi merenje niže). Novi skin = jedan unos
u `BOJE_SKINA` i jedan u `SKINOVI`; `skin.test.js` proverava kontrast
(WCAG ≥ 4.5 za tekst) za svaki skin u obe teme, pa nova paleta odmah pada ako
je nečitljiva.

### Šta još stoji otvoreno

Da skin zahvati i samu igru (tablu, cigle, parket, kartu sveta), treba prvo
tokenizovati boje:

- U kodu je **1224 hardkodovane hex boje** i
  **25 odvojenih `:root` blokova** — svaka igra ima svoju kopiju istih promenljivih.
  Samo `covece.html` ima pravu paletu za canvas (`paleta()`).
- Prvi korak je **zajednički set promenljivih na jednom mestu** + `PALETA` objekat koji
  igre čitaju pri crtanju. To vredi uraditi i bez skinova (danas kutija sa kodom ima
  ukucane boje i ne poštuje svetlu temu).
- Skin treba da važi **za sve igre odjednom** (kao zvuk), `localStorage: igre.skin`,
  primena preko `data-skin` na `<html>`. Tema svetlo/tamno ostaje odvojena — **svaki
  skin mora da radi u obe**.
- **Najviše tri skina** (npr. Klasik / Neon / Papir). Svaki dodatni množi posao pri
  svakoj budućoj promeni.
- Redosled: (1) pretvori boje u promenljive, (2) pilot na dve igre, (3) presudi da li
  ide na ostale 22.

Redosled: (1) pretvori te boje u promenljive, (2) pilot na dve igre (Cigle i
Čoveče), (3) presudi da li ide na ostale. Mehanizam za skin već stoji i čeka —
dodaje se samo boja.
