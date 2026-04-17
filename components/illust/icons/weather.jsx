// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（膨張・パンパン・外側に引っ張られる）
export function IconWeatherPressureDown({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 外に広がる波紋エフェクト */}
      <path d="M12 2c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z" strokeDasharray="2 4" opacity="0.4" />
      {/* 膨張した丸いベース */}
      <path d="M12 4.5c4.5 0 7.5 3 7.5 7.5s-3 7.5-7.5 7.5S4.5 16.5 4.5 12 7.5 4.5 12 4.5z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 4.5c4.5 0 7.5 3 7.5 7.5s-3 7.5-7.5 7.5S4.5 16.5 4.5 12 7.5 4.5 12 4.5z" />
      {/* ぼんやり・めまいの表情 */}
      <path d="M8 11a1.5 1.5 0 1 1 3 0 M13 11a1.5 1.5 0 1 1 3 0" opacity="0.8" />
      <path d="M10 15.5S11 16.5 12 16.5 14 15.5 14 15.5" opacity="0.6" />
    </svg>
  );
}

// 2. 気圧上昇（圧縮・ペチャンコ・上から重み）
export function IconWeatherPressureUp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 上からの圧力線エフェクト */}
      <path d="M12 2v3 M7 3v2 M17 3v2" strokeWidth="2" opacity="0.4" />
      {/* 押しつぶされた俵型のベース */}
      <rect x="3" y="9" width="18" height="12" rx="6" fill="currentColor" fillOpacity="0.15" />
      <rect x="3" y="9" width="18" height="12" rx="6" />
      {/* 苦しそうな・耐えている表情 */}
      <path d="M7 13l2 1.5L7 16 M17 13l-2 1.5 2 1.5" opacity="0.8" />
      <path d="M10 17.5h4" opacity="0.6" />
    </svg>
  );
}

// 3. 冷え（収縮・縮こまる・ガタガタ）
export function IconWeatherCold({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 雪や冷気のニュアンス */}
      <path d="M12 2v2 M19 5l-1.5 1.5 M5 5l1.5 1.5" opacity="0.4" />
      {/* ギュッと縮こまったベース */}
      <rect x="5" y="7" width="14" height="14" rx="5" fill="currentColor" fillOpacity="0.15" />
      <rect x="5" y="7" width="14" height="14" rx="5" />
      {/* 震える表情（ギュッと瞑った目と波打つ口） */}
      <path d="M8 12h2 M14 12h2" strokeWidth="2" opacity="0.8" />
      <path d="M9 16l1-1 1 1 1-1 1 1 1-1" opacity="0.6" />
    </svg>
  );
}

// 4. 暑さ（のぼせ・発汗・熱ごもり）
export function IconWeatherHeat({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 太陽の熱線エフェクト */}
      <path d="M12 2v2 M19 5l-1.5 1.5 M5 5l1.5 1.5" opacity="0.4" />
      {/* のぼせて下部がとろけたベース */}
      <path d="M5 10c0-4 3-6 7-6s7 2 7 6v4c0 3-1 6-4 6H9c-3 0-4-3-4-6v-4z" fill="currentColor" fillOpacity="0.15" />
      <path d="M5 10c0-4 3-6 7-6s7 2 7 6v4c0 3-1 6-4 6H9c-3 0-4-3-4-6v-4z" />
      {/* 汗のしずく */}
      <path d="M19 12c0 1.5-1 3-2 3s-2-1.5-2-3 2-3 2-3 2 1.5 2 3z" fill="currentColor" opacity="0.5" stroke="none" />
      {/* へばった表情 */}
      <path d="M8 12q1.5 -1.5 3 0 M13 12q1.5 -1.5 3 0" opacity="0.8" />
      <path d="M10 16c1 1.5 3 1.5 4 0" opacity="0.6" />
    </svg>
  );
}

// 5. 湿気（重だるさ・下ぶくれ・水滞）
export function IconWeatherDamp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 重たい空気・モヤのエフェクト */}
      <path d="M6 8c-2 0-3 1.5-3 3 0 1.5 1 3 3 3 M18 8c2 0 3 1.5 3 3 0 1.5-1 3-3 3" opacity="0.3" />
      {/* 水分で下ぶくれになったスライム状のベース */}
      <path d="M12 4C9 4 6 7 6 12c0 4.5 2 8 6 8s6-3.5 6-8c0-5-3-8-6-8z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 4C9 4 6 7 6 12c0 4.5 2 8 6 8s6-3.5 6-8c0-5-3-8-6-8z" />
      {/* どんよりした表情 */}
      <path d="M8 12h2 M14 12h2" strokeWidth="2" opacity="0.8" />
      <path d="M10 16.5q2 -1.5 4 0" opacity="0.6" />
    </svg>
  );
}

// 6. 乾燥（乾き・カサカサ・潤い不足）
export function IconWeatherDry({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* カサカサのエフェクト（点線） */}
      <path d="M12 2v2 M20 12h-2 M4 12H2 M12 22v-2" opacity="0.3" strokeDasharray="1 3" />
      {/* 水分が抜けて少し歪んだベース */}
      <path d="M12 4.5c4-1 7.5 2 8 6.5.5 4.5-2 8.5-6.5 9-4.5.5-8.5-2-9-6.5C4 9 8 5.5 12 4.5z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 4.5c4-1 7.5 2 8 6.5.5 4.5-2 8.5-6.5 9-4.5.5-8.5-2-9-6.5C4 9 8 5.5 12 4.5z" />
      {/* ひび割れ */}
      <path d="M6 8l2 2-1 2 M16 18l-1-2 2-1" opacity="0.3" />
      {/* 乾ききった表情 */}
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" opacity="0.8" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" opacity="0.8" />
      <path d="M10 15h4" opacity="0.6" />
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
