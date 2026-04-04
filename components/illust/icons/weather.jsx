// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（上から重圧・ペチャンコ）
export function IconWeatherPressureDown({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 重圧の矢印エフェクト */}
      <path d="M12 2v5 M9 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      
      {/* 押しつぶされた顔の輪郭（横に広く、縦に潰れる） */}
      <rect x="2" y="11" width="20" height="10" rx="5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="2" y="11" width="20" height="10" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      
      {/* 圧力で曲がったアンテナ */}
      <path d="M12 11 Q14 8 17 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="9" r="1.5" fill="currentColor" />
      
      {/* 苦しそうな目 (＞ ＜) と、食いしばった波口 */}
      <path d="M6 14l2 1.5-2 1.5 M18 14l-2 1.5 2 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17.5 Q11 16 12 17.5 T14 17.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 2. 気圧上昇（内から外へ膨張・パンパン）
export function IconWeatherPressureUp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 膨張の矢印エフェクト */}
      <path d="M4 4l2.5 2.5 M20 4l-2.5 2.5 M4 20l2.5-2.5 M20 20l-2.5-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      
      {/* 真ん丸に膨張した顔の輪郭 */}
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      
      {/* ピンと張ったアンテナ */}
      <path d="M12 3.5 V1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="1" r="1.5" fill="currentColor" />
      
      {/* 驚いて見開いた目と、丸い口 */}
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="15" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// 3. 冷え・気温低下（ガタガタ震える・縮こまる）
export function IconWeatherCold({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 寒気エフェクト（キラキラ・結晶） */}
      <path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M19 5l-1.5 1.5 M6.5 17.5L5 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      
      {/* 寒さで四角く縮こまった顔 */}
      <rect x="6.5" y="7.5" width="11" height="11" rx="3" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="6.5" y="7.5" width="11" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      
      {/* 縮んだアンテナ */}
      <path d="M12 7.5 V5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
      
      {/* ギュッとつむった横線の目と、ガタガタの口 */}
      <path d="M8 11.5h1.5 M14.5 11.5h1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 14.5l1-1 1 1 1-1 1 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 4. 暑さ・気温上昇（汗だく・のぼせ）
export function IconWeatherHeat({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 立ち上る熱気・湯気のエフェクト */}
      <path d="M6 5 Q7 3 8 5 T10 5 M14 4 Q15 2 16 4 T18 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      
      {/* 少しとろけたような顔（通常より角丸が大きく、少し潰れ気味） */}
      <rect x="4" y="9" width="16" height="13" rx="6.5" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="9" width="16" height="13" rx="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      
      {/* 暑さでへたったアンテナ */}
      <path d="M12 9 Q10 5 7 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="6" r="1.5" fill="currentColor" />
      
      {/* ヘロヘロの半目と、ぽかんと開いた口 */}
      <path d="M7.5 13.5 Q8.5 12 9.5 13.5 M14.5 13.5 Q15.5 12 16.5 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 17.5 A1 1 0 0 0 13 17.5 Z" fill="currentColor" />
      
      {/* 大きな汗のしずく */}
      <path d="M19.5 11 C19.5 11 21.5 13 21.5 14.5 A2 2 0 0 1 17.5 14.5 C17.5 13 19.5 11 19.5 11 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// 5. 湿気・湿度上昇（ジメジメ・下ぶくれ）
export function IconWeatherDamp({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 重みで下ぶくれになったスライム/水滴型の顔 */}
      <path d="M12 7 C8 7 5 11 4 16 C3.5 19.5 6 22 12 22 C18 22 20.5 19.5 20 16 C19 11 16 7 12 7 Z" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <path d="M12 7 C8 7 5 11 4 16 C3.5 19.5 6 22 12 22 C18 22 20.5 19.5 20 16 C19 11 16 7 12 7 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      
      {/* 水分を含んだアンテナと、垂れる水滴 */}
      <path d="M12 7 V3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" />
      <path d="M14 4.5 C14 4.5 15.5 6 15.5 7 A1.5 1.5 0 0 1 12.5 7 C12.5 6 14 4.5 14 4.5 Z" fill="currentColor" opacity="0.3" />
      
      {/* とろんとした横目と、だるそうな波口 */}
      <path d="M7.5 14 H10.5 M13.5 14 H16.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 14.5 Q9 15.5 10 14.5 M14 14.5 Q15 15.5 16 14.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 18.5 Q12 17 14 18.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 6. 乾燥・湿度低下（カサカサ・ひび割れ）
export function IconWeatherDry({ className = "h-7 w-7", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 水分が飛んでいくパーティクルエフェクト */}
      <path d="M12 2v1.5 M17 3l1 1 M7 3l-1 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" strokeDasharray="1 3" />
      
      {/* カクカクかすれた（点線の）輪郭 */}
      <rect x="4" y="7" width="16" height="14" rx="4" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="4" y="7" width="16" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
      
      {/* かすれたアンテナ */}
      <path d="M12 7 V4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
      <circle cx="12" cy="3" r="1.5" fill="currentColor" />
      
      {/* 生気を失った点目と、真一文字の口 */}
      <circle cx="8.5" cy="12.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="12.5" r="1.5" fill="currentColor" />
      <path d="M10 16.5 H14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      
      {/* 顔の表面の稲妻状のひび割れ */}
      <path d="M4 10 L6.5 11.5 L5 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M17 16 L18.5 14.5 L20 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

/* ★ 呼び出し用ヘルパー（各ページでこれを使います） */
export function WeatherIcon({ triggerKey, className = "h-7 w-7" }) {
  switch (triggerKey) {
    case "pressure_down":
      return <IconWeatherPressureDown className={className} />;
    case "pressure_up":
      return <IconWeatherPressureUp className={className} />;
    case "cold":
      return <IconWeatherCold className={className} />;
    case "heat":
      return <IconWeatherHeat className={className} />;
    case "damp":
      return <IconWeatherDamp className={className} />;
    case "dry":
      return <IconWeatherDry className={className} />;
    default:
      return null;
  }
}
