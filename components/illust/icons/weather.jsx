// components/illust/icons/weather.jsx
"use client";

// 1. 気圧低下（寒色系：膨張・ふにゃふにゃ・血管拡張の偏頭痛イメージ）
export function IconWeatherPressureDown({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-pressure-down" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      
      {/* 力なく膨張して境界が曖昧になった背景 */}
      <path d="M16 4 C24 4 28 9 27 16 C26 24 21 28 16 27 C9 26 5 23 5 16 C5 9 8 4 16 4 Z" fill="url(#grad-pressure-down)" />
      
      {/* 血管が緩んでふにゃふにゃに広がる破線 */}
      <path d="M16 7 C19 10 23 10 25 16 C23 22 19 22 16 25 C13 22 9 22 7 16 C9 10 13 10 16 7 Z" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" strokeLinejoin="round" />
      
      {/* だらんと張りを失った内部の波線（弛緩のイメージ） */}
      <path d="M11 14 Q 13.5 11 16 14 T 21 14" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M11 18 Q 13.5 15 16 18 T 21 18" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      
      {/* 遠心（外向き）の4方向矢印（力なさを出すため少し細め） */}
      <g stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8 V2 M13.5 4.5 L16 2 L18.5 4.5" />
        <path d="M16 24 V30 M13.5 27.5 L16 30 L18.5 27.5" />
        <path d="M8 16 H2 M4.5 13.5 L2 16 L4.5 18.5" />
        <path d="M24 16 H30 M27.5 13.5 L30 16 L27.5 18.5" />
      </g>
    </svg>
  );
}

// 2. 気圧上昇（暖色系：圧縮・ギュウギュウ・血管収縮の緊張性頭痛イメージ）
export function IconWeatherPressureUp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-pressure-up" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e11d48" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      
      {/* 圧縮されて密度が高まった背景 */}
      <circle cx="16" cy="16" r="10" fill="url(#grad-pressure-up)" />
      
      {/* ギュウギュウに締め付けられる二重の枠線（角ばった緊張感） */}
      <rect x="9" y="9" width="14" height="14" rx="2" fill="none" stroke="#fb7185" strokeWidth="1.5" opacity="0.9" />
      <rect x="12" y="12" width="8" height="8" rx="1" fill="none" stroke="#e11d48" strokeWidth="1.5" opacity="0.8" />
      
      {/* 内部の緊張（血管収縮のピリピリしたギザギザ） */}
      <path d="M13 16 L 14.5 14 L 17.5 18 L 19 16" fill="none" stroke="#be123c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* 求心（内向き）の4方向矢印（力強く圧迫する太さ） */}
      <g stroke="#be123c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2 V7 M13 4.5 L16 7 L19 4.5" />
        <path d="M16 30 V25 M13 27.5 L16 25 L19 27.5" />
        <path d="M2 16 H7 M4.5 13 L7 16 L4.5 19" />
        <path d="M30 16 H25 M27.5 13 L25 16 L27.5 19" />
      </g>
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


// 5. 湿気（濃紺：どんより太い波線＋非対称で重たい水たまり）
export function IconWeatherDamp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-drop-main" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* メイン水滴：深い紺色から、墨汁にならないギリギリの超濃紺へ */}
          <stop offset="0%" stopColor="#1e3153" />
          <stop offset="100%" stopColor="#0f1b33" />
        </linearGradient>
        <linearGradient id="grad-drop-sub" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* サブ水滴：少し明るめの紺から深い紺へ */}
          <stop offset="0%" stopColor="#31466b" />
          <stop offset="100%" stopColor="#1e3153" />
        </linearGradient>
      </defs>
      
      {/* どんよりした重たい空気（波線） ※太く、色を濃くして存在感をアップ */}
      <path d="M-2 10 Q 4 5, 10 10 T 22 10 T 34 10" fill="none" stroke="#475c82" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M2 16 Q 7 12, 12 16 T 22 16 T 32 16" fill="none" stroke="#31466b" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

      {/* 右側のしずく（中） ※メインの横で合体して溜まっている */}
      <path d="M22 14 C 22 14, 16 21, 16 25 C 16 28, 18.5 29.5, 22 29.5 C 25.5 29.5, 28 28, 28 25 C 28 21, 22 14, 22 14 Z" fill="url(#grad-drop-sub)" opacity="0.8" />

      {/* 落ちてくる小さな水滴（上部・非対称のアクセント） */}
      <path d="M24 5 C 24 5, 22 8, 22 10 C 22 11.5, 23 12.5, 24 12.5 C 25 12.5, 26 11.5, 26 10 C 26 8, 24 5, 24 5 Z" fill="#475c82" opacity="0.7" />

      {/* 左側・メインの重たい水滴（大） ※一番大きく、下にずっしり溜まる */}
      <path d="M13 7 C 13 7, 5 16, 5 23 C 5 27.5, 8.5 30, 13 30 C 17.5 30, 21 27.5, 21 23 C 21 16, 13 7, 13 7 Z" fill="url(#grad-drop-main)" opacity="0.95" />

      {/* メインしずくのハイライト（液体のぬめり感）※ここは白のまま維持 */}
      <path d="M9 24 A 4.5 4.5 0 0 1 11 17.5" fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* 底に広がる水たまりのライン（重力と停滞感） */}
      <path d="M 8 31 H 25" fill="none" stroke="#0f1b33" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}



// 6. 乾燥（マスタード：ひび割れた大地＋蒸発）
export function IconWeatherDry({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      {/* 蒸発して上へ逃げる水分（上向きの点線と粒子） */}
      <path d="M10 16 v-6 M16 14 v-8 M22 15 v-5" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.6" />
      <circle cx="10" cy="6" r="1" fill="#d97706" opacity="0.8" />
      <circle cx="16" cy="3" r="1.5" fill="#b45309" opacity="0.6" />
      <circle cx="22" cy="7" r="1" fill="#d97706" opacity="0.8" />
      
      {/* 乾燥してひび割れた大地 */}
      <path d="M4 22 Q 10 18, 16 22 T 28 22" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 26 Q 10 24, 16 26 T 28 24" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      
      {/* ひび割れのディテール */}
      <path d="M12 20 l 2 4 l -1 3 M18 23 l 3 4 M24 21 l 1 3" fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
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
