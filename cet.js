/* © 2026 Branko Josipović. Sva prava zadržana. Ovaj kod se ne sme kopirati, prerađivati ni
   objavljivati bez pisane dozvole autora — videti LICENSE u korenu repozitorijuma. */
/* cet.js — poruke između igrača, isto u svakoj igri koja ima sobu.
   Igra samo kaže CET.ukljuci({mreza, ime}) i prosledi mu poruke tipa "cet". */
(function () {
"use strict";

var EMODZI = ["👍", "😀", "😂", "😮", "😢", "🎉", "🔥", "👏", "🤔", "😅", "💪", "🍀"];
var RECI = ["Bravo!", "Ma daj…", "Sad ću ja", "Čekaj malo", "Idemo!", "Baš si me sredio", "Hvala", "Ćao"];
var ROK = 1200;                                   // između dve poruke bar toliko

var M = null, dajIme = null, zadnja = 0, panel = null, dugme = null, oblacic = null, tajmerObl = null;
var istorija = [];

var CSS =
'.cetDugme{position:fixed;right:10px;z-index:70;bottom:calc(var(--navh,40px) + 12px);' +
'width:46px;height:46px;border-radius:50%;border:1px solid var(--line,#283a5e);background:var(--panel,#16223a);' +
'color:var(--ink,#eef2f9);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;' +
'box-shadow:0 6px 18px rgba(0,0,0,.45);touch-action:manipulation}' +
'.cetDugme:active{transform:translateY(1px)}' +
'.cetDugme .tacka{position:absolute;top:2px;right:2px;width:11px;height:11px;border-radius:50%;' +
'background:var(--bad,#d65a4e);border:2px solid var(--panel,#16223a)}' +
'.cetPanel{position:fixed;left:8px;right:8px;z-index:71;bottom:calc(var(--navh,40px) + 64px);' +
'max-width:420px;margin:0 auto;background:var(--panel,#16223a);border:1px solid var(--line,#283a5e);' +
'border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:10px;display:flex;flex-direction:column;gap:8px;' +
'max-height:min(70vh,440px);overflow-y:auto;overscroll-behavior:contain}' +
'.cetPanel .red{display:flex;flex-wrap:wrap;gap:5px}' +
'.cetPanel button{font:inherit;color:var(--ink,#eef2f9);background:var(--panel-2,#1b2a4a);' +
'border:1px solid var(--line,#283a5e);border-radius:9px;padding:5px 9px;cursor:pointer;touch-action:manipulation}' +
'.cetPanel button.emo{font-size:20px;padding:3px 7px;line-height:1.2}' +
'.cetPanel button.rec{font-size:13px}' +
'.cetPanel .unos{display:flex;gap:6px}' +
'.cetPanel input{flex:1 1 auto;min-width:0;font:inherit;font-size:16px;color:var(--ink,#eef2f9);' +
'background:var(--panel-2,#1b2a4a);border:1px solid var(--line,#283a5e);border-radius:9px;padding:7px 10px;' +
'text-transform:none;letter-spacing:normal;text-align:left}' +
'.cetPanel .istorija{max-height:110px;overflow-y:auto;font-size:13px;display:flex;flex-direction:column;gap:3px}' +
'.cetPanel .istorija div{color:var(--ink-dim,#9fb0cc)}' +
'.cetPanel .istorija b{color:var(--ink,#eef2f9)}' +
'.cetOblacic{position:fixed;left:50%;transform:translateX(-50%) translateY(6px);z-index:72;' +
'top:calc(env(safe-area-inset-top,0px) + 70px);max-width:min(88vw,340px);' +
'background:var(--panel,#16223a);border:1px solid var(--gold,#c9a227);border-radius:14px;padding:8px 14px;' +
'font-size:15px;color:var(--ink,#eef2f9);box-shadow:0 10px 26px rgba(0,0,0,.5);text-align:center;' +
'opacity:0;transition:opacity .18s,transform .18s;pointer-events:none}' +
'.cetOblacic.vidi{opacity:1;transform:translateX(-50%) translateY(0)}' +
'.cetOblacic b{color:var(--gold,#c9a227);font-weight:700}';

function stil() {
  if (document.getElementById("cetStil")) return;
  var e = document.createElement("style");
  e.id = "cetStil"; e.textContent = CSS;
  document.head.appendChild(e);
}
function tekstElem(roditelj, tekst) {              // poruke se nikad ne lepe kao HTML
  roditelj.appendChild(document.createTextNode(tekst));
}
function pokaziOblacic(tekst, od) {
  if (!oblacic) {
    oblacic = document.createElement("div");
    oblacic.className = "cetOblacic";
    document.body.appendChild(oblacic);
  }
  oblacic.textContent = "";
  if (od) { var b = document.createElement("b"); b.textContent = od + ": "; oblacic.appendChild(b); }
  tekstElem(oblacic, tekst);
  oblacic.classList.remove("vidi");
  void oblacic.offsetWidth;
  oblacic.classList.add("vidi");
  clearTimeout(tajmerObl);
  tajmerObl = setTimeout(function () { oblacic.classList.remove("vidi"); },
    Math.min(6000, 3000 + tekst.length * 60));
}
function upisiUIstoriju(od, tekst) {
  istorija.push({ od: od, t: tekst });
  if (istorija.length > 30) istorija.shift();
  var box = panel && panel.querySelector(".istorija");
  if (!box) return;
  crtajIstoriju(box);
}
function crtajIstoriju(box) {
  box.textContent = "";
  for (var i = 0; i < istorija.length; i++) {
    var d = document.createElement("div");
    var b = document.createElement("b");
    b.textContent = istorija[i].od + ": ";
    d.appendChild(b);
    tekstElem(d, istorija[i].t);
    box.appendChild(d);
  }
  box.scrollTop = box.scrollHeight;
}
function posalji(tekst) {
  tekst = String(tekst || "").replace(/[<>]/g, "").trim().slice(0, 90);
  if (!tekst || !M || !M.povezan || !M.povezan()) return false;
  var sad = Date.now();
  if (sad - zadnja < ROK) return false;            // da se ne zatrpava
  zadnja = sad;
  M.posalji({ t: "cet", tekst: tekst });
  upisiUIstoriju("Ti", tekst);
  pokaziOblacic(tekst, "Ti");
  window.SFX && SFX.tick();
  return true;
}
function zatvori() {
  if (panel) { panel.remove(); panel = null; }
}
function otvori() {
  if (panel) return zatvori();
  panel = document.createElement("div");
  panel.className = "cetPanel";
  var ist = document.createElement("div"); ist.className = "istorija";
  panel.appendChild(ist);
  crtajIstoriju(ist);
  var redE = document.createElement("div"); redE.className = "red";
  EMODZI.forEach(function (e) {
    var b = document.createElement("button");
    b.className = "emo"; b.textContent = e;
    b.onclick = function () { if (posalji(e)) zatvori(); };
    redE.appendChild(b);
  });
  panel.appendChild(redE);
  var redR = document.createElement("div"); redR.className = "red";
  RECI.forEach(function (r) {
    var b = document.createElement("button");
    b.className = "rec"; b.textContent = r;
    b.onclick = function () { if (posalji(r)) zatvori(); };
    redR.appendChild(b);
  });
  panel.appendChild(redR);
  var unos = document.createElement("div"); unos.className = "unos";
  var polje = document.createElement("input");
  polje.type = "text"; polje.maxLength = 90; polje.placeholder = "Napiši poruku…";
  polje.autocomplete = "off";
  var salji = document.createElement("button");
  salji.textContent = "Pošalji";
  var idi = function () { if (posalji(polje.value)) { polje.value = ""; zatvori(); } };
  salji.onclick = idi;
  polje.onkeydown = function (e) { if (e.key === "Enter") idi(); };
  unos.appendChild(polje); unos.appendChild(salji);
  panel.appendChild(unos);
  var zatv = document.createElement("button");
  zatv.textContent = "✕ Zatvori";
  zatv.onclick = zatvori;
  panel.appendChild(zatv);
  document.body.appendChild(panel);
  if (dugme) { var t = dugme.querySelector(".tacka"); if (t) t.remove(); }
  setTimeout(function () { polje.focus(); }, 60);
}

/* Dok je otvoren meni ili neki prozor preko ekrana, dugme se sklanja da ne smeta. */
var pratim = false;
function pratiPrekrivac() {
  var pre = document.getElementById("overlay");
  if (!pre || pratim) return;
  pratim = true;
  var osvezi = function () {
    if (!dugme) return;
    var sakrij = !pre.hidden;
    dugme.style.display = sakrij ? "none" : "";
    if (sakrij) zatvori();
  };
  try { new MutationObserver(osvezi).observe(pre, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) { }
  osvezi();
}

var CET = {
  EMODZI: EMODZI, RECI: RECI,
  ukljuci: function (o) {                          // igra ovo pozove kad soba proradi
    o = o || {};
    M = o.mreza || window.Mreza;
    dajIme = o.ime || null;
    stil();
    if (!dugme) {
      dugme = document.createElement("button");
      dugme.type = "button";
      dugme.className = "cetDugme";
      dugme.title = "Pošalji poruku";
      dugme.textContent = "💬";
      dugme.onclick = otvori;
      document.body.appendChild(dugme);
    }
    dugme.hidden = false;
    pratiPrekrivac();
  },
  iskljuci: function () {
    zatvori();
    if (dugme) dugme.hidden = true;
    istorija.length = 0;
  },
  ukljucen: function () { return !!dugme && !dugme.hidden; },
  primi: function (m, od) {                        // vrati true ako je poruka bila za čet
    if (!m || m.t !== "cet") return false;
    var ime = "Protivnik";
    try { if (dajIme) ime = dajIme(od) || ime; } catch (e) { }
    var tekst = String(m.tekst || "").slice(0, 90);
    if (!tekst) return true;
    upisiUIstoriju(ime, tekst);
    pokaziOblacic(tekst, ime);
    window.SFX && SFX.coin();
    if (dugme && !panel && !dugme.querySelector(".tacka")) {
      var t = document.createElement("span"); t.className = "tacka";
      dugme.appendChild(t);
    }
    return true;
  },
  posalji: posalji,
  otvori: otvori,
  zatvori: zatvori,
  get istorija() { return istorija.slice(); }
};
window.CET = CET;
})();
