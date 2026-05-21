"use client";

import React from "react";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV"]);
const TSUBO_HEAD_NECK_CODES = new Set(["GB20", "GV20"]);

const OUTLINE = "#7C5244";
const HAIR = "#6A4B3F";
const SKIN_LINE = "#B77B61";
const SKIN_DEEP = "#9E684F";

const strokeProps = {
  stroke: OUTLINE,
  strokeWidth: 2.1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

const softLineProps = {
  stroke: SKIN_DEEP,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

function getTsuboCode(point: any) {
  return String(point?.code || "").trim().toUpperCase();
}

function getTsuboCodePrefix(point: any) {
  const match = getTsuboCode(point).match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getTsuboRegionKey(point: any) {
  const region = String(point?.point_region || "").trim();
  const code = getTsuboCode(point);

  if (region === "head_neck" || TSUBO_HEAD_NECK_CODES.has(code)) return "head_neck";

  if (
    region === "abdomen" ||
    region === "chest_abdomen" ||
    region === "trunk" ||
    region === "back" ||
    region === "low_back"
  ) {
    return "trunk";
  }

  const prefix = getTsuboCodePrefix(point);

  if (TSUBO_TRUNK_PREFIXES.has(prefix)) return "trunk";
  if (TSUBO_HAND_PREFIXES.has(prefix)) return "hand_wrist";
  if (TSUBO_FOOT_PREFIXES.has(prefix)) return "foot_ankle";

  return "body";
}

export function getTsuboRegionIconLabel(point: any) {
  const key = getTsuboRegionKey(point);

  if (key === "head_neck") return "頭・首まわり";
  if (key === "hand_wrist") return "手・手首まわり";
  if (key === "foot_ankle") return "足・足首まわり";
  if (key === "trunk") return "体幹・お腹まわり";

  return "からだのツボ";
}

function IconFrame({
  children,
  className,
}: {
  children: (paint: {
    skin: string;
    shade: string;
    bg: string;
    highlight: string;
  }) => React.ReactNode;
  className?: string;
}) {
  const rawId = React.useId().replaceAll(":", "");
  const ids = {
    bg: `tsubo-bg-${rawId}`,
    skin: `tsubo-skin-${rawId}`,
    shade: `tsubo-shade-${rawId}`,
    lift: `tsubo-lift-${rawId}`,
  };

  const paint = {
    skin: `url(#${ids.skin})`,
    shade: `url(#${ids.shade})`,
    bg: `url(#${ids.bg})`,
    highlight: "#FFE7D5",
  };

  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id={ids.bg} cx="36%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFFDFC" />
          <stop offset="68%" stopColor="#FDF4EF" />
          <stop offset="100%" stopColor="#F7E5DC" />
        </radialGradient>

        <linearGradient id={ids.skin} x1="32" y1="16" x2="96" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE2CD" />
          <stop offset="48%" stopColor="#F1BE9C" />
          <stop offset="100%" stopColor="#D99673" />
        </linearGradient>

        <linearGradient id={ids.shade} x1="48" y1="24" x2="98" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C98466" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#9E5F49" stopOpacity="0.48" />
        </linearGradient>

        <filter id={ids.lift} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.2" floodColor="#6E4A3C" floodOpacity="0.16" />
        </filter>
      </defs>

      <circle cx="64" cy="64" r="58" fill={paint.bg} />

      <g filter={`url(#${ids.lift})`}>
        {children(paint)}
      </g>
    </svg>
  );
}

function HeadNeckIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="M49 72 L49 88 C44 96 31 102 18 116 H110 C97 102 84 96 79 88 V72 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M49 88 C56 97 72 97 79 88 C87 98 100 105 110 116 H18 C28 105 41 98 49 88 Z"
            fill={p.shade}
            opacity="0.65"
          />

          <path
            d="M40 50 C40 33 50 22 64 22 C78 22 88 33 88 50 C88 67 78 77 64 77 C50 77 40 67 40 50 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M65 22 C79 23 88 34 88 50 C88 67 78 77 64 77 C71 70 75 60 75 50 C75 40 72 30 65 22 Z"
            fill={p.shade}
            opacity="0.45"
          />

          <path
            d="M39 45 C38 28 49 16 64 16 C80 16 90 28 89 45 C82 38 73 37 64 41 C54 37 46 38 39 45 Z"
            fill={HAIR}
            stroke={OUTLINE}
            strokeWidth="1.6"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d="M36 48 C32 49 32 56 40 56 M92 48 C96 49 96 56 88 56"
            fill="none"
            {...strokeProps}
          />

          <path
            d="M45 104 C56 110 72 110 83 104"
            fill="none"
            {...softLineProps}
            opacity="0.52"
          />
        </>
      )}
    </IconFrame>
  );
}

function HandWristIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          {/* fingers */}
          <path d="M48 66 V31 C48 24 56 24 56 31 V63" fill={p.skin} {...strokeProps} />
          <path d="M57 64 V20 C57 13 66 13 66 20 V62" fill={p.skin} {...strokeProps} />
          <path d="M67 63 V24 C67 17 76 17 76 24 V65" fill={p.skin} {...strokeProps} />
          <path d="M77 68 V34 C77 28 85 28 85 34 V78" fill={p.skin} {...strokeProps} />

          {/* thumb */}
          <path
            d="M45 80 L30 68 C24 63 23 55 29 51 C34 48 39 52 45 59 L54 70 C59 77 52 85 45 80 Z"
            fill={p.skin}
            {...strokeProps}
          />

          {/* palm */}
          <path
            d="M42 66 C46 56 55 51 66 52 C79 53 88 64 88 78 V89 C88 106 78 117 64 117 C50 117 40 106 40 91 V78 C40 74 41 70 42 66 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M42 83 C47 90 54 95 58 104 M52 76 C61 77 70 84 75 94"
            fill="none"
            {...softLineProps}
            opacity="0.5"
          />

          <path
            d="M75 58 C84 65 86 75 86 88 C86 104 77 115 64 117 C75 105 76 85 75 58 Z"
            fill={p.shade}
            opacity="0.38"
          />

          <path
            d="M56 61 V75 M66 61 V77 M76 66 V79"
            fill="none"
            {...strokeProps}
            opacity="0.44"
          />
        </>
      )}
    </IconFrame>
  );
}

function FootAnkleIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="M70 12 H94 C92 34 89 52 89 68 C89 80 97 90 97 102 C97 113 88 119 76 118 C69 118 64 115 56 116 H32 C24 116 23 109 31 105 C49 96 65 82 70 65 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M88 13 H94 C92 34 89 52 89 68 C89 80 97 90 97 102 C97 113 88 119 76 118 C68 117 64 113 66 106 C70 92 80 82 80 67 C80 50 85 32 88 13 Z"
            fill={p.shade}
            opacity="0.55"
          />

          <ellipse
            cx="79"
            cy="93"
            rx="5"
            ry="6.5"
            fill={p.highlight}
            opacity="0.75"
            stroke={SKIN_LINE}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />

          <path
            d="M34 106 C31 109 29 112 29 115 M45 101 C41 105 38 109 37 115 M57 94 C53 101 50 108 50 115"
            fill="none"
            {...softLineProps}
            opacity="0.52"
          />

          <path
            d="M72 54 C74 68 70 82 61 93"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.6"
          />
        </>
      )}
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="M51 16 H77 C90 17 101 23 108 32 C110 36 103 45 94 49 C90 63 88 76 88 88 C88 101 96 109 98 118 H30 C32 109 40 101 40 88 C40 76 38 63 34 49 C25 45 18 36 20 32 C27 23 38 17 51 16 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M33 118 C37 109 43 101 43 89 C43 72 38 58 34 49 C29 47 24 42 22 37 C29 57 47 78 48 94 C48 106 39 114 33 118 Z"
            fill={p.shade}
            opacity="0.45"
          />

          <path
            d="M95 118 C91 109 85 101 85 89 C85 72 90 58 94 49 C99 47 104 42 106 37 C99 57 81 78 80 94 C80 106 89 114 95 118 Z"
            fill={p.shade}
            opacity="0.45"
          />

          <path
            d="M38 50 C49 56 59 56 64 56 C69 56 79 56 90 50"
            fill="none"
            {...strokeProps}
            opacity="0.28"
          />

          <path
            d="M64 60 V110"
            fill="none"
            stroke={SKIN_LINE}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.58"
          />

          <circle cx="64" cy="92" r="3.2" fill={SKIN_DEEP} opacity="0.72" />

          <path
            d="M59 69 C54 76 53 84 54 91 M69 69 C74 76 75 84 74 91"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.46"
          />
        </>
      )}
    </IconFrame>
  );
}

function GenericBodyIcon({ className }: { className?: string }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <circle cx="64" cy="23" r="11" fill={p.skin} {...strokeProps} />

          <path
            d="M52 39 H76 C87 39 100 45 106 53 C110 59 104 65 98 60 L85 49 V76 L93 113 C95 121 84 123 80 116 L64 88 L48 116 C44 123 33 121 35 113 L43 76 V49 L30 60 C24 65 18 59 22 53 C28 45 41 39 52 39 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M64 39 H76 C87 39 100 45 106 53 C110 59 104 65 98 60 L85 49 V76 L93 113 C95 121 84 123 80 116 L64 88 Z"
            fill={p.shade}
            opacity="0.44"
          />

          <path
            d="M64 43 V85"
            fill="none"
            stroke={SKIN_LINE}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.42"
          />
        </>
      )}
    </IconFrame>
  );
}

export default function TsuboRegionIcon({
  point,
  className = "h-8 w-8",
}: {
  point: any;
  className?: string;
}) {
  const key = getTsuboRegionKey(point);

  if (key === "head_neck") return <HeadNeckIcon className={className} />;
  if (key === "hand_wrist") return <HandWristIcon className={className} />;
  if (key === "foot_ankle") return <FootAnkleIcon className={className} />;
  if (key === "trunk") return <TrunkAbdomenIcon className={className} />;

  return <GenericBodyIcon className={className} />;
}
