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

// 気圧の上下変動（上昇と低下が同日に重なる物理変化）
export function IconWeatherPressureMixed({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-pressure-mixed" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="line-pressure-mixed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* 上下する気圧の波を受け止める、やわらかな同心円 */}
      <circle cx="16" cy="16" r="12" fill="url(#grad-pressure-mixed)" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="url(#line-pressure-mixed)" strokeWidth="1.5" strokeDasharray="2.5 2.5" opacity="0.7" />
      <path d="M8 16 C10.5 12.5 13 19.5 16 16 C19 12.5 21.5 19.5 24 16" fill="none" stroke="#7c3aed" strokeWidth="1.7" strokeLinecap="round" />

      {/* 上昇と低下を並べ、どちらか一方に固定しない */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 23 V8 M7.5 11 L10 8 L12.5 11" stroke="#4f46e5" strokeWidth="1.8" />
        <path d="M22 9 V24 M19.5 21 L22 24 L24.5 21" stroke="#9333ea" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// 3. 低温（収縮・氷 / アイスブルー系）
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


// 4. 気温上昇（上昇する熱気・陽炎 / オレンジレッド系）
export function IconWeatherHeat({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-heat" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffedd5" stopOpacity="0.0" />
        </radialGradient>
        <linearGradient id="line-heat" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      
      {/* 下から湧き上がり、膨張する熱のオーラ */}
      <circle cx="16" cy="18" r="12" fill="url(#grad-heat)" />
      
      {/* 上昇する熱気（陽炎のような波線と上向きの矢印） */}
      {/* 中央 */}
      <path d="M16 26 C20 22, 12 18, 16 14 C18.5 11.5, 16 7, 16 5" fill="none" stroke="url(#line-heat)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.5 8.5 L16 5 L19.5 8.5" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* 左 */}
      <path d="M9 23 C11.5 20, 6.5 16, 9 13 C10.5 11, 9 8, 9 6" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M6.5 8.5 L9 6 L11.5 8.5" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      
      {/* 右 */}
      <path d="M23 23 C20.5 20, 25.5 16, 23 13 C21.5 11, 23 8, 23 6" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M20.5 8.5 L23 6 L25.5 8.5" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      {/* 外側へ発散する熱の粒子感 */}
      <path d="M5 18 Q 3 14, 6 10" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 4" opacity="0.7" />
      <path d="M27 18 Q 29 14, 26 10" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 4" opacity="0.7" />
    </svg>
  );
}

// 高温（強い日照・太陽熱 / サンイエロー〜オレンジ系）
export function IconWeatherHighTemperature({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-high-temperature" cx="45%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#fb923c" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sun-high-temperature" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* 日照そのものが強い、絶対的な高温環境 */}
      <circle cx="16" cy="16" r="13" fill="url(#grad-high-temperature)" />
      <circle cx="16" cy="16" r="6.5" fill="url(#sun-high-temperature)" />
      <circle cx="14" cy="14" r="2.2" fill="#fff7cc" opacity="0.55" />

      {/* 太陽から外へ伸びる熱の光 */}
      <g stroke="#f97316" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16 2.5 V6" />
        <path d="M16 26 V29.5" />
        <path d="M2.5 16 H6" />
        <path d="M26 16 H29.5" />
        <path d="M6.5 6.5 L9 9" />
        <path d="M23 23 L25.5 25.5" />
        <path d="M25.5 6.5 L23 9" />
        <path d="M9 23 L6.5 25.5" />
      </g>
    </svg>
  );
}

// 気温低下（下向きの冷気・下降ベクトル / ブルー系）
export function IconWeatherTemperatureDown({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="grad-temperature-down" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="line-temperature-down" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* 上から流れ込み、下へ沈む冷気 */}
      <circle cx="16" cy="14" r="12" fill="url(#grad-temperature-down)" />
      <path d="M16 5 C12 9 20 13 16 17 C13.5 19.5 16 23 16 27" fill="none" stroke="url(#line-temperature-down)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12.5 23.5 L16 27 L19.5 23.5" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M9 7 C6.5 10 11.5 14 9 17 C7.5 19 9 22 9 25" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M6.5 22.5 L9 25 L11.5 22.5" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      <path d="M23 7 C25.5 10 20.5 14 23 17 C24.5 19 23 22 23 25" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M20.5 22.5 L23 25 L25.5 22.5" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      {/* 冷気の粒子 */}
      <circle cx="5" cy="13" r="1" fill="#7dd3fc" opacity="0.75" />
      <circle cx="27" cy="11" r="1.2" fill="#38bdf8" opacity="0.65" />
    </svg>
  );
}

// 寒暖差（暖気の上昇と冷気の低下が同日に重なる変化）
export function IconWeatherTemperatureSwing({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-temperature-swing" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
          <stop offset="48%" stopColor="#f8fafc" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="line-temperature-swing" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      <circle cx="16" cy="16" r="13" fill="url(#grad-temperature-swing)" />
      <path d="M6 19 C9 14 12 22 16 16 C20 10 23 18 26 13" fill="none" stroke="url(#line-temperature-swing)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.5 2.5" />

      {/* 暖気は上へ、冷気は下へ */}
      <path d="M11 24 C14 20 8 16 11 12 C12.5 10 11 7 11 5" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8 L11 5 L14 8" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 6 C18 10 24 14 21 18 C19.5 20 21 23 21 27" fill="none" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 24 L21 27 L24 24" fill="none" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="16" cy="16" r="2.5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" opacity="0.9" />
    </svg>
  );
}


// 5. 湿気（明るいネイビー：どんより太い波線＋非対称で重たい水たまり）
export function IconWeatherDamp({ className = "h-10 w-10", ...props }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="grad-drop-main" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* メイン水滴：深い紺から、光を含んだ深いネイビーへ（墨汁から脱却） */}
          <stop offset="0%" stopColor="#3e547e" />
          <stop offset="100%" stopColor="#253a5c" />
        </linearGradient>
        <linearGradient id="grad-drop-sub" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* サブ水滴：より明るく、澄んだネイビーブルーへ */}
          <stop offset="0%" stopColor="#5e7aa7" />
          <stop offset="100%" stopColor="#3e547e" />
        </linearGradient>
      </defs>
      
      {/* どんよりした重たい空気（波線） ※色を明るくして、少し空気が澄んだ印象に */}
      <path d="M-2 10 Q 4 5, 10 10 T 22 10 T 34 10" fill="none" stroke="#6e89b3" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M2 16 Q 7 12, 12 16 T 22 16 T 32 16" fill="none" stroke="#5e7aa7" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

      {/* 右側のしずく（中） ※メインの横で合体して溜まっている */}
      <path d="M22 14 C 22 14, 16 21, 16 25 C 16 28, 18.5 29.5, 22 29.5 C 25.5 29.5, 28 28, 28 25 C 28 21, 22 14, 22 14 Z" fill="url(#grad-drop-sub)" opacity="0.8" />

      {/* 落ちてくる小さな水滴（上部・非対称のアクセント） */}
      <path d="M24 5 C 24 5, 22 8, 22 10 C 22 11.5, 23 12.5, 24 12.5 C 25 12.5, 26 11.5, 26 10 C 26 8, 24 5, 24 5 Z" fill="#6e89b3" opacity="0.7" />

      {/* 左側・メインの重たい水滴（大） ※一番大きく、下にずっしり溜まる */}
      <path d="M13 7 C 13 7, 5 16, 5 23 C 5 27.5, 8.5 30, 13 30 C 17.5 30, 21 27.5, 21 23 C 21 16, 13 7, 13 7 Z" fill="url(#grad-drop-main)" opacity="0.95" />

      {/* メインしずくのハイライト（液体のぬめり感）※白のまま維持 */}
      <path d="M9 24 A 4.5 4.5 0 0 1 11 17.5" fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

      {/* 底に広がる水たまりのライン（重力と停滞感） */}
      <path d="M 8 31 H 25" fill="none" stroke="#253a5c" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
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

export function resolveWeatherIconKey(triggerKey, direction = null) {
  const key = String(triggerKey || "").trim();
  const physicalDirection = String(direction || "").trim();

  if (key === "pressure_shift") {
    if (physicalDirection === "mixed") return "pressure_mixed";
    return physicalDirection === "up" ? "pressure_up" : "pressure_down";
  }
  if (key === "pressure_down" || key === "pressure_up") {
    return physicalDirection === "mixed" ? "pressure_mixed" : key;
  }
  if (key === "temp_shift" || key === "temperature_shift" || key === "temp") {
    if (physicalDirection === "up") return "temperature_up";
    if (physicalDirection === "down") return "temperature_down";
    return "temperature_swing";
  }
  if (key === "heat" || key === "high_temperature") return "high_temperature";
  if (key === "cold" || key === "low_temperature") return "low_temperature";
  return key;
}

// トリガーに応じたアイコンを返すラッパーコンポーネント
export function WeatherIcon({ triggerKey, direction = null, className = "h-10 w-10" }) {
  switch (resolveWeatherIconKey(triggerKey, direction)) {
    case "pressure_down": return <IconWeatherPressureDown className={className} />;
    case "pressure_up": return <IconWeatherPressureUp className={className} />;
    case "pressure_mixed": return <IconWeatherPressureMixed className={className} />;
    case "low_temperature": return <IconWeatherCold className={className} />;
    case "high_temperature": return <IconWeatherHighTemperature className={className} />;
    case "temperature_up": return <IconWeatherHeat className={className} />;
    case "temperature_down": return <IconWeatherTemperatureDown className={className} />;
    case "temperature_swing": return <IconWeatherTemperatureSwing className={className} />;
    case "damp": return <IconWeatherDamp className={className} />;
    case "dry": return <IconWeatherDry className={className} />;
    default: return null;
  }
}
