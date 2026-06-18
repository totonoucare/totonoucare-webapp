"use client";

export default function HeroDashboardArt({ className = "" }) {
  return (
    <div className={["relative shrink-0", className].join(" ")}>
      <svg viewBox="0 0 200 200" className="h-[200px] w-[200px]" aria-hidden="true">
        <defs>
          <filter id="softGlowAura" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
          </filter>
          <filter id="corePulseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
          <filter id="waveLayerBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
          <radialGradient id="lifeForceGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C99A35" />
            <stop offset="100%" stopColor="#C99A35" stopOpacity="0.14" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="95" fill="#fbfcf9" filter="url(#softGlowAura)" opacity="0.92" />

        <circle cx="100" cy="100" r="76" fill="none" stroke="#c6d7cf" strokeWidth="1.7" strokeOpacity="0.76" />
        <circle cx="100" cy="100" r="112" fill="none" stroke="#c6d7cf" strokeWidth="1.45" strokeOpacity="0.44" />

        <path
          d="M18 96 C 44 58, 82 138, 112 100 S 160 62, 188 98"
          fill="none"
          stroke="#3BA58B"
          strokeOpacity="0.24"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#waveLayerBlur)"
        />
        <path
          d="M22 122 C 52 88, 92 154, 124 120 S 172 92, 198 122"
          fill="none"
          stroke="#3BA58B"
          strokeOpacity="0.15"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#waveLayerBlur)"
        />

        <path
          d="M35 138 A82 82 0 0 1 130 38"
          fill="none"
          stroke="#C99A35"
          strokeOpacity="0.24"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        <circle cx="100" cy="100" r="24" fill="url(#lifeForceGold)" filter="url(#corePulseGlow)" opacity="0.94" />
        <circle cx="100" cy="100" r="7" fill="#C99A35" opacity="0.98" />

        <circle cx="100" cy="28" r="3" fill="#3BA58B" opacity="0.26" />
        <circle cx="100" cy="172" r="3" fill="#3BA58B" opacity="0.26" />
        <circle cx="28" cy="100" r="3" fill="#3BA58B" opacity="0.22" />
        <circle cx="172" cy="100" r="3" fill="#3BA58B" opacity="0.22" />
      </svg>
    </div>
  );
}


