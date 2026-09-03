# -*- coding: utf-8 -*-
"""Od Natural Earth podataka pravi svet.js — granice, države i gradove za igru Mapa."""
import json, math, os

SP = os.path.dirname(os.path.abspath(__file__))
IME = {  # ISO3 -> srpski naziv
 "CHN":"Kina","IND":"Indija","USA":"SAD","IDN":"Indonezija","PAK":"Pakistan","BRA":"Brazil",
 "NGA":"Nigerija","BGD":"Bangladeš","RUS":"Rusija","MEX":"Meksiko","JPN":"Japan","ETH":"Etiopija",
 "PHL":"Filipini","EGY":"Egipat","VNM":"Vijetnam","COD":"DR Kongo","TUR":"Turska","DEU":"Nemačka",
 "IRN":"Iran","THA":"Tajland","GBR":"Velika Britanija","ITA":"Italija","ZAF":"Južnoafrička Republika",
 "TZA":"Tanzanija","MMR":"Mjanmar","KEN":"Kenija","KOR":"Južna Koreja","COL":"Kolumbija","ESP":"Španija",
 "ARG":"Argentina","UKR":"Ukrajina","UGA":"Uganda","DZA":"Alžir","SDN":"Sudan","IRQ":"Irak",
 "AFG":"Avganistan","POL":"Poljska","CAN":"Kanada","MAR":"Maroko","SAU":"Saudijska Arabija",
 "UZB":"Uzbekistan","PER":"Peru","MYS":"Malezija","AGO":"Angola","GHA":"Gana","MOZ":"Mozambik",
 "YEM":"Jemen","NPL":"Nepal","VEN":"Venecuela","MDG":"Madagaskar","CMR":"Kamerun","CIV":"Obala Slonovače",
 "PRK":"Severna Koreja","AUS":"Australija","TWN":"Tajvan","NER":"Niger","LKA":"Šri Lanka",
 "BFA":"Burkina Faso","MLI":"Mali","ROU":"Rumunija","CHL":"Čile","MWI":"Malavi","KAZ":"Kazahstan",
 "ZMB":"Zambija","ECU":"Ekvador","NLD":"Holandija","SYR":"Sirija","GTM":"Gvatemala","KHM":"Kambodža",
 "SEN":"Senegal","TCD":"Čad","ZWE":"Zimbabve","GIN":"Gvineja","RWA":"Ruanda","BEN":"Benin","TUN":"Tunis",
 "BDI":"Burundi","BOL":"Bolivija","BEL":"Belgija","CUB":"Kuba","HTI":"Haiti","SSD":"Južni Sudan",
 "DOM":"Dominikanska Republika","GRC":"Grčka","CZE":"Češka","SWE":"Švedska","PRT":"Portugal",
 "SOM":"Somalija","JOR":"Jordan","AZE":"Azerbejdžan","ARE":"Ujedinjeni Arapski Emirati","HUN":"Mađarska",
 "HND":"Honduras","BLR":"Belorusija","TJK":"Tadžikistan","ISR":"Izrael","AUT":"Austrija",
 "PNG":"Papua Nova Gvineja","CHE":"Švajcarska","TGO":"Togo","SLE":"Sijera Leone","LAO":"Laos",
 "PRY":"Paragvaj","BGR":"Bugarska","SRB":"Srbija","LBN":"Liban","LBY":"Libija","NIC":"Nikaragva",
 "KGZ":"Kirgistan","SLV":"Salvador","ERI":"Eritreja","TKM":"Turkmenistan","DNK":"Danska","FIN":"Finska",
 "SVK":"Slovačka","COG":"Kongo","CRI":"Kostarika","OMN":"Oman","IRL":"Irska","LBR":"Liberija",
 "NZL":"Novi Zeland","CAF":"Centralnoafrička Republika","PSE":"Palestina","MRT":"Mauritanija",
 "PAN":"Panama","KWT":"Kuvajt","HRV":"Hrvatska","GEO":"Gruzija","URY":"Urugvaj","BIH":"Bosna i Hercegovina",
 "MNG":"Mongolija","ARM":"Jermenija","JAM":"Jamajka","ALB":"Albanija","QAT":"Katar","LTU":"Litvanija",
 "MDA":"Moldavija","NAM":"Namibija","GMB":"Gambija","BWA":"Bocvana","GAB":"Gabon","LSO":"Lesoto",
 "SVN":"Slovenija","MKD":"Severna Makedonija","GNB":"Gvineja Bisao","LVA":"Letonija",
 "TTO":"Trinidad i Tobago","GNQ":"Ekvatorijalna Gvineja","EST":"Estonija","TLS":"Istočni Timor",
 "CYP":"Kipar","SWZ":"Esvatini","DJI":"Džibuti","FJI":"Fidži","GUY":"Gvajana","BTN":"Butan",
 "SLB":"Solomonska Ostrva","MNE":"Crna Gora","LUX":"Luksemburg","SUR":"Surinam","BRN":"Bruneji",
 "BLZ":"Belize","BHS":"Bahami","ISL":"Island","VUT":"Vanuatu","GRL":"Grenland",
}
PO_NAZIVU = {"France":("FRA","Francuska"), "Norway":("NOR","Norveška"), "Kosovo":("XKX","Kosovo")}
BEZ_PITANJA = {"ESH","ATA","ATF","FLK","NCL","PRI","GRL","SLB","VUT","FJI","TLS","BRN","GNQ","SWZ","GNB","DJI"}
KONTINENT = {"Europe":"Evropa","Asia":"Azija","Africa":"Afrika","North America":"Severna Amerika",
             "South America":"Južna Amerika","Oceania":"Okeanija","Antarctica":"Antarktik",
             "Seven seas (open ocean)":"Okean"}
LAKE = {"Antarctica","Fr. S. Antarctic Lands"}

def kodiraj(tacke, z=100):
    """Google polyline kodiranje — kratko i lako se čita u pregledaču."""
    out = []
    px = py = 0
    for x, y in tacke:
        ix, iy = int(round(x * z)), int(round(y * z))
        for v in (ix - px, iy - py):
            v = ~(v << 1) if v < 0 else (v << 1)
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1f)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        px, py = ix, iy
    return "".join(out)

def rdp(t, eps):
    if len(t) < 4: return t
    drzi = [False] * len(t)
    drzi[0] = drzi[-1] = True
    stek = [(0, len(t) - 1)]
    while stek:
        a, b = stek.pop()
        if b - a < 2: continue
        ax, ay = t[a]; bx, by = t[b]
        dx, dy = bx - ax, by - ay
        duz = math.hypot(dx, dy) or 1
        naj, naji = -1, -1
        for i in range(a + 1, b):
            d = abs((t[i][0] - ax) * dy - (t[i][1] - ay) * dx) / duz
            if d > naj: naj, naji = d, i
        if naj > eps:
            drzi[naji] = True
            stek.append((a, naji)); stek.append((naji, b))
    return [p for p, k in zip(t, drzi) if k]

def rdp_prsten(ring, eps):
    """RDP nad zatvorenim prstenom: prvo se nađe najudaljenija tačka od početne,
       pa se prsten uprošćava u dva luka — inače je osnovica duga nula i ništa ne ostane."""
    t = ring[:-1] if ring[0] == ring[-1] else list(ring)
    n = len(t)
    if n < 8: return list(ring)
    k = max(range(n), key=lambda i: (t[i][0] - t[0][0]) ** 2 + (t[i][1] - t[0][1]) ** 2)
    a = rdp(t[:k + 1], eps)
    b = rdp(t[k:] + [t[0]], eps)
    out = a[:-1] + b[:-1]
    return out + [out[0]] if out else list(ring)

def obradi():
    d = json.load(open(os.path.join(SP, "ne50.geojson")))
    drzave = []
    for f in d["features"]:
        p = f["properties"]
        iso = p["ISO_A3"]
        naziv = p["NAME"]
        if naziv in LAKE: continue
        if iso == "-99":
            if naziv not in PO_NAZIVU: continue
            iso, ime = PO_NAZIVU[naziv]
        else:
            ime = IME.get(iso)
            if not ime: continue
        g = f["geometry"]
        delovi = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        prsteni = []
        for poly in delovi:
            for k, ring in enumerate(poly):
                xs = [c[0] for c in ring]; ys = [c[1] for c in ring]
                sirina, visina = max(xs) - min(xs), max(ys) - min(ys)
                if max(sirina, visina) < 0.45: continue          # sitna ostrva se preskaču
                eps = 0.025 if max(sirina, visina) < 14 else 0.07
                t = rdp_prsten([(c[0], c[1]) for c in ring], eps)
                if len(t) < 4: continue
                prsteni.append((max(sirina, visina), t))
        if not prsteni: continue
        prsteni.sort(key=lambda r: -r[0])
        prsteni = prsteni[:22]                                   # dovoljno za oblik zemlje
        pop = p.get("POP_EST") or 0
        kont = KONTINENT.get(p.get("CONTINENT"), "")
        tez = 1 if (pop > 25e6 or (kont == "Evropa" and pop > 4e6)) else (2 if (pop > 4e6 or kont == "Evropa") else 3)
        drzave.append({
            "n": ime, "i": iso, "x": round(p.get("LABEL_X") or 0, 2), "y": round(p.get("LABEL_Y") or 0, 2),
            "k": kont, "t": tez, "q": 0 if iso in BEZ_PITANJA else 1,
            "o": [kodiraj(t) for _, t in prsteni]
        })
    return drzave

def gradovi(drzave):
    imena_iso = {d["i"]: d["n"] for d in drzave}
    SRP = {  # engleski -> srpski, samo za gradove koje stavljamo u igru
     "Tokyo":"Tokio","New York":"Njujork","Mexico City":"Meksiko Siti","Mumbai":"Mumbaj","São Paulo":"Sao Paulo",
     "Shanghai":"Šangaj","Dhaka":"Daka","Buenos Aires":"Buenos Ajres","Los Angeles":"Los Anđeles","Cairo":"Kairo",
     "Rio de Janeiro":"Rio de Žaneiro","Beijing":"Peking","Manila":"Manila","Moscow":"Moskva","Istanbul":"Istanbul",
     "Paris":"Pariz","Seoul":"Seul","Lagos":"Lagos","Jakarta":"Džakarta","Chicago":"Čikago","London":"London",
     "Lima":"Lima","Tehran":"Teheran","Kinshasa":"Kinšasa","Bogota":"Bogota","Hong Kong":"Hongkong",
     "Taipei":"Tajpej","Bangkok":"Bangkok","Santiago":"Santjago","Madrid":"Madrid","Toronto":"Toronto",
     "Singapore":"Singapur","Luanda":"Luanda","Baghdad":"Bagdad","Khartoum":"Kartum","Sydney":"Sidnej",
     "Riyadh":"Rijad","Hanoi":"Hanoj","Washington,  D.C.":"Vašington","Melbourne":"Melburn","Yangon":"Jangon",
     "Brasília":"Brazilija","Ankara":"Ankara","San Francisco":"San Francisko","Johannesburg":"Johanesburg",
     "Berlin":"Berlin","Algiers":"Alžir","Rome":"Rim","Pyongyang":"Pjongjang","Nairobi":"Najrobi",
     "Addis Ababa":"Adis Abeba","Kuala Lumpur":"Kuala Lumpur","Casablanca":"Kazablanka","Dubai":"Dubai",
     "Athens":"Atina","Kyiv":"Kijev","Kiev":"Kijev","Bucharest":"Bukurešt","Budapest":"Budimpešta",
     "Vienna":"Beč","Warsaw":"Varšava","Prague":"Prag","Sofia":"Sofija","Belgrade":"Beograd","Zagreb":"Zagreb",
     "Sarajevo":"Sarajevo","Skopje":"Skoplje","Podgorica":"Podgorica","Ljubljana":"Ljubljana","Tirana":"Tirana",
     "Lisbon":"Lisabon","Amsterdam":"Amsterdam","Brussels":"Brisel","Bern":"Bern","Stockholm":"Stokholm",
     "Oslo":"Oslo","Copenhagen":"Kopenhagen","Helsinki":"Helsinki","Dublin":"Dablin","Reykjavík":"Rejkjavik",
     "Minsk":"Minsk","Riga":"Riga","Vilnius":"Vilnjus","Tallinn":"Talin","Chisinau":"Kišinjev",
     "Bratislava":"Bratislava","Monaco":"Monako","Havana":"Havana","Panama City":"Panama","Bogotá":"Bogota",
     "Caracas":"Karakas","Quito":"Kito","La Paz":"La Paz","Montevideo":"Montevideo","Asunción":"Asunsion",
     "Cape Town":"Kejptaun","Accra":"Akra","Dakar":"Dakar","Tunis":"Tunis","Tripoli":"Tripoli",
     "Damascus":"Damask","Beirut":"Bejrut","Jerusalem":"Jerusalim","Amman":"Aman","Doha":"Doha",
     "Kabul":"Kabul","Islamabad":"Islamabad","New Delhi":"Nju Delhi","Delhi":"Delhi","Colombo":"Kolombo",
     "Kathmandu":"Katmandu","Ulaanbaatar":"Ulan Bator","Tashkent":"Taškent","Baku":"Baku","Tbilisi":"Tbilisi",
     "Yerevan":"Jerevan","Astana":"Astana","Nur-Sultan":"Astana","Vancouver":"Vankuver","Montreal":"Montreal",
     "Ottawa":"Otava","Houston":"Hjuston","Miami":"Majami","Boston":"Boston","Seattle":"Sijetl",
     "Las Vegas":"Las Vegas","Auckland":"Oklend","Wellington":"Velington","Osaka":"Osaka","Ōsaka":"Osaka",
     "Kolkata":"Kalkuta","Bengaluru":"Bangalor","Karachi":"Karači","Lahore":"Lahore","Guangzhou":"Guangdžou",
     "Shenzhen":"Šenžen","Chengdu":"Čengdu","Abu Dhabi":"Abu Dabi","Kuwait City":"Kuvajt",
     "Ho Chi Minh City":"Ho Ši Min","Phnom Penh":"Pnom Pen","Vientiane":"Vijentijan","Naypyidaw":"Nejpjidav",
    }
    RUCNO = [  # naši krajevi i još pokoji, sa koordinatama
     ("Novi Sad","Srbija",19.83,45.25,2), ("Niš","Srbija",21.90,43.32,2),
     ("Subotica","Srbija",19.67,46.10,3), ("Split","Hrvatska",16.44,43.51,2),
     ("Dubrovnik","Hrvatska",18.09,42.65,2), ("Rijeka","Hrvatska",14.44,45.33,3),
     ("Banja Luka","Bosna i Hercegovina",17.19,44.77,3), ("Mostar","Bosna i Hercegovina",17.81,43.34,3),
     ("Ohrid","Severna Makedonija",20.80,41.12,3), ("Budva","Crna Gora",18.84,42.29,3),
     ("Solun","Grčka",22.94,40.64,2), ("Temišvar","Rumunija",21.23,45.75,3),
     ("Minhen","Nemačka",11.58,48.14,2), ("Hamburg","Nemačka",9.99,53.55,2),
     ("Milano","Italija",9.19,45.46,2), ("Venecija","Italija",12.34,45.44,2),
     ("Napulj","Italija",14.25,40.85,2), ("Barselona","Španija",2.17,41.39,2),
     ("Marsej","Francuska",5.37,43.30,3), ("Krakov","Poljska",19.94,50.06,3),
     ("Sankt Peterburg","Rusija",30.34,59.93,2), ("Odesa","Ukrajina",30.73,46.48,3),
     ("Antalija","Turska",30.71,36.90,3), ("Solt Lejk Siti","SAD",-111.89,40.76,3),
    ]
    c = json.load(open(os.path.join(SP, "ne110_cities.geojson")))
    izlaz = []
    vidjeno = set()
    for f in c["features"]:
        p = f["properties"]
        srp = SRP.get(p["name"])
        if not srp or srp in vidjeno: continue
        drz = imena_iso.get(p.get("adm0_a3"))
        if not drz: continue
        pop = p.get("pop_max") or 0
        tez = 1 if pop > 5e6 or p.get("adm0cap") else 2
        if pop < 1.5e6 and not p.get("adm0cap"): tez = 3
        izlaz.append({"n": srp, "d": drz, "x": round(p["longitude"], 2), "y": round(p["latitude"], 2), "t": tez})
        vidjeno.add(srp)
    for n, d, x, y, t in RUCNO:
        if n in vidjeno: continue
        izlaz.append({"n": n, "d": d, "x": x, "y": y, "t": t})
        vidjeno.add(n)
    return izlaz

drzave = obradi()
grad = gradovi(drzave)
podaci = {"z": 100, "d": drzave, "g": grad}
tekst = "/* svet.js — granice, države i gradovi za igru Mapa.\n" \
        "   Napravljeno iz Natural Earth 50m (javno vlasništvo), uprošćeno i skraćeno;\n" \
        "   koordinate su kodirane kao u Google polyline zapisu, stotinka stepena. */\n" \
        "window.SVET = " + json.dumps(podaci, ensure_ascii=False, separators=(",", ":")) + ";\n"
open("/home/user/border-wait/svet.js", "w", encoding="utf-8").write(tekst)
print("država:", len(drzave), "· za pitanja:", sum(1 for d in drzave if d["q"]))
print("gradova:", len(grad))
print("veličina:", round(len(tekst.encode()) / 1024, 1), "KB")
