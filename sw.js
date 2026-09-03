/* © 2026 Branko Josipović. Sva prava zadržana. Ovaj kod se ne sme kopirati, prerađivati ni
   objavljivati bez pisane dozvole autora — videti LICENSE u korenu repozitorijuma. */
/* Service Worker — igre rade bez interneta, ali se osvežavaju čim ima signala.
   Stranice i skripte: mreža prvo (uz kratak rok), pa keš — tako nova verzija stiže odmah.
   Ikone i slike: keš prvo — one se ne menjaju. */
/* Ime keša je namerno drugačije od starog „igre-vNN" sa border-wait adrese:
   oba sajta dele isto skladište, pa se tako ne brišu međusobno. */
const VERSION = "igre-sajt-v75";
const NET_TIMEOUT = 2500;
const CORE = [
  "./", "./index.html", "./igre.js", "./pomoc.html", "./statistika.html", "./manifest.webmanifest",
  "./sudoku.html", "./solitaire.html", "./kolona.html", "./aparat.html", "./svercer.html",
  "./tetris.html", "./avioni.html", "./cigle.html", "./stvorenja.html", "./tablic.html", "./jamb.html", "./geo.html",
  "./pikado.html", "./bilijar.html", "./kuca.html", "./teren.html", "./mapa.html", "./covece.html", "./riziko.html", "./basket.html", "./rumi.html",
  "./mreza.js", "./cet.js", "./svet.js", "./riziko.js",
  "./icons/igre-180.png", "./icons/igre-192.png", "./icons/igre-512.png",
  "./icons/sudoku-180.png", "./icons/solitaire-180.png", "./icons/kolona-180.png",
  "./icons/aparat-180.png", "./icons/svercer-180.png", "./icons/tetris-180.png",
  "./icons/avioni-180.png", "./icons/cigle-180.png", "./icons/stvorenja-180.png",
  "./icons/tablic-180.png", "./icons/jamb-180.png", "./icons/geo-180.png", "./icons/pikado-180.png", "./icons/bilijar-180.png", "./icons/kuca-180.png", "./icons/teren-180.png", "./icons/mapa-180.png", "./icons/covece-180.png", "./icons/riziko-180.png", "./icons/basket-180.png", "./icons/rumi-180.png"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => { })));
    await self.skipWaiting();                    // nova verzija ne čeka zatvaranje kartica
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const stare = keys.filter(k => k !== VERSION);
    await Promise.all(stare.map(k => caches.delete(k)));
    await self.clients.claim();
    dopuni();                                    // tiho popuni ono sto je pri instalaciji palo
    if (stare.length) {                          // bila je starija verzija → javi stranicama da se osveže
      const cs = await self.clients.matchAll({ type: "window" });
      for (const c of cs) c.postMessage({ type: "sw-activated", version: VERSION });
    }
  })());
});

async function dopuni() {                        // ako je prvo skidanje palo na pola, dovuci ostatak
  const c = await caches.open(VERSION);
  let dodato = 0;
  for (const u of CORE) {
    if (await c.match(u, { ignoreSearch: true })) continue;
    try { await c.add(new Request(u, { cache: "reload" })); dodato++; } catch (e) { }
  }
  return dodato;
}

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
  if (e.data === "version" && e.source) e.source.postMessage({ version: VERSION });
  if (e.data === "dopuni") e.waitUntil(dopuni().then(n => { if (e.source) e.source.postMessage({ dopunjeno: n }); }));
});

const timeout = (p, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("timeout")), ms);
  p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
});

async function freshFirst(e, req) {               // mreža prvo, keš kao mreža za slučaj nužde
  const cache = await caches.open(VERSION);
  const net = fetch(req).then(res => {
    if (res && res.ok && res.type === "basic") cache.put(req, res.clone()).catch(() => { });
    return res;
  });
  try {
    return await timeout(net, NET_TIMEOUT);
  } catch (err) {
    e.waitUntil(net.catch(() => { }));            // spori odgovor ipak osveži keš
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const fb = await cache.match("./index.html");
      if (fb) return fb;
    }
    return new Response("Offline — ova stranica nije sačuvana.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function cacheFirst(e, req) {               // ikone i slike se ne menjaju
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => {
    if (res && res.ok && res.type === "basic") cache.put(req, res.clone()).catch(() => { });
    return res;
  }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  const res = await net;
  return res || new Response("", { status: 504 });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const svez = req.mode === "navigate" || /\.(html|js|webmanifest|json|css)$/i.test(url.pathname) || url.pathname.endsWith("/");
  e.respondWith(svez ? freshFirst(e, req) : cacheFirst(e, req));
});
