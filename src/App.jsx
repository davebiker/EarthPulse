import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, Globe, Thermometer, Wind, Droplets, Zap, Radio, Satellite, AlertTriangle, TrendingUp, Eye, CloudRain, Sun, DollarSign, Rocket, Navigation } from "lucide-react";

const APIS = {
  earthquakes: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  weather: (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,surface_pressure,apparent_temperature,precipitation&hourly=temperature_2m,precipitation_probability&timezone=auto&forecast_days=2`,
  airQuality: (lat, lon) => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide&timezone=auto`,
  iss: "https://api.wheretheiss.at/v1/satellites/25544",
  solar: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  solarWind: "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json",
  solarFlare: "https://services.swpc.noaa.gov/products/summary/10cm-flux.json",
  crypto: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
  cryptoHistory: (id) => `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1&precision=0`,
};

const CITIES = [
  { name: "Praha", lat: 50.0755, lon: 14.4378, tz: "Europe/Prague" },
  { name: "New York", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
];

const weatherDescriptions = {
  0: "Jasno", 1: "Převážně jasno", 2: "Polojasno", 3: "Zataženo",
  45: "Mlha", 48: "Námraza", 51: "Mrholení", 53: "Mrholení",
  55: "Mrholení", 61: "Slabý déšť", 63: "Déšť", 65: "Silný déšť",
  71: "Sněžení", 73: "Sněžení", 75: "Silné sněžení",
  80: "Přeháňky", 81: "Přeháňky", 82: "Silné přeháňky",
  95: "Bouřky", 96: "Bouřky s krupobitím", 99: "Silné bouřky",
};

const GlowText = ({ children, color = "#00f0ff", size = "text-xs", className = "" }) => (
  <span className={`${size} font-bold ${className}`} style={{ color, textShadow: `0 0 10px ${color}40, 0 0 20px ${color}20` }}>{children}</span>
);

const ScanLine = () => (
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)",
    pointerEvents: "none", zIndex: 1, borderRadius: "inherit"
  }} />
);

const PulseRing = ({ color = "#00f0ff", size = 8, delay = 0 }) => (
  <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      backgroundColor: color, boxShadow: `0 0 6px ${color}`
    }} />
    <div style={{
      position: "absolute", width: size, height: size, borderRadius: "50%",
      border: `1px solid ${color}`, animation: `pulse-ring 2s ease-out infinite ${delay}s`, opacity: 0
    }} />
  </div>
);

const DataCard = ({ title, icon: Icon, children, color = "#00f0ff", span = 1, row = 1 }) => (
  <div style={{
    gridColumn: `span ${span}`, gridRow: `span ${row}`,
    background: "linear-gradient(135deg, rgba(10,15,30,0.95), rgba(5,10,20,0.98))",
    border: `1px solid ${color}15`, borderRadius: 12,
    padding: "16px 18px", position: "relative", overflow: "hidden",
    boxShadow: `0 0 30px ${color}08, inset 0 1px 0 ${color}10`,
    transition: "all 0.3s ease",
  }}
    onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${color}40`; e.currentTarget.style.boxShadow = `0 0 40px ${color}15, inset 0 1px 0 ${color}20`; }}
    onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${color}15`; e.currentTarget.style.boxShadow = `0 0 30px ${color}08, inset 0 1px 0 ${color}10`; }}
  >
    <ScanLine />
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon size={14} style={{ color, filter: `drop-shadow(0 0 4px ${color}60)` }} />
        <span style={{ color: `${color}90`, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>{title}</span>
      </div>
      {children}
    </div>
  </div>
);

const SeismicWave = ({ data }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    const magnitudes = data.slice(0, 50).map(q => q.properties.mag || 0);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      offsetRef.current += 1.5;
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const idx = Math.floor((x / w) * magnitudes.length);
        const mag = magnitudes[idx] || 0;
        const amplitude = (mag / 9) * (h * 0.4);
        const frequency = 0.02 + mag * 0.005;
        const y = h / 2 + Math.sin((x + offsetRef.current) * frequency) * amplitude + Math.sin((x + offsetRef.current * 0.7) * 0.01) * 10;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "#ff3366";
      ctx.lineWidth = 1;
      ctx.shadowColor = "#ff3366";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const idx = Math.floor((x / w) * magnitudes.length);
        const mag = magnitudes[idx] || 0;
        const amplitude = (mag / 9) * (h * 0.25);
        const y = h / 2 + Math.cos((x + offsetRef.current * 1.3) * 0.03) * amplitude;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
};

const WorldClock = ({ cities }) => {
  const [times, setTimes] = useState({});
  useEffect(() => {
    const update = () => {
      const t = {};
      cities.forEach(c => {
        try {
          const d = new Date();
          t[c.name] = {
            time: d.toLocaleTimeString("cs-CZ", { timeZone: c.tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            date: d.toLocaleDateString("cs-CZ", { timeZone: c.tz, day: "numeric", month: "short" }),
          };
        } catch { t[c.name] = { time: "--:--:--", date: "" }; }
      });
      setTimes(t);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [cities]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {cities.map((c, i) => (
        <div key={c.name} style={{
          padding: "10px 12px", borderRadius: 8,
          background: i === 0 ? "rgba(0,240,255,0.08)" : "rgba(255,255,255,0.02)",
          border: i === 0 ? "1px solid rgba(0,240,255,0.2)" : "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 9, color: "#ffffff50", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5, marginBottom: 4 }}>{c.name.toUpperCase()}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: i === 0 ? "#00f0ff" : "#ffffff", fontFamily: "'JetBrains Mono', monospace", textShadow: i === 0 ? "0 0 10px #00f0ff40" : "none" }}>
            {times[c.name]?.time || "--:--:--"}
          </div>
          <div style={{ fontSize: 9, color: "#ffffff40", marginTop: 2 }}>{times[c.name]?.date}</div>
        </div>
      ))}
    </div>
  );
};

const EarthMap = ({ earthquakes, issPos }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const countriesRef = useRef(null);

  // Load map data once from public folder
  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";
    fetch(`${base}countries-110m.json`)
      .then(r => r.json())
      .then(topo => {
        // Manual TopoJSON decode — no library needed
        const obj = topo.objects.countries;
        const arcs = topo.arcs;
        const scale = topo.transform?.scale || [1, 1];
        const translate = topo.transform?.translate || [0, 0];

        // Decode arc coordinates
        const decodedArcs = arcs.map(arc => {
          let x = 0, y = 0;
          return arc.map(([dx, dy]) => {
            x += dx; y += dy;
            return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
          });
        });

        // Convert arc indices to coordinates
        const arcToCoords = (idx) => {
          if (idx >= 0) return decodedArcs[idx].slice();
          return decodedArcs[~idx].slice().reverse();
        };

        const ringToCoords = (ring) => {
          let coords = [];
          ring.forEach(idx => { coords = coords.concat(arcToCoords(idx)); });
          return coords;
        };

        const features = [];
        (obj.geometries || []).forEach(geom => {
          if (geom.type === "Polygon") {
            features.push(geom.arcs.map(ring => ringToCoords(ring)));
          } else if (geom.type === "MultiPolygon") {
            geom.arcs.forEach(polygon => {
              features.push(polygon.map(ring => ringToCoords(ring)));
            });
          }
        });
        countriesRef.current = features;
      })
      .catch(err => console.error("Map load error:", err));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;

    const toX = lon => ((lon + 180) / 360) * w;
    const toY = lat => ((90 - lat) / 180) * h;

    const quakes = earthquakes.slice(0, 100).map(q => ({
      x: toX(q.geometry.coordinates[0]),
      y: toY(q.geometry.coordinates[1]),
      mag: q.properties.mag || 1,
    }));

    const draw = () => {
      timeRef.current += 0.02;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(0,240,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 18; i++) { const x = (i / 18) * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let i = 0; i <= 9; i++) { const y = (i / 9) * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Equator
      ctx.strokeStyle = "rgba(0,240,255,0.1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.setLineDash([]);

      // Draw countries
      if (countriesRef.current) {
        ctx.strokeStyle = "rgba(0,240,255,0.4)";
        ctx.fillStyle = "rgba(0,240,255,0.07)";
        ctx.lineWidth = 1;
        countriesRef.current.forEach(polygon => {
          polygon.forEach(ring => {
            ctx.beginPath();
            ring.forEach(([lon, lat], i) => {
              const x = toX(lon), y = toY(lat);
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        });
      }

      quakes.forEach((q, i) => {
        const pulse = Math.sin(timeRef.current * 2 + i) * 0.3 + 0.7;
        const baseSize = Math.max(3, q.mag * 4);
        const color = q.mag >= 5 ? "#ff3366" : q.mag >= 3 ? "#ffaa00" : "#00f0ff";
        ctx.beginPath();
        ctx.arc(q.x, q.y, baseSize + 6 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(q.x, q.y, baseSize * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.floor(pulse * 200).toString(16).padStart(2, '0')}`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ISS Position
      if (issPos) {
        const ix = ((issPos.longitude + 180) / 360) * w;
        const iy = ((90 - issPos.latitude) / 180) * h;
        const issPulse = Math.sin(timeRef.current * 3) * 0.3 + 0.7;

        // ISS orbit trail (subtle)
        ctx.strokeStyle = "rgba(168,85,247,0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(0, iy);
        ctx.lineTo(w, iy);
        ctx.stroke();
        ctx.setLineDash([]);

        // ISS glow
        ctx.beginPath();
        ctx.arc(ix, iy, 20 * issPulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(168,85,247,0.1)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ix, iy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,85,247,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ISS icon (crosshair)
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(ix - 8, iy); ctx.lineTo(ix + 8, iy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix, iy - 8); ctx.lineTo(ix, iy + 8); ctx.stroke();
        ctx.beginPath(); ctx.arc(ix, iy, 4, 0, Math.PI * 2); ctx.fillStyle = "#a855f7"; ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "bold 16px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#a855f7";
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 8;
        ctx.fillText("ISS", ix + 16, iy - 8);
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(168,85,247,0.7)";
        ctx.fillText(`${issPos.latitude.toFixed(1)}° ${issPos.longitude.toFixed(1)}°`, ix + 16, iy + 6);
        ctx.shadowBlur = 0;
      }

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [earthquakes, issPos]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", borderRadius: 8 }} />;
};

const ISSTracker = ({ issData }) => {
  if (!issData) return <div style={{ fontSize: 11, color: "#ffffff30", textAlign: "center", padding: 20 }}>Načítání ISS dat...</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Rocket size={22} style={{ color: "#a855f7", filter: "drop-shadow(0 0 6px #a855f780)" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#ffffff50", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>RYCHLOST</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#a855f7", textShadow: "0 0 15px #a855f730" }}>
            {issData.velocity ? `${Number(issData.velocity).toFixed(0)} km/h` : "—"}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "LATITUDE", value: `${Number(issData.latitude).toFixed(3)}°` },
          { label: "LONGITUDE", value: `${Number(issData.longitude).toFixed(3)}°` },
          { label: "NADMOŘSKÁ VÝŠKA", value: `${Number(issData.altitude).toFixed(0)} km` },
          { label: "VIDITELNOST", value: issData.visibility === "daylight" ? "Denní" : "Noční" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(168,85,247,0.05)", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(168,85,247,0.08)" }}>
            <div style={{ fontSize: 8, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffffcc", marginTop: 2 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CryptoTicker = ({ crypto, histories }) => {
  if (!crypto) return <div style={{ fontSize: 11, color: "#ffffff30", textAlign: "center", padding: 20 }}>Načítání krypto dat...</div>;

  const coins = [
    { id: "bitcoin", symbol: "BTC", color: "#f7931a", icon: "₿" },
    { id: "ethereum", symbol: "ETH", color: "#627eea", icon: "Ξ" },
    { id: "solana", symbol: "SOL", color: "#00ffa3", icon: "◎" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {coins.map(coin => {
        const data = crypto[coin.id];
        if (!data) return null;
        const change = data.usd_24h_change;
        const isUp = change >= 0;
        const history = histories?.[coin.id] || [];

        return (
          <div key={coin.id} style={{
            background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${coin.color}15`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: `${coin.color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: coin.color
                }}>{coin.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffffdd" }}>{coin.symbol}</div>
                  <div style={{ fontSize: 8, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace" }}>{coin.id.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#ffffffee" }}>
                  ${data.usd?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  color: isUp ? "#00ff88" : "#ff3366"
                }}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                </div>
              </div>
            </div>
            {history.length > 0 && (
              <div style={{ height: 40 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id={`grad-${coin.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#00ff88" : "#ff3366"} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={isUp ? "#00ff88" : "#ff3366"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="p" stroke={isUp ? "#00ff88" : "#ff3366"} fill={`url(#grad-${coin.id})`} strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SolarWeather = ({ solarData, solarWind, solarFlare }) => {
  const kpValues = solarData?.slice(1, 9)?.map(d => ({
    time: d[0]?.slice(5, 16) || "",
    kp: parseFloat(d[1]) || 0,
    observed: d[2] || "predicted"
  })) || [];

  const currentKp = kpValues[0]?.kp || 0;
  const kpColor = currentKp >= 7 ? "#ff3366" : currentKp >= 5 ? "#ffaa00" : currentKp >= 3 ? "#88ff00" : "#00ff88";
  const kpLabel = currentKp >= 7 ? "SILNÁ BOUŘE" : currentKp >= 5 ? "GEO BOUŘE" : currentKp >= 3 ? "AKTIVNÍ" : "KLIDNÉ";

  const windBt = solarWind?.Bt || "—";
  const flux = solarFlare?.Flux || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>Kp INDEX</div>
          <div style={{ fontSize: 38, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: kpColor, textShadow: `0 0 25px ${kpColor}40`, lineHeight: 1 }}>
            {currentKp.toFixed(1)}
          </div>
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PulseRing color={kpColor} size={6} />
            <span style={{ fontSize: 10, fontWeight: 600, color: kpColor }}>{kpLabel}</span>
          </div>
        </div>
      </div>

      {/* Kp bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 50 }}>
        {kpValues.map((d, i) => {
          const barColor = d.kp >= 7 ? "#ff3366" : d.kp >= 5 ? "#ffaa00" : d.kp >= 3 ? "#88ff00" : "#00ff88";
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{
                width: "100%", height: Math.max(4, (d.kp / 9) * 45),
                background: `linear-gradient(0deg, ${barColor}60, ${barColor})`,
                borderRadius: "3px 3px 0 0", boxShadow: `0 0 8px ${barColor}30`,
                opacity: d.observed === "observed" ? 1 : 0.5,
              }} />
              <span style={{ fontSize: 7, color: "#ffffff30", fontFamily: "'JetBrains Mono', monospace" }}>
                {d.time.slice(-5)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2 }}>
        <div style={{ background: "rgba(255,170,0,0.05)", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(255,170,0,0.08)" }}>
          <div style={{ fontSize: 8, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace" }}>SLUNEČNÍ VÍTR Bt</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#ffaa00", marginTop: 2 }}>{windBt} <span style={{ fontSize: 9, color: "#ffffff40" }}>nT</span></div>
        </div>
        <div style={{ background: "rgba(255,170,0,0.05)", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(255,170,0,0.08)" }}>
          <div style={{ fontSize: 8, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace" }}>RÁDIOVÝ FLUX</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#ffaa00", marginTop: 2 }}>{flux} <span style={{ fontSize: 9, color: "#ffffff40" }}>SFU</span></div>
        </div>
      </div>
    </div>
  );
};

export default function EarthPulseDashboard() {
  const [earthquakes, setEarthquakes] = useState(null);
  const [weather, setWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [issData, setIssData] = useState(null);
  const [solarData, setSolarData] = useState(null);
  const [solarWind, setSolarWind] = useState(null);
  const [solarFlare, setSolarFlare] = useState(null);
  const [crypto, setCrypto] = useState(null);
  const [cryptoHistories, setCryptoHistories] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState("Navazování spojení...");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [errors, setErrors] = useState([]);
  const [uptime, setUptime] = useState(0);
  const [dataSources, setDataSources] = useState(0);

  const fetchData = useCallback(async () => {
    const errs = [];
    let sources = 0;

    setLoadingPhase("Seismická data USGS...");
    try { const r = await fetch(APIS.earthquakes); const d = await r.json(); setEarthquakes(d); sources++; } catch { errs.push("Seismic"); }

    setLoadingPhase("Meteorologická data...");
    try { const r = await fetch(APIS.weather(50.0755, 14.4378)); const d = await r.json(); setWeather(d); sources++; } catch { errs.push("Weather"); }

    try { const r = await fetch(APIS.airQuality(50.0755, 14.4378)); const d = await r.json(); setAirQuality(d); sources++; } catch { errs.push("AirQuality"); }

    setLoadingPhase("Pozice ISS...");
    try { const r = await fetch(APIS.iss); const d = await r.json(); setIssData(d); sources++; } catch { errs.push("ISS"); }

    setLoadingPhase("Solární aktivita NOAA...");
    try { const r = await fetch(APIS.solar); const d = await r.json(); setSolarData(d); sources++; } catch { errs.push("Solar"); }
    try { const r = await fetch(APIS.solarWind); const d = await r.json(); setSolarWind(d); sources++; } catch { errs.push("SolarWind"); }
    try { const r = await fetch(APIS.solarFlare); const d = await r.json(); setSolarFlare(d); sources++; } catch { errs.push("SolarFlare"); }

    setLoadingPhase("Kryptoměny CoinGecko...");
    try { const r = await fetch(APIS.crypto); const d = await r.json(); setCrypto(d); sources++; } catch { errs.push("Crypto"); }

    try {
      const histories = {};
      for (const id of ["bitcoin", "ethereum", "solana"]) {
        try {
          const r = await fetch(APIS.cryptoHistory(id));
          const d = await r.json();
          histories[id] = (d.prices || []).filter((_, i) => i % 4 === 0).map(([t, p]) => ({ t, p }));
        } catch {}
      }
      setCryptoHistories(histories);
      sources++;
    } catch { errs.push("CryptoHistory"); }

    setDataSources(sources);
    setErrors(errs);
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  // ISS updates every 5s
  useEffect(() => {
    const i = setInterval(async () => {
      try { const r = await fetch(APIS.iss); const d = await r.json(); setIssData(d); } catch {}
    }, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 120000); return () => clearInterval(i); }, [fetchData]);
  useEffect(() => { const i = setInterval(() => setUptime(u => u + 1), 1000); return () => clearInterval(i); }, []);

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const eqFeatures = earthquakes?.features || [];
  const significantQuakes = eqFeatures.filter(q => q.properties.mag >= 4);
  const avgMag = eqFeatures.length > 0 ? (eqFeatures.reduce((s, q) => s + (q.properties.mag || 0), 0) / eqFeatures.length).toFixed(1) : "—";
  const maxMag = eqFeatures.length > 0 ? Math.max(...eqFeatures.map(q => q.properties.mag || 0)).toFixed(1) : "—";
  const hourlyTemps = weather?.hourly?.temperature_2m?.slice(0, 24) || [];
  const hourlyPrecip = weather?.hourly?.precipitation_probability?.slice(0, 24) || [];
  const currentWeather = weather?.current || {};
  const weatherDesc = weatherDescriptions[currentWeather.weather_code] || "N/A";
  const aqiValue = airQuality?.current?.european_aqi;
  const aqiLabel = !aqiValue ? "N/A" : aqiValue <= 20 ? "Výborná" : aqiValue <= 40 ? "Dobrá" : aqiValue <= 60 ? "Střední" : aqiValue <= 80 ? "Špatná" : "Velmi špatná";
  const aqiColor = !aqiValue ? "#666" : aqiValue <= 20 ? "#00ff88" : aqiValue <= 40 ? "#88ff00" : aqiValue <= 60 ? "#ffaa00" : "#ff3366";
  const btcPrice = crypto?.bitcoin?.usd;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050a14", color: "#00f0ff", fontFamily: "'JetBrains Mono', monospace" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Outfit:wght@300;400;600;700;800&display=swap'); @keyframes loading { 0% { width: 0%; } 100% { width: 100%; } } @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontFamily: "'Outfit', sans-serif", fontWeight: 800, marginBottom: 8 }}>
            <span style={{ color: "#00f0ff" }}>EARTH</span> <span style={{ color: "#fff" }}>PULSE</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, marginBottom: 20, opacity: 0.5 }}>INICIALIZACE SYSTÉMU</div>
          <div style={{ width: 280, height: 3, background: "#ffffff08", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, #00f0ff, #a855f7)", borderRadius: 2, animation: "loading 2s ease-in-out" }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.4, animation: "blink 1s infinite" }}>{loadingPhase}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%, #0a1628 0%, #050a14 50%, #020408 100%)",
      color: "#ffffff", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20,
      position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Outfit:wght@300;400;600;700;800&display=swap');
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #00f0ff20; border-radius: 2px; }
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,240,255,0.03) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "60%", left: "50%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,51,102,0.02) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, animation: "fadeIn 0.6s ease-out" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PulseRing color="#00ff88" size={8} />
                <span style={{ fontSize: 9, color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>LIVE</span>
              </div>
              <span style={{ fontSize: 9, color: "#ffffff20" }}>|</span>
              <span style={{ fontSize: 9, color: "#ffffff30", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                UPTIME {formatUptime(uptime)}
              </span>
              <span style={{ fontSize: 9, color: "#ffffff20" }}>|</span>
              <span style={{ fontSize: 9, color: "#ffffff30", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
                {dataSources} DATA STREAMS ACTIVE
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
              <span style={{ color: "#00f0ff", textShadow: "0 0 20px #00f0ff30" }}>EARTH</span>
              <span style={{ color: "#ffffff" }}> PULSE</span>
              <span style={{ fontSize: 10, color: "#a855f7", marginLeft: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, verticalAlign: "super" }}>v2.0</span>
            </h1>
            <p style={{ fontSize: 10, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginTop: 4 }}>
              REAL-TIME PLANETARY MONITORING • SEISMIC • SPACE • WEATHER • CRYPTO
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#ffffff30", fontFamily: "'JetBrains Mono', monospace" }}>POSLEDNÍ AKTUALIZACE</div>
            <div style={{ fontSize: 12, color: "#ffffff60", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{lastUpdate?.toLocaleTimeString("cs-CZ") || "—"}</div>
            <div style={{ fontSize: 9, color: "#ffffff20", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
              {eqFeatures.length} QUAKES • ISS TRACKING • {errors.length === 0 ? "ALL OK" : `${errors.length} WARN`}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20, animation: "fadeIn 0.6s ease-out 0.1s both" }}>
          {[
            { label: "ZEMĚTŘESENÍ / 24H", value: eqFeatures.length, color: "#00f0ff", icon: Activity },
            { label: "NEJVYŠŠÍ MAG.", value: `M${maxMag}`, color: maxMag >= 5 ? "#ff3366" : "#ffaa00", icon: AlertTriangle },
            { label: "TEPLOTA PRAHA", value: `${currentWeather.temperature_2m ?? "—"}°C`, color: "#ffaa00", icon: Thermometer },
            { label: "ISS RYCHLOST", value: issData ? `${Number(issData.velocity).toFixed(0)} km/h` : "—", color: "#a855f7", icon: Rocket },
            { label: "Kp INDEX", value: solarData?.[1]?.[1] || "—", color: "#ff8800", icon: Sun },
            { label: "BITCOIN", value: btcPrice ? `$${(btcPrice / 1000).toFixed(1)}k` : "—", color: "#f7931a", icon: DollarSign },
          ].map((s, i) => (
            <div key={i} style={{
              background: "rgba(10,15,30,0.8)", border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 10, padding: "12px 14px", position: "relative", overflow: "hidden"
            }}>
              <ScanLine />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <s.icon size={10} style={{ color: s.color, opacity: 0.6 }} />
                  <span style={{ fontSize: 7, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1.5 }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 20, fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: s.color, textShadow: `0 0 10px ${s.color}40` }}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, animation: "fadeIn 0.6s ease-out 0.2s both" }}>

          {/* Earthquake Map + ISS */}
          <DataCard title="GLOBÁLNÍ MAPA — ZEMĚTŘESENÍ + ISS TRACKER" icon={Globe} color="#00f0ff" span={2}>
            <div style={{ height: 240, borderRadius: 8, overflow: "hidden", background: "rgba(0,10,20,0.5)", border: "1px solid rgba(0,240,255,0.08)" }}>
              <EarthMap earthquakes={eqFeatures} issPos={issData ? { latitude: Number(issData.latitude), longitude: Number(issData.longitude) } : null} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {[
                { color: "#00f0ff", label: "M < 3" },
                { color: "#ffaa00", label: "M 3-5" },
                { color: "#ff3366", label: "M 5+" },
                { color: "#a855f7", label: "ISS POSITION" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  <span style={{ fontSize: 9, color: "#ffffff50", fontFamily: "'JetBrains Mono', monospace" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </DataCard>

          {/* World Clock */}
          <DataCard title="SVĚTOVÝ ČAS" icon={Globe} color="#00f0ff">
            <WorldClock cities={CITIES} />
          </DataCard>

          {/* Seismic Wave */}
          <DataCard title="SEISMOGRAF — VLNOVÁ AKTIVITA" icon={Activity} color="#00f0ff" span={1}>
            <div style={{ height: 100, borderRadius: 8, overflow: "hidden" }}>
              <SeismicWave data={eqFeatures} />
            </div>
          </DataCard>

          {/* ISS Tracker */}
          <DataCard title="ISS — MEZINÁRODNÍ VESMÍRNÁ STANICE" icon={Satellite} color="#a855f7">
            <ISSTracker issData={issData} />
          </DataCard>

          {/* Solar Weather */}
          <DataCard title="SLUNEČNÍ POČASÍ — NOAA SWPC" icon={Sun} color="#ff8800">
            <SolarWeather solarData={solarData} solarWind={solarWind} solarFlare={solarFlare} />
          </DataCard>

          {/* Crypto */}
          <DataCard title="KRYPTOMĚNY — LIVE" icon={DollarSign} color="#f7931a" span={1} row={2}>
            <CryptoTicker crypto={crypto} histories={cryptoHistories} />
          </DataCard>

          {/* Weather Prague */}
          <DataCard title="POČASÍ PRAHA" icon={CloudRain} color="#ffaa00">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: "#ffaa00", textShadow: "0 0 20px #ffaa0030", lineHeight: 1 }}>
                    {currentWeather.temperature_2m ?? "—"}°
                  </div>
                  <div style={{ fontSize: 11, color: "#ffffff60", marginTop: 4 }}>{weatherDesc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#ffffff40" }}>Pocitově</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#ffffff80" }}>{currentWeather.apparent_temperature ?? "—"}°</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                {[
                  { icon: Wind, label: "Vítr", value: `${currentWeather.wind_speed_10m ?? "—"} km/h` },
                  { icon: Droplets, label: "Vlhkost", value: `${currentWeather.relative_humidity_2m ?? "—"}%` },
                  { icon: Zap, label: "Tlak", value: `${currentWeather.surface_pressure ? Math.round(currentWeather.surface_pressure) : "—"} hPa` },
                ].map(w => (
                  <div key={w.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 6px", textAlign: "center" }}>
                    <w.icon size={12} style={{ color: "#ffaa00", opacity: 0.6, margin: "0 auto 4px" }} />
                    <div style={{ fontSize: 8, color: "#ffffff40", marginBottom: 2 }}>{w.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#ffffffcc" }}>{w.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </DataCard>

          {/* Temperature + Precip */}
          <DataCard title="TEPLOTNÍ PROGNÓZA + SRÁŽKY — 24H" icon={Thermometer} color="#ffaa00">
            <div style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyTemps.map((t, i) => ({ h: `${i}h`, t, p: hourlyPrecip[i] || 0 }))}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffaa00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffaa00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="precipGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4488ff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4488ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" tick={{ fontSize: 8, fill: "#ffffff30" }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid #ffffff20", borderRadius: 6, fontSize: 10, color: "#ffffffcc" }} />
                  <Area type="monotone" dataKey="t" stroke="#ffaa00" fill="url(#tempGrad)" strokeWidth={2} dot={false} name="Teplota °C" />
                  <Area type="monotone" dataKey="p" stroke="#4488ff" fill="url(#precipGrad2)" strokeWidth={1} dot={false} name="Srážky %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DataCard>

          {/* Air Quality */}
          <DataCard title="KVALITA OVZDUŠÍ PRAHA" icon={Eye} color={aqiColor}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: aqiColor, textShadow: `0 0 20px ${aqiColor}30`, lineHeight: 1 }}>
                {aqiValue ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: aqiColor, marginBottom: 4, fontWeight: 600 }}>{aqiLabel}</div>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${Math.min((aqiValue || 0) / 100 * 100, 100)}%`, borderRadius: 3, background: `linear-gradient(90deg, #00ff88, ${aqiColor})`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "PM2.5", value: airQuality?.current?.pm2_5, unit: "µg/m³" },
                { label: "PM10", value: airQuality?.current?.pm10, unit: "µg/m³" },
                { label: "NO₂", value: airQuality?.current?.nitrogen_dioxide, unit: "µg/m³" },
                { label: "EU AQI", value: aqiValue, unit: "index" },
              ].map(m => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 8, color: "#ffffff40" }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffffcc" }}>{m.value != null ? Math.round(m.value) : "—"} <span style={{ fontSize: 8, color: "#ffffff40" }}>{m.unit}</span></div>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Recent Significant Earthquakes */}
          <DataCard title="VÝZNAMNÁ ZEMĚTŘESENÍ" icon={AlertTriangle} color="#ff3366" span={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
              {(significantQuakes.length > 0 ? significantQuakes : eqFeatures.slice(0, 6)).slice(0, 8).map((q, i) => {
                const mag = q.properties.mag;
                const color = mag >= 5 ? "#ff3366" : mag >= 3 ? "#ffaa00" : "#00f0ff";
                const time = new Date(q.properties.time);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
                    background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: `3px solid ${color}`
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color, minWidth: 50, textAlign: "center" }}>{mag?.toFixed(1)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#ffffffcc", lineHeight: 1.3 }}>{q.properties.place}</div>
                      <div style={{ fontSize: 9, color: "#ffffff40", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        {time.toLocaleString("cs-CZ", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <PulseRing color={color} size={6} delay={i * 0.3} />
                  </div>
                );
              })}
            </div>
          </DataCard>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.3, animation: "fadeIn 0.6s ease-out 0.4s both" }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            EARTH PULSE v2.0 • USGS • OPEN-METEO • NOAA SWPC • ISS API • COINGECKO
          </div>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            ISS: 5s REFRESH • DATA: 120s • ŠKODA X INNOVATION LAB
          </div>
        </div>
      </div>
    </div>
  );
}
