"use client";

import { useId } from "react";

export default function HeroTitleMark({ compact = false, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const logoBgGrad = `logoBgGrad-${uid}`;
  const radarSweep = `radarSweep-${uid}`;

  // ビジネス仕様の格付けカラーパレット
  const colors = {
    // 課題（未病）を伝える、信頼と格式のダークネイビー
    core: "#0F173E", 
    // 解決策（レーダー）を伝える、先読みとエネルギーのアンバー
    radar: "#FBBF24",
    // サブテキスト用の落ち着いたグレー
    sub: "text-slate-500" 
  };

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      {/* 1. アイコン部分：文字の色に合わせて格上げされたネイビー・レーダー */}
      <div
        className={[
          "relative shrink-0 overflow-hidden bg-white shadow-[0_4px_12px_rgba(15,23,62,0.12)] ring-1 ring-slate-900/5",
          compact ? "h-10 w-10 rounded-[14px]" : "h-14 w-14 rounded-[20px]",
        ].join(" ")}
      >
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            {/* 背景のわずかな奥行き（少しグレーを帯びた、清潔な白） */}
            <linearGradient id={logoBgGrad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#F8F9FA" />
            </linearGradient>

            {/* レーダーのスウィープ：アンバー〜ミントへのグラデーション（先読みと diffusion） */}
            <linearGradient id={radarSweep} x1="0.5" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.radar} /> {/* Amber */}
              <stop offset="100%" stopColor={colors.radar} stopOpacity="0" />
            </linearGradient>
            
            {/* 信号波に奥行きを与える、繊細なブラーフィルタ */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
            </filter>
          </defs>

          {/* 背景 */}
          <rect width="64" height="64" fill={`url(#${logoBgGrad})`} />

          {/* 背景の波紋：ネイビーの薄い線（体調のゆらぎ） */}
          <circle cx="32" cy="32" r="22" fill="none" stroke={colors.core} strokeWidth="1.5" strokeOpacity="0.08" />
          <circle cx="32" cy="32" r="14" fill="none" stroke={colors.core} strokeWidth="1.5" strokeOpacity="0.06" />

          {/* レーダーのスウィープ（右上の広がり：先読みと拡散） */}
          <g filter="url(#softGlow)" opacity="0.6">
            <path d="M42 22 A 18 18 0 0 1 54 38" fill="none" stroke={`url(#${radarSweep})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M36 16 A 26 26 0 0 1 54 28" fill="none" stroke={`url(#${radarSweep})`} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M48 28 A 10 10 0 0 1 54 44" fill="none" stroke={`url(#${radarSweep})`} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
          </g>

          {/* パラボラアンテナ（ネイビー：揺るぎない分析軸。右向き・精密設計） */}
          <g transform="translate(48, 46) rotate(35) scale(-1, 1)">
            {/* アンテナの軸（太く、信頼感がある） */}
            <path d="M12 -2 L12 -12" stroke={colors.core} strokeWidth="4.5" strokeLinecap="round" />
            {/* パラボラ部分（シャープで、無駄のない造形） */}
            <path d="M0 -14 C0 -4, 24 -4, 24 -14 L20 -16 C20 -10, 4 -10, 4 -16 Z" fill={colors.core} />
            {/* 受信機先端（正確なポイントを捉える） */}
            <circle cx="12" cy="-22" r="3" fill={colors.core} />
            <path d="M12 -12 L12 -20" stroke={colors.core} strokeWidth="1.8" />
          </g>
        </svg>
      </div>

      {/* 2. タイポグラフィ部分：ビジネス仕様の格付け */}
      <div className="flex flex-col justify-center">
        <div
          className={[
            "font-black tracking-tighter flex items-baseline gap-0.5",
            compact ? "text-[20px] leading-none" : "text-[32px] leading-[1.02]",
          ].join(" ")}
        >
          {/* 課題はネイビーで重く、解決策はアンバーで鋭く */}
          <span style={{ color: colors.core }}>未病</span>
          <span style={{ color: colors.radar }}>レーダー</span>
        </div>

        {!compact && (
          <p className={`mt-1 text-[10px] font-extrabold tracking-[0.18em] uppercase ${colors.sub}`}>
            <span style={{ color: colors.core }}>MIBYO</span> Radar
            <span className="mx-2 text-slate-300">|</span>
            PERSONAL FORECAST
          </p>
        )}
      </div>
    </div>
  );
}
