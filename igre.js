/* © 2026 Branko Josipović. Sva prava zadržana. Ovaj kod se ne sme kopirati, prerađivati ni
   objavljivati bez pisane dozvole autora — videti LICENSE u korenu repozitorijuma. */
/* igre.js — zajednička donja traka igara + zvuk (WebAudio, bez audio fajlova) */
(function () {
"use strict";

var GAMES = [
  { id: "sudoku",    href: "sudoku.html",    em: "🔢", nm: "Sudoku" },
  { id: "solitaire", href: "solitaire.html", em: "🎴", nm: "Soliter" },
  { id: "kolona",    href: "kolona.html",    em: "🚧", nm: "Kolona" },
  { id: "aparat",    href: "aparat.html",    em: "🎰", nm: "Aparat" },
  { id: "svercer",   href: "svercer.html",   em: "🚬", nm: "Švercer" },
  { id: "tetris",    href: "tetris.html",    em: "🧱", nm: "Tetris" },
  { id: "avioni",    href: "avioni.html",    em: "✈️", nm: "Avioni" },
  { id: "cigle",     href: "cigle.html",     em: "🕹️", nm: "Cigle" },
  { id: "stvorenja", href: "stvorenja.html", em: "🐉", nm: "Bića" },
  { id: "tablic",    href: "tablic.html",    em: "🃏", nm: "Tablić" },
  { id: "jamb",      href: "jamb.html",      em: "🎲", nm: "Jamb" },
  { id: "geo",       href: "geo.html",       em: "🌍", nm: "Geo" },
  { id: "pikado",    href: "pikado.html",    em: "🎯", nm: "Pikado" },
  { id: "bilijar",   href: "bilijar.html",   em: "🎱", nm: "Bilijar" },
  { id: "kuca",      href: "kuca.html",      em: "🛋", nm: "Kuća" },
  { id: "teren",     href: "teren.html",     em: "🟩", nm: "Teren" },
  { id: "mapa",      href: "mapa.html",      em: "🗺", nm: "Mapa" },
  { id: "covece",    href: "covece.html",    em: "🔴", nm: "Čoveče" },
  { id: "riziko",    href: "riziko.html",    em: "⚔️", nm: "Riziko" },
  { id: "basket",    href: "basket.html",    em: "🏀", nm: "Basket" },
  { id: "rumi",      href: "rumi.html",      em: "🀄", nm: "Rumi" },
  { id: "zastave",   href: "zastave.html",   em: "🚩", nm: "Zastave" }
];
var SKEY = "igre.sound";
var IKEY = "igre.ime";

/* ---------- ime igrača (da se u sobi zna ko je ko) ---------- */
var IGRAC = {
  ime: function () { try { return (localStorage.getItem(IKEY) || "").trim().slice(0, 14); } catch (e) { return ""; } },
  postavi: function (v) {
    v = String(v || "").replace(/[<>]/g, "").trim().slice(0, 14);
    try { localStorage.setItem(IKEY, v); } catch (e) { }
    paintIme();
    return v;
  },
  imeIli: function (rez) { return IGRAC.ime() || rez; },
  pitaj: function (gotovo) {                      // mali prozorčić, radi na svakoj strani
    var stara = document.querySelector(".imeSloj");
    if (stara) stara.remove();
    var sloj = document.createElement("div");
    sloj.className = "imeSloj";
    sloj.innerHTML =
      '<div class="imeBox">' +
      '<h3>👤 Kako se zoveš?</h3>' +
      '<p>Ime se vidi drugom igraču kad igrate u sobi. Čuva se samo na ovom telefonu.</p>' +
      '<input id="imeUnos" maxlength="14" autocomplete="name" placeholder="npr. Branko">' +
      '<div class="imeBtns"><button id="imeOk">Sačuvaj</button><button id="imeNe">Kasnije</button></div></div>';
    document.body.appendChild(sloj);
    var polje = sloj.querySelector("#imeUnos");
    polje.value = IGRAC.ime();
    var zatvori = function (v) { sloj.remove(); if (gotovo) gotovo(v); };
    sloj.querySelector("#imeOk").onclick = function () { zatvori(IGRAC.postavi(polje.value)); };
    sloj.querySelector("#imeNe").onclick = function () { zatvori(IGRAC.ime()); };
    sloj.addEventListener("click", function (e) { if (e.target === sloj) zatvori(IGRAC.ime()); });
    polje.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); zatvori(IGRAC.postavi(polje.value)); } });
    setTimeout(function () { polje.focus(); }, 60);
  }
};
function paintIme() {
  var b = document.getElementById("imeBtn");
  if (b) b.textContent = "👤 " + (IGRAC.ime() || "Upiši ime");
}
window.IGRAC = IGRAC;

/* ---------- zvuk ---------- */
var on = true;
try { var v = localStorage.getItem(SKEY); if (v !== null) on = v === "1"; } catch (e) { }
var ctx = null, master = null;

function engine() {
  if (!on) return null;
  try {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      /* tek kad je i pojačalo spremno upisujemo ctx — inače bi polupripremljen
         kanal zauvek ostao nem, jer se drugi put više ne bi ni pravio */
      var c = new AC(), m = c.createGain();
      m.gain.value = 0.30;
      m.connect(c.destination);
      ctx = c; master = m;
    }
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    return ctx;
  } catch (e) { return null; }
}
/* iOS drži zvučni kanal zatvoren dok ga korisnik prvi put ne dodirne.
   Zato na prvi dodir bilo gde otvaramo kanal i pustimo nečujan zvuk. */
var otkljucan = false;
function otkljucaj() {
  if (otkljucan) return;
  var c = engine();
  if (!c) { if (on) rezervaProbudi(); return; }
  try { if (c.state === "suspended" && c.resume) c.resume(); } catch (e) { }
  try {
    var b = c.createBuffer(1, 1, 22050), src = c.createBufferSource();
    src.buffer = b; src.connect(master || c.destination); src.start(0);
  } catch (e) { }
  try {                                          // isto i za izgovor: prvi mora unutar dodira
    if (window.speechSynthesis && !GLAS._primljen) {
      GLAS._primljen = true;
      if (window.speechSynthesis.paused && window.speechSynthesis.resume) window.speechSynthesis.resume();
      var u = new SpeechSynthesisUtterance("ok");
      u.volume = 0; u.rate = 2;
      window.speechSynthesis.speak(u);
    }
  } catch (e) { }
  if (c.state === "running") otkljucan = true;
}
["pointerdown", "touchend", "mousedown", "keydown"].forEach(function (t) {
  document.addEventListener(t, otkljucaj, { passive: true, capture: true });
});
document.addEventListener("visibilitychange", function () {
  if (document.hidden) return;
  otkljucan = false;
  try { if (ctx && ctx.state === "suspended" && ctx.resume) ctx.resume(); } catch (e) { }
});

/* ---------- stil zvuka: moderno ili retro ----------
   Retro je čip iz osamdesetih: pravougaoni talas po polustepenima, stepenasto
   klizanje i jednobitni šum. Prelaz važi za sve igre odjednom. */
var STILKEY = "igre.zvukStil";
var stil = "moderno";
try { var sv = localStorage.getItem(STILKEY); if (sv === "retro" || sv === "moderno") stil = sv; } catch (e) { }
function naPolustepen(f) {
  var n = Math.round(12 * Math.log(Math.max(20, f) / 440) / Math.LN2);
  return 440 * Math.pow(2, n / 12);
}
function tonRetro(c, o) {
  try {
    var t = c.currentTime + (o.at || 0), d = Math.max(.03, (o.d || .12) * .8);
    var vol = (o.v == null ? .4 : o.v) * .6;
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = "square";
    var f0 = naPolustepen(o.f);
    osc.frequency.setValueAtTime(f0, t);
    if (o.to) {                                  // klizanje ide u koracima, kao na čipu
      var f1 = naPolustepen(o.to), k = 6;
      for (var i = 1; i <= k; i++)
        osc.frequency.setValueAtTime(naPolustepen(f0 * Math.pow(f1 / f0, i / k)), t + d * i / k);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .004);
    g.gain.setValueAtTime(vol, t + d * .72);     // ravno pa naglo, bez mekog gašenja
    g.gain.linearRampToValueAtTime(0, t + d);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + d + .02);
  } catch (e) { }
}
function sumRetro(c, o) {
  try {
    var t = c.currentTime + (o.at || 0), d = o.d || .1;
    var n = Math.max(1, Math.floor(c.sampleRate * d));
    var korak = Math.max(2, Math.round(c.sampleRate / Math.max(300, Math.min(6000, o.f || 1200))));
    var buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
    var v = 1;
    for (var i = 0; i < n; i++) {
      if (i % korak === 0) v = Math.random() < .5 ? -1 : 1;   // jedan bit, kao stari čip
      data[i] = v * (1 - i / n);
    }
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 5200; f.Q.value = .4;
    var g = c.createGain(); g.gain.value = (o.v == null ? .4 : o.v) * .5;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + d + .02);
  } catch (e) { }
}

/* ---------- rezervni zvuk, bez WebAudio ----------
   Poneki pregledač (zaključan režim na iPhonu, stroga podešavanja) uopšte nema
   WebAudio. Tada tonove sami sklopimo u mali WAV i pustimo ih običnim <audio>
   elementom — tiše i grublje, ali se čuje. */
var REZ_HZ = 11025, rezKes = {}, rezRed = [], rezMoze = null, rezBudan = false;
function rezervaMoze() {
  if (rezMoze !== null) return rezMoze;
  rezMoze = false;
  try {
    var a = document.createElement("audio");
    rezMoze = !!(a.canPlayType && a.canPlayType("audio/wav") !== "" && window.btoa);
  } catch (e) { }
  return rezMoze;
}
function talas(tip, faza) {
  var t = faza - Math.floor(faza);
  if (tip === "square") return t < .5 ? 1 : -1;
  if (tip === "sawtooth") return 2 * t - 1;
  if (tip === "triangle") return 4 * Math.abs(t - .5) - 1;
  return Math.sin(2 * Math.PI * t);
}
function uWav(uzorci) {                          // 8 bita, mono — dovoljno za pisak
  var n = uzorci.length, b = new Uint8Array(44 + n);
  function w32(p, v) { b[p] = v & 255; b[p + 1] = (v >> 8) & 255; b[p + 2] = (v >> 16) & 255; b[p + 3] = (v >> 24) & 255; }
  function w16(p, v) { b[p] = v & 255; b[p + 1] = (v >> 8) & 255; }
  function ws(p, s) { for (var i = 0; i < s.length; i++) b[p + i] = s.charCodeAt(i); }
  ws(0, "RIFF"); w32(4, 36 + n); ws(8, "WAVEfmt ");
  w32(16, 16); w16(20, 1); w16(22, 1); w32(24, REZ_HZ); w32(28, REZ_HZ); w16(32, 1); w16(34, 8);
  ws(36, "data"); w32(40, n); b.set(uzorci, 44);
  var s = "";
  for (var i = 0; i < b.length; i += 4096) s += String.fromCharCode.apply(null, b.subarray(i, i + 4096));
  return "data:audio/wav;base64," + btoa(s);
}
function rezUzorci(o, sum) {
  var d = Math.max(.03, Math.min(1.2, o.d || .12));
  var n = Math.max(1, Math.round(REZ_HZ * d));
  var a = new Uint8Array(n);
  var f0 = Math.max(20, o.f || 440), f1 = Math.max(20, o.to || f0);
  var tip = o.type || "sine", faza = 0;
  if (stil === "retro" && !sum) {                // i rezervni put ume osamdesete
    tip = "square"; f0 = naPolustepen(f0); f1 = naPolustepen(f1);
  }
  var korak = sum ? Math.max(2, Math.round(REZ_HZ / Math.max(200, Math.min(5000, o.f || 1200)))) : 0;
  var v = 1;
  for (var i = 0; i < n; i++) {
    var u = i / n, x;
    if (sum) { if (i % korak === 0) v = Math.random() < .5 ? -1 : 1; x = v; }
    else { faza += (f0 * Math.pow(f1 / f0, u)) / REZ_HZ; x = talas(tip, faza); }
    var env = Math.min(1, u / .015) * (1 - u);   // brz napad, ravnomerno gašenje
    a[i] = 128 + Math.round(120 * x * env);
  }
  return a;
}
function rezURI(o, sum) {
  var k = (sum ? "s" : "t") + "|" + stil + "|" + (o.f || 0) + "|" + (o.to || 0) + "|" +
          (o.d || 0) + "|" + (o.type || "");
  if (rezKes[k]) return rezKes[k];
  var uri;
  try { uri = uWav(rezUzorci(o, sum)); } catch (e) { return null; }
  rezKes[k] = uri; rezRed.push(k);
  while (rezRed.length > 80) { delete rezKes[rezRed.shift()]; }
  return uri;
}
function rezPusti(o, sum) {
  if (!on || !rezervaMoze()) return;
  var uri = rezURI(o, sum);
  if (!uri) return;
  var kreni = function () {
    try {
      var a = new Audio(uri);
      a.volume = Math.max(.02, Math.min(1, (o.v == null ? .4 : o.v) * .5));
      var p = a.play();
      if (p && p.catch) p.catch(function () { });
    } catch (e) { }
  };
  if (o.at) setTimeout(kreni, Math.round(o.at * 1000)); else kreni();
}
/* iOS traži da prvi zvuk krene iz dodira — zato na prvi dodir pustimo nečujan WAV */
function rezervaProbudi() {
  if (rezBudan || !rezervaMoze()) return;
  rezBudan = true;
  try {
    var a = new Audio(rezURI({ f: 440, d: .03, v: .01 }, false));
    a.volume = 0; var p = a.play(); if (p && p.catch) p.catch(function () { });
  } catch (e) { }
}

function tone(o) {
  if (!on) return;
  var c = engine(); if (!c) return rezPusti(o, false);
  if (stil === "retro") return tonRetro(c, o);
  try {
    var t = c.currentTime + (o.at || 0), d = o.d || .12, vol = o.v == null ? .4 : o.v;
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + d);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.atk || .01));
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + d + .03);
  } catch (e) { }
}
function noise(o) {
  if (!on) return;
  var c = engine(); if (!c) return rezPusti(o, true);
  if (stil === "retro") return sumRetro(c, o);
  try {
    var t = c.currentTime + (o.at || 0), d = o.d || .1;
    var n = Math.max(1, Math.floor(c.sampleRate * d));
    var buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + d);
    f.Q.value = o.q == null ? 1 : o.q;
    var g = c.createGain(); g.gain.value = o.v == null ? .4 : o.v;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + d + .02);
  } catch (e) { }
}

var SFX = {
  isOn: function () { return on; },
  set: function (x) {
    on = !!x;
    try { localStorage.setItem(SKEY, on ? "1" : "0"); } catch (e) { }
    if (on) { engine(); SFX.tap(); } else if (window.GLAS) GLAS.stani();
    paintBtn();
    if (window.GLAS) GLAS.paint();
    return on;
  },
  toggle: function () { return SFX.set(!on); },
  /* SFX.stil() vraća "moderno" ili "retro"; sa argumentom ga menja i pamti */
  stil: function (v) {
    if (v === undefined) return stil;
    stil = v === "retro" ? "retro" : "moderno";
    try { localStorage.setItem(STILKEY, stil); } catch (e) { }
    return stil;
  },
  _paintGlas: function () { if (window.GLAS) GLAS.paint(); },

  tick:    function () { tone({ f: 520, d: .05, type: "square", v: .14 }); },
  tap:     function () { tone({ f: 680, to: 900, d: .08, type: "triangle", v: .28 }); },
  good:    function () { tone({ f: 660, d: .1, type: "triangle", v: .28 }); tone({ f: 988, d: .13, type: "triangle", v: .22, at: .075 }); },
  bad:     function () { tone({ f: 210, to: 90, d: .22, type: "sawtooth", v: .22 }); },
  card:    function () { noise({ d: .07, f: 2600, to: 900, v: .3, q: .8 }); },
  shuffle: function () { for (var i = 0; i < 6; i++) noise({ d: .05, f: 2000 + Math.random() * 1400, v: .16, at: i * .045, q: .7 }); },
  whoosh:  function () { noise({ d: .22, f: 400, to: 2400, v: .2, q: .6 }); },
  coin:    function () { tone({ f: 988, d: .08, type: "square", v: .2 }); tone({ f: 1319, d: .16, type: "square", v: .18, at: .07 }); },
  stamp:   function () { noise({ d: .06, f: 320, v: .45, q: .5 }); tone({ f: 130, to: 60, d: .13, type: "square", v: .28 }); },
  reel:    function () { noise({ d: .05, f: 1800, v: .26, q: 1.2 }); tone({ f: 320, d: .05, type: "square", v: .13 }); },
  drum:    function () { for (var i = 0; i < 9; i++) noise({ d: .04, f: 190, v: .2, at: i * .07, q: 1 }); },
  engine:  function () { tone({ f: 70, to: 135, d: .5, type: "sawtooth", v: .2 }); noise({ d: .5, f: 200, to: 520, v: .1, q: .5 }); },
  siren:   function () { tone({ f: 720, to: 420, d: .34, type: "sawtooth", v: .26 }); tone({ f: 720, to: 420, d: .34, type: "sawtooth", v: .26, at: .37 }); },
  win:     function () { [523, 659, 784, 1047].forEach(function (f, i) { tone({ f: f, d: .3, type: "triangle", v: .28, at: i * .1 }); }); },
  jackpot: function () { [523, 659, 784, 1047, 1319, 1047, 1319, 1568].forEach(function (f, i) { tone({ f: f, d: .26, type: "square", v: .22, at: i * .085 }); }); },

  /* bilijar */
  kugle:  function (j) { var v = Math.max(.10, Math.min(.55, j == null ? .3 : j));
            noise({ d: .035, f: 3400, to: 1900, v: v, q: 2.2 });
            tone({ f: 1500, to: 950, d: .05, type: "square", v: v * .45 }); },
  banda:  function (j) { var v = Math.max(.08, Math.min(.45, j == null ? .25 : j));
            noise({ d: .075, f: 760, to: 260, v: v, q: 1.1 });
            tone({ f: 210, to: 110, d: .1, type: "sine", v: v * .7 }); },
  rupa:   function () { noise({ d: .09, f: 950, to: 220, v: .38, q: .8 });
            tone({ f: 280, to: 90, d: .24, type: "sine", v: .32, at: .03 }); },
  stap:   function () { noise({ d: .04, f: 2400, to: 1300, v: .34, q: 1.6 });
            tone({ f: 540, to: 260, d: .07, type: "triangle", v: .28 }); },
  /* basket — sve niže i toplije, da liči na loptu, obruč i mrežu */
  odskok: function (j) { var v = Math.max(.06, Math.min(.5, j == null ? .3 : j));
            noise({ d: .05, f: 900, to: 220, v: v * .5, q: .7, filter: "lowpass" });
            tone({ f: 132, to: 62, d: .17, type: "sine", v: v * .9, atk: .004 });
            tone({ f: 205, to: 95, d: .09, type: "triangle", v: v * .32, atk: .003 }); },
  obruc:  function (j) { var v = Math.max(.08, Math.min(.45, j == null ? .3 : j));
            tone({ f: 430, to: 402, d: .27, type: "triangle", v: v * .5, atk: .003 });
            tone({ f: 688, d: .17, type: "sine", v: v * .26, atk: .003 });
            tone({ f: 1150, d: .09, type: "sine", v: v * .11, atk: .002 });
            tone({ f: 148, to: 88, d: .13, type: "sine", v: v * .5, atk: .004 });
            noise({ d: .04, f: 1600, to: 520, v: v * .18, q: 1.2 }); },
  tabla:  function (j) { var v = Math.max(.08, Math.min(.45, j == null ? .3 : j));
            tone({ f: 258, to: 190, d: .19, type: "triangle", v: v * .7, atk: .003 });
            tone({ f: 515, d: .08, type: "sine", v: v * .22, atk: .002 });
            noise({ d: .05, f: 1100, to: 380, v: v * .26, q: .8, filter: "lowpass" }); },
  mrezica: function () { noise({ d: .18, f: 1500, to: 520, v: .15, q: .6 });
            noise({ d: .11, f: 700, to: 280, v: .09, q: .5, at: .05 }); },
  izbacaj: function () { noise({ d: .13, f: 900, to: 300, v: .11, q: .5, filter: "lowpass" }); },
  kos:    function (cist) {
            tone({ f: 392, d: .19, type: "triangle", v: .19, atk: .01 });
            tone({ f: 587, d: .27, type: "triangle", v: .15, at: .09, atk: .012 });
            if (cist) tone({ f: 784, d: .32, type: "sine", v: .12, at: .19, atk: .015 }); },
  promasaj: function () {
            tone({ f: 188, to: 118, d: .23, type: "sine", v: .18, atk: .012 });
            noise({ d: .1, f: 420, to: 170, v: .09, q: .6, filter: "lowpass" }); },
  truba:  function () {                          // rog na kraju serije, kao u hali
            for (var k = 0; k < 2; k++) {
              tone({ f: 233, d: .45, type: "sawtooth", v: .14, at: k * .55, atk: .025 });
              tone({ f: 175, d: .45, type: "triangle", v: .18, at: k * .55, atk: .025 });
              tone({ f: 117, d: .5, type: "sine", v: .16, at: k * .55, atk: .03 });
            } },
  /* rumi */
  plocica: function () { noise({ d: .045, f: 1400, to: 520, v: .2, q: .9 });
            tone({ f: 320, to: 210, d: .07, type: "triangle", v: .16, atk: .003 }); },
  /* pikado */
  strelica: function () { noise({ d: .06, f: 1600, to: 380, v: .4, q: 1.4 });
            tone({ f: 340, to: 150, d: .11, type: "triangle", v: .24 }); },
  mimo:   function () { noise({ d: .12, f: 420, to: 160, v: .3, q: .7 }); }
};
window.SFX = SFX;

/* ---------- izgovor (engleski) — „treble twenty“, „foul“, „game shot“ ---------- */
var GKEY = "igre.glas";
var glasOn = true;
try { var gv = localStorage.getItem(GKEY); if (gv !== null) glasOn = gv === "1"; } catch (e) { }
var izabranGlas = null, glasTrazen = false;
function nadjiGlas() {
  if (!window.speechSynthesis) return null;
  if (izabranGlas) return izabranGlas;
  var lista = [];
  try { lista = window.speechSynthesis.getVoices() || []; } catch (e) { }
  var redom = ["en-gb", "en-us", "en-au", "en-ie", "en"];
  for (var i = 0; i < redom.length; i++)
    for (var j = 0; j < lista.length; j++)
      if ((lista[j].lang || "").toLowerCase().replace("_", "-").indexOf(redom[i]) === 0) {
        izabranGlas = lista[j]; return izabranGlas;
      }
  return null;
}
if (window.speechSynthesis && !glasTrazen) {
  glasTrazen = true;
  try { window.speechSynthesis.addEventListener("voiceschanged", function () { izabranGlas = null; nadjiGlas(); }); } catch (e) { }
  setTimeout(nadjiGlas, 300);
}
var GLAS = {
  _primljen: false,
  moze: function () { return !!window.speechSynthesis; },
  isOn: function () { return glasOn && on && !!window.speechSynthesis; },
  set: function (x) {
    glasOn = !!x;
    try { localStorage.setItem(GKEY, glasOn ? "1" : "0"); } catch (e) { }
    if (!glasOn) GLAS.stani(); else GLAS.reci("Voice on");
    paintGlas();
    return glasOn;
  },
  toggle: function () { return GLAS.set(!glasOn); },
  stani: function () { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { } },
  reci: function (tekst, o) {
    if (!tekst || !GLAS.isOn()) return;
    o = o || {};
    var S = window.speechSynthesis;
    function spremi() {
      var u = new SpeechSynthesisUtterance(String(tekst));
      var v = nadjiGlas();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
      u.rate = o.rate || 1.02;
      u.pitch = o.pitch || 1;
      u.volume = o.volume == null ? 1 : o.volume;
      return u;
    }
    function kreni(drugiPut) {
      try {
        var u = spremi(), poceo = false;
        u.onstart = function () { poceo = true; GLAS._radi = true; };
        u.onerror = function () { poceo = true; };
        S.speak(u);
        clearTimeout(cuvar);
        if (!drugiPut) cuvar = setTimeout(function () {   // iOS ume da progura izgovor u prazno
          if (poceo || !GLAS.isOn()) return;
          try { S.cancel(); } catch (e) { }
          setTimeout(function () { kreni(true); }, 60);
        }, 320);
      } catch (e) { }
    }
    try {
      if (S.paused && S.resume) S.resume();          // zaglavljen red se odglavi
      if (o.prekini !== false && (S.speaking || S.pending)) {
        S.cancel();
        clearTimeout(cekaj);
        cekaj = setTimeout(function () { kreni(false); }, 90);   // posle prekida treba trenutak
      } else kreni(false);
    } catch (e) { }
  },
  proba: function () {
    glasOn = true;
    try { localStorage.setItem(GKEY, "1"); } catch (e) { }
    on = true;
    try { localStorage.setItem(SKEY, "1"); } catch (e) { }
    paintGlas(); paintBtn();
    GLAS._radi = false;
    GLAS.reci("Treble twenty. One hundred and eighty!", { rate: 1 });
    var lista = [];
    try { lista = window.speechSynthesis ? (window.speechSynthesis.getVoices() || []) : []; } catch (e) { }
    var v = nadjiGlas();
    return {
      moze: !!window.speechSynthesis,
      ukljucen: GLAS.isOn(),
      glasova: lista.length,
      izabran: v ? (v.name + " (" + v.lang + ")") : "podrazumevani glas telefona"
    };
  }
};
var cuvar = null, cekaj = null;
function paintGlas() {
  var b = document.getElementById("glasToggle");
  if (!b) return;
  b.textContent = glasOn ? "🗣 Najava" : "🤐 Bez najave";
  b.disabled = !window.speechSynthesis;
  b.title = window.speechSynthesis
    ? "Izgovara šta si pogodio, na engleskom"
    : "Ovaj pregledač ne ume da govori";
}
GLAS.paint = paintGlas;
window.GLAS = GLAS;

/* brojevi rečima, za najavu */
var JEDNO = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
var DESET = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function recima(n) {
  n = Math.round(n);
  if (n < 0) return "minus " + recima(-n);
  if (n < 20) return JEDNO[n];
  if (n < 100) return DESET[Math.floor(n / 10)] + (n % 10 ? "-" + JEDNO[n % 10] : "");
  var st = Math.floor(n / 100), os = n % 100;
  return JEDNO[st] + " hundred" + (os ? " and " + recima(os) : "");
}
window.RECIMA = recima;

window.IGRE = GAMES;

/* ---------- donja traka ---------- */
/* Na telefonu je stubac igre uzak namerno — palac stiže svuda. Na računaru
   je isti taj stubac izgledao izgubljeno usred praznog ekrana, pa se tamo
   raširi za četvrtinu. Svaka igra zadrži svoju meru, samo pomnoženu. */
var CSS =
'.gamenav{position:fixed;left:0;right:0;bottom:0;z-index:60;display:grid;' +
'grid-template-columns:repeat(' + (GAMES.length + 1) + ',1fr);align-items:stretch;' +
'background:var(--panel);border-top:1px solid var(--line);' +
'padding-bottom:env(safe-area-inset-bottom, 0px);box-shadow:0 -4px 18px rgba(0,0,0,.22)}' +
'.gamenav a,.gamenav button{display:flex;flex-direction:column;align-items:center;justify-content:center;' +
'gap:1px;padding:5px 1px;background:transparent;border:0;border-radius:0;color:var(--ink-dim);' +
'text-decoration:none;font:inherit;cursor:pointer;touch-action:manipulation;min-height:46px}' +
'.gamenav .e{font-size:19px;line-height:1.05}' +
'.gamenav .t{font-size:9px;letter-spacing:0;white-space:nowrap;overflow:hidden;max-width:100%;text-overflow:clip}' +
'@media (max-width:460px){.gamenav .t{display:none}.gamenav .e{font-size:20px}.gamenav a,.gamenav button{min-height:42px;padding:6px 0}}' +
'.gamenav a.on{color:var(--gold);box-shadow:inset 0 2px 0 var(--gold);' +
'background:color-mix(in srgb, var(--gold) 9%, transparent)}' +
'.gamenav button.off{opacity:.6}' +
'.gamenav a:active,.gamenav button:active{transform:none;background:color-mix(in srgb, var(--ink) 8%, transparent)}' +
'.homeBtn{display:inline-flex;align-items:center;justify-content:center;gap:4px;' +
'font:inherit;font-size:15px;color:var(--ink);background:var(--panel);border:1px solid var(--line);' +
'border-radius:10px;padding:6px 10px;text-decoration:none;cursor:pointer;touch-action:manipulation;line-height:1.2;' +
'position:relative;z-index:60}' +
'.homeBtn:active{transform:translateY(1px)}' +
/* Zaglavlje mora da stane u jedan red — inače naslov gura tablu sa ekrana. */
'header button,header .homeBtn,header .zvukBtn{white-space:nowrap;flex:0 0 auto}' +
'header>div:first-child{min-width:0}' +
'header h1,header .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'@media (max-width:360px){.zvukBtn,.homeBtn{padding:5px 7px;font-size:14px}}' +
'.zvukBtn{display:inline-flex;align-items:center;justify-content:center;' +
'font:inherit;font-size:15px;color:var(--ink);background:var(--panel);border:1px solid var(--line);' +
'border-radius:10px;padding:6px 10px;cursor:pointer;touch-action:manipulation;line-height:1.2;' +
'position:relative;z-index:60}' +
'.zvukBtn.nemo{color:var(--bad,#d65a4e);border-color:var(--bad,#d65a4e)}' +
'.zvukBtn:active{transform:translateY(1px)}' +
'@media (max-height:600px){.zvukBtn{padding:4px 8px;font-size:13px}}' +
'.zvukPoruka{position:fixed;left:10px;right:10px;margin:0 auto;max-width:360px;z-index:95;' +
'bottom:calc(var(--navh,52px) + env(safe-area-inset-bottom,0px) + 14px);' +
'background:var(--panel,#16223a);color:var(--ink,#eef2f9);' +
'border:1px solid var(--gold,#c9a227);border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45;' +
'box-shadow:0 10px 28px rgba(0,0,0,.5);text-align:center;transition:opacity .5s;cursor:pointer}' +
'.zvukPoruka.van{opacity:0}' +
'.zvukPoruka .dijag{display:inline-block;margin-top:4px;font-size:11.5px;opacity:.7;font-variant-numeric:tabular-nums}' +
'.kodBox.kodKlik{cursor:pointer;-webkit-user-select:all;user-select:all}' +
'.kodBox.kodKlik:active{filter:brightness(1.2)}' +
'.kodAlat{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:8px 0 2px}' +
'.kodAlat button{font:inherit;font-size:14px;padding:7px 12px;border-radius:10px;cursor:pointer;' +
'border:1px solid var(--line,#283a5e);background:var(--panel-2,#1b2a4a);color:var(--ink,#eef2f9)}' +
'.kodAlat button:active{transform:translateY(1px)}' +
'.kodAlat .kodKopiraj{border-color:var(--gold,#c9a227);color:var(--gold,#c9a227);font-weight:700}' +
'.kodAlat button.ok{border-color:var(--good,#2e9e6b);color:var(--good,#2e9e6b)}' +
'@media (hover:hover){.homeBtn:hover{border-color:var(--gold)}}' +
'@media (max-height:600px){.homeBtn{padding:4px 8px;font-size:13px}}' +
/* iPhone sam uveća stranicu kad tapneš u polje sa slovom manjim od 16 px, i ne vrati je
   nazad — zato su sva polja bar 16 px. touch-action gasi i uvećavanje na dvostruki tap. */
'input,textarea,select{font-size:16px !important}' +
'.imeSloj{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;' +
'background:rgba(6,11,22,.72);backdrop-filter:blur(3px);padding:18px}' +
'.imeBox{background:var(--panel,#16223a);border:1px solid var(--line,#283a5e);border-radius:16px;' +
'padding:16px;max-width:320px;width:100%;box-shadow:0 12px 30px rgba(0,0,0,.5);text-align:center}' +
'.imeBox h3{margin:0 0 6px;font-size:17px;color:var(--ink,#eef2f9)}' +
'.imeBox p{margin:0 0 10px;font-size:12px;color:var(--ink-dim,#9fb0cc)}' +
'.imeBox input{width:100%;padding:10px;border-radius:10px;border:1px solid var(--line,#283a5e);' +
'background:var(--panel-2,#1b2a4a);color:var(--ink,#eef2f9);text-align:center;font-weight:700}' +
'.imeBtns{display:flex;gap:8px;justify-content:center;margin-top:10px}' +
'.imeBtns button{padding:8px 14px;border-radius:10px;border:1px solid var(--line,#283a5e);' +
'background:var(--panel,#16223a);color:var(--ink,#eef2f9);font:inherit;cursor:pointer}' +
'.imeBtns #imeOk{border-color:var(--gold,#c9a227);color:var(--gold,#c9a227);font-weight:700}' +
'html,body{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
':root{--navh:52px;--sat:env(safe-area-inset-top, 0px)}' +
'html,body{height:auto !important}' +
/* spiskovi se skroluju: jastuk racuna i visinu trake i sigurnu zonu, pa dno ostaje
   dohvatljivo i ako merenje trake omane (iPhone ume da javi manju visinu) */
'body.duga-strana{padding-bottom:0 !important}' +
'body.duga-strana .wrap{padding-bottom:calc(var(--navh, 52px) + env(safe-area-inset-bottom, 0px) + 40px) !important}' +
'body{padding-bottom:calc(var(--navh) + 4px) !important}' +
'.wrap{min-height:calc(100dvh - var(--navh) - var(--sat) - 4px) !important}' +
'@media (orientation:landscape) and (max-height:620px){' +
':root{--navh:38px}.gamenav .t{display:none}.gamenav .e{font-size:17px}.gamenav a,.gamenav button{min-height:34px}}' +
/* pravila igre — isti prozorčić u svakoj igri */
'.uputBtn{display:inline-flex;align-items:center;justify-content:center;' +
'font:inherit;font-size:15px;color:var(--ink);background:var(--panel);border:1px solid var(--line);' +
'border-radius:10px;padding:6px 10px;cursor:pointer;touch-action:manipulation;line-height:1.2;' +
'position:relative;z-index:60}' +
'.uputBtn:active{transform:translateY(1px)}' +
'@media (hover:hover){.uputBtn:hover{border-color:var(--gold)}}' +
'@media (max-width:360px){.uputBtn{padding:5px 7px;font-size:14px}}' +
'@media (max-height:600px){.uputBtn{padding:4px 8px;font-size:13px}}' +
'header button,header .homeBtn,header .zvukBtn,header .uputBtn{white-space:nowrap;flex:0 0 auto}' +
'.pravilaSloj{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;' +
'background:rgba(6,11,22,.74);backdrop-filter:blur(3px);padding:14px}' +
'.pravilaBox{background:var(--panel,#16223a);border:1px solid var(--line,#283a5e);border-radius:16px;' +
'padding:14px 16px;max-width:420px;width:100%;max-height:82vh;overflow:auto;-webkit-overflow-scrolling:touch;' +
'box-shadow:0 12px 30px rgba(0,0,0,.55);color:var(--ink,#eef2f9)}' +
'.pravilaBox h3{margin:0 0 8px;font-size:17px}' +
'.pravilaBox ul{margin:0;padding-left:20px;font-size:14px;line-height:1.55;color:var(--ink-dim,#9fb0cc)}' +
'.pravilaBox li{margin-bottom:7px}' +
'.pravilaBox li b{color:var(--ink,#eef2f9)}' +
'.pravilaBtns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}' +
'.pravilaBtns button,.pravilaBtns a{padding:8px 14px;border-radius:10px;border:1px solid var(--line,#283a5e);' +
'background:var(--panel-2,#1b2a4a);color:var(--ink,#eef2f9);font:inherit;font-size:14px;cursor:pointer;text-decoration:none}' +
'.pravilaBtns #pravZatvori{border-color:var(--gold,#c9a227);color:var(--gold,#c9a227);font-weight:700}' +

'.topBtn{display:inline-flex;align-items:center;justify-content:center;' +
'font:inherit;font-size:15px;color:var(--ink,#eef2f9);background:var(--panel,#16223a);border:1px solid var(--line,#283a5e);' +
'border-radius:10px;padding:6px 10px;cursor:pointer;touch-action:manipulation;line-height:1.2;' +
'position:relative;z-index:60}' +
'.topBtn:active{transform:translateY(1px)}' +
'@media (max-width:430px){.zvukBtn,.homeBtn,.uputBtn,.topBtn{padding:5px 7px;font-size:14px}}' +
/* Sa pet dugmadi u zaglavlju uski telefoni traže tešnji raspored — inače red iscuri sa ekrana. */
'@media (max-width:390px){header{gap:6px}' +
'header button,header .homeBtn,header .zvukBtn,header .uputBtn,header .topBtn{padding:5px 6px;font-size:13.5px}}' +
'@media (max-width:340px){header{gap:4px}' +
'header button,header .homeBtn,header .zvukBtn,header .uputBtn,header .topBtn{padding:4px 5px;font-size:13px}}' +
'.verIgre{margin-top:4px;font-size:12px;opacity:.75;font-variant-numeric:tabular-nums}' +
'.topSloj{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;' +
'padding:16px;background:rgba(6,10,20,.72);backdrop-filter:blur(3px)}' +
'.topBox{width:min(100%,420px);max-height:86vh;overflow:auto;background:var(--panel,#16223a);' +
'color:var(--ink,#eef2f9);border:1px solid var(--line,#283a5e);border-radius:16px;padding:16px 16px 14px;' +
'box-shadow:0 18px 44px rgba(0,0,0,.5)}' +
'.topBox h3{margin:0 0 10px;font-size:17px}' +
'.topBox h4{margin:14px 0 6px;font-size:14px;color:var(--gold,#c9a227);font-weight:700}' +
'.topBox h4:first-child{margin-top:0}' +
'.topPrazno{margin:0;font-size:13.5px;color:var(--ink-dim,#9fb0cc)}' +
'.topLista{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px}' +
'.topLista li{display:flex;align-items:baseline;gap:8px;font-size:14px;' +
'background:var(--panel-2,#1b2a4a);border-radius:9px;padding:5px 9px}' +
'.topLista li .m{flex:0 0 26px;font-size:13px;color:var(--ink-dim,#9fb0cc)}' +
'.topLista li b{font-variant-numeric:tabular-nums;font-size:15px}' +
'.topLista li .ko{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-dim,#9fb0cc);font-size:13px}' +
'.topLista li small{color:var(--ink-dim,#9fb0cc);font-size:12px;white-space:nowrap}' +
'.topRed{display:flex;align-items:center;gap:10px;margin-top:16px;padding-top:12px;' +
'border-top:1px solid var(--line,#283a5e);font-size:14px}' +
'.topStil{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}' +
'.topStil button{font:inherit;font-size:13.5px;padding:6px 10px;border-radius:9px;cursor:pointer;' +
'background:var(--panel-2,#1b2a4a);color:var(--ink-dim,#9fb0cc);border:1px solid var(--line,#283a5e)}' +
'.topStil button.on{color:var(--gold,#c9a227);border-color:var(--gold,#c9a227);font-weight:700}' +
'.topSkinOpis{font-size:12px;color:var(--ink-dim,#9fb0cc);text-align:right;margin-top:-4px}' +
'.utisak{margin-top:12px;padding-top:12px;border-top:1px solid var(--line,#283a5e)}' +
'.utRed{display:flex;align-items:center;gap:10px;font-size:14px}' +
/* Uže odabrano nego što izgleda: .zvezde je previše obično ime da bi se puštalo
   svuda — ovaj sloj važi samo unutar bloka sa ocenom. */
'.utisak .zvezde{margin-left:auto;display:flex;gap:2px}' +
'.utisak .zvezde .zv{font:inherit;font-size:22px;line-height:1;padding:2px 3px;border:0;background:none;cursor:pointer;' +
'color:var(--line,#283a5e);touch-action:manipulation}' +
'.utisak .zvezde .zv.on{color:var(--gold,#c9a227)}' +
'.utisak .zvezde .zv:active{transform:translateY(1px)}' +
'.utTekst{display:block;width:100%;margin-top:8px;font:inherit;font-size:14px;line-height:1.35;' +
'padding:8px 10px;border-radius:10px;resize:vertical;' +
'background:var(--panel-2,#1b2a4a);color:var(--ink,#eef2f9);border:1px solid var(--line,#283a5e)}' +
'.utTekst:focus{outline:none;border-color:var(--gold,#c9a227)}' +
'.utHvala{margin-top:6px;font-size:12.5px;color:var(--good,#2e9e6b);text-align:right}' +
'.topVer{margin-top:10px;font-size:12.5px;color:var(--ink-dim,#9fb0cc);text-align:center;font-variant-numeric:tabular-nums}' +
'.topBtns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}' +
'.topBtns button{padding:8px 14px;border-radius:10px;border:1px solid var(--line,#283a5e);' +
'background:var(--panel-2,#1b2a4a);color:var(--ink,#eef2f9);font:inherit;font-size:14px;cursor:pointer}' +
'.topBtns #topZatvori{border-color:var(--gold,#c9a227);color:var(--gold,#c9a227);font-weight:700}';

/* Kratka lestvica koja se ne može promašiti — služi da korisnik čuje da zvuk radi. */
SFX.proba = function () {
  on = true;
  try { localStorage.setItem(SKEY, "1"); } catch (e) { }
  otkljucan = false;
  otkljucaj();
  rezervaProbudi();
  var c = engine();
  [660, 880, 1175].forEach(function (f, i) {
    tone({ f: f, d: .18, type: "triangle", v: .5, at: i * .13 });
  });
  noise({ d: .1, f: 2000, v: .3, at: .4, q: .8 });
  paintBtn();
  return SFX.stanje();
};
SFX.stanje = function () {
  return {
    ukljucen: on,
    kanal: ctx ? ctx.state : "nije otvoren",
    stil: stil,
    webaudio: !!(window.AudioContext || window.webkitAudioContext),
    rezerva: rezervaMoze(),
    govor: !!window.speechSynthesis
  };
};

/* kratka poruka preko ekrana, da korisnik zna šta se desilo */
function poruciNaEkranu(html) {
  var stari = document.querySelector(".zvukPoruka");
  if (stari) stari.remove();
  var d = document.createElement("div");
  d.className = "zvukPoruka";
  d.innerHTML = html;
  document.body.appendChild(d);
  setTimeout(function () { d.classList.add("van"); }, 4200);
  setTimeout(function () { if (d.parentNode) d.remove(); }, 4800);
  d.addEventListener("click", function () { d.remove(); });
}
SFX.poruka = poruciNaEkranu;

function paintBtn() {
  var b = document.getElementById("sndBtn");
  if (!b) return;
  b.querySelector(".e").textContent = on ? "🔊" : "🔇";
  b.querySelector(".t").textContent = on ? "Zvuk" : "Nemo";
  b.classList.toggle("off", !on);
  b.setAttribute("aria-pressed", on ? "true" : "false");
  b.title = on ? "Isključi zvuk" : "Uključi zvuk";
  paintZvukBtn();
}
function paintZvukBtn() {
  var lista = document.querySelectorAll(".zvukBtn");
  for (var i = 0; i < lista.length; i++) {
    lista[i].textContent = on ? "🔊" : "🔇";
    lista[i].title = on ? "Zvuk je uključen — dodirni da utišaš" : "Zvuk je isključen — dodirni da uključiš";
    lista[i].classList.toggle("nemo", !on);
  }
}
/* kratak opis stanja, da se sa slike ekrana vidi šta tačno fali */
function dijagnoza(st) {
  return "wa=" + (st.webaudio ? 1 : 0) + " rez=" + (st.rezerva ? 1 : 0) +
         " kanal=" + st.kanal + " stil=" + st.stil;
}
/* jedno dugme za zvuk radi svuda isto: pali, proba i kaže šta je zatekao */
function prekidacZvuka() {
  if (on) {
    SFX.set(false);
    poruciNaEkranu("🔇 <b>Zvuk isključen.</b>");
    return;
  }
  var st = SFX.proba();
  if (!st.webaudio && !st.rezerva)
    return poruciNaEkranu("⚠️ <b>Ovaj pregledač ne da zvuk.</b><br>" +
      "Nema ni WebAudio ni običan zvučni zapis — na iPhonu to obično znači " +
      "<b>Zaključani režim</b> (Podešavanja → Privatnost i bezbednost)." +
      '<br><span class="dijag">stanje: ' + dijagnoza(st) + "</span>");
  poruciNaEkranu("🔊 <b>Zvuk uključen</b> — čuo si tri tona?<br>" +
    (st.webaudio ? "" : "Ovaj pregledač nema WebAudio, pa idemo <b>rezervnim putem</b> — zvuk je grublji.<br>") +
    (st.kanal === "suspended" ? "Zvučni kanal je još zatvoren — dodirni ekran još jednom.<br>" : "") +
    "Ako nisi čuo ništa: pojačaj dugmićima sa strane i proveri <b>mali prekidač iznad njih</b> " +
    "(kad je na crveno, telefon ćuti)." +
    (st.webaudio && st.kanal === "running" ? "" : '<br><span class="dijag">stanje: ' + dijagnoza(st) + "</span>"));
}
SFX.prekidac = prekidacZvuka;

function measure() {                      // stvarna visina trake → --navh (safe-area je već u njoj)
  var nav = document.querySelector(".gamenav");
  if (!nav) return;
  var h = Math.ceil(nav.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty("--navh", h + "px");
}
/* iOS ume da doda sigurnu zonu tek posle prvog crtanja — zato merimo i kasnije,
   i pratimo svaku promenu visine trake, da dno strane nikad ne ostane ispod nje */
function pratiTraku() {
  var nav = document.querySelector(".gamenav");
  if (!nav) return;
  if (window.ResizeObserver) {
    try { new ResizeObserver(measure).observe(nav); } catch (e) { }
  }
  [60, 250, 800, 2000].forEach(function (ms) { setTimeout(measure, ms); });
  window.addEventListener("load", measure);
  window.addEventListener("pageshow", measure);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) setTimeout(measure, 60); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", measure);
}

/* ---------- pravila svake igre (dugme ❔ u zaglavlju) ----------
   Kratko uputstvo baš za igru koja je otvorena; opšta pomoć (soba, offline)
   ostaje na pomoc.html, a odavde do nje vodi dugme. */
var PRAVILA = {
  sudoku: ["🔢 Sudoku", [
    "U svakom <b>redu</b>, svakoj <b>koloni</b> i svakom <b>kvadratu 3×3</b> stoje cifre od 1 do 9, svaka tačno jednom.",
    "Tapni polje pa cifru ispod table. <b>⌫</b> briše, <b>↶</b> vraća potez.",
    "<b>✎ Beleške</b> — cifre se upisuju sitno, kao podsetnik šta sve može u to polje.",
    "<b>💡 Savet</b> popunjava jedno polje umesto tebe; broj grešaka se broji.",
    "Težina se bira gore levo; nova zagonetka uvek ima tačno jedno rešenje."
  ]],
  solitaire: ["🎴 Soliter (Klondike)", [
    "Cilj: sva četiri <b>temelja</b> gore desno složiti od keca do kralja, po bojama.",
    "U kolonama se slaže <b>naniže i naizmenično crveno-crno</b>; prazna kolona prima samo kralja.",
    "Tapni kartu pa je tapni <b>drugi put</b> — sama nađe gde može. Ili tapni kartu pa odredište.",
    "<b>Vuci 1 / Vuci 3</b> gore levo: koliko karata izlazi sa špila. U „Vuci 1“ se na otpadu vidi jedna karta, u „Vuci 3“ tri.",
    "<b>💡 Potez</b> nalazi potez, <b>↶ Poništi</b> vraća, <b>⏫ Završi</b> sam slaže kad su sve karte otvorene, <b>⟲ Isti špil</b> deli isto deljenje ispočetka."
  ]],
  kolona: ["🚧 Kolona", [
    "Stojiš u koloni na prelazu i biraš traku. Cilj je <b>proći za što manje minuta</b>.",
    "Svaki tap na <b>⏳ sačekaj minut</b> je jedan minut. Rampa obrađuje: 🚗 1′ · 🚐 2′ · 🚌 3′ · 🚚 4′, a 🔍 pregled dodaje +3′.",
    "<b>⬅ levo</b> i <b>desno ➡</b> menjaju traku — ali staješ <b>na kraj</b> nove trake.",
    "I drugi vozači menjaju trake, pa procena nije uvek tačna: rizik je deo igre.",
    "<b>📅 Dnevna kolona</b> je ista za sve tog dana — rezultat se poredi; <b>🎲 Slobodna igra</b> je nasumična."
  ]],
  aparat: ["🎰 Aparat", [
    "Krediti su <b>virtuelni</b> i ništa ne vrede. Kad ih potrošiš, <b>＋100</b> ih vrati, a <b>⟲</b> te vrati na početnih 100.",
    "<b>🃏 Poker:</b> uzmeš pet karata, tapneš one koje <b>zadržavaš</b>, pa DELI još jednom. Isplata piše ispod: par (J+) 1× … rojal 250×.",
    "<b>🍒 Voćkice:</b> pet linija (tri reda i dve dijagonale). Tri ista na liniji plaćaju po tabeli, ulog je po liniji.",
    "Posle dobitka ide <b>duplanje</b>: pogodiš boju — duplo, promašiš — nema ništa. Možeš i odmah da naplatiš.",
    "Ulog se bira dugmićima iznad; statistika ispod pamti kako ti ide."
  ]],
  svercer: ["🚬 Švercer", [
    "Pet tura. U svakoj natovariš <b>gepek od 8 mesta</b> i voziš kroz <b>tri punkta</b>.",
    "Vrednija roba nosi <b>veći rizik pregleda</b>. Na punktu vidiš raspoloženje carinika i još uvek smeš da baciš robu kroz prozor.",
    "Posle svakog prođenog punkta biraš: <b>prodaj tu</b> (×1,5 pa ×2) ili <b>teraj do pijace</b> (×3).",
    "Padneš li na pregledu — <b>sve ti uzmu</b> za tu turu. Zato se zna kad je dosta.",
    "<b>📅 Dnevna sezona</b> je ista za sve tog dana; na kraju se rezultat poredi sa „savršenim švercerom“."
  ]],
  tetris: ["🧱 Tetris", [
    "Slažeš kockice tako da <b>popuniš ceo red</b> — pun red nestaje i nosi bodove.",
    "Dugmad ispod: <b>◀ ▶</b> pomeraju, <b>⟳</b> okreće, <b>▼</b> spušta brže, <b>⤓</b> tresne do dna.",
    "<b>↹ sačuvaj</b> odloži komad za kasnije. Sa strane se vidi šta sledi.",
    "Više redova odjednom nosi više bodova; sa nivoom komadi padaju brže.",
    "Igra se pamti posle svakog spuštenog komada — <b>▶ Nastavi</b> te vraća gde si stao."
  ]],
  avioni: ["✈️ Avioni", [
    "Prevlačiš prstom po ekranu da voziš avion; <b>puca sam</b>, ne moraš da držiš dugme.",
    "Pokupi <b>nadogradnje oružja</b> koje padaju — topovi, laser, rakete, fazer; isto oružje dvaput je jače.",
    "<b>☢️ nuklearka</b> čisti ceo ekran — jednom po nivou, kad zagusti.",
    "Svaki nivo se završava <b>bosom</b>; on ima svoj obrazac napada, uči se izbegavanje.",
    "<b>⏸</b> pauzira. Nivo, poeni, životi i oružje se pamte — <b>▶ Nastavi</b> vraća partiju."
  ]],
  cigle: ["🕹️ Cigle", [
    "<b>Prevlači prstom</b> ispod palice da je pomeriš, tapni da ispališ lopticu.",
    "Cigle: <b>zelena</b> puca iz prve, <b>žuta</b> traži dva, <b>crvena</b> tri udarca; <b>siva čelična</b> obično stoji kao zid.",
    "Bonusi padaju: 🟦 šira palica, ⬤ tri loptice, 🐢 sporije, 🔫 pištolj, ❤️ život.",
    "<b>🔩 Čelična lopta</b> — sedam sekundi lopta ruši sve iz prve i <b>probija i beton</b>, ne odbija se od cigala. Pada češće kad iza betona ostane samo nekoliko cigala.",
    "Ugao odbijanja zavisi od toga <b>gde loptica pogodi palicu</b> — tako biraš smer.",
    "<b>🏁 Trka u dvoje</b> — isti nivo na dva telefona preko sobe, gleda se ko brže odmakne."
  ]],
  stvorenja: ["🐉 Bića", [
    "Šetaj mapom strelicama i ulazi u <b>🍀 travu</b> — tamo iskaču divlja stvorenja.",
    "U borbi ih prvo <b>oslabi</b>, pa baci <b>🔮 loptu</b> da ih uhvatiš. Tim ide do šest.",
    "Tipovi: 🔥 tuče 🌿, 🌿 tuče 💧, 💧 tuče 🔥 — u prednosti je <b>dvostruka šteta</b>.",
    "Na nivou 12 se većina <b>razvija</b>. Kod <b>💚 vidara</b> se lečiš, a cilj su <b>🏛️ tri arene</b>.",
    "<b>👥</b> pokazuje tim i statistiku, <b>⟲</b> počinje sasvim novu igru."
  ]],
  tablic: ["🃏 Tablić", [
    "Kartom iz ruke <b>uzimaš</b> karte sa stola: ili istu vrednost, ili više karata čiji je <b>zbir</b> jednak tvojoj.",
    "<b>Kec vredi 1 ili 11</b> — kecom se uzimaju i 8 i 3 zajedno, i sam kec sa stola.",
    "Ako ne uzimaš, karta se <b>odlaže</b> na sto. Ko pokupi sve sa stola ima <b>tablu</b>.",
    "Poeni na kraju: karo 10 i tref 2 posebno, kečevi, pa bod onome ko ima <b>više karata</b>.",
    "<b>🌐 Igra u sobi</b> — <b>dvoje, troje ili četvoro</b>, svako na svom telefonu, uz 💬 poruke ostalima. Karte se dele svima po šest, a red ide u krug.",
    "Tri poena za najviše karata dobija samo onaj ko ih ima sam — kad je izjednačeno, ti poeni propadaju."
  ]],
  jamb: ["🎲 Jamb", [
    "Bacaš pet kocki, do <b>tri puta</b> po potezu; između bacanja zadržavaš koje hoćeš.",
    "Rezultat upisuješ u polje po kolonama: <b>naniže</b>, <b>naviše</b>, <b>slobodno</b> i <b>najava</b>.",
    "<b>Najava</b> se kaže posle prvog bacanja i mora se ispuniti baš to polje — nosi najviše.",
    "Gore idu jedinice do šestica (dovoljan zbir nosi bonus), dole kenta, ful, poker i jamb.",
    "U sobi igraju do <b>četiri igrača</b>, svako na svom telefonu; ima i dugme za poruke."
  ]],
  geo: ["🌍 Geo", [
    "Kviz iz geografije: zastave, glavni gradovi, reke, mora, planine, granice.",
    "<b>Vežbanje</b> je samo za tebe i pamti dokle si stigao; <b>kviz u sobi</b> ide na vreme, do četvoro igrača.",
    "Posle svakog pitanja piše šta je tačno — i zašto, kad je zeznuto.",
    "Oblasti i broj pitanja biraju se na početnom ekranu.",
    "U sobi svi vide isto pitanje u isto vreme i tabelu posle svakog kruga."
  ]],
  pikado: ["🎯 Pikado", [
    "Igra se <b>501</b>, oduzima se, a izlazi se <b>na duplo</b>.",
    "Nišan se pomera <b>prevlačenjem prsta</b>, a strelica ide <b>tapom</b>. Ruka se ljulja — zato se cilja mirno i kratko.",
    "Ako je uključen žiroskop, nagib telefona pomera nišan; može i bez njega, samo prstom.",
    "U sobi svi imaju <b>istu mirnoću ruke</b> i po <b>10 sekundi</b> na strelicu.",
    "Na kraju lega ide <b>statistika</b>: prosek za tri strelice, najbolji krug, koliko trostrukih dvadesetica i bulova. Pod <b>⚙︎</b> se pali glasovna najava."
  ]],
  bilijar: ["🎱 Bilijar", [
    "<b>Osmica</b> ili <b>snuker</b>, protiv računara (tri težine) ili udvoje u sobi.",
    "Smer se bira <b>prevlačenjem</b>, jačina klizačem, a na kugli se prstom namešta <b>felš</b> — gore/dole i levo/desno.",
    "Felš menja belu posle udara: donji je vraća nazad, gornji je gura napred, bočni je skreće.",
    "U osmici prvo svoje kugle (pune ili polupune), pa <b>osmica na kraju</b>.",
    "U snukeru ide crvena pa boja; posle poslednje crvene boje idu <b>redom</b>. Faul poklanja poene protivniku. U meniju pod <b>🔈</b> se pali najava šta je palo."
  ]],
  covece: ["🔴 Čoveče, ne ljuti se", [
    "Cilj je izvesti sve <b>četiri figure</b> iz kuće, obići tablu i ući u svoja četiri polja u sredini.",
    "<b>Šestica izvodi</b> figuru iz kuće i uvek donosi novo bacanje. Ako su ti sve figure u kući, imaš tri pokušaja da je dobiješ.",
    "Ko stane na <b>tuđu figuru</b> — vraća je kući. Na svoju ne sme, to polje je zauzeto.",
    "U cilj se ulazi <b>tačnim brojem</b>; ako je previše, taj potez ne može.",
    "Kad ima više mogućnosti, dodirni figuru koju hoćeš da pomeriš; kad je samo jedna, igra je odigra sama.",
    "Igra se <b>protiv računara</b>, <b>na jednom telefonu</b> u dvoje do četvoro, ili <b>🌐 u sobi</b> — prazna mesta tada vodi računar."
  ]],
  rumi: ["🀄 Rumi", [
    "Igra sa <b>106 pločica</b>: brojevi 1—13 u četiri boje, svaki po dva puta, i <b>dva džokera</b>. Svako počinje sa 14 pločica.",
    "Slažu se dve stvari: <b>niz</b> — tri i više uzastopnih brojeva iste boje (jedinica je najmanja, posle 13 se ne nastavlja), i <b>grupa</b> — isti broj u tri ili četiri različite boje.",
    "<b>Prvi izlazak</b> mora da vredi bar <b>30 poena</b> i to samo iz svoje ruke — tada se ne sme dirati ono što je već na stolu.",
    "Posle izlaska se sto sme <b>preslagati kako god</b>: razbij niz, uzmi pločicu iz grupe od četiri, spoji i razdvoji — samo na kraju poteza svaki skup mora biti ispravan i moraš spustiti bar jednu svoju pločicu.",
    "<b>Džoker</b> menja bilo koju pločicu. Skida se sa stola samo onom pločicom koju baš zamenjuje, <b>i to iz tvoje ruke</b> — ista pločica koja već stoji negde na stolu ga ne skida. Kad ga uzmeš, mora odmah nazad na sto, u istom potezu.",
    "Ako ne možeš (ili nećeš) da igraš — <b>vučeš jednu</b> pločicu i <b>potez je time završen</b>: posle vučenja se ništa ne spušta na sto, igra sledeći. Izvučena pločica ostaje <b>uokvirena zlatnim okvirom</b> u tvojoj ruci <b>kroz ceo protivnikov potez</b>, da se vidi šta je došlo; kad red opet dođe na tebe, okvir nestaje — jer tada potez tek počinje.",
    "<b>✓ Gotovo</b> prolazi samo ako si spustio bar jednu pločicu iz ruke. Ako nemaš šta da spustiš, potez se završava dugmetom <b>🁢 Vuci</b>, ne dugmetom „Gotovo“.",
    "Partija u sobi se <b>pamti zajedno sa kodom</b>: ako telefon izbaci stranicu iz memorije, na spisku stoji „Nastavi partiju“ sa kodom, i pritiskom na njega se ista soba otvara istim kodom. Ostali se vrate tim kodom i nastavlja se tamo gde je stalo.",
    "<b>↩ Vrati</b> skida <b>jedno</b> pomeranje, ne ceo potez — pritiskaj dok se ne vratiš dokle želiš; u broju uz dugme piše koliko koraka ima unazad. <b>⇅ Sortiraj</b> radi i dok protivnik igra.",
    "Ako pre toga <b>izabereš pločice</b>, dugme pređe u <b>↩ Vrati izabrano</b> i vraća <b>baš njih</b> tamo odakle su krenule ovog poteza — svoje u ruku, zatečene u svoj skup i na svoje mesto. Tako se ispravi jedna pogrešno spuštena pločica bez razvaljivanja ostatka.",
    "Kad protivnik odigra, <b>ono što je promenio na stolu zasija zlatnim okvirom</b> — i nove pločice i skupovi koje je presložio. Okvir sam izbledi posle nekoliko sekundi, ili čim ti pomeriš prvu pločicu.",
    "Ko prvi ostane bez pločica viče <b>Rumi!</b> — dobija zbir svih tuđih pločica, a ostali gube svoje (džoker u ruci je 30). Ako se špil isprazni i niko ne može, pobeđuje ko ima najmanje.",
    "Igra se <b>protiv računara</b>, <b>na jednom telefonu</b> (telefon se predaje) ili <b>🌐 u sobi</b> do četiri igrača. Ako se u sobi desi da <b>oba telefona čekaju jedan drugoga</b>, otvori 🌐 i pritisni <b>↻ Uskladi partiju</b> — ne mora se izlaziti iz sobe."
  ]],
  zastave: ["🚩 Zastave", [
    "Deset pitanja, uz svako <b>tri ponuđena odgovora</b>. Nema kazne za promašaj — broji se koliko si tačnih skupio.",
    "Bira se <b>vrsta pitanja</b>: <b>🚩 Zastave</b> (vidiš zastavu, pogađaš državu), <b>💰 Valute</b> (vidiš državu, pogađaš čime se tamo plaća), <b>🏛 Glavni gradovi</b> ili <b>🎲 Sve pomešano</b>.",
    "Pogrešni odgovori se biraju <b>sa istog kontinenta</b> kad god ih ima — tako se ne pogađa po izgledu nego se stvarno mora znati.",
    "Tačan odgovor svetli zeleno, a kad promašiš, prikaže se koji je tačan pa se ide dalje.",
    "Svaka vrsta pitanja ima <b>svoju top listu</b> i svoj lični rekord, pa se rezultati ne mešaju.",
    "<b>🌐 Igra u sobi</b> — do <b>četvoro</b> igrača, svako na svom telefonu. Svi vide isto pitanje i iste ponuđene odgovore; kad svi odgovore (ili istekne vreme), otkriva se tačan i vidi se ko je šta izabrao.",
    "U sobi pobeđuje ko ima <b>više tačnih</b>; ako je isto, gore je onaj kome je trebalo manje vremena.",
    "Sam sa sobom igra radi i bez interneta."
  ]],
  basket: ["🏀 Basket", [
    "Slobodna bacanja sa prave linije: <b>4,6 m</b> do table, obruč na <b>3,05 m</b>, prava lopta i prava gravitacija. Lopta polazi sa visine sa koje je čovek ispušta, oko 2 m.",
    "Bira se <b>👁 pogled</b>. <b>Sa strane</b> — vidi se ceo luk, povlačenjem se biraju i ugao i jačina. <b>Iz prvog lica</b> — gledaš pravo u koš, luk je stalan, a povlačenjem biraš <b>jačinu i pravac</b>, pa se promašuje i levo i desno.",
    "<b>Povuci prstom</b> od lopte prema košu. Tanka tačkasta putanja pokazuje kuda kreće luk, a iz prvog lica i koliko ide u stranu.",
    "Pogodak nosi <b>2 poena</b>, a <b>čist koš</b> (bez table i bez obruča) <b>3</b>. Od trećeg uzastopnog koša ide 🔥 i svaki nosi poen više.",
    "Serija je <b>10 ili 20 lopti</b>; najbolji rezultat se pamti posebno za svaku seriju i težinu.",
    "Težina: <b>lako</b> — miran koš i duža pomoćna putanja; <b>srednje</b> — kratka pomoć; <b>teško</b> — <b>vetar</b> i koš koji se <b>pomera</b> levo-desno.",
    "Lopta se odbija o obruč i tablu kao prava — može da se uđe i preko table. Zvuci su iz sale: tup udar o parket, zvonjava obruča, šuštanje mreže i rog na kraju serije.",
    "<b>🌐 Igra u sobi</b> — do četiri igrača šutiraju istu seriju, svako svojim tempom, i vide ko koliko ima."
  ]],
  riziko: ["⚔️ Riziko", [
    "Svet je podeljen na <b>41 oblast</b> u šest kontinenata; cilj je držati zadati deo karte — <b>50%, 70% ili sve</b>.",
    "Potez ima tri dela: <b>pojačanja</b> (dodirni svoju oblast pa dodaj vojsku, ili ▣ rasporedi sve odjednom), <b>napad</b> i jedno <b>prebacivanje</b>.",
    "Napad: dodirni svoju oblast (treba bar <b>2 vojske</b>), pa susednu protivničku. 🎲 <b>Napadni</b> baca jednom, ⚡ <b>Do kraja</b> dok neko ne padne.",
    "Napadač baca do <b>tri kockice</b>, branilac do <b>dve</b>; poredi se najveća sa najvećom. <b>Nerešeno brani</b> — gubi napadač.",
    "Kad oblast padne, u nju prelazi sva vojska osim jedne. Ko drži <b>ceo kontinent</b>, svaki potez dobija dodatnu vojsku (Azija 7, Evropa 5, Severna Amerika 4, Afrika i Južna Amerika 3, Okeanija 2).",
    "Karta se <b>pomera prevlačenjem</b> i zumira sa <b>dva prsta</b>; <b>isprekidane linije</b> su prelazi preko mora (npr. Brazil — Zapadna Afrika).",
    "Igra se <b>protiv računara</b>, <b>na jednom telefonu</b> ili <b>🌐 u sobi</b> do četiri igrača — prazne stolice vodi računar."
  ]],
  mapa: ["🗺 Mapa", [
    "Pitanje kaže koju <b>državu ili grad</b> tražimo — ti dodirneš mesto na karti i potvrdiš.",
    "Poeni idu <b>po udaljenosti</b>: najviše 1000 po pitanju. Kod država je pun pogodak ako dodirneš bilo gde unutar zemlje.",
    "Karta se <b>pomera prevlačenjem</b>, a zumira sa <b>dva prsta</b> ili dugmićima ＋ − ; 🌍 vraća ceo svet.",
    "Bira se oblast (ceo svet, Evropa ili naš kraj), šta se pita (države, gradovi ili mešano) i težina.",
    "<b>⏱ Vreme</b> po pitanju je izbor: bez žurbe, 10 ili 20 sekundi. Kad sat istekne, važi ono što si pribo — a ako nisi ništa, pitanje nosi nula.",
    "Posle odgovora vidiš tačno mesto, crtu do svog pribadanja i koliko si kilometara promašio.",
    "<b>🌐 Igra u sobi</b> — do četiri igrača dobiju ista pitanja i vide ko je bio bliži."
  ]],
  teren: ["🟩 Teren", [
    "Izađi iz svoje boje, napravi krug i vrati se na svoje — <b>sve unutar kruga postaje tvoje</b>.",
    "Dok si napolju, za tobom stoji <b>trag</b>: ko ga pregazi, gotov si. Tako i ti obaraš protivnika — preseci njegov trag.",
    "<b>Oboreni protivnici</b> se broje: koliko si ih oborio piše 🎯 u zaglavlju dok igraš, na kraju partije i na svojoj top-listi.",
    "Smer se menja <b>prevlačenjem prsta</b> — kao palica, u bilo kom pravcu, pa se ide i <b>ukoso</b>, glatko, bez skokova po poljima. Tipke ispod daju četiri strane, a dve pritisnute zajedno dijagonalu. Uz ivicu table se klizi, ne gine — ali sopstveni trag ubija.",
    "Tabla je <b>mnogo veća od ekrana</b> — ekran prati tvoju glavu, a cela tabla i svi igrači se vide na <b>mapici u desnom uglu</b>.",
    "Po tabli su <b>skriveni dragulji</b>: vide se tek kad im priđeš. 🛡 štit — deset sekundi te niko ne može oboriti · ⚡ brzina · ❄ led (protivnici uspore) · 💎 parče terena odmah.",
    "Cilj se bira: <b>20, 30, 40, 50 ili 60%</b> table. Ko prvi stigne — pobedio je.",
    "<b>🌐 Igra u sobi</b> — do <b>četiri igrača</b> na istoj tabli, svako na svom telefonu; ko izgubi teren, vraća se na novo mesto i partija ide dalje."
  ]],
  kuca: ["🛋 Kuća", [
    "Nameštaj se <b>prevlači</b> u sobu koja mu odgovara — kuhinja, spavaća, dnevna, kupatilo.",
    "Tapni komad pa ga okreni dugmetom <b>⟳</b>, a veličinu menjaj sa <b>⬌</b> i <b>⬍</b>.",
    "Komadi se lepe za mrežu i <b>naslanjaju leđima na zid</b> kad im je tu mesto — krevet, orman, sudopera.",
    "<b>Slagalica</b> ima zadatak i proverava se, a u <b>slobodnom uređivanju</b> radiš šta hoćeš i sve se pamti.",
    "<b>🏠 Drugi plan</b> daje novi raspored soba."
  ]]
};

/* ---------- verzija svake igre ----------
   Svaka igra ima svoj broj koji raste kad je doradimo; vidi se u podnožju
   strane i u prozorčiću 🏆. Uz njega ide i verzija celog kompleta (sw.js). */
var VERZIJE = {
  sudoku: "1.0", solitaire: "1.3", kolona: "1.0", aparat: "1.3", svercer: "1.0",
  tetris: "1.0", avioni: "1.0", cigle: "1.3", stvorenja: "1.0", tablic: "1.7",
  jamb: "1.4", geo: "1.4", pikado: "1.4", bilijar: "1.4", kuca: "1.0",
  teren: "1.4", mapa: "1.3", covece: "1.4", riziko: "1.3", basket: "1.3", rumi: "2.4", zastave: "1.1"
};


/* ---------- skin: izgled svih igara odjednom ----------
   Igre boje uzimaju iz istih promenljivih (--bg, --panel, --ink…), koje svaka
   definiše u svom :root. Skin ih prepisuje sa jačeg mesta: html[data-skin=…]
   pobeđuje :root, a html[data-skin=…] [data-theme=light] pobeđuje svetlu temu
   igre. Zato skin i tema rade jedno pored drugog — svaki skin ima obe.
   Prima se odmah pri učitavanju, pre prvog crtanja, da nema treptaja. */
var SKINKEY = "igre.skin";
var SKINOVI = [
  { id: "klasik", nm: "Klasik", em: "🌙", opis: "mirno plavo, kao do sada" },
  { id: "neon",   nm: "Neon",   em: "🕹", opis: "arkada: ljubičasto i sjaj" },
  { id: "papir",  nm: "Papir",  em: "📜", opis: "toplo, kao društvena igra" }
];
var BOJE_SKINA = {
  neon: {
    tamno: "--bg:#07060f;--panel:#12102a;--panel-2:#1b1740;--ink:#eaf6ff;--ink-dim:#a99ce0;" +
           "--line:#392f88;--gold:#ffd23f;--good:#2ee6a8;--bad:#ff5c7a;" +
           "--filc:#1b1140;--filc-2:#120b2e;" +
           "--shadow:0 0 0 1px rgba(126,96,255,.22),0 10px 30px rgba(108,60,255,.38)",
    svetlo: "--bg:#f3f0ff;--panel:#ffffff;--panel-2:#ece5ff;--ink:#1a1040;--ink-dim:#544396;" +
            "--line:#d5c8fb;--gold:#7d4f00;--good:#0d6f4f;--bad:#b81440;" +
            "--filc:#2d2070;--filc-2:#221859;" +
            "--shadow:0 1px 2px rgba(60,30,140,.08),0 6px 18px rgba(60,30,140,.12)"
  },
  papir: {
    tamno: "--bg:#22190f;--panel:#33261a;--panel-2:#403022;--ink:#f7eddb;--ink-dim:#c9b394;" +
           "--line:#5a4530;--gold:#e0ad4c;--good:#79b070;--bad:#dc7358;" +
           "--filc:#43331f;--filc-2:#332616;" +
           "--shadow:0 1px 0 rgba(255,255,255,.04),0 8px 24px rgba(0,0,0,.45)",
    svetlo: "--bg:#f4ecdc;--panel:#fffaf0;--panel-2:#efe4cf;--ink:#33291c;--ink-dim:#6d5c45;" +
            "--line:#dccdae;--gold:#8a5f12;--good:#356b3e;--bad:#9c3c31;" +
            "--filc:#5c4526;--filc-2:#48351c;" +
            "--shadow:0 1px 2px rgba(60,45,25,.08),0 6px 18px rgba(60,45,25,.12)"
  }
};
function skinSada() {
  try { var v = localStorage.getItem(SKINKEY); if (v && BOJE_SKINA[v]) return v; } catch (e) { }
  return "klasik";
}
function skinCSS() {
  var out = "";
  for (var id in BOJE_SKINA) {
    var b = BOJE_SKINA[id], h = 'html[data-skin="' + id + '"]';
    out += h + "{" + b.tamno + "}" +
           h + ' [data-theme="dark"]{' + b.tamno + "}" +
           h + ' [data-theme="light"]{' + b.svetlo + "}";
  }
  return out;
}
function primeniSkin(id) {
  var d = document.documentElement;
  if (id === "klasik") d.removeAttribute("data-skin"); else d.setAttribute("data-skin", id);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    var b = BOJE_SKINA[id];
    meta.content = b ? (/--bg:([^;]+)/.exec(b.tamno) || [])[1] || "#0e1626" : "#0e1626";
  }
}
/* ---------- karte: jedno lice za sve kartaške igre ----------
   Izgled je po pravoj špilu: u gornjem levom uglu broj pa znak ispod njega, isto
   to okrenuto naglavačke u donjem desnom, a po sredini onoliko znakova koliko
   karta vredi — donja polovina okrenuta, kao na pravoj karti. Figure (J, Q, K)
   su nacrtane, i to dvoglavo: gornja polovina se preslika u donju.
   Igra samo kaže KARTE.lice(rang, znak, broj) i postavi --kw na širinu karte. */
var KARTE = (function () {
  /* Tri kolone i sedam redova, kao na pravoj špilu. Brojevi su delovi polja. */
  var MESTA = {
    1:  [[.5, .5]],
    2:  [[.5, 0], [.5, 1]],
    3:  [[.5, 0], [.5, .5], [.5, 1]],
    4:  [[0, 0], [1, 0], [0, 1], [1, 1]],
    5:  [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
    6:  [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
    7:  [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
    8:  [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
    9:  [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
    10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]]
  };
  function uglovi(rang, znak) {
    var jedan = '<b>' + rang + '</b><i>' + znak + '</i>';
    return '<span class="kUgao gore">' + jedan + '</span>' +
           '<span class="kUgao dole">' + jedan + '</span>';
  }
  function znaci(broj, znak) {
    var l = MESTA[broj] || [], h = "";
    for (var i = 0; i < l.length; i++) {
      var x = l[i][0], y = l[i][1];
      /* Ispod sredine znak stoji naglavačke — tako je i na pravoj karti. */
      h += '<i style="left:' + (x * 100).toFixed(2) + '%;top:' + (y * 100).toFixed(2) + '%' +
           (y > .5 ? ';--okret:180deg' : '') + '">' + znak + '</i>';
    }
    return '<span class="kZnaci">' + h + '</span>';
  }
  /* Gornja polovina figure; donja je ista, samo okrenuta oko sredine — kao na
     pravoj karti, koja se čita sa obe strane. */
  function polaFigure(rang, znak) {
    var kapa;
    if (rang === "K")
      kapa = '<path d="M18.5 14.4 L18.5 5.4 L23.5 9.6 L26.8 2.4 L30 8 L33.2 2.4 L36.5 9.6 L41.5 5.4 L41.5 14.4 Z"/>' +
             '<circle cx="26.8" cy="1.8" r="1.6" stroke="none"/><circle cx="33.2" cy="1.8" r="1.6" stroke="none"/>';
    else if (rang === "Q")
      kapa = '<path d="M19 14.4 L19 6 Q24 9.8 26.9 3.6 Q30 7.6 33.1 3.6 Q36 9.8 41 6 L41 14.4 Z"/>' +
             '<circle cx="26.9" cy="2.6" r="1.6" stroke="none"/><circle cx="33.1" cy="2.6" r="1.6" stroke="none"/>';
    else
      kapa = '<path d="M18.5 14.4 L18.5 8 Q30 1.4 41.5 8 L41.5 14.4 Z"/>' +
             '<path d="M41 7.4 Q47.5 4.4 50 1" fill="none" stroke-width="2" stroke-linecap="round"/>';
    /* Trup ide sve do sredine karte, pa se sa svojom preslikanom polovinom
       spaja u jedno telo — kao na pravoj figuri koja se čita sa obe strane. */
    var ruka = rang === "K"
      ? '<path d="M14 45 L14 26 M10.6 29.6 L17.4 29.6" fill="none" stroke-width="1.8" stroke-linecap="round"/>'
      : rang === "Q"
        ? '<circle cx="14" cy="28" r="2.6" fill="none" stroke-width="1.6"/><path d="M14 30.8 L14 45" fill="none" stroke-width="1.6" stroke-linecap="round"/>'
        : '<path d="M14 45 L14 25" fill="none" stroke-width="1.8" stroke-linecap="round"/><path d="M14 25 Q18.5 27 18.5 31" fill="none" stroke-width="1.6"/>';
    return '<g stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M8.5 45 L11 36.6 Q30 31.4 49 36.6 L51.5 45 Z" fill="currentColor" fill-opacity=".1"/>' +
      '<path d="M22 34.6 Q30 38.4 38 34.6" fill="none" stroke-width="1.6"/>' +
      '<circle cx="30" cy="22.6" r="9.4" fill="none"/>' +
      '<circle cx="26.4" cy="21.2" r="1.4" stroke="none"/>' +
      '<circle cx="33.6" cy="21.2" r="1.4" stroke="none"/>' +
      '<path d="M26.4 26.4 Q30 29.4 33.6 26.4" fill="none" stroke-width="1.6"/>' +
      ruka + kapa +
      '<text x="7" y="12" font-size="12" text-anchor="middle" stroke="none">' + znak + '</text>' +
      '</g>';
  }
  function figura(rang, znak) {
    var pola = polaFigure(rang, znak);
    return '<span class="kSlika"><svg viewBox="-1 -1 62 92" preserveAspectRatio="xMidYMid meet" ' +
      'fill="currentColor" stroke="currentColor" aria-hidden="true">' +
      '<rect x="0.7" y="0.7" width="58.6" height="88.6" rx="4" fill="none" stroke-width="1.2" opacity=".5"/>' +
      pola + '<g transform="rotate(180 30 45)">' + pola + '</g>' +
      '<line x1="0.7" y1="45" x2="59.3" y2="45" stroke-width="1" opacity=".4"/>' +
      '</svg></span>';
  }
  /* rang: "A", "2"…"10", "J", "Q", "K" · znak: ♠ ♥ ♦ ♣ · broj: 1–10, ili 0 za figuru */
  function lice(rang, znak, broj) {
    return uglovi(rang, znak) + (broj >= 1 && broj <= 10 ? znaci(broj, znak) : figura(rang, znak));
  }
  return { MESTA: MESTA, lice: lice, znaci: znaci, figura: figura, uglovi: uglovi };
})();
window.KARTE = KARTE;

var KARTE_CSS =
'.kUgao{position:absolute;display:flex;flex-direction:column;align-items:center;line-height:.86;' +
'font-weight:800;font-variant-numeric:tabular-nums}' +
'.kUgao b{font-size:calc(var(--kw, 46px) * .30)}' +
'.kUgao i{font-style:normal;font-weight:400;font-size:calc(var(--kw, 46px) * .26);margin-top:calc(var(--kw, 46px) * -.02)}' +
'.kUgao.gore{top:2%;left:5%}' +
'.kUgao.dole{bottom:2%;right:5%;transform:rotate(180deg)}' +
'.kZnaci{position:absolute;left:20%;right:20%;top:13%;bottom:13%}' +
'.kZnaci i{position:absolute;font-style:normal;line-height:1;font-size:calc(var(--kw, 46px) * .26);' +
'transform:translate(-50%,-50%) rotate(var(--okret, 0deg))}' +
'.as .kZnaci i{font-size:calc(var(--kw, 46px) * .70)}' +
'.kSlika{position:absolute;inset:9% 11%;display:block}' +
'.kSlika svg{width:100%;height:100%;display:block}';

/* ---------- koliko je stubac igre širok ----------
   Na telefonu je uzak namerno — palac stiže svuda. Na računaru je isti taj
   stubac izgledao izgubljeno usred praznog ekrana, pa se tamo raširi za
   četvrtinu. Svaka igra zadrži svoju meru, samo pomnoženu ovim brojem.
   Stil ide rano, jer neke igre mere platno još dok se strana učitava. */
var SIRINA_CSS =
  ':root{--sirenje:1}' +
  '@media (min-width:1080px) and (min-height:680px){:root{--sirenje:1.25}}';
(function ranoSirenje() {
  var st = document.createElement("style");
  st.id = "sirinaStil";
  st.textContent = SIRINA_CSS + KARTE_CSS;
  (document.head || document.documentElement).appendChild(st);
})();
/* Isti množilac za igre koje platno mere u JavaScriptu, a ne u CSS-u. */
window.SIRENJE = function () {
  var v = 0;
  try { v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sirenje")); } catch (e) { }
  return v > 0 ? v : 1;
};

(function ranoSkin() {                            // pre prvog crtanja, da ne trepne
  var st = document.createElement("style");
  st.id = "skinStil";
  st.textContent = skinCSS();
  (document.head || document.documentElement).appendChild(st);
  primeniSkin(skinSada());
})();
var SKIN = {
  spisak: function () { return SKINOVI.slice(); },
  sada: skinSada,
  postavi: function (id) {
    if (!BOJE_SKINA[id]) id = "klasik";
    try { localStorage.setItem(SKINKEY, id); } catch (e) { }
    primeniSkin(id);
    return id;
  },
  ime: function (id) {
    for (var i = 0; i < SKINOVI.length; i++) if (SKINOVI[i].id === (id || skinSada())) return SKINOVI[i].nm;
    return "Klasik";
  }
};
window.SKIN = SKIN;

/* ---------- top lista deset najboljih ----------
   s: 1 = veći rezultat je bolji, -1 = manji je bolji. f: kako se ispisuje. */
var TOPLISTE = {
  sudoku:    [{ id: "lako", nm: "Lako", s: -1, f: "vreme" }, { id: "srednje", nm: "Srednje", s: -1, f: "vreme" },
              { id: "tesko", nm: "Teško", s: -1, f: "vreme" }, { id: "ekspert", nm: "Ekspert", s: -1, f: "vreme" }],
  solitaire: [{ id: "vreme", nm: "Najbrže rešeno", s: -1, f: "vreme" },
              { id: "poteza", nm: "Najmanje poteza", s: -1, f: "broj" }],
  kolona:    [{ id: "dnevna", nm: "Dnevna kolona", s: -1, f: "min" }, { id: "slobodna", nm: "Slobodna igra", s: -1, f: "min" }],
  aparat:    [{ id: "dobitak", nm: "Najveći dobitak", s: 1, f: "kr" }],
  svercer:   [{ id: "dnevna", nm: "Dnevna tura", s: 1, f: "poena" }, { id: "slobodna", nm: "Slobodna tura", s: 1, f: "poena" }],
  tetris:    [{ id: "bodovi", nm: "Bodovi", s: 1, f: "broj" }],
  avioni:    [{ id: "bodovi", nm: "Bodovi", s: 1, f: "broj" }],
  cigle:     [{ id: "bodovi", nm: "Bodovi", s: 1, f: "broj" }],
  stvorenja: [{ id: "koraci", nm: "Tri arene iz najmanje koraka", s: -1, f: "broj" }],
  tablic:    [{ id: "poeni", nm: "Poeni u partiji", s: 1, f: "broj" }],
  jamb:      [{ id: "listic", nm: "Ukupno na listiću", s: 1, f: "broj" }],
  geo:       [{ id: "poeni", nm: "Poeni", s: 1, f: "broj" }],
  pikado:    [{ id: "strele", nm: "Leg zatvoren iz najmanje strelica", s: -1, f: "broj" }],
  bilijar:   [{ id: "snuker", nm: "Snuker — poeni u frejmu", s: 1, f: "broj" }],
  kuca:      [{ id: "vreme", nm: "Najbrže sređena kuća", s: -1, f: "vreme" }],
  teren:     [{ id: "procenat", nm: "Osvojeno table", s: 1, f: "procenat" },
              { id: "oboreni", nm: "Oboreni protivnici", s: 1, f: "broj" }],
  mapa:      [{ id: "poeni", nm: "Poeni", s: 1, f: "broj" }],
  covece:    [{ id: "bacanja", nm: "Pobeda iz najmanje bacanja", s: -1, f: "broj" }],
  riziko:    [{ id: "potezi", nm: "Pobeda iz najmanje poteza", s: -1, f: "broj" }],
  basket:    [{ id: "s10", nm: "Serija od 10 lopti", s: 1, f: "broj" }, { id: "s20", nm: "Serija od 20 lopti", s: 1, f: "broj" }],
  rumi:      [{ id: "bodovi", nm: "Bodovi u partiji", s: 1, f: "broj" }],
  zastave:   [{ id: "zastava", nm: "Zastave — tačnih od 10", s: 1, f: "broj" },
              { id: "valuta", nm: "Valute — tačnih od 10", s: 1, f: "broj" },
              { id: "grad", nm: "Glavni gradovi — tačnih od 10", s: 1, f: "broj" },
              { id: "mesano", nm: "Pomešano — tačnih od 10", s: 1, f: "broj" }]
};
var TKEY = "igre.top";

function sveListe() { try { return JSON.parse(localStorage.getItem(TKEY) || "{}") || {}; } catch (e) { return {}; } }
function upisiListe(s) { try { localStorage.setItem(TKEY, JSON.stringify(s)); } catch (e) { } }
function tablaZa(igra, id) {
  var l = TOPLISTE[igra] || [];
  for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  return null;
}
function ispisRezultata(t, v) {
  if (t.f === "vreme") { var s = Math.max(0, Math.round(v)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  if (t.f === "min") return Math.round(v) + " min";
  if (t.f === "procenat") return (Math.round(v * 10) / 10) + "%";
  if (t.f === "kr") return Math.round(v) + " kr";
  if (t.f === "poena") return Math.round(v) + " p";
  return String(Math.round(v * 10) / 10).replace(/\.0$/, "");
}
function danKratko(ms) {
  var d = new Date(ms);
  return d.getDate() + "." + (d.getMonth() + 1) + ".";
}

var TOP = {
  liste: function (igra) { return (TOPLISTE[igra] || []).slice(); },
  lista: function (igra, tabla) { return (sveListe()[igra + "|" + tabla] || []).slice(); },
  najbolji: function (igra, tabla) { var l = TOP.lista(igra, tabla); return l.length ? l[0].v : null; },
  ispis: function (igra, tabla, v) { var t = tablaZa(igra, tabla); return t ? ispisRezultata(t, v) : String(v); },
  /* Vraća {mesto, rekord} — mesto 0 znači da rezultat nije ušao među deset. */
  upisi: function (igra, tabla, v, opis) {
    var t = tablaZa(igra, tabla);
    if (!t || v == null || typeof v !== "number" || !isFinite(v)) return null;
    var sve = sveListe(), k = igra + "|" + tabla, l = sve[k] || [];
    var red = { v: v, i: (window.IGRAC && IGRAC.ime()) || "", d: Date.now(), o: opis || "" };
    l.push(red);
    l.sort(function (a, b) { return t.s > 0 ? b.v - a.v : a.v - b.v; });   // stabilno: stariji drži mesto kod izjednačenja
    var mesto = l.indexOf(red) + 1;
    sve[k] = l.slice(0, 10);
    upisiListe(sve);
    return { mesto: mesto <= 10 ? mesto : 0, rekord: mesto === 1, lista: sve[k] };
  },
  obrisi: function (igra) {
    var sve = sveListe(), l = TOPLISTE[igra] || [];
    for (var i = 0; i < l.length; i++) delete sve[igra + "|" + l[i].id];
    upisiListe(sve);
  },
  pokazi: pokaziTop
};
window.TOP = TOP;

function redoviTabele(igra, t) {
  var l = TOP.lista(igra, t.id);
  if (!l.length) return '<p class="topPrazno">Još nema upisanog rezultata — odigraj partiju.</p>';
  var h = '<ol class="topLista">';
  for (var i = 0; i < l.length; i++) {
    var r = l[i], medalja = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
    h += '<li><span class="m">' + medalja + '</span>' +
      '<b>' + ispisRezultata(t, r.v) + '</b>' +
      '<span class="ko">' + (r.i ? String(r.i).replace(/[<>&]/g, "") : "") + '</span>' +
      '<small>' + (r.o ? String(r.o).replace(/[<>&]/g, "") + " · " : "") + danKratko(r.d) + '</small></li>';
  }
  return h + "</ol>";
}
function pokaziTop(igra) {
  var stari = document.querySelector(".topSloj");
  if (stari) stari.remove();
  var liste = TOP.liste(igra), naslov = imeIgreZa(igra);
  var telo = "";
  for (var i = 0; i < liste.length; i++)
    telo += '<h4>' + liste[i].nm + '</h4>' + redoviTabele(igra, liste[i]);
  if (!liste.length) telo = '<p class="topPrazno">Ova igra nema rezultat koji se meri.</p>';
  var sloj = document.createElement("div");
  sloj.className = "topSloj";
  sloj.innerHTML = '<div class="topBox" role="dialog" aria-modal="true">' +
    '<h3>🏆 ' + naslov + ' — najboljih deset</h3>' +
    '<div class="topTelo">' + telo + '</div>' +
    '<div class="topRed"><span>🔊 Zvuk</span>' +
    '<div class="topStil">' +
    '<button type="button" data-stil="moderno">🎧 Moderno</button>' +
    '<button type="button" data-stil="retro">👾 Retro</button></div></div>' +
    '<div class="topRed"><span>🎨 Izgled</span>' +
    '<div class="topStil" id="topSkin">' + skinDugmad() + '</div></div>' +
    '<div class="topSkinOpis" id="topSkinOpis"></div>' +
    utisakHtml(igra) +
    '<div class="topVer" id="topVer">' + kratkoIme(igra) +
    (VERZIJE[igra] ? " v" + VERZIJE[igra] : "") + '</div>' +
    '<div class="topBtns">' +
    (liste.length ? '<button type="button" id="topBrisi">🗑 Obriši listu</button>' : "") +
    '<button type="button" id="topZatvori">Nastavi igru</button></div></div>';
  document.body.appendChild(sloj);
  var zatvori = function () { sloj.remove(); };
  sloj.querySelector("#topZatvori").addEventListener("click", zatvori);
  sloj.addEventListener("click", function (e) { if (e.target === sloj) zatvori(); });
  var br = sloj.querySelector("#topBrisi");
  if (br) br.addEventListener("click", function () {
    if (br.dataset.sig !== "1") { br.dataset.sig = "1"; br.textContent = "🗑 Stvarno obriši?"; return; }
    TOP.obrisi(igra); zatvori(); pokaziTop(igra);
  });
  skinVezi(sloj);
  var dugmad = sloj.querySelectorAll("[data-stil]");
  var oboji = function () {
    for (var i = 0; i < dugmad.length; i++)
      dugmad[i].classList.toggle("on", dugmad[i].dataset.stil === SFX.stil());
  };
  for (var d = 0; d < dugmad.length; d++) dugmad[d].addEventListener("click", function () {
    SFX.stil(this.dataset.stil); oboji();
    if (!SFX.isOn()) SFX.set(true); else SFX.good();
  });
  oboji();
  utisakVezi(sloj);
  if (window.SWPomoc && SWPomoc.mojaVerzija) SWPomoc.mojaVerzija().then(function (v) {
    var el = document.getElementById("topVer");
    if (el && v) el.textContent = el.textContent + " · komplet " + v;
  });
  document.addEventListener("keydown", function beg(e) {
    if (e.key === "Escape") { zatvori(); document.removeEventListener("keydown", beg); }
  });
}
function kratkoIme(id) { return imeIgreZa(id).replace(/^\S+\s/, ""); }
function imeIgreZa(id) {
  for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i].em + " " + GAMES[i].nm;
  return id;
}
/* verzija igre u podnožju svake strane, da se uvek zna šta se igra */
function upisiVerziju(igra) {
  var v = VERZIJE[igra];
  var f = document.querySelector(".foot");
  if (!v || !f || f.querySelector(".verIgre")) return;
  var s = document.createElement("div");
  s.className = "verIgre";
  s.textContent = kratkoIme(igra) + " v" + v;
  f.appendChild(s);
}

/* ---------- statistika igranja i utisci ----------
   Svaki telefon vodi svoju: koliko je puta koja igra igrana i koliko dugo, plus
   ocena i predlog ako ih igrač ostavi. Sažetak se sa spiska igara objavi kao
   zapamćena MQTT poruka, pa se na strani statistika.html vidi sve na jednom
   mestu. Šalje se samo ime koje je igrač sam upisao, brojevi i njegov tekst —
   ništa se ne čita sa telefona. Objašnjeno je i u Pomoći. */
var StKEY = "igre.stat", UtKEY = "igre.utisci", UidKEY = "igre.uid";
var STAT_TEMA = "bwstat2";
var PRAG_IGRANJA = 20;        // sekundi da se poseta broji kao jedno igranje
var MIROVANJE = 180;          // posle toliko sekundi bez dodira vreme se ne broji
var OBJAVA_RAZMAK = 120000;   // ne objavljuj češće od dva minuta

function mojUid() {
  var v = "";
  try { v = localStorage.getItem(UidKEY) || ""; } catch (e) { }
  if (!/^[0-9a-f]{8}$/.test(v)) {
    v = (Math.random().toString(16) + "00000000").slice(2, 10);
    try { localStorage.setItem(UidKEY, v); } catch (e) { }
  }
  return v;
}
function statUcitaj() {
  var s;
  try { s = JSON.parse(localStorage.getItem(StKEY) || "{}"); } catch (e) { s = null; }
  s = s && typeof s === "object" ? s : {};
  s.po = s.po && typeof s.po === "object" ? s.po : {};
  return s;
}
function statUpisi(s) { try { localStorage.setItem(StKEY, JSON.stringify(s)); } catch (e) { } }
function utisciUcitaj() {
  try { return JSON.parse(localStorage.getItem(UtKEY) || "{}") || {}; } catch (e) { return {}; }
}
function utisciUpisi(u) { try { localStorage.setItem(UtKEY, JSON.stringify(u)); } catch (e) { } }

var merim = null, sekunde = 0, upisano = 0, zaduzeno = false, zadnjiDodir = Date.now();
function merenjeStart(igra) {
  if (merim || !VERZIJE[igra]) return;
  merim = igra;
  ["pointerdown", "keydown", "touchstart"].forEach(function (t) {
    document.addEventListener(t, function () { zadnjiDodir = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(otkucaj, 5000);
  document.addEventListener("visibilitychange", function () { if (document.hidden) merenjeUpisi(); });
  window.addEventListener("pagehide", merenjeUpisi);
}
function otkucaj() {
  if (!merim || document.hidden) return;
  if (Date.now() - zadnjiDodir > MIROVANJE * 1000) return;   // strana stoji otvorena, ali se ne igra
  sekunde += 5;
  if ((!zaduzeno && sekunde >= PRAG_IGRANJA) || sekunde - upisano >= 30) merenjeUpisi();
}
function merenjeUpisi() {
  if (!merim) return;
  var d = sekunde - upisano, novo = !zaduzeno && sekunde >= PRAG_IGRANJA;
  if (d <= 0 && !novo) return;
  var s = statUcitaj(), g = s.po[merim] || { n: 0, s: 0 };
  g.s += d;
  if (novo) { g.n++; zaduzeno = true; }
  s.po[merim] = g;
  s.zadnji = Date.now();
  if (!s.prvi) s.prvi = s.zadnji;
  statUpisi(s);
  upisano = sekunde;
}

function statSazetak() {
  var s = statUcitaj(), naj = {};
  for (var igra in TOPLISTE) {
    if (!Object.prototype.hasOwnProperty.call(TOPLISTE, igra)) continue;
    var liste = TOPLISTE[igra];
    for (var i = 0; i < liste.length; i++) {
      var v = TOP.najbolji(igra, liste[i].id);
      if (v != null) naj[igra + "|" + liste[i].id] = v;
    }
  }
  return {
    v: 2, uid: mojUid(), ime: (window.IGRAC && IGRAC.ime()) || "",
    kad: Date.now(), prvi: s.prvi || Date.now(),
    po: s.po, naj: naj, ut: utisciUcitaj()
  };
}
var STAT = {
  moja: statUcitaj,
  sazetak: statSazetak,
  uid: mojUid,
  tema: STAT_TEMA,
  ukupno: function () {                          // {puta, sekundi} preko svih igara
    var s = statUcitaj(), p = 0, v = 0;
    for (var k in s.po) if (Object.prototype.hasOwnProperty.call(s.po, k)) { p += s.po[k].n || 0; v += s.po[k].s || 0; }
    return { puta: p, sekundi: v };
  },
  /* Objava ide sa spiska igara, najviše jednom u dva minuta i samo kad ima šta. */
  objavi: function (silom) {
    if (!window.Mreza || !Mreza.objaviTablu) return Promise.resolve(0);
    var sad = Date.now(), zadnja = 0;
    try { zadnja = +(sessionStorage.getItem("igre.statObjava") || 0); } catch (e) { }
    if (!silom && sad - zadnja < OBJAVA_RAZMAK) return Promise.resolve(0);
    var sz = statSazetak();
    if (!silom && !Object.keys(sz.po).length && !Object.keys(sz.ut).length) return Promise.resolve(0);
    try { sessionStorage.setItem("igre.statObjava", String(sad)); } catch (e) { }
    return Mreza.objaviTablu(STAT_TEMA + "/" + sz.uid, sz).catch(function () { return 0; });
  },
  citaj: function (naStavku, rok) {
    if (!window.Mreza || !Mreza.citajTablu) return Promise.reject(new Error("nema mrežnog dela"));
    return Mreza.citajTablu(STAT_TEMA, naStavku, rok);
  },
  /* za provere: jedan otkucaj je pet sekundi igranja */
  _takt: function (koliko) { for (var i = 0; i < (koliko || 1); i++) otkucaj(); merenjeUpisi(); },
  _merim: function () { return merim; },
  _obrisi: function () {
    try { localStorage.removeItem(StKEY); localStorage.removeItem(UtKEY); sessionStorage.removeItem("igre.statObjava"); } catch (e) { }
    sekunde = upisano = 0; zaduzeno = false;
  },
  vreme: function (sek) {                        // 3450 -> „57 min", 145 -> „2 min"
    sek = Math.round(sek || 0);
    if (sek < 60) return sek + " s";
    var m = Math.round(sek / 60);
    if (m < 90) return m + " min";
    var h = Math.floor(m / 60);
    return h + " h " + (m % 60 ? (m % 60) + " min" : "");
  }
};
window.STAT = STAT;

/* ---------- ocena i predlog za igru ---------- */
var UTISAK = {
  za: function (igra) { return utisciUcitaj()[igra] || null; },
  upisi: function (igra, zvezde, tekst) {
    var u = utisciUcitaj(), stari = u[igra] || {};
    var z = Math.max(0, Math.min(5, Math.round(zvezde == null ? (stari.z || 0) : zvezde)));
    var t = String(tekst == null ? (stari.t || "") : tekst).replace(/[<>]/g, "").trim().slice(0, 400);
    if (!z && !t) delete u[igra]; else u[igra] = { z: z, t: t, kad: Date.now() };
    utisciUpisi(u);
    return u[igra] || null;
  }
};
window.UTISAK = UTISAK;

function utisakHtml(igra) {
  var u = UTISAK.za(igra) || { z: 0, t: "" };
  var zv = "";
  for (var i = 1; i <= 5; i++)
    zv += '<button type="button" class="zv' + (i <= u.z ? " on" : "") + '" data-z="' + i + '" ' +
      'aria-label="' + i + ' od 5">★</button>';
  return '<div class="utisak" data-igra="' + igra + '">' +
    '<div class="utRed"><span>⭐ Tvoja ocena</span><div class="zvezde">' + zv + '</div></div>' +
    '<textarea class="utTekst" rows="2" maxlength="400" ' +
    'placeholder="Šta bi popravio ili dodao? (nije obavezno)">' + u.t.replace(/[<>&]/g, "") + '</textarea>' +
    '<div class="utHvala" hidden>Hvala — stiže uz statistiku.</div></div>';
}
function utisakVezi(koren) {
  var box = koren.querySelector(".utisak");
  if (!box) return;
  var igra = box.dataset.igra, polje = box.querySelector(".utTekst"), hvala = box.querySelector(".utHvala");
  var zvezde = box.querySelectorAll(".zv");
  var oboji = function (n) {
    for (var i = 0; i < zvezde.length; i++) zvezde[i].classList.toggle("on", i < n);
  };
  var javi = function () { hvala.hidden = false; };
  for (var i = 0; i < zvezde.length; i++) zvezde[i].addEventListener("click", function () {
    var n = +this.dataset.z;
    var sad = UTISAK.za(igra);
    if (sad && sad.z === n) n = 0;               // ponovni tap na istu zvezdicu skida ocenu
    UTISAK.upisi(igra, n, polje.value);
    oboji(n); javi();
    window.SFX && (n ? SFX.good() : SFX.tick());
  });
  polje.addEventListener("change", function () { UTISAK.upisi(igra, null, polje.value); javi(); });
  polje.addEventListener("blur", function () { UTISAK.upisi(igra, null, polje.value); });
}

/* Isti blok sa ocenom, samo sam za sebe — sa spiska igara, za utisak o svemu. */
function pokaziUtisak(igra) {
  var stari = document.querySelector(".topSloj");
  if (stari) stari.remove();
  var sloj = document.createElement("div");
  sloj.className = "topSloj";
  sloj.innerHTML = '<div class="topBox" role="dialog" aria-modal="true">' +
    "<h3>⭐ " + (igra === "opste" ? "Utisak o igrama" : imeIgreZa(igra)) + "</h3>" +
    '<p class="topPrazno">Oceni i napiši šta bi popravio ili dodao — stiže uz statistiku, ' +
    "uz ime koje si upisao pod 👤.</p>" +
    utisakHtml(igra) +
    '<div class="topBtns"><button type="button" id="utZatvori">Gotovo</button></div></div>';
  document.body.appendChild(sloj);
  utisakVezi(sloj);
  var zatvori = function () { sloj.remove(); };
  sloj.querySelector("#utZatvori").addEventListener("click", zatvori);
  sloj.addEventListener("click", function (e) { if (e.target === sloj) zatvori(); });
  document.addEventListener("keydown", function beg(e) {
    if (e.key === "Escape") { zatvori(); document.removeEventListener("keydown", beg); }
  });
}
window.UTISAK_SLOJ = pokaziUtisak;

function skinDugmad() {
  var h = "";
  for (var i = 0; i < SKINOVI.length; i++)
    h += '<button type="button" data-skin="' + SKINOVI[i].id + '">' +
      SKINOVI[i].em + " " + SKINOVI[i].nm + "</button>";
  return h;
}
function skinVezi(koren) {
  var red = koren.querySelector("#topSkin");
  if (!red) return;
  var opis = koren.querySelector("#topSkinOpis");
  var dugmad = red.querySelectorAll("button");
  var oboji = function () {
    var sad = SKIN.sada();
    for (var i = 0; i < dugmad.length; i++)
      dugmad[i].classList.toggle("on", dugmad[i].dataset.skin === sad);
    if (opis) for (var k = 0; k < SKINOVI.length; k++)
      if (SKINOVI[k].id === sad) opis.textContent = SKINOVI[k].opis;
  };
  for (var d = 0; d < dugmad.length; d++) dugmad[d].addEventListener("click", function () {
    SKIN.postavi(this.dataset.skin); oboji();
    window.SFX && SFX.tap();
  });
  oboji();
}

function pravilaZa(ime) { return PRAVILA[ime] || null; }

function pokaziPravila(ime) {
  var pr = pravilaZa(ime);
  if (!pr) return;
  var stari = document.querySelector(".pravilaSloj");
  if (stari) stari.remove();
  var sloj = document.createElement("div");
  sloj.className = "pravilaSloj";
  var stavke = "";
  for (var i = 0; i < pr[1].length; i++) stavke += "<li>" + pr[1][i] + "</li>";
  sloj.innerHTML = '<div class="pravilaBox" role="dialog" aria-modal="true">' +
    "<h3>❔ " + pr[0] + " — pravila</h3><ul>" + stavke + "</ul>" +
    '<div class="pravilaBtns"><button type="button" id="pravZatvori">Nastavi igru</button>' +
    '<a href="pomoc.html?od=' + ime + '.html">❔ Opšta pomoć</a></div></div>';
  document.body.appendChild(sloj);
  var zatvori = function () { sloj.remove(); };
  sloj.querySelector("#pravZatvori").addEventListener("click", zatvori);
  sloj.addEventListener("click", function (e) { if (e.target === sloj) zatvori(); });
  document.addEventListener("keydown", function beg(e) {
    if (e.key === "Escape") { zatvori(); document.removeEventListener("keydown", beg); }
  });
}

/* svaka veza ka opštoj pomoći nosi ime igre, da pomoć zna kuda da vrati */
function obeleziPomoc(ime) {
  var veze = document.querySelectorAll('a[href="pomoc.html"]');
  for (var i = 0; i < veze.length; i++) veze[i].href = "pomoc.html?od=" + ime + ".html";
}

/* ---------- kod sobe: dodirni da kopiraš, ili pošalji ----------
   Kod se govorio naglas, a preko telefona to ne ide. Svaka kutija sa kodom
   (.kodBox) sama dobija dugmad „Kopiraj" i „Pošalji", pa se kod prosledi
   saigračima kao obična poruka. */
var IGRA_SADA = "";
function samoKod(t) { return (t || "").replace(/\s+/g, "").toUpperCase(); }

function starinskiPrepis(t) {                      // kad Clipboard API ne prolazi
  try {
    var el = document.createElement("textarea");
    el.value = t;
    el.contentEditable = "true";
    el.readOnly = false;
    el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0";
    document.body.appendChild(el);
    var opseg = document.createRange();
    opseg.selectNodeContents(el);
    var izbor = window.getSelection();
    izbor.removeAllRanges(); izbor.addRange(opseg);
    el.setSelectionRange(0, t.length);
    var ok = document.execCommand("copy");
    el.remove();
    return !!ok;
  } catch (e) { return false; }
}
function prepisi(t) {                              // vraća obećanje: je li uspelo
  return new Promise(function (res) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(t).then(
          function () { res(true); },
          function () { res(starinskiPrepis(t)); }
        );
      }
    } catch (e) { }
    res(starinskiPrepis(t));
  });
}
function adresaIgre() { return location.origin + location.pathname; }
function vezaZaSobu(kod) { return adresaIgre() + "?soba=" + encodeURIComponent(kod); }

/* ---------- ulazak preko veze ----------
   Domaćin pošalje vezu sa ?soba=KOD, gost je otvori i uđe bez kucanja. Ručno
   kucanje ostaje netaknuto — ovo samo pritiska istu dugmad umesto igrača, pa
   radi u svakoj igri sa sobom bez ijedne izmene u samoj igri. */
function kodIzLinka() {
  var k = "";
  try { k = new URLSearchParams(location.search).get("soba") || ""; } catch (e) { }
  k = String(k).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{4,6}$/.test(k) ? k : "";
}
function skloniKodIzLinka() {                     // da osvežavanje strane ne ulazi opet
  try {
    var u = new URL(location.href);
    u.searchParams.delete("soba");
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
  } catch (e) { }
}
function udjiIzLinka(kod) {
  var faza = 0, tikova = 0;
  var q = function (sel) { return document.querySelector(sel); };
  var tik = setInterval(function () {
    if (++tikova > 80) return clearInterval(tik);          // ~10 s pa diže ruke
    if (faza === 0) {
      var otvori = q("#udjiBtn") || q("#sobaBtn2") || q("#trkaBtn");
      if (!otvori) return;
      otvori.click();
      if (otvori.id === "udjiBtn") faza = 1;
      return;
    }
    var polje = q("#kodIn2") || q("#kodIn"), idi = q("#idiBtn2") || q("#idiBtn");
    if (!polje || !idi) return;
    clearInterval(tik);
    polje.value = kod;
    try { polje.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) { }
    idi.click();
  }, 130);
}

/* ---------- ekran da ne zaspi dok soba stoji ----------
   Domaćin čeka na ekranu sa kodom; ako se telefon zaključa, strana se zamrzne i
   gost više ne može da uđe — soba prosto nema ko da odgovori. Zato dok god soba
   stoji tražimo od telefona da ne gasi ekran. Brava se gubi kad strana ode u
   pozadinu, pa se traži ponovo čim se vrati. */
var brava = null, bravaTrazena = false;
function drziBudno() {
  bravaTrazena = true;
  if (brava || document.hidden) return;
  if (!navigator.wakeLock || !navigator.wakeLock.request) return;
  try {
    navigator.wakeLock.request("screen").then(function (b) {
      brava = b;
      try { b.addEventListener("release", function () { brava = null; }); } catch (e) { }
    }, function () { });
  } catch (e) { }
}
function pustiBudno() {
  bravaTrazena = false;
  if (!brava) return;
  try { brava.release(); } catch (e) { }
  brava = null;
}
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && bravaTrazena) drziBudno();
});
window.BUDAN = {
  drzi: drziBudno, pusti: pustiBudno,
  ima: function () { return !!brava; },
  trazen: function () { return bravaTrazena; },
  podrzan: function () { return !!(navigator.wakeLock && navigator.wakeLock.request); }
};
function porukaZaKod(kod) {
  var nm = IGRA_SADA ? imeIgreZa(IGRA_SADA) : "igru";
  return "Kod sobe za " + nm + ": " + kod + "\nUđi odmah: " + vezaZaSobu(kod);
}
function javiKratko(dugme, tekst) {
  if (!dugme) return;
  var staro = dugme.textContent;
  dugme.textContent = tekst;
  dugme.classList.add("ok");
  setTimeout(function () { dugme.textContent = staro; dugme.classList.remove("ok"); }, 1800);
}
function kopirajKod(kod, dugme) {
  prepisi(kod).then(function (ok) {
    window.SFX && (ok ? SFX.good() : SFX.bad());
    if (ok) {
      javiKratko(dugme, "✓ Kopirano");
      poruciNaEkranu("📋 Kod <b>" + kod + "</b> je kopiran — nalepi ga u poruku saigraču.");
    } else {
      poruciNaEkranu("Kopiranje nije prošlo. <b>Pritisni i drži kod</b> pa izaberi „Copy“.");
    }
  });
}
function podeliKod(kod, dugme) {
  try {
    if (navigator.share) {
      navigator.share({ title: "Kod sobe", text: porukaZaKod(kod) }).catch(function () { });
      window.SFX && SFX.tap();
      return;
    }
  } catch (e) { }
  /* Bez deljenja: u ostavu ide cela veza, pa se nalepi u poruku kao veza. */
  prepisi(vezaZaSobu(kod)).then(function (ok) {
    window.SFX && (ok ? SFX.good() : SFX.bad());
    if (ok) {
      javiKratko(dugme, "✓ Veza kopirana");
      poruciNaEkranu("🔗 <b>Veza sa kodom " + kod + "</b> je kopirana — nalepi je u poruku.");
    } else poruciNaEkranu("Kopiranje nije prošlo. <b>Pritisni i drži kod</b> pa izaberi „Copy“.");
  });
}
function opremiKod(box) {
  if (!box || box.getAttribute("data-kodOpremljen")) return;
  var kod = samoKod(box.textContent);
  if (!/^[A-Z0-9]{4,10}$/.test(kod)) return;       // kutija bez pravog koda se ne dira
  box.setAttribute("data-kodOpremljen", "1");
  box.classList.add("kodKlik");
  box.setAttribute("role", "button");
  box.setAttribute("tabindex", "0");
  box.title = "Dodirni da kopiraš kod";
  box.addEventListener("click", function () { kopirajKod(samoKod(box.textContent), null); });
  box.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kopirajKod(samoKod(box.textContent), null); }
  });
  var alat = document.createElement("div");
  alat.className = "kodAlat";
  alat.innerHTML = '<button type="button" class="kodKopiraj">📋 Kopiraj kod</button>' +
    '<button type="button" class="kodPodeli">' + (navigator.share ? "📤 Pošalji vezu" : "🔗 Kopiraj vezu") + "</button>";
  if (box.parentNode) box.parentNode.insertBefore(alat, box.nextSibling);
  var kb = alat.querySelector(".kodKopiraj");
  kb.addEventListener("click", function () { kopirajKod(samoKod(box.textContent), kb); });
  var pb = alat.querySelector(".kodPodeli");
  if (pb) pb.addEventListener("click", function () { podeliKod(samoKod(box.textContent), pb); });
}
function pratiKodove() {
  var obidji = function () {
    var l = document.querySelectorAll(".kodBox");
    for (var i = 0; i < l.length; i++) opremiKod(l[i]);
  };
  obidji();
  try {
    new MutationObserver(obidji).observe(document.body, { childList: true, subtree: true });
  } catch (e) { setInterval(obidji, 800); }
}
window.KOD = {
  kopiraj: kopirajKod, podeli: podeliKod, opremi: opremiKod, prati: pratiKodove,
  veza: vezaZaSobu, izLinka: kodIzLinka, udji: udjiIzLinka, poruka: porukaZaKod
};

function build() {
  if (document.querySelector(".gamenav")) return;
  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  var here = (location.pathname.split("/").pop() || "").toLowerCase();
  if (here === "") here = "index.html";                // koren sajta je spisak igara
  if (here === "index.html" || here === "pomoc.html" || here === "statistika.html" || here === "")
    document.body.classList.add("duga-strana");        // spiskovi se skroluju, pa im treba jastuk na dnu
  var nav = document.createElement("nav");
  nav.className = "gamenav";
  nav.setAttribute("aria-label", "Izbor igre");
  var h = "";
  for (var i = 0; i < GAMES.length; i++) {
    var g = GAMES[i], act = here === g.href ? " on" : "";
    h += '<a class="' + act.trim() + '" href="' + g.href + '" title="' + g.nm + '">' +
      '<span class="e">' + g.em + '</span><span class="t">' + g.nm + '</span></a>';
  }
  h += '<button id="sndBtn" type="button"><span class="e">🔊</span><span class="t">Zvuk</span></button>';
  nav.innerHTML = h;
  document.body.appendChild(nav);
  if (here !== "index.html" && here !== "") {          // kućica i zvuk u zaglavlju svake igre
    var thm = document.querySelector("header #theme") || document.querySelector("header button:last-of-type");
    if (thm && thm.parentNode) {
      var imeIgre = here.replace(/\.html$/, "");
      IGRA_SADA = imeIgre;
      upisiVerziju(imeIgre);
      merenjeStart(imeIgre);                           // koliko se i koliko dugo igra
      /* Statistika se ranije slala samo sa spiska igara — ko uđe pravo u igru
         (sa ikonice ili preko veze za sobu) nije javljao ništa. Sada javlja i
         iz same igre; sam poziv je prigušen na jednom u dva minuta. */
      setTimeout(function () { window.STAT && STAT.objavi(); }, 25000);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) setTimeout(function () { window.STAT && STAT.objavi(); }, 1500);
      });
      if (pravilaZa(imeIgre) && !document.querySelector(".uputBtn")) {
        var pb = document.createElement("button");
        pb.type = "button"; pb.className = "uputBtn"; pb.textContent = "❔";
        pb.title = "Pravila igre";
        pb.addEventListener("click", function () { pokaziPravila(imeIgre); });
        thm.parentNode.insertBefore(pb, thm);
      }
      if (VERZIJE[imeIgre] && !document.querySelector(".topBtn")) {
        var tb = document.createElement("button");
        tb.type = "button"; tb.className = "topBtn"; tb.textContent = "🏆";
        tb.title = "Najboljih deset, zvuk i verzija";
        tb.addEventListener("click", function () { pokaziTop(imeIgre); });
        thm.parentNode.insertBefore(tb, thm);
      }
      if (!document.querySelector(".zvukBtn")) {
        var zb = document.createElement("button");
        zb.type = "button"; zb.className = "zvukBtn"; zb.textContent = "🔊";
        zb.addEventListener("click", prekidacZvuka);
        thm.parentNode.insertBefore(zb, thm);
      }
      if (!document.querySelector(".homeBtn")) {
        var hb = document.createElement("a");
        hb.className = "homeBtn"; hb.href = "./"; hb.title = "Sve igre"; hb.textContent = "🏠";
        thm.parentNode.insertBefore(hb, thm);
      }
    }
  }
  if (here !== "index.html" && here !== "pomoc.html" && here !== "")
    obeleziPomoc(here.replace(/\.html$/, ""));
  document.getElementById("sndBtn").addEventListener("click", prekidacZvuka);
  pratiKodove();
  var izLinka = kodIzLinka();
  if (izLinka && here !== "index.html" && here !== "") { skloniKodIzLinka(); udjiIzLinka(izLinka); }
  paintBtn();
  paintIme();
  measure();
  pratiTraku();
  window.addEventListener("resize", measure);
  window.addEventListener("orientationchange", function () { setTimeout(measure, 120); });

  // prvi dodir budi audio (politika pregledača)
  var wake = function () { engine(); document.removeEventListener("pointerdown", wake); };
  document.addEventListener("pointerdown", wake);
}

window.PRAVILA_IGRE = { spisak: PRAVILA, pokazi: pokaziPravila };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
else build();

/* ---------- offline: service worker ---------- */
(function () {
  if (!("serviceWorker" in navigator)) return;
  var ok = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!ok) return;                                   // sa file:// SW ne radi — tada je stranica ionako lokalna

  var hadController = !!navigator.serviceWorker.controller;
  var reloading = false;
  function osveziJednom(oznaka) {
    if (reloading) return;
    try {
      var k = "igre.reload." + oznaka;
      if (sessionStorage.getItem(k)) return;          // zaštita od petlje
      sessionStorage.setItem(k, "1");
    } catch (e) { }
    reloading = true;
    location.reload();
  }
  navigator.serviceWorker.addEventListener("message", function (e) {
    if (e.data && e.data.type === "sw-activated") osveziJednom(e.data.version);
  });
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!hadController) return;                       // prva instalacija ne traži osvežavanje
    osveziJednom("ctrl");
  });

  var lastCheck = 0;
  function proveri(reg) {
    var now = Date.now();
    if (now - lastCheck < 4000) return;
    lastCheck = now;
    reg.update().catch(function () { });
  }

  /* Koja verzija stoji na serveru — pita se mimo svakog keša (i pregledačevog i
     onog na GitHub-u), pa se zna da li uopšte ima šta da se preuzme. */
  function serverskaVerzija() {
    return fetch("sw.js?ts=" + Date.now(), { cache: "no-store" })
      .then(function (o) { return o.ok ? o.text() : ""; })
      .then(function (t) { var m = /VERSION\s*=\s*"([^"]+)"/.exec(t || ""); return m ? m[1] : null; });
  }
  /* Šta server deli na običnoj adresi — baš to vidi pregledač kad traži novog
     radnika. GitHub-ov keš ume da do deset minuta posle objave deli staru kopiju. */
  function deljenaVerzija() {
    return fetch("sw.js", { cache: "reload" })
      .then(function (o) { return o.ok ? o.text() : ""; })
      .then(function (t) { var m = /VERSION\s*=\s*"([^"]+)"/.exec(t || ""); return m ? m[1] : null; });
  }
  function mojaVerzija() {                            // šta trenutno radi na telefonu
    return new Promise(function (res) {
      var c = navigator.serviceWorker.controller;
      if (!c) return res(null);
      var gotovo = false;
      var slusaj = function (e) {
        if (!e.data || !e.data.version || gotovo) return;
        gotovo = true;
        navigator.serviceWorker.removeEventListener("message", slusaj);
        res(e.data.version);
      };
      navigator.serviceWorker.addEventListener("message", slusaj);
      try { c.postMessage("version"); } catch (e) { res(null); }
      setTimeout(function () { if (!gotovo) { gotovo = true; res(null); } }, 2500);
    });
  }
  /* Poslednje sredstvo kad pregledač neće da preuzme novog radnika: obriši sve
     sačuvano i odjavi radnika, pa stranica krene iz početka sa mreže. */
  function tvrdoOsvezi() {
    return caches.keys()
      .then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); })
      .catch(function () { })
      .then(function () { return navigator.serviceWorker.getRegistration(); })
      .then(function (r) { return r ? r.unregister() : null; })
      .catch(function () { })
      .then(function () { try { sessionStorage.clear(); } catch (e) { } location.reload(); });
  }
  window.SWPomoc = {
    serverskaVerzija: serverskaVerzija, deljenaVerzija: deljenaVerzija,
    mojaVerzija: mojaVerzija, tvrdoOsvezi: tvrdoOsvezi
  };

  function reg() {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (r) {
      window.__swReg = r;
      window.SWPomoc.reg = r;
      proveri(r);                                     // odmah pitaj ima li nove verzije
      /* Ako na serveru stoji druga verzija, a pregledač je ne vidi (keš na putu),
         probaj još jednom odmah — a ako ni to ne prođe, stranica će to i napisati. */
      setTimeout(function () {
        serverskaVerzija().then(function (na) {
          if (!na) return;
          window.SWPomoc.naServeru = na;
          return mojaVerzija().then(function (moja) {
            window.SWPomoc.moja = moja;
            if (moja && na !== moja) r.update().catch(function () { });
          });
        }).catch(function () { });
      }, 1200);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) proveri(r);             // i svaki put kad se aplikacija vrati u prvi plan
      });
      window.addEventListener("focus", function () { proveri(r); });
      setInterval(function () { proveri(r); }, 30 * 60 * 1000);
      r.addEventListener("updatefound", function () {
        var w = r.installing;
        if (!w) return;
        w.addEventListener("statechange", function () {
          if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage("skipWaiting");
        });
      });
      if (r.waiting && navigator.serviceWorker.controller) r.waiting.postMessage("skipWaiting");
    }).catch(function () { });
  }
  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);
})();
})();
