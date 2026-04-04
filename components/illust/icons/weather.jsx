// components/illust/icons/weather.jsx
"use client";

export function IconPressureUp({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 雲のベース */}
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* 雲の中の上向き矢印 */}
      <path d="M12 15V9m0 0l-2.5 2.5M12 9l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPressureDown({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 雲のベース */}
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* 雲の中の下向き矢印 */}
      <path d="M12 9v6m0 0l-2.5-2.5M12 15l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTempUp({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 温度計 */}
      <path d="M10 14.76V4.5a2.5 2.5 0 0 0-5 0v10.26a4.5 4.5 0 1 0 5 0z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="17.5" r="2" fill="currentColor" />
      {/* 上向き矢印 */}
      <path d="M17 17V7m0 0l-3 3m3-3l3 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTempDown({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 温度計 */}
      <path d="M10 14.76V4.5a2.5 2.5 0 0 0-5 0v10.26a4.5 4.5 0 1 0 5 0z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="17.5" r="2" fill="currentColor" />
      {/* 下向き矢印 */}
      <path d="M17 7v10m0 0l-3-3m3 3l3-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHumidUp({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 雫 */}
      <path d="M9 4s-6 6-6 10a6 6 0 0 0 12 0c0-4-6-10-6-10z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 上向き矢印 */}
      <path d="M18 17V7m0 0l-2.5 2.5M18 7l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHumidDown({ className = "h-6 w-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      {/* 雫 */}
      <path d="M9 4s-6 6-6 10a6 6 0 0 0 12 0c0-4-6-10-6-10z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 下向き矢印 */}
      <path d="M18 7v10m0 0l-2.5-2.5M18 17l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 気象トリガーと方向から、適切なアイコンを自動で返すコンポーネント
 */
export function WeatherTriggerIcon({ trigger, dir, className = "h-6 w-6", ...props }) {
  if (trigger === "pressure" && dir === "up") return <IconPressureUp className={className} {...props} />;
  if (trigger === "pressure" && dir === "down") return <IconPressureDown className={className} {...props} />;
  if (trigger === "temp" && dir === "up") return <IconTempUp className={className} {...props} />;
  if (trigger === "temp" && dir === "down") return <IconTempDown className={className} {...props} />;
  if (trigger === "humidity" && dir === "up") return <IconHumidUp className={className} {...props} />;
  if (trigger === "humidity" && dir === "down") return <IconHumidDown className={className} {...props} />;
  
  // フォールバック（通常は表示されない）
  return <IconPressureDown className={className} {...props} />;
}
