// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（パープル：膨張・上へ抜ける力）
export function IconWeatherPressureDown({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#8b5cf6' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <path d="M12 16V6 M9 9l3-3 3 3" />
      <path d="M6 14a6 6 0 0 1 12 0" strokeDasharray="2 3" opacity="0.6"/>
    </svg>
  );
}

// 2. 気圧上昇（ティール：重圧・下へ押し込む力）
export function IconWeatherPressureUp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#0f766e' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="14" width="12" height="6" rx="2" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <path d="M12 4v10 M9 11l3 3 3-3" />
      <path d="M6 14h12 M6 20h12" opacity="0.6"/>
    </svg>
  );
}

// 3. 冷え（アイスブルー：収縮・結晶）
export function IconWeatherCold({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#0284c7' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <path d="M12 4v16 M4 12h16 M6.5 6.5l11 11 M6.5 17.5l11-11" />
    </svg>
  );
}

// 4. 暑さ（オレンジ：発散・熱放射）
export function IconWeatherHeat({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#ea580c' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 3v2 M12 19v2 M3 12h2 M19 12h2" />
      <path d="M5.5 5.5l1.5 1.5 M17 17l1.5 1.5 M5.5 18.5l1.5-1.5 M17 7l1.5-1.5" opacity="0.7" />
    </svg>
  );
}

// 5. 湿気（スレート：停滞・重たい水たまり）
export function IconWeatherDamp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#475569' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 底が平らになった重たい水滴 */}
      <path d="M12 4 C12 4 6 11 6 16 A6 3 0 0 0 18 16 C18 11 12 4 12 4 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M6 17c0 1.5 2.5 2 6 2s6-.5 6-2" opacity="0.5" />
    </svg>
  );
}

// 6. 乾燥（マスタード：水分が飛んでいくカサカサ感）
export function IconWeatherDry({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ color: '#b45309' }} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 蒸発していくような点線のしずく */}
      <path d="M12 4 C12 4 6 11 6 16 A6 6 0 0 0 18 16 C18 11 12 4 12 4 Z" fill="currentColor" fillOpacity="0.1" strokeDasharray="3 3" />
      <path d="M9 13l2 2 4-4" opacity="0.5" />
    </svg>
  );
}

export function WeatherIcon({ triggerKey, className = "h-7 w-7" }) {
  switch (triggerKey) {
    case "pressure_down": return <IconWeatherPressureDown className={className} />;
    case "pressure_up": return <IconWeatherPressureUp className={className} />;
    case "cold": return <IconWeatherCold className={className} />;
    case "heat": return <IconWeatherHeat className={className} />;
    case "damp": return <IconWeatherDamp className={className} />;
    case "dry": return <IconWeatherDry className={className} />;
    default: return null;
  }
}
