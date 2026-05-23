import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Wind, Thermometer, MapPin } from "lucide-react";

interface HourData {
  time: string;
  temp: number;
  wind: number;
  uv: number;
}

interface PeriodData {
  label: string;
  timeRange: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  wind: number;
  uv: number;
  uvLabel: string;
  uvColor: string;
}

const UV_LABELS: [number, string, string][] = [
  [3, "Low", "text-emerald-400"],
  [6, "Moderate", "text-yellow-400"],
  [8, "High", "text-orange-400"],
  [11, "Very High", "text-red-400"],
  [Infinity, "Extreme", "text-purple-400"],
];

function uvInfo(uv: number): [string, string] {
  for (const [threshold, label, color] of UV_LABELS) {
    if (uv < threshold) return [label, color];
  }
  return ["Extreme", "text-purple-400"];
}

function formatHour(t: string): string {
  const h = parseInt(t.split("T")[1]?.split(":")[0] ?? "0");
  if (h === 12) return "12PM";
  if (h === 0) return "12AM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

// Calgary fallback
const DEFAULT_LAT = 51.0447;
const DEFAULT_LON = -114.0719;

async function getGeolocation(): Promise<{ lat: number; lon: number; city: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, city: "Calgary" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Reverse geocode via Nominatim (free, no key)
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
          );
          const data = await resp.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.county ||
            data?.address?.state ||
            "On Site";
          resolve({ lat, lon, city });
        } catch {
          resolve({ lat, lon, city: "On Site" });
        }
      },
      () => resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, city: "Calgary" }),
      { timeout: 5000, maximumAge: 600000 },
    );
  });
}

export function WeatherWidget() {
  const [periods, setPeriods] = useState<PeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      setLoading(true);
      try {
        const geo = await getGeolocation();
        if (cancelled) return;
        setCity(geo.city);

        // Open-Meteo — free, no API key
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America%2FEdmonton";
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&hourly=temperature_2m,wind_speed_10m,uv_index&timezone=${encodeURIComponent(tz)}&forecast_hours=24`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather unavailable");
        const data = await res.json();
        if (cancelled) return;

        const hourly = data.hourly;
        const hours: HourData[] = hourly.time.map((t: string, i: number) => ({
          time: t,
          temp: hourly.temperature_2m[i],
          wind: hourly.wind_speed_10m[i],
          uv: hourly.uv_index[i],
        }));

        const periodLabels = ["Early AM", "Morning", "Noon", "Afternoon", "Evening", "Night"];
        const grouped: PeriodData[] = [];
        for (let p = 0; p < 6; p++) {
          const slice = hours.slice(p * 4, p * 4 + 4);
          if (slice.length === 0) break;
          const temps = slice.map((h) => h.temp);
          const winds = slice.map((h) => h.wind);
          const uvs = slice.map((h) => h.uv);
          const startH = formatHour(slice[0].time);
          const endH = formatHour(slice[slice.length - 1].time);
          const avgUv = Math.round(uvs.reduce((a, b) => a + b, 0) / uvs.length);
          const [uvLabel, uvColor] = uvInfo(avgUv);

          grouped.push({
            label: periodLabels[p],
            timeRange: `${startH} - ${endH}`,
            temp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
            tempMin: Math.round(Math.min(...temps)),
            tempMax: Math.round(Math.max(...temps)),
            wind: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length * 10) / 10,
            uv: avgUv,
            uvLabel,
            uvColor,
          });
        }
        setPeriods(grouped);
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false);
    }
    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-3 flex items-center justify-center gap-2 text-xs text-dark-500">
        <div className="w-3 h-3 border-2 border-primary-500/20 border-t-primary-400 rounded-full animate-spin" />
        Loading weather...
      </div>
    );
  }

  if (periods.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card p-3 space-y-2"
    >
      <div className="flex items-center gap-1.5 text-[10px] text-dark-500">
        <MapPin size={11} className="text-primary-400" />
        <span className="text-dark-400">{city}</span>
        <Sun size={12} className="text-amber-400 ml-1" />
        <span>Today</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {periods.map((p) => (
          <div
            key={p.label}
            className="flex-shrink-0 w-[90px] bg-dark-800/40 rounded-lg p-2 text-center space-y-1"
          >
            <div className="text-[10px] text-dark-500 font-medium">{p.label}</div>
            <div className="text-[9px] text-dark-600">{p.timeRange}</div>

            <div className="flex items-center justify-center gap-1">
              <Thermometer size={11} className="text-red-400" />
              <span className="text-sm font-bold text-white">{p.temp}°</span>
            </div>
            <div className="text-[9px] text-dark-500">
              {p.tempMin}° ~ {p.tempMax}°
            </div>

            <div className="flex items-center justify-center gap-1 text-[9px] text-dark-400">
              <Wind size={10} className="text-sky-400" />
              <span>{p.wind} km/h</span>
            </div>

            <div className={`text-[9px] font-semibold ${p.uvColor}`}>
              UV {p.uv} · {p.uvLabel}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
