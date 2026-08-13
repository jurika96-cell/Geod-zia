# Geodézia PWA

Mac nélküli, iPhone-on telepíthető webapp.

## Funkciók

- Fordított geodéziai feladat
- Egyszerű geodéziai feladat
- Kétpontos tájolt metszés
- Ívmetszés
- Hárompontos metszés (Tienstra)
- 6400 MILS
- Offline cache
- iPhone főképernyős telepítés
- Világos/sötét megjelenés

## Konvenció

- X = kelet
- Y = észak
- 0 MIL = észak
- 1600 MIL = kelet
- 3200 MIL = dél
- 4800 MIL = nyugat

## iPhone telepítés

A PWA-t HTTPS webcímről kell megnyitni (például GitHub Pages, Netlify, Cloudflare Pages).
Ezután iPhone Safariban:
Megosztás → Hozzáadás a Főképernyőhöz.

A service worker miatt az első teljes betöltés után offline is használható.

## Tienstra bevitel

- α = ∠BPC
- β = ∠CPA
- γ = ∠APB

A három irány által a P álláspont körül képzett szögek összege normál esetben 6400 MIL.
