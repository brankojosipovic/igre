/* © 2026 Branko Josipović. Sva prava zadržana. Ovaj kod se ne sme kopirati, prerađivati ni
   objavljivati bez pisane dozvole autora — videti LICENSE u korenu repozitorijuma. */
/* mreza.js — igra u dvoje preko interneta: jedan napravi sobu i dobije kod, drugi ga ukuca.

   Dva načina prenosa, oba se pokreću odjednom — koji prvi uspe, taj se koristi:

   1) RELEJ (glavni). Poruke idu kroz javne MQTT brokere preko WebSocket-a. Telefoni
      se ne traže međusobno, pa mobilne mreže i kućni ruteri ne mogu da smetaju.
      Spajamo se na više brokera odjednom; dovoljno je da oba telefona uhvate isti.
   2) DIREKTNA VEZA (rezerva). WebRTC preko PeerJS-a — brža, ali na 4G/5G često
      ne uspe da se probije, pa je tu samo kao pomoć.

   Sve se skida tek kad se izabere igra u dvoje, pa offline rad ostaje netaknut. */
(function () {
  "use strict";

  /* ---------- podešavanja ---------- */
  var MQTT_CDN = [
    "https://cdn.jsdelivr.net/npm/mqtt@5/dist/mqtt.min.js",
    "https://unpkg.com/mqtt@5/dist/mqtt.min.js",
    "https://cdn.jsdelivr.net/npm/mqtt/dist/mqtt.min.js"
  ];
  var BROKERI = window.__BROKERI_TEST || [            // javni, bez registracije
    { ime: "emqx", url: "wss://broker.emqx.io:8084/mqtt" },
    { ime: "eclipse", url: "wss://mqtt.eclipseprojects.io/mqtt" },
    { ime: "hivemq", url: "wss://broker.hivemq.com:8884/mqtt" },
    { ime: "mosquitto", url: "wss://test.mosquitto.org:8081/mqtt" }
  ];

  var PEER_CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js",
    "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js",
    "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
  ];
  var SERVERI = [
    { ime: "peerjs.com", opcije: { host: "0.peerjs.com", port: 443, path: "/", secure: true, key: "peerjs" } }
  ];
  var LED = {                                          // STUN + besplatan TURN, koliko ih ima
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
      { urls: ["turn:freestun.net:3478", "turns:freestun.net:5350"], username: "free", credential: "free" },
      {
        urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turns:openrelay.metered.ca:443?transport=tcp"],
        username: "openrelayproject", credential: "openrelayproject"
      }
    ],
    sdpSemantics: "unified-plan"
  };

  var ROK_BROKER = 9000;      // koliko čekamo da se javi broker
  var ROK_SOBA = 25000;       // koliko gost zove domaćina pre nego što odustane
  var ROK_NAJAVE = 6 * 3600e3;// posle ovoga zapamćena najava sobe više ne važi
                              // (domaćin se možda upravo vraća iz druge aplikacije)
  var ROK_SERVER = 9000;      // koliko čekamo PeerJS server
  var ROK_VEZA = 15000;       // koliko čekamo da se probije direktna veza
  var AZBUKA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";      // bez I, L, O, 0, 1 — da se ne mešaju
  var PREFIKS = "bwigre-";
  var TEMA = "bwigre/";

  /* ---------- stanje ---------- */
  var uloga = null, kod = null, zadnjaGreska = "";
  var naPoruku = function () { }, naStatus = function () { };
  var lokalni = null;                                   // kanal za probu na istom uređaju
  var R = null;                                         // relej
  var objavljen = false;                                // da se "povezan" ne javi dvaput
  var peerovi = [], veza = null;                        // direktna veza

  function kodiraj(n) {
    var s = "";
    for (var i = 0; i < n; i++) s += AZBUKA[(Math.random() * AZBUKA.length) | 0];
    return s;
  }
  function status(st, detalj) { try { naStatus(st, detalj); } catch (e) { } }
  function stigla(p, od) { try { naPoruku(p, od); } catch (e) { } }

  /* ---------- skidanje biblioteka ---------- */
  function skripta(url, rok) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = url; s.async = true;
      var t = setTimeout(function () { s.onload = s.onerror = null; rej(new Error("rok")); }, rok);
      s.onload = function () { clearTimeout(t); res(); };
      s.onerror = function () { clearTimeout(t); rej(new Error("pad")); };
      document.head.appendChild(s);
    });
  }
  function ucitajRedom(spisak, imaLi) {
    if (imaLi()) return Promise.resolve(imaLi());
    var i = -1;
    function sledeci() {
      i++;
      if (i >= spisak.length) return Promise.reject(new Error("Ne mogu da skinem mrežni deo — proveri internet."));
      return skripta(spisak[i], 9000).then(function () {
        var g = imaLi();
        return g || Promise.reject(new Error("prazno"));
      }).catch(sledeci);
    }
    return sledeci();
  }
  function ucitajMqtt() {
    if (window.__MqttTest) return Promise.resolve(window.__MqttTest);
    return ucitajRedom(MQTT_CDN, function () { return window.mqtt && window.mqtt.connect ? window.mqtt : null; });
  }
  function ucitajPeer() {
    if (window.__PeerTest) return Promise.resolve(window.__PeerTest);
    return ucitajRedom(PEER_CDN, function () { return window.Peer || null; });
  }

  /* ---------- javna tabla: zapamćene poruke ----------
     Svaki telefon objavi svoj sažetak kao MQTT poruku sa zastavicom „retain",
     pa je broker čuva. Strana sa pregledom se samo pretplati i odjednom
     pokupi sve što stoji. Bez ijednog servera sa naše strane. */
  function klijent(M, url, oznaka) {
    return M.connect(url, {
      clientId: oznaka + Math.random().toString(36).slice(2, 10),
      clean: true, keepalive: 20, connectTimeout: ROK_BROKER,
      reconnectPeriod: 0, protocolVersion: 4
    });
  }
  function objaviTablu(tema, obj) {
    return ucitajMqtt().then(function (M) {
      var tovar = JSON.stringify(obj);
      return new Promise(function (res) {
        var ostalo = BROKERI.length, poslato = 0;
        var kraj = function () { if (--ostalo <= 0) res(poslato); };
        BROKERI.forEach(function (b) {
          var c, gotov = false, t = null;
          var zavrsi = function (ok) {
            if (gotov) return;
            gotov = true; if (ok) poslato++;
            clearTimeout(t);
            try { c && c.end(true); } catch (e) { }
            kraj();
          };
          try { c = klijent(M, b.url, "bwo"); } catch (e) { return zavrsi(false); }
          t = setTimeout(function () { zavrsi(false); }, ROK_BROKER);
          c.on("connect", function () {
            try { c.publish(tema, tovar, { qos: 0, retain: true }, function () { zavrsi(true); }); }
            catch (e) { zavrsi(false); }
          });
          c.on("error", function () { zavrsi(false); });
        });
      });
    });
  }
  function citajTablu(prefiks, naStavku, rok) {
    return ucitajMqtt().then(function (M) {
      return new Promise(function (res) {
        var klijenti = [], n = 0, brokera = 0;
        var zavrsi = function () {
          klijenti.forEach(function (c) { try { c.end(true); } catch (e) { } });
          res({ stavki: n, brokera: brokera });
        };
        setTimeout(zavrsi, rok || 7000);
        BROKERI.forEach(function (b) {
          var c;
          try { c = klijent(M, b.url, "bwc"); } catch (e) { return; }
          klijenti.push(c);
          c.on("connect", function () {
            brokera++;
            try { c.subscribe(prefiks + "/#", { qos: 0 }); } catch (e) { }
          });
          c.on("message", function (tema, tovar) {
            var d; try { d = JSON.parse(String(tovar)); } catch (e) { return; }
            if (d) { n++; try { naStavku(d, b.ime); } catch (e) { } }
          });
          c.on("error", function () { });
        });
      });
    });
  }

  /* ---------- 1) relej preko javnih brokera ---------- */
  function napraviRelej(zaKod, zaUlogu) {
    var moja = TEMA + zaKod + "/s";                    // svi u sobi dele jednu temu
    var tudja = moja;
    /* Zapamćena (retained) najava: domaćin je objavi kad otvori sobu, broker je
       čuva. Gost je pokupi čim se pretplati — pa se zna razlika između „nema te
       sobe" i „soba postoji, ali domaćinu je ekran ugašen". */
    var najava = TEMA + zaKod + "/n";
    var sobaZiva = false;
    var ja = kodiraj(6), broj = 0, videno = Object.create(null), vidjenih = 0;
    var klijenti = [], spojen = false, mrtav = false, kucanje = null, imena = [];
    /* Telefon koji ode u drugu aplikaciju obori WebSocket, pa broker objavi
       njegovu oporuku „ode". To ne znači da je igrač otišao iz sobe — zato se
       posle praznjenja sobe čeka MILOST pa se tek onda javlja prekid. Ko sam
       pritisne „Izađi iz sobe" pošalje „ode" sa oznakom da je svesno — tada
       nema čekanja, soba je stvarno prazna. */
    var MILOST = 90000, pauza = null;
    /* Ko se dugo nije javio, više ne drži svoje mesto. Bez ovoga stara oznaka
       igrača koji se vratio pod novom oznakom blokira sopstveno mesto — pa mu
       domaćin kaže da je soba puna. */
    var KUCANJE = 20000, ZIVOT = 75000;
    function otkaziPauzu() { if (pauza) { clearTimeout(pauza); pauza = null; } }
    var drustvo = Object.create(null);                  // id → {ime, uloga, kad}

    function mojeIme() { return (window.IGRAC && IGRAC.ime()) || ""; }
    function paket(p) { return JSON.stringify({ o: ja, i: ++broj, im: mojeIme(), p: p }); }
    function spisak() {
      var sad = Date.now();
      var out = [{ id: ja, ime: mojeIme(), uloga: zaUlogu, ja: true, kad: 0, svez: true }];
      for (var k in drustvo) out.push({
        id: k, ime: drustvo[k].ime, uloga: drustvo[k].uloga, kad: drustvo[k].kad,
        vid: drustvo[k].vid, svez: sad - (drustvo[k].vid || 0) < ZIVOT
      });
      out.sort(function (a, b) { return (a.kad || 0) - (b.kad || 0); });
      return out;
    }
    function upisi(id, ime, uloga) {
      var pre = drustvo[id] ? drustvo[id].ime : null;
      drustvo[id] = {
        ime: ime || (drustvo[id] && drustvo[id].ime) || "",
        uloga: uloga || (drustvo[id] && drustvo[id].uloga) || "gost",
        kad: (drustvo[id] && drustvo[id].kad) || Date.now(),
        vid: Date.now()
      };
      otkaziPauzu();                                    // neko je tu — nema prekida
      if (pre !== drustvo[id].ime || pre === null) status("ucesnici", spisak());
    }

    var rel = {
      vrsta: "relej",
      spojen: function () { return spojen && zivih() > 0; },
      /* Za slanje je dovoljno da broker bude živ. „spojen" znači da se neko već
         javio, a to zna da bude false baš u trenutku kad se neko vraća u sobu —
         tada poruka ne sme da se izgubi. */
      ziv: function () { return zivih() > 0; },
      drustvo: function () { return spisak(); },
      jaSam: function () { return ja; },
      sobaZiva: function () { return sobaZiva; },
      brokeri: function () { return imena.slice(); },
      posalji: function (obj) {
        var m = paket(obj), ok = false;
        klijenti.forEach(function (c) { try { if (c.connected) { c.publish(moja, m, { qos: 0 }); ok = true; } } catch (e) { } });
        return ok;
      },
      /* Vraćanje iz druge aplikacije: pretplata je možda pala, a i ostali su
         nas u međuvremenu možda otpisali — zato se ponovo javimo. */
      ozivi: function () {
        if (mrtav) return;
        otkaziPauzu();
        klijenti.forEach(function (c) {
          try {
            if (c.connected) c.subscribe(tudja, { qos: 0 });
            else if (c.reconnect) c.reconnect();
          } catch (e) { }
        });
        try { rel.posalji({ __: "evo", uloga: zaUlogu }); } catch (e) { }
      },
      /* Kad se u sobi nađu dva domaćina, jedan se povlači — pa mora i drugima
         da javi da više nije domaćin, inače bi ga i dalje tražili kao takvog. */
      predaj: function () {
        if (zaUlogu !== "domacin") return;
        zaUlogu = "gost";
        try { rel.posalji({ __: "evo", uloga: zaUlogu }); } catch (e) { }
        status("ucesnici", spisak());
      },
      zatvori: function () {
        mrtav = true; clearInterval(kucanje); otkaziPauzu();
        /* Domaćin za sobom briše najavu, da tuđi kod kasnije ne izgleda kao živa soba. */
        if (zaUlogu === "domacin") klijenti.forEach(function (c) {
          try { if (c.connected) c.publish(najava, "", { qos: 0, retain: true }); } catch (e) { }
        });
        klijenti.forEach(function (c) { try { c.end(true); } catch (e) { } });
        klijenti = []; spojen = false;
      }
    };
    function zivih() { return klijenti.filter(function (c) { return c.connected; }).length; }

    function primi(tema, tovar) {
      if (mrtav) return;
      if (tema === najava) {                            // najava, ne poruka iz sobe
        var t; try { t = JSON.parse(String(tovar)); } catch (e) { t = null; }
        sobaZiva = !!(t && t.kad && Date.now() - t.kad < ROK_NAJAVE);
        return;
      }
      var d; try { d = JSON.parse(String(tovar)); } catch (e) { return; }
      if (!d || d.o === ja) return;
      var kljuc = d.o + ":" + d.i;
      if (videno[kljuc]) return;                        // ista poruka stigla preko drugog brokera
      videno[kljuc] = 1;
      if (++vidjenih > 800) { videno = Object.create(null); vidjenih = 0; }
      var p = d.p;
      if (p && p.__ === "zdravo") {
        upisi(d.o, d.im, p.uloga);
        rel.posalji({ __: "evo", uloga: zaUlogu });
        return spoji();
      }
      if (p && p.__ === "evo") {
        /* Ko nam je nov, taj nas verovatno ne vidi — javimo se i mi. Tako se
           nađu i dva koja se vraćaju u sobu bez da ijedan zove „zdravo"
           (domaćin koji je ponovo otvorio staru sobu, na primer). Ne vrti se u
           krug: odgovara se samo na nepoznatog. */
        var novi = !drustvo[d.o];
        upisi(d.o, d.im, p.uloga);
        if (novi) rel.posalji({ __: "evo", uloga: zaUlogu });
        return spoji();
      }
      if (p && p.__ === "tu") { upisi(d.o, d.im, null); return; }   // samo javlja da je tu
      if (p && p.__ === "ode") {
        delete drustvo[d.o];
        status("ucesnici", spisak());
        if (p.svesno && !Object.keys(drustvo).length) {
          otkaziPauzu(); spojen = false; status("prekinuto"); return;
        }
        /* Soba je ostala prazna. „objavljen" se namerno NE vraća na false:
           ako se neko vrati, treba da stigne „ucesnici", a ne opet „povezan" —
           inače bi domaćina usred partije odbacilo nazad u čekaonicu. */
        if (!Object.keys(drustvo).length) {
          otkaziPauzu();
          pauza = setTimeout(function () {
            pauza = null;
            if (mrtav || Object.keys(drustvo).length) return;
            spojen = false; status("prekinuto");
          }, MILOST);
        }
        return;
      }
      if (d.im) upisi(d.o, d.im, null);
      else if (drustvo[d.o]) drustvo[d.o].vid = Date.now();
      spoji(); stigla(p, d.o);
    }
    function spoji() {
      if (spojen) return;
      spojen = true; clearInterval(kucanje); kucanje = null;
      preuzmi("relej");
    }
    /* Tiho javljanje da smo i dalje tu — po tome se poznaje koja je oznaka
       zastarela, pa se mesto oslobodi onome ko se vraća pod novom. */
    setInterval(function () { if (!mrtav && zivih()) { try { rel.posalji({ __: "tu" }); } catch (e) { } } }, KUCANJE);

    /* spoji se na svaki broker; uspeh je bar jedan */
    rel.otvori = function (M) {
      return new Promise(function (res, rej) {
        var odgovorilo = 0, uspelo = 0, greske = [];
        BROKERI.forEach(function (b) {
          var c, gotov = false;
          try {
            c = M.connect(b.url, {
              clientId: "bw" + zaKod + ja, clean: true, keepalive: 30,
              connectTimeout: ROK_BROKER, reconnectPeriod: 5000, protocolVersion: 4,
              will: { topic: moja, payload: JSON.stringify({ o: ja, i: 0, p: { __: "ode" } }), qos: 0, retain: false }
            });
          } catch (e) { return kraj(false, b.ime + ": " + (e.message || "pad")); }
          var bioSpojen = false;
          var t = setTimeout(function () { try { c.end(true); } catch (e) { } kraj(false, b.ime + ": ne javlja se"); }, ROK_BROKER);
          c.on("connect", function () {
            bioSpojen = true;
            try { c.subscribe(tudja, { qos: 0 }); } catch (e) { }
            try {
              if (zaUlogu === "domacin")
                c.publish(najava, JSON.stringify({ kod: zaKod, kad: Date.now() }), { qos: 0, retain: true });
              else c.subscribe(najava, { qos: 0 });
            } catch (e) { }
            clearTimeout(t); if (klijenti.indexOf(c) < 0) klijenti.push(c);
            if (imena.indexOf(b.ime) < 0) imena.push(b.ime);
            setTimeout(function () { try { rel.posalji({ __: "evo", uloga: zaUlogu }); } catch (e) { } }, 60);
            kraj(true);
          });
          c.on("message", primi);
          c.on("error", function (e) {
            if (!bioSpojen) { clearTimeout(t); try { c.end(true); } catch (x) { } }   // mrtav broker se ne doziva stalno
            kraj(false, b.ime + ": " + ((e && e.message) || "greška"));
          });
          function kraj(ok, greska) {
            if (mrtav) { try { c && c.end(true); } catch (e) { } return; }
            if (!ok && greska) greske.push(greska);
            if (gotov) return;
            gotov = true; odgovorilo++; if (ok) uspelo++;
            if (uspelo === 1 && ok) res(rel);
            else if (odgovorilo === BROKERI.length && !uspelo) rej({ vrsta: "relej", detalji: greske });
          }
        });
      });
    };

    /* gost zove domaćina dok se ne javi.

       „trazimDomacina" traži baš domaćina, a ne bilo koga. Bez toga se dva
       telefona koja se u isto vreme vraćaju u staru sobu prepoznaju međusobno,
       svaki pomisli da je onaj drugi domaćin — i soba ostane bez domaćina.
       Kad se niko ne javi, u odbijanju stoji i ko je sve viđen, da onaj ko zove
       ume da odluči da li da sam otvori sobu ili da sačeka. */
    rel.zovi = function (rok, trazimDomacina) {
      var cekaj = rok > 0 ? rok : ROK_SOBA;
      return new Promise(function (res, rej) {
        function javioSe() {
          if (!spojen) return false;
          if (!trazimDomacina) return true;
          for (var k in drustvo) if (drustvo[k].uloga === "domacin") return true;
          return false;
        }
        rel.posalji({ __: "zdravo" });
        kucanje = setInterval(function () { if (!javioSe()) rel.posalji({ __: "zdravo" }); }, 1200);
        var t0 = Date.now();
        var straza = setInterval(function () {
          if (mrtav) { clearInterval(straza); return; }
          if (javioSe()) { clearInterval(straza); return res(rel); }
          if (Date.now() - t0 > cekaj) {
            clearInterval(straza); clearInterval(kucanje);
            rej({
              vrsta: "relej", ja: ja, drustvo: spisak(),
              detalji: ["nema odgovora iz sobe (" + imena.join(", ") + ")"]
            });
          }
        }, 200);
      });
    };

    return rel;
  }

  /* ---------- 2) direktna veza (rezerva) ---------- */
  function ubij(p) { try { p && p.destroy(); } catch (e) { } }
  function opcijeZa(srv) {
    var o = { debug: 0, config: LED };
    for (var k in srv.opcije) o[k] = srv.opcije[k];
    return o;
  }
  function zatvoriPeerove(cuvaj) {
    peerovi.filter(function (p) { return p !== cuvaj; }).forEach(ubij);
    peerovi = cuvaj ? [cuvaj] : [];
  }
  function vezi(v) {
    veza = v;
    v.on("data", function (d) { stigla(d, "direktna"); });
    v.on("close", function () { status("prekinuto"); veza = null; });
    v.on("error", function () { status("prekinuto"); });
    if (v.open) preuzmi("direktna");
    else v.on("open", function () { preuzmi("direktna"); });
  }
  function domacinNa(Peer, srv, mojKod) {
    return new Promise(function (res, rej) {
      var p, gotov = false;
      try { p = new Peer(PREFIKS + mojKod, opcijeZa(srv)); }
      catch (e) { return rej(e); }
      var t = setTimeout(function () {
        if (gotov) return;
        gotov = true; ubij(p); rej({ type: "timeout", server: srv.ime });
      }, ROK_SERVER);
      p.on("open", function () { if (!gotov) { gotov = true; clearTimeout(t); res(p); } });
      p.on("connection", function (v) {
        if (veza || (R && R.spojen())) { try { v.close(); } catch (e) { } return; }
        zatvoriPeerove(p); vezi(v);
      });
      p.on("disconnected", function () { if (!p.destroyed) { try { p.reconnect(); } catch (e) { } } });
      p.on("error", function (e) {
        if (!gotov) { gotov = true; clearTimeout(t); ubij(p); if (e) e.server = srv.ime; rej(e || { type: "unknown" }); }
      });
    });
  }
  function gostNa(Peer, srv, trazeniKod) {
    return new Promise(function (res, rej) {
      var p, gotov = false;
      function kraj(ok, sta) {
        if (gotov) return;
        gotov = true; clearTimeout(t);
        if (ok) res({ peer: p, veza: sta }); else { ubij(p); rej(sta); }
      }
      try { p = new Peer(null, opcijeZa(srv)); }
      catch (e) { return rej(e); }
      var t = setTimeout(function () { kraj(false, { type: "timeout", server: srv.ime }); }, ROK_SERVER + ROK_VEZA);
      p.on("open", function () {
        var v;
        try { v = p.connect(PREFIKS + trazeniKod, { reliable: true }); }
        catch (e) { return kraj(false, e); }
        if (!v) return kraj(false, { type: "peer-unavailable", server: srv.ime });
        v.on("open", function () { kraj(true, v); });
        v.on("error", function (e) { if (e) e.server = srv.ime; kraj(false, e || { type: "unknown" }); });
      });
      p.on("error", function (e) { if (e) e.server = srv.ime; kraj(false, e || { type: "unknown" }); });
    });
  }

  /* prvi način koji uspe gasi drugi */
  function preuzmi(sta) {
    if (sta === "relej") { zatvoriPeerove(null); try { if (veza) veza.close(); } catch (e) { } veza = null; }
    else if (R) { R.zatvori(); R = null; }
    if (objavljen) return;
    objavljen = true;
    status("povezan", uloga);
  }

  /* ---------- javni deo ---------- */
  var API = {
    podrzana: function () { return typeof WebSocket !== "undefined"; },
    kod: function () { return kod; },
    uloga: function () { return uloga; },                // "domacin" | "gost"
    nacin: function () { return lokalni ? "lokalno" : (R && R.spojen()) ? "relej" : (veza && veza.open) ? "direktna" : null; },
    povezan: function () { return !!lokalni || !!(R && R.spojen()) || !!(veza && veza.open); },
    detalji: function () { return zadnjaGreska; },
    /* Posle neuspelog ulaska: {ja, drustvo} — ko je bio u sobi, iako se domaćin
       nije javio. Po tome igra bira ko od njih otvara sobu. */
    videno: function () { return videnoUSobi; },
    /* Povlačenje domaćina kad se u istoj sobi zateknu dvojica: soba ostaje,
       veza ostaje, samo se uloga vraća na gosta. */
    predajUlogu: function () {
      if (uloga !== "domacin") return;
      uloga = "gost";
      if (R && R.predaj) R.predaj();
    },
    jaSam: function () { return R ? R.jaSam() : "ja"; },
    drustvo: function () { return R ? R.drustvo() : (veza && veza.open ? [{ id: "ja", ime: (window.IGRAC && IGRAC.ime()) || "", ja: true }] : []); },
    tudji: function () { return API.drustvo().filter(function (x) { return !x.ja; }); },
    tudjeIme: function (rez) { var t = API.tudji()[0]; return (t && t.ime) || rez || "Protivnik"; },

    napravi: function (opcije) {
      opcije = opcije || {};
      naPoruku = opcije.poruka || naPoruku; naStatus = opcije.status || naStatus;
      uloga = "domacin"; zadnjaGreska = ""; peerovi = []; veza = null; objavljen = false;
      kod = (opcije.kod || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || kodiraj(5);   // isti kod = nastavak partije
      status("spajam", "otvaram sobu");

      var greske = [];
      var preko = ucitajMqtt().then(function (M) {
        R = napraviRelej(kod, "domacin");
        return R.otvori(M);
      }).catch(function (e) {
        R = null; greske.push("relej: " + opisGreske(e)); throw e;
      });

      var direktno = ucitajPeer().then(function (Peer) {
        return Promise.all(SERVERI.map(function (s) {
          return domacinNa(Peer, s, kod).then(function (p) { peerovi.push(p); return true; }, function (e) { return e; });
        })).then(function (rez) {
          if (rez.some(function (r) { return r === true; })) return true;
          throw rez[0];
        });
      }).catch(function (e) { greske.push("direktna: " + opisGreske(e)); throw e; });

      return prviUspeh([preko, direktno]).then(function () {
        window.BUDAN && BUDAN.drzi();                  // ekran ne sme da zaspi dok se čeka
        status("cekam", kod);
        return kod;
      }, function () {
        zadnjaGreska = trag(greske);
        status("greska", "Ne mogu da otvorim sobu — nijedan server se ne javlja. Proveri internet i probaj ponovo." + zadnjaGreska);
        throw new Error("nema servera");
      });
    },

    pridruzi: function (uneti, opcije) {
      opcije = opcije || {};
      naPoruku = opcije.poruka || naPoruku; naStatus = opcije.status || naStatus;
      uloga = "gost"; kod = (uneti || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); zadnjaGreska = "";
      sobaJeBila = false;
      peerovi = []; veza = null; objavljen = false;
      if (kod.length < 4) return Promise.reject(new Error("Kod nije potpun."));
      status("spajam", "tražim sobu " + kod);

      var greske = [];
      /* Nastavak partije samo proverava ima li koga u sobi, pa mu treba brz
         odgovor: kratak rok i bez direktne veze, koja ume da traži i pola minuta. */
      var rok = opcije.rok > 0 ? opcije.rok : 0;
      /* Ko je viđen u sobi iako se domaćin nije javio — igra po tome bira ko
         od njih otvara sobu, pa ne otvore svi ili nijedan. */
      videnoUSobi = null;
      var preko = ucitajMqtt().then(function (M) {
        R = napraviRelej(kod, "gost");
        return R.otvori(M).then(function () { return R.zovi(rok, !!opcije.trazimDomacina); });
      }).catch(function (e) {
        if (e && e.drustvo) videnoUSobi = { ja: e.ja, drustvo: e.drustvo };
        if (R) { sobaJeBila = !!(R.sobaZiva && R.sobaZiva()); R.zatvori(); R = null; }
        greske.push("relej: " + opisGreske(e)); throw e;
      });

      /* Kad se samo proverava ima li koga u sobi, direktna veza se i ne pokreće —
         inače bi njeno odustajanje ostalo bez obrade i javilo se kao greška. */
      var putevi = [preko];
      if (!opcije.samoRelej) putevi.push(ucitajPeer().then(function (Peer) {
        return gostNa(Peer, SERVERI[0], kod).then(function (r) {
          if (R && R.spojen()) { ubij(r.peer); try { r.veza.close(); } catch (e) { } return true; }
          peerovi = [r.peer]; vezi(r.veza); return true;
        });
      }).catch(function (e) { greske.push("direktna: " + opisGreske(e)); throw e; }));

      return prviUspeh(putevi).then(function () {
        window.BUDAN && BUDAN.drzi();
        return kod;
      }, function () {
        zadnjaGreska = trag(greske);
        status("greska", (sobaJeBila
          ? "Soba <b>" + kod + "</b> postoji, ali se domaćin ne javlja — verovatno mu se ugasio ekran. " +
            "Neka ga uključi i vrati se u igru, pa probaj ponovo."
          : "Nisam našao sobu sa tim kodom. Proveri kod i da li je domaćin još na ekranu sa kodom.") + zadnjaGreska);
        throw new Error("nema sobe");
      });
    },

    /* proba na istom uređaju: dva prozora iste igre razgovaraju bez interneta */
    lokalno: function (ime, opcije) {
      opcije = opcije || {};
      naPoruku = opcije.poruka || naPoruku; naStatus = opcije.status || naStatus;
      uloga = opcije.uloga || "domacin"; kod = "LOKAL";
      lokalni = new BroadcastChannel("bwigre-" + ime);
      lokalni.onmessage = function (e) { stigla(e.data); };
      status("povezan", uloga);
      return Promise.resolve(kod);
    },

    posalji: function (obj) {
      if (lokalni) { try { lokalni.postMessage(obj); } catch (e) { } return true; }
      if (R && R.ziv()) return R.posalji(obj);
      if (veza && veza.open) { try { veza.send(obj); return true; } catch (e) { } }
      return false;
    },

    /* Ručno oživljavanje veze; igre ga zovu iz dugmeta „Probaj ponovo". */
    ozivi: function () { return ozivi(); },

    objaviTablu: objaviTablu,
    citajTablu: citajTablu,

    zatvori: function () {
      window.BUDAN && BUDAN.pusti();                    // soba je gotova, ekran sme da spava
      if (R) { try { R.posalji({ __: "ode", svesno: 1 }); } catch (e) { } R.zatvori(); R = null; }
      try { if (veza) veza.close(); } catch (e) { }
      zatvoriPeerove(null);
      try { if (lokalni) lokalni.close(); } catch (e) { }
      veza = lokalni = null; uloga = null; kod = null; objavljen = false;
      status("zatvoreno");
    }
  };

  /* ---------- vraćanje u prvi plan ----------
     Kad telefon ode u drugu aplikaciju, veza sa brokerom pukne i ostali dobiju
     našu oporuku. Ne čekamo da to neko primeti — čim se strana vrati, javimo se
     sami. Bez ovoga je domaćinu bilo dovoljno da pogleda poruku pa da soba padne. */
  var sobaJeBila = false;      // pri neuspelom ulasku: da li je bar postojala najava sobe
  var videnoUSobi = null;      // pri neuspelom ulasku: ko je ipak bio u sobi (bez domaćina)
  var zadnjeOzivljavanje = 0;
  function ozivi() {
    if (!R) return false;
    var sad = Date.now();
    if (sad - zadnjeOzivljavanje < 1200) return true;   // focus i visibilitychange stižu zajedno
    zadnjeOzivljavanje = sad;
    try { R.ozivi(); } catch (e) { }
    return true;
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) ozivi(); });
  window.addEventListener("pageshow", function () { ozivi(); });
  window.addEventListener("focus", function () { ozivi(); });
  window.addEventListener("online", function () { ozivi(); });

  /* uspeh čim jedan uspe; neuspeh tek kad svi padnu */
  function prviUspeh(spisak) {
    return new Promise(function (res, rej) {
      var palo = 0, gotovo = false;
      spisak.forEach(function (p) {
        p.then(function (v) { if (!gotovo) { gotovo = true; res(v); } },
          function () { if (++palo === spisak.length && !gotovo) rej(); });
      });
    });
  }

  function opisGreske(e) {
    if (!e) return "greška";
    if (e.detalji) return e.detalji.join(", ");
    if (e.type) return (e.server ? e.server + " " : "") + e.type;
    return e.message || "greška";
  }
  function trag(greske) {
    return greske.length ? "<br><small style=\"opacity:.65\">(" + greske.join(" · ") + ")</small>" : "";
  }

  window.Mreza = API;
})();
