/* napravi_riziko.js — pravi riziko.js iz svet.js.
   Oblasti su grupe pravih država; susedstvo se računa iz granica (najmanje
   rastojanje između tačaka obrisa), pa se ručno dopunjava morskim vezama. */
"use strict";
const fs = require("fs");
const path = require("path");
const koren = path.join(__dirname, "..");

global.window = {};
require(path.join(koren, "svet.js"));
const SVET = global.window.SVET;

function dekodiraj(s, z) {
  const t = [];
  let i = 0, x = 0, y = 0;
  while (i < s.length) {
    let r = 0, sh = 0, b;
    do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
    x += (r & 1) ? ~(r >> 1) : (r >> 1);
    r = 0; sh = 0;
    do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
    y += (r & 1) ? ~(r >> 1) : (r >> 1);
    t.push(x / z, y / z);
  }
  return t;
}
const DRZAVE = {};
for (const d of SVET.d) DRZAVE[d.n] = { ime: d.n, lon: d.x, lat: d.y, kont: d.k, prsteni: d.o.map(o => dekodiraj(o, SVET.z)) };
function sredinaPrstena(p) {
  let sx = 0, sy = 0;
  for (let i = 0; i < p.length; i += 2) { sx += p[i]; sy += p[i + 1]; }
  return [sx / (p.length / 2), sy / (p.length / 2)];
}

const KONTINENTI = [
  { n: "Severna Amerika", b: 4 },
  { n: "Južna Amerika", b: 3 },
  { n: "Evropa", b: 5 },
  { n: "Afrika", b: 3 },
  { n: "Azija", b: 7 },
  { n: "Okeanija", b: 2 }
];

const OBLASTI = [
  ["Grenland", "Severna Amerika", ["Grenland"]],
  ["Kanada", "Severna Amerika", ["Kanada"]],
  ["Sjedinjene Države", "Severna Amerika", ["SAD"]],
  ["Meksiko", "Severna Amerika", ["Meksiko"]],
  ["Srednja Amerika", "Severna Amerika", ["Gvatemala", "Belize", "Honduras", "Salvador", "Nikaragva", "Kostarika", "Panama"]],
  ["Karibi", "Severna Amerika", ["Kuba", "Haiti", "Dominikanska Republika", "Jamajka", "Bahami", "Trinidad i Tobago"]],

  ["Kolumbija i Venecuela", "Južna Amerika", ["Kolumbija", "Venecuela", "Gvajana", "Surinam", "Ekvador"]],
  ["Peru i Bolivija", "Južna Amerika", ["Peru", "Bolivija"]],
  ["Brazil", "Južna Amerika", ["Brazil"]],
  ["Argentina", "Južna Amerika", ["Argentina", "Urugvaj", "Paragvaj"]],
  ["Čile", "Južna Amerika", ["Čile"]],

  ["Skandinavija", "Evropa", ["Norveška", "Švedska", "Finska", "Danska", "Island"]],
  ["Britanija", "Evropa", ["Velika Britanija", "Irska"]],
  ["Zapadna Evropa", "Evropa", ["Francuska", "Belgija", "Holandija", "Luksemburg"]],
  ["Iberija", "Evropa", ["Španija", "Portugal"]],
  ["Srednja Evropa", "Evropa", ["Nemačka", "Austrija", "Švajcarska", "Češka", "Slovačka", "Slovenija"]],
  ["Italija", "Evropa", ["Italija"]],
  ["Balkan", "Evropa", ["Srbija", "Hrvatska", "Bosna i Hercegovina", "Crna Gora", "Kosovo", "Severna Makedonija", "Albanija", "Grčka", "Bugarska", "Rumunija", "Mađarska"]],
  ["Poljska i Baltik", "Evropa", ["Poljska", "Litvanija", "Letonija", "Estonija"]],
  ["Ukrajina", "Evropa", ["Ukrajina", "Belorusija", "Moldavija"]],

  ["Severna Afrika", "Afrika", ["Maroko", "Alžir", "Tunis", "Libija", "Mauritanija"]],
  ["Egipat i Sudan", "Afrika", ["Egipat", "Sudan"]],
  ["Zapadna Afrika", "Afrika", ["Senegal", "Gambija", "Gvineja Bisao", "Gvineja", "Sijera Leone", "Liberija", "Obala Slonovače", "Gana", "Togo", "Benin", "Nigerija", "Niger", "Mali", "Burkina Faso"]],
  ["Centralna Afrika", "Afrika", ["Čad", "Centralnoafrička Republika", "Kamerun", "Gabon", "Ekvatorijalna Gvineja", "Kongo", "DR Kongo"]],
  ["Istočna Afrika", "Afrika", ["Etiopija", "Eritreja", "Džibuti", "Somalija", "Kenija", "Uganda", "Ruanda", "Burundi", "Tanzanija", "Južni Sudan"]],
  ["Južna Afrika", "Afrika", ["Južnoafrička Republika", "Namibija", "Bocvana", "Zimbabve", "Zambija", "Mozambik", "Malavi", "Angola", "Lesoto", "Esvatini", "Madagaskar"]],

  ["Rusija", "Azija", ["Rusija"]],
  ["Srednja Azija", "Azija", ["Kazahstan", "Uzbekistan", "Turkmenistan", "Kirgistan", "Tadžikistan"]],
  ["Bliski istok", "Azija", ["Turska", "Sirija", "Liban", "Izrael", "Palestina", "Jordan", "Irak", "Kipar"]],
  ["Arabija", "Azija", ["Saudijska Arabija", "Jemen", "Oman", "Ujedinjeni Arapski Emirati", "Katar", "Kuvajt"]],
  ["Iran i Kavkaz", "Azija", ["Iran", "Azerbejdžan", "Jermenija", "Gruzija"]],
  ["Avganistan i Pakistan", "Azija", ["Avganistan", "Pakistan"]],
  ["Indija", "Azija", ["Indija", "Nepal", "Butan", "Bangladeš", "Šri Lanka"]],
  ["Mongolija", "Azija", ["Mongolija"]],
  ["Kina", "Azija", ["Kina", "Tajvan"]],
  ["Jugoistočna Azija", "Azija", ["Mjanmar", "Tajland", "Laos", "Kambodža", "Vijetnam", "Malezija", "Bruneji", "Filipini"]],
  ["Japan i Koreja", "Azija", ["Japan", "Južna Koreja", "Severna Koreja"]],

  ["Indonezija", "Okeanija", ["Indonezija", "Istočni Timor"]],
  ["Papua", "Okeanija", ["Papua Nova Gvineja", "Solomonska Ostrva", "Vanuatu", "Fidži"]],
  ["Australija", "Okeanija", ["Australija"]],
  ["Novi Zeland", "Okeanija", ["Novi Zeland"]]
];

/* prekomorski prsteni koji se ne crtaju ni ne broje (Gvajana i Reunion uz Francusku) */
const ISKLJUCI = [["Francuska", -53.3, 3.8], ["Francuska", 55.6, -21.1]];

const BEZ = {};
for (const [drz, lon, lat] of ISKLJUCI) {
  const d = DRZAVE[drz];
  if (!d) throw new Error("nepoznata država u ISKLJUCI: " + drz);
  let naj = -1, najD = Infinity;
  d.prsteni.forEach((p, i) => {
    const [cx, cy] = sredinaPrstena(p);
    const r = Math.hypot(cx - lon, cy - lat);
    if (r < najD) { najD = r; naj = i; }
  });
  if (najD > 3) throw new Error("nema prstena kod " + lon + "," + lat + " u " + drz);
  (BEZ[drz] = BEZ[drz] || []).push(naj);
}
for (const drz in BEZ) {
  BEZ[drz].sort((a, b) => a - b);
  DRZAVE[drz].prsteni = DRZAVE[drz].prsteni.filter((p, i) => BEZ[drz].indexOf(i) < 0);
}

/* provera pokrivenosti */
const uzeto = {};
for (const [n, k, cl] of OBLASTI) for (const c of cl) {
  if (!DRZAVE[c]) throw new Error("nepoznata država: " + c + " (u " + n + ")");
  if (uzeto[c]) throw new Error("država dva puta: " + c);
  uzeto[c] = n;
}
const visak = Object.keys(DRZAVE).filter(c => !uzeto[c]);
if (visak.length) console.log("nije ni u jednoj oblasti:", visak.join(", "));

/* geometrija */
function povrsina(prsten) {
  let s = 0;
  for (let i = 0, j = prsten.length - 2; i < prsten.length; j = i, i += 2)
    s += prsten[j] * prsten[i + 1] - prsten[i] * prsten[j + 1];
  return Math.abs(s) / 2;
}
const RAD = Math.PI / 180;
function raz(x1, y1, x2, y2) {                 // grubo rastojanje u stepenima, sa ispravkom po širini
  const k = Math.cos((y1 + y2) / 2 * RAD);
  return Math.hypot((x1 - x2) * k, y1 - y2);
}

const oblasti = OBLASTI.map(([n, k, clanovi]) => {
  let sx = 0, sy = 0, sp = 0;
  const tacke = [];
  for (const c of clanovi) {
    const d = DRZAVE[c];
    let p = 0;
    for (const r of d.prsteni) { p += povrsina(r); for (let i = 0; i < r.length; i += 2) tacke.push(r[i], r[i + 1]); }
    sx += d.lon * p; sy += d.lat * p; sp += p;
  }
  const cx = sx / sp, cy = sy / sp;
  let naj = null, najD = Infinity;             // natpis ide na kopno, kod najbliže članice
  for (const c of clanovi) {
    const d = DRZAVE[c];
    const r = raz(cx, cy, d.lon, d.lat);
    if (r < najD) { najD = r; naj = d; }
  }
  return { n, k, clanovi, x: naj.lon, y: naj.lat, tacke };
});

/* susedstvo iz granica */
const N = oblasti.length;
const daljina = [];
for (let i = 0; i < N; i++) daljina.push(new Array(N).fill(Infinity));
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = oblasti[i].tacke, b = oblasti[j].tacke;
  let naj = Infinity;
  for (let p = 0; p < a.length; p += 2) {
    const ax = a[p], ay = a[p + 1];
    for (let q = 0; q < b.length; q += 2) {
      const d = raz(ax, ay, b[q], b[q + 1]);
      if (d < naj) { naj = d; if (naj < .02) { p = a.length; break; } }
    }
  }
  daljina[i][j] = daljina[j][i] = naj;
}

const PRAG = 0.25;
const parovi = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++)
  if (daljina[i][j] < 1.2) parovi.push([daljina[i][j], oblasti[i].n, oblasti[j].n]);
parovi.sort((a, b) => a[0] - b[0]);
if (process.argv[2] === "--parovi")
  for (const p of parovi) console.log(p[0].toFixed(3), p[1], "—", p[2]);

/* ručne dopune: morske veze i mostovi koje granice ne vide */
const MOREM = [
  ["Grenland", "Kanada"], ["Grenland", "Skandinavija"],
  ["Britanija", "Zapadna Evropa"], ["Britanija", "Skandinavija"],
  ["Skandinavija", "Poljska i Baltik"],
  ["Italija", "Severna Afrika"],
  ["Karibi", "Sjedinjene Države"], ["Karibi", "Meksiko"], ["Karibi", "Srednja Amerika"],
  ["Brazil", "Zapadna Afrika"],
  ["Arabija", "Istočna Afrika"], ["Arabija", "Iran i Kavkaz"],
  ["Indonezija", "Australija"], ["Indonezija", "Papua"],
  ["Papua", "Australija"], ["Australija", "Novi Zeland"],
  ["Rusija", "Sjedinjene Države"]
];

/* veze koje granice nađu, a ne valjaju (prekomorski delovi država) */
const IZBACI = [];


const indeks = {};
oblasti.forEach((o, i) => { indeks[o.n] = i; });
const susedi = oblasti.map(() => new Set());
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++)
  if (daljina[i][j] < PRAG) { susedi[i].add(j); susedi[j].add(i); }
for (const [a, b] of MOREM) {
  if (!(a in indeks) || !(b in indeks)) throw new Error("morska veza ka nepoznatoj oblasti: " + a + " / " + b);
  susedi[indeks[a]].add(indeks[b]); susedi[indeks[b]].add(indeks[a]);
}
for (const [a, b] of IZBACI) { susedi[indeks[a]].delete(indeks[b]); susedi[indeks[b]].delete(indeks[a]); }

/* provera: sve mora biti povezano i ništa ne sme ostati samo */
const videno = new Set([0]), red = [0];
while (red.length) { const i = red.pop(); for (const j of susedi[i]) if (!videno.has(j)) { videno.add(j); red.push(j); } }
if (videno.size !== N) console.log("NIJE POVEZANO:", oblasti.filter((o, i) => !videno.has(i)).map(o => o.n).join(", "));
oblasti.forEach((o, i) => { if (susedi[i].size === 0) console.log("bez suseda:", o.n); });

/* veze preko mora — crtaju se isprekidano da se vidi da se može preći */
const preko = [];
for (let i = 0; i < N; i++) for (const j of susedi[i])
  if (j > i && daljina[i][j] > .06) preko.push([i, j]);

const izlaz = {
  b: BEZ,
  m: preko,
  k: KONTINENTI,
  o: oblasti.map((o, i) => ({
    n: o.n, k: KONTINENTI.findIndex(k => k.n === o.k),
    d: o.clanovi, x: +o.x.toFixed(2), y: +o.y.toFixed(2),
    s: [...susedi[i]].sort((a, b) => a - b)
  }))
};
const tekst = "/* riziko.js — oblasti, kontinenti i susedstvo za igru Riziko.\n" +
  "   Napravljeno skriptom scripts/napravi_riziko.js iz svet.js; granice se crtaju\n" +
  "   iz svet.js, ovde stoje samo grupe država, natpisi i ko je s kim u komšiluku. */\n" +
  "window.RIZIKO = " + JSON.stringify(izlaz) + ";\n";
fs.writeFileSync(path.join(koren, "riziko.js"), tekst);
console.log("oblasti:", N, "veza:", susedi.reduce((a, s) => a + s.size, 0) / 2, "bajtova:", tekst.length);
