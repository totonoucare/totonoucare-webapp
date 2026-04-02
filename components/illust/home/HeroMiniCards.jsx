"use client";

import Button from "@/components/ui/Button";

function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconCore9() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
      <defs>
        <linearGradient id="core9Grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cce0d2" />
          <stop offset="100%" stopColor="#e8f0ea" />
        </linearGradient>
        <filter id="core9Glow">
          <feGaussianBlur stdDeviation="2" stdDeviationX="2" stdDeviationY="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#core9Grad)" />
      
      {/* アクセル（上） */}
      <circle cx="60" cy="30" r="7" fill="#6a9770" />
      <path d="M54 30 L66 30" stroke="#ffffff" strokeWidth="1.5" />
      
      {/* ブレーキ（下） */}
      <circle cx="60" cy="90" r="7" fill="#89ac8e" />
      <path d="M54 90 L66 90" stroke="#ffffff" strokeWidth="1.5" />
      
      {/* バッテリー（中） */}
      <circle cx="60" cy="60" r="9" fill="#e5b85c" filter="url(#core9Glow)" />
      
      {/* 残りの6タイプ（抽象的な円の重なり） */}
      <circle cx="34" cy="46" r="4.5" fill="#a8c7ab" fillOpacity="0.8" />
      <circle cx="34" cy="74" r="4.5" fill="#a8c7ab" fillOpacity="0.8" />
      <circle cx="86" cy="46" r="4.5" fill="#a8c7ab" fillOpacity="0.8" />
      <circle cx="86" cy="74" r="4.5" fill="#a8c7ab" fillOpacity="0.8" />
      <circle cx="46" cy="34" r="4" fill="#a8c7ab" fillOpacity="0.6" />
      <circle cx="74" cy="34" r="4" fill="#a8c7ab" fillOpacity="0.6" />
      <circle cx="46" cy="86" r="4" fill="#a8c7ab" fillOpacity="0.6" />
      <circle cx="74" cy="86" r="4" fill="#a8c7ab" fillOpacity="0.6" />
    </svg>
  );
}

function IconForecastwave() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
      <defs>
        <linearGradient id="forecastBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
        <filter id="forecastGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a54a" />
          <stop offset="100%" stopColor="#e5b85c" />
        </linearGradient>
      </defs>
      
      {/* グラスモーフィズムの背景 */}
      <rect x="10" y="10" width="100" height="100" rx="20" fill="url(#forecastBg)" />
      
      {/* 気象の波 (データウェーブ、グラスモーフィズム) */}
      <path d="M 0 50 Q 25 35, 45 50 T 110 45" fill="none" stroke="#6a9770" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3" />
      
      {/* 体調の波 (滑らかな曲線) */}
      <path d="M 0 70 Q 20 50, 40 70 T 110 65" fill="none" stroke="#6a9770" strokeWidth="3.5" strokeLinecap="round" />
      
      {/* 雨雲 (抽象化、透明感) */}
      <circle cx="40" cy="32" r="8" fill="#cce0d2" fillOpacity="0.6" />
      <circle cx="52" cy="32" r="8" fill="#cce0d2" fillOpacity="0.8" />
      
      {/* 太陽 (抽象化、発光) */}
      <circle cx="80" cy="28" r="7" fill="#e5b85c" filter="url(#forecastGlow)" />
      
      {/* 目安スコア (キャラクター胸のレーダーの抽象化) */}
      <circle cx="60" cy="90" r="14" fill="#ffffff" fillOpacity="0.8" />
      <circle cx="60" cy="90" r="8" fill="url(#scoreGrad)" />
      
      {/* シグナルポイント */}
      <circle cx="60" cy="62" r="4.5" fill="#ffffff" fillOpacity="0.9" />
      <circle cx="60" cy="62" r="2.5" fill="#6a9770" />
    </svg>
  );
}

function IconCareTsuboMoxa() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" fill="none">
      <defs>
        <filter id="careShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#4d6f55" floodOpacity="0.12" />
        </filter>
        <linearGradient id="careGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8f0ea" />
        </linearGradient>
        <filter id="careGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* ケア提案 (抽象化されたツボとお灸、発光、アウトラインなし) */}
      <circle cx="60" cy="60" r="48" fill="url(#careGrad)" filter="url(#careShadow)" />
      
      {/* ツボ押しとお灸の手元 (抽象化) */}
      <rect x="30" y="55" width="20" height="28" rx="8" fill="#a8c7ab" />
      <path d="M40 78 C 38 88, 52 88, 50 78" fill="none" stroke="#89ac8e" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* お灸 (Moxa、発光) */}
      <circle cx="60" cy="98" r="6" fill="#e5b85c" filter="url(#careGlow)" />
      
      {/* 薬草の束 (漢方) */}
      <path d="M80 60 C 72 45, 92 35, 90 45 Z" fill="#89ac8e" />
      <path d="M85 60 C 77 48, 97 42, 95 48 Z" fill="#a8c7ab" fillOpacity="0.7" />
      
      {/* 食養生のポイント */}
      <circle cx="90" cy="85" r="3.5" fill="#89ac8e" fillOpacity="0.6" />
      <circle cx="100" cy="80" r="3.5" fill="#89ac8e" fillOpacity="0.6" />
      <circle cx="85" cy="75" r="3.5" fill="#89ac8e" fillOpacity="0.6" />
      
      {/* 中央の発光ポイント (体調が整うオーラ) */}
      <circle cx="60" cy="60" r="14" fill="none" stroke="#e5b85c" strokeWidth="1.5" strokeOpacity="0.6" filter="url(#careGlow)" />
    </svg>
  );
}

function MiniCard({ icon, title, core, signal, score, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[200px] flex-col rounded-[24px] border border-[var(--ring)] bg-white p-4 text-left shadow-[0_12px_24px_-20px_rgba(0,0,0,0.18)] transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] overflow-hidden">
          {icon}
        </div>
        <IconChevron />
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        
        {children || (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
            <span className="text-[11px] font-extrabold text-slate-700">{core}</span>
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
              {signal} /
              <span className="text-sm font-black text-slate-900">{score}</span>
              <span className="text-[10px] text-slate-500">点</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto inline-flex items-center gap-1 text-[12px] font-extrabold text-[var(--accent-ink)]">
        詳しく見る
        <IconChevron />
      </div>
    </button>
  );
}

export default function HeroMiniCards({ compact = false }) {
  const latestResultHref = null;
  const core = { title: "短期集中型" };

  const heightClass = compact ? "h-[200px]" : "h-auto";

  return (
    <div className={["grid gap-3 sm:grid-cols-2 lg:grid-cols-3", heightClass].join(" ")}>
      <MiniCard icon={<IconCore9 />} title="1.体質チェック" core={core?.title} onClick={() => {}}>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
          <span className="text-[11px] font-extrabold text-slate-700">{core?.title}</span>
          <span className="text-[11px] font-extrabold text-slate-500">
            アクセル / バッテリー
          </span>
        </div>
      </MiniCard>

      <MiniCard
        icon={<IconForecastwave />}
        title="2.気象×体質予報"
        onClick={() => {}}
      >
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-2.5 py-1.5 ring-1 ring-emerald-100">
          <span className="text-[11px] font-extrabold text-emerald-800">安定</span>
          <span className="text-xs font-black text-emerald-900">2</span>
          <span className="text-[10px] text-emerald-600">点</span>
        </div>
      </MiniCard>

      <MiniCard
        icon={<IconCareTsuboMoxa />}
        title="3.合いやすい対策"
        onClick={() => {}}
      >
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-2.5 py-1.5 ring-1 ring-amber-100">
          <span className="text-[11px] font-extrabold text-amber-800">ケア</span>
          <span className="text-xs font-black text-amber-900">8</span>
          <span className="text-[10px] text-amber-600">点</span>
        </div>
      </MiniCard>
    </div>
  );
}
