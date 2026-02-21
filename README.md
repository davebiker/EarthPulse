# 🌍 EARTH PULSE v2.0

Real-Time Planetary Monitoring Dashboard — živý dashboard napojený na 9 datových streamů ze 6 free API.

![EARTH PULSE](https://img.shields.io/badge/LIVE-Dashboard-00f0ff?style=for-the-badge) ![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square) ![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square)

## 🛰 Datové zdroje (všechny free, bez API klíčů)

| Zdroj | Data | Refresh |
|-------|------|---------|
| **USGS** | Zemětřesení z celého světa za 24h | 120s |
| **Open-Meteo** | Počasí Praha + předpověď | 120s |
| **Open-Meteo AQ** | Kvalita ovzduší Praha | 120s |
| **Where The ISS At** | Pozice ISS v reálném čase | 5s |
| **NOAA SWPC** | Sluneční počasí, Kp index | 120s |
| **CoinGecko** | BTC, ETH, SOL kurzy | 120s |

## 🚀 Spuštění lokálně

```bash
npm install
npm run dev
```

## 📦 Deploy na GitHub Pages

1. Vytvoř nový repozitář `earth-pulse` na GitHubu
2. Pushni tento kód:

```bash
git init
git add .
git commit -m "🌍 EARTH PULSE v2.0"
git branch -M main
git remote add origin https://github.com/davebiker/EarthPulse.git
git push -u origin main
```

3. V repozitáři jdi do **Settings → Pages**
4. V sekci **Source** vyber **GitHub Actions**
5. Hotovo! Po prvním pushi se automaticky spustí build a deploy

Dashboard bude dostupný na: `https://davebiker.github.io/EarthPulse/`

## ⚠️ Poznámka k base path

Pokud chceš změnit název repozitáře, uprav `base` v `vite.config.js`:

```js
base: '/tvuj-nazev-repo/',
```

Pokud chceš provozovat na vlastní doméně (např. `earth.inka.cz`), nastav:

```js
base: '/',
```

A přidej soubor `public/CNAME` s obsahem:
```
earth.inka.cz
```

## 🛠 Technologie

- React 18 + Vite 5
- Recharts (grafy)
- Lucide React (ikony)
- Canvas API (seismická mapa, seismograf)
- CSS animations + glow efekty

---

*Built with ❤️ at ŠKODA X Innovation Lab*
