// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（膨張・上に抜ける力 / パープル系）
export function IconWeatherPressureDown({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-pressure-down" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="line-pressure-down" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* 背景の柔らかな膨張 */}
      <circle cx="16" cy="16" r="14" fill="url(#grad-pressure-down)" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="url(#line-pressure-down)" strokeWidth="1" strokeOpacity="0.3" />
      {/* 押し広げられる波紋 */}
      <path d="M6 16c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" strokeLinecap="round" />
      <path d="M9 16c0-3.8 3.2-7 7-7s7 3.2 7 7" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.4" strokeLinecap="round" />
      {/* メインの浮力ベクトル */}
      <path d="M16 22V8" fill="none" stroke="url(#line-pressure-down)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 13l5-5 5 5" fill="none" stroke="url(#line-pressure-down)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 光のハイライト */}
      <circle cx="11" cy="8" r="1.5" fill="#c4b5fd" opacity="0.8" />
    </svg>
  );
}

// 2. 気圧上昇（圧縮・下に押し込む力 / ティール・深緑系）
export function IconWeatherPressureUp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-pressure-up" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="line-pressure-up" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      {/* 背景の圧縮された面 */}
      <rect x="4" y="16" width="24" height="12" rx="4" fill="url(#grad-pressure-up)" />
      <rect x="4" y="16" width="24" height="12" rx="4" fill="none" stroke="url(#line-pressure-up)" strokeWidth="1" strokeOpacity="0.4" />
      {/* 重圧のレイヤー線 */}
      <path d="M6 20h20 M8 24h16" fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* メインの下降ベクトル */}
      <path d="M16 4v12" fill="none" stroke="url(#line-pressure-up)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 11l5 5 5-5" fill="none" stroke="url(#line-pressure-up)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 圧力のエフェクト */}
      <path d="M12 4v6 M20 4v6" fill="none" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4" />
    </svg>
  );
}

// 3. 冷え（収縮・氷 / アイスブルー系）
export function IconWeatherCold({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-cold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
        </radialGradient>
        <linearGradient id="line-cold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* 芯に冷えを溜め込んだ背景 */}
      <circle cx="16" cy="16" r="13" fill="url(#grad-cold)" />
      <circle cx="16" cy="16" r="13" fill="none" stroke="url(#line-cold)" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* 氷の結晶のディテール */}
      <path d="M16 6v20 M6 16h20 M8.5 8.5l15 15 M8.5 23.5l15-15" fill="none" stroke="url(#line-cold)" strokeWidth="2" strokeLinecap="round" />
      {/* 結晶の枝 */}
      <path d="M16 9l2 2 M16 9l-2 2 M16 23l2-2 M16 23l-2-2 M23 16l-2 2 M23 16l-2-2 M9 16l2 2 M9 16l2-2" fill="none" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="16" cy="16" r="3" fill="#bae6fd" />
    </svg>
  );
}

// 4. 暑さ（発散・熱 / オレンジレッド系）
export function IconWeatherHeat({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffedd5" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id="line-heat" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* 熱が放射される背景 */}
      <circle cx="16" cy="16" r="14" fill="url(#grad-heat)" />
      {/* 太陽のコア */}
      <circle cx="16" cy="16" r="6" fill="url(#line-heat)" opacity="0.9" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#c2410c" strokeWidth="1.5" />
      {/* 揺らめく熱線 */}
      <path d="M16 4v3 M16 25v3 M4 16h3 M25 16h3" fill="none" stroke="url(#line-heat)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7.5 7.5l2.5 2.5 M22 22l2.5 2.5 M7.5 24.5l2.5-2.5 M22 7.5l2.5 2.5" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" opacity="0.8" />
      {/* コアのハイライト */}
      <path d="M14 14a2.5 2.5 0 0 1 3.5 0" fill="none" stroke="#ffedd5" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

// 5. 湿気（停滞・重たい水たまり / スレート系）
export function IconWeatherDamp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-damp" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#334155" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="line-damp" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {/* 底にべちゃっと溜まった重たい形状 */}
      <path d="M16 6 C16 6 6 15 6 22 A10 4 0 0 0 26 22 C26 15 16 6 16 6 Z" fill="url(#grad-damp)" />
      <path d="M16 6 C16 6 6 15 6 22 A10 4 0 0 0 26 22 C26 15 16 6 16 6 Z" fill="none" stroke="url(#line-damp)" strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
      {/* 停滞を示す波紋 */}
      <path d="M9 22c0 1.5 3 2.5 7 2.5s7-1 7-2.5" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M11 20c0 1 2 1.5 5 1.5s5-0.5 5-1.5" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* 内部の重さを示す水滴 */}
      <circle cx="16" cy="18" r="2" fill="#cbd5e1" opacity="0.7" />
    </svg>
  );
}

// 6. 乾燥（枯渇・蒸発・カサカサ / マスタード系）
export function IconWeatherDry({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-dry" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="line-dry" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* 蒸発していくような半透明のしずく */}
      <path d="M16 4 C16 4 8 13 8 20 A8 8 0 0 0 24 20 C24 13 16 4 16 4 Z" fill="url(#grad-dry)" />
      {/* 輪郭が途切れている（カサカサ感） */}
      <path d="M16 4 C16 4 8 13 8 20 A8 8 0 0 0 24 20" fill="none" stroke="url(#line-dry)" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" opacity="0.8" />
      {/* 枯渇を示すひび割れ */}
      <path d="M16 26l-2-4 3-3-2-3" fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      {/* 上へ飛んでいく粒子 */}
      <circle cx="12" cy="10" r="1" fill="#fcd34d" />
      <circle cx="20" cy="8" r="1.5" fill="#fcd34d" opacity="0.7" />
      <circle cx="16" cy="12" r="1" fill="#fcd34d" opacity="0.5" />
    </svg>
  );
}

// トリガーに応じたアイコンを返すラッパーコンポーネント
export function WeatherIcon({ triggerKey, className = "h-10 w-10" }) {
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
