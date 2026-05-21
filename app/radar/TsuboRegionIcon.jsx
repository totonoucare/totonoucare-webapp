"use client";

import React from "react";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV"]);
const TSUBO_HEAD_NECK_CODES = new Set(["GB20", "GV20"]);

const OUTLINE = "#7C5244";
const HAIR = "#68483D";
const SKIN_DEEP = "#9F684F";
const SKIN_LINE = "#B97A5F";

const strokeProps = {
  stroke: OUTLINE,
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
};

const softLineProps = {
  stroke: SKIN_DEEP,
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
};

function getTsuboCode(point) {
  return String(point?.code || "").trim().toUpperCase();
}

function getTsuboCodePrefix(point) {
  const match = getTsuboCode(point).match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getTsuboRegionKey(point) {
  const region = String(point?.point_region || "").trim();
  const code = getTsuboCode(point);

  if (region === "head_neck" || TSUBO_HEAD_NECK_CODES.has(code)) {
    return "head_neck";
  }

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

export function getTsuboRegionIconLabel(point) {
  const key = getTsuboRegionKey(point);

  if (key === "head_neck") return "頭・首まわり";
  if (key === "hand_wrist") return "手・手首まわり";
  if (key === "foot_ankle") return "足・足首まわり";
  if (key === "trunk") return "体幹・お腹まわり";

  return "からだのツボ";
}

function IconFrame({ children, className }) {
  const rawId = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  const bgId = `tsuboBg${rawId}`;
  const skinId = `tsuboSkin${rawId}`;
  const shadeId = `tsuboShade${rawId}`;
  const shadowId = `tsuboShadow${rawId}`;

  const paint = {
    bg: `url(#${bgId})`,
    skin: `url(#${skinId})`,
    shade: `url(#${shadeId})`,
    highlight: "#FFE8D7",
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
        <radialGradient id={bgId} cx="34%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FDF4EF" />
          <stop offset="100%" stopColor="#F5E2D8" />
        </radialGradient>

        <linearGradient
          id={skinId}
          x1="28"
          y1="18"
          x2="98"
          y2="118"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFE4D2" />
          <stop offset="50%" stopColor="#F2BF9E" />
          <stop offset="100%" stopColor="#D99773" />
        </linearGradient>

        <linearGradient
          id={shadeId}
          x1="46"
          y1="24"
          x2="98"
          y2="116"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#C88568" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8F5643" stopOpacity="0.5" />
        </linearGradient>

        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2"
            floodColor="#5F4035"
            floodOpacity="0.16"
          />
        </filter>
      </defs>

      <circle cx="64" cy="64" r="58" fill={paint.bg} />

      <g filter={`url(#${shadowId})`}>{children(paint)}</g>
    </svg>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="M49 72 L49 88 C43 97 31 103 18 116 H110 C97 103 85 97 79 88 V72 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M49 88 C56 97 72 97 79 88 C87 98 100 106 110 116 H18 C28 106 41 98 49 88 Z"
            fill={p.shade}
            opacity="0.62"
          />

          <path
            d="M40 50 C40 33 50 22 64 22 C78 22 88 33 88 50 C88 67 78 77 64 77 C50 77 40 67 40 50 Z"
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="M65 22 C79 23 88 34 88 50 C88 67 78 77 64 77 C71 70 75 60 75 50 C75 40 72 30 65 22 Z"
            fill={p.shade}
            opacity="0.44"
          />

          <path
            d="M39 45 C38 29 49 16 64 16 C80 16 90 29 89 45 C82 38 73 37 64 41 C54 37 46 38 39 45 Z"
            fill={HAIR}
            stroke={OUTLINE}
            strokeWidth="1.7"
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
            opacity="0.5"
          />
        </>
      )}
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="
              M50 119
              C43 110 40 100 40 88
              L40 78
              C34 74 28 69 24 63
              C20 57 24 50 30 50
              C34 50 38 54 43 60
              L49 67
              L49 31
              C49 25 56 25 56 31
              L56 63
              L58 20
              C58 13 66 13 66 20
              L66 62
              L68 24
              C68 17 76 17 76 24
              L76 65
              L78 34
              C78 28 85 28 85 34
              L85 78
              C89 86 90 95 87 104
              C84 114 76 119 64 119
              Z
            "
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="
              M76 38
              L78 78
              C81 90 78 105 66 118
              C78 118 85 112 88 103
              C91 94 89 86 85 78
              L85 34
              C85 29 79 28 78 34
              Z
            "
            fill={p.shade}
            opacity="0.44"
          />

          <path
            d="M56 62 V77 M66 62 V78 M76 66 V79"
            fill="none"
            {...strokeProps}
            opacity="0.42"
          />

          <path
            d="M40 80 C48 84 55 92 58 104"
            fill="none"
            {...softLineProps}
            opacity="0.5"
          />

          <path
            d="M51 80 C61 80 71 87 76 97"
            fill="none"
            {...softLineProps}
            opacity="0.42"
          />

          <path
            d="M31 59 C37 66 45 74 54 79"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.55"
          />
        </>
      )}
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="
              M70 12
              H94
              C93 31 89 51 89 68
              C89 80 97 90 97 102
              C97 113 88 119 76 118
              C68 118 64 115 56 116
              H32
              C24 116 23 109 31 105
              C48 96 64 83 70 65
              Z
            "
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="
              M88 13
              H94
              C93 31 89 51 89 68
              C89 80 97 90 97 102
              C97 113 88 119 76 118
              C68 117 64 113 66 106
              C70 92 80 82 80 67
              C80 50 85 32 88 13
              Z
            "
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
            d="M34 106 C31 109 29 112 29 115"
            fill="none"
            {...softLineProps}
            opacity="0.5"
          />

          <path
            d="M45 101 C41 105 38 109 37 115"
            fill="none"
            {...softLineProps}
            opacity="0.48"
          />

          <path
            d="M57 94 C53 101 50 108 50 115"
            fill="none"
            {...softLineProps}
            opacity="0.42"
          />

          <path
            d="M72 54 C74 68 70 82 61 93"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.58"
          />
        </>
      )}
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <path
            d="
              M51 16
              H77
              C90 17 101 23 108 32
              C110 36 103 45 94 49
              C90 63 88 76 88 88
              C88 101 96 109 98 118
              H30
              C32 109 40 101 40 88
              C40 76 38 63 34 49
              C25 45 18 36 20 32
              C27 23 38 17 51 16
              Z
            "
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="
              M33 118
              C37 109 43 101 43 89
              C43 72 38 58 34 49
              C29 47 24 42 22 37
              C29 57 47 78 48 94
              C48 106 39 114 33 118
              Z
            "
            fill={p.shade}
            opacity="0.42"
          />

          <path
            d="
              M95 118
              C91 109 85 101 85 89
              C85 72 90 58 94 49
              C99 47 104 42 106 37
              C99 57 81 78 80 94
              C80 106 89 114 95 118
              Z
            "
            fill={p.shade}
            opacity="0.42"
          />

          <path
            d="M38 50 C49 56 59 56 64 56 C69 56 79 56 90 50"
            fill="none"
            {...strokeProps}
            opacity="0.26"
          />

          <path
            d="M64 60 V110"
            fill="none"
            stroke={SKIN_LINE}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.56"
          />

          <circle cx="64" cy="92" r="3.2" fill={SKIN_DEEP} opacity="0.72" />

          <path
            d="M59 69 C54 76 53 84 54 91"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.45"
          />

          <path
            d="M69 69 C74 76 75 84 74 91"
            fill="none"
            stroke={p.highlight}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.38"
          />
        </>
      )}
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      {(p) => (
        <>
          <circle cx="64" cy="23" r="11" fill={p.skin} {...strokeProps} />

          <path
            d="
              M52 39
              H76
              C87 39 100 45 106 53
              C110 59 104 65 98 60
              L85 49
              V76
              L93 113
              C95 121 84 123 80 116
              L64 88
              L48 116
              C44 123 33 121 35 113
              L43 76
              V49
              L30 60
              C24 65 18 59 22 53
              C28 45 41 39 52 39
              Z
            "
            fill={p.skin}
            {...strokeProps}
          />

          <path
            d="
              M64 39
              H76
              C87 39 100 45 106 53
              C110 59 104 65 98 60
              L85 49
              V76
              L93 113
              C95 121 84 123 80 116
              L64 88
              Z
            "
            fill={p.shade}
            opacity="0.42"
          />

          <path
            d="M64 43 V85"
            fill="none"
            stroke={SKIN_LINE}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity="0.4"
          />
        </>
      )}
    </IconFrame>
  );
}

export default function TsuboRegionIcon({
  point,
  className = "h-8 w-8",
}) {
  const key = getTsuboRegionKey(point);

  if (key === "head_neck") {
    return <HeadNeckIcon className={className} />;
  }

  if (key === "hand_wrist") {
    return <HandWristIcon className={className} />;
  }

  if (key === "foot_ankle") {
    return <FootAnkleIcon className={className} />;
  }

  if (key === "trunk") {
    return <TrunkAbdomenIcon className={className} />;
  }

  return <GenericBodyIcon className={className} />;
}
