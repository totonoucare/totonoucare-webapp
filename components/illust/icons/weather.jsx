// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（膨張・パンパン） ★修正
export function IconWeatherPressureDown({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 4l2 2 M20 4l-2 2 M4 20l2 -2 M20 20l-2 -2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="8" cy="11" r="1.5" fill="currentColor" />
      <circle cx="16" cy="11" r="1.5" fill="currentColor" />
      <circle cx="12" cy="15" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// 2. 気圧上昇（圧縮・ペチャンコ） ★修正
export function IconWeatherPressureUp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M12 2v4 M7 2v3 M17 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M10 6l2 2 2-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      <rect x="2" y="10" width="20" height="12" rx="6" fill="currentColor" fillOpacity="0.15" />
      <rect x="2" y="10" width="20" height="12" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M6 14l2.5 1.5-2.5 1.5 M18 14l-2.5 1.5 2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18q2 -2 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 3. 冷え（収縮・縮こまる）
export function IconWeatherCold({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M3 12l2-2 2 2-2 2z M19 12l2-2 2 2-2 2z M12 2l2 2-2 2-2-2z" fill="currentColor" opacity="0.25" />
      <rect x="6" y="6" width="12" height="14" rx="4" fill="currentColor" fillOpacity="0.15" />
      <rect x="6" y="6" width="12" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11l2-1 M14 10l2 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 15l1-1 1 1 1-1 1 1 1-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 4. 暑さ（のぼせ・発汗）
export function IconWeatherHeat({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M12 2v3 M7 4l1.5 1.5 M17 4l-1.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <rect x="4" y="8" width="16" height="14" rx="7" fill="currentColor" fillOpacity="0.15" />
      <rect x="4" y="8" width="16" height="14" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 13q1.5 -2 3 0 M13 13q1.5 -2 3 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 17q2 2 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12c0 1.1-.9 2-2 2s-2-.9-2-2c0-1.5 2-3 2-3s2 1.5 2 3z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// 5. 湿気（重だるさ・下ぶくれ）
export function IconWeatherDamp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M5 10a4 4 0 0 1 8 -2 5 5 0 0 1 4 8h-12a3 3 0 0 1 -0 -6z" fill="currentColor" opacity="0.1" />
      <path d="M5 10a4 4 0 0 1 8 -2 5 5 0 0 1 4 8h-12a3 3 0 0 1 -0 -6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      <path d="M5 13c0 -4 3 -6 7 -6s7 2 7 6c0 6 -2 9 -7 9s-7 -3 -7 -9z" fill="currentColor" fillOpacity="0.15" />
      <path d="M5 13c0 -4 3 -6 7 -6s7 2 7 6c0 6 -2 9 -7 9s-7 -3 -7 -9z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 13h2 M14 13h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 18q2 -1.5 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 6. 乾燥（乾き・カサカサ）
export function IconWeatherDry({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <rect x="5" y="6" width="14" height="15" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="5" y="6" width="14" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <circle cx="15" cy="11" r="1.5" fill="currentColor" />
      <path d="M10 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 9l3 1-1 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M19 14l-3 1 1 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M12 2v2 M16 3l1 1 M8 3l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" strokeDasharray="1 3" />
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
