"use client";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV", "GV"]);

const TSUBO_SKIN_ICON_COLOR = "#D59A86";

function getTsuboCodePrefix(point) {
  const code = String(point?.code || "").trim().toUpperCase();
  const match = code.match(/^[A-Z]+/);
  return match ? match[0] : "";
}

function getTsuboRegionKey(point) {
  const region = String(point?.point_region || "").trim();

  if (region === "head_neck") return "head_neck";
  if (region === "abdomen" || region === "chest_abdomen" || region === "trunk") return "trunk";

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
  if (key === "foot_ankle") return "脚・足首まわり";
  if (key === "trunk") return "体幹・お腹まわり";

  return "からだのツボ";
}

function IconFrame({ children, className }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      style={{ color: TSUBO_SKIN_ICON_COLOR }}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function HeadNeckIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M60,216 C76,200 100,188 104,155 C96,145 84,128 84,92 C84,60 104,40 128,40 C152,40 172,60 172,92 C172,128 160,145 152,155 C156,188 180,200 196,216"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60,216 C76,200 100,188 104,155 C96,145 84,128 84,92 C84,60 104,40 128,40 C152,40 172,60 172,92 C172,128 160,145 152,155 C156,188 180,200 196,216 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />
      <path
        d="M100,195 Q128,204 156,195"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function HandWristIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M96,224 L96,170 C96,155 80,145 72,132 C65,120 74,108 86,116 C96,122 104,136 108,146 L108,80 C108,70 122,70 122,80 L122,145 M126,120 L126,68 C126,58 140,58 140,68 L140,145 M144,120 L144,74 C144,64 158,64 158,74 L158,145 M162,130 L162,94 C162,84 176,84 176,94 L176,170 C176,190 160,224 160,224"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M96,224 L96,170 C96,155 80,145 72,132 C65,120 74,108 86,116 C96,122 104,136 108,146 L108,80 C108,70 122,70 122,80 L122,145 L126,145 L126,68 C126,58 140,58 140,68 L140,145 L144,145 L144,74 C144,64 158,64 158,74 L158,145 L162,145 L162,94 C162,84 176,84 176,94 L176,170 C176,190 160,224 160,224 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />
    </IconFrame>
  );
}

function FootAnkleIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M165,44 L165,115 C165,130 145,150 120,165 C95,178 72,185 60,192 C48,200 52,216 72,216 L192,216 C206,216 216,204 212,185 C206,160 195,125 195,44"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M165,44 L165,115 C165,130 145,150 120,165 C95,178 72,185 60,192 C48,200 52,216 72,216 L192,216 C206,216 216,204 212,185 C206,160 195,125 195,44 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />
      <path
        d="M172,150 A 8,8 0 0,1 172,166"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </IconFrame>
  );
}

function TrunkAbdomenIcon({ className }) {
  return (
    <IconFrame className={className}>
      <path
        d="M106,44 C95,44 72,55 60,70 C48,82 54,104 68,112 L74,116 C84,145 92,175 80,216 C76,226 84,232 96,232 L160,232 C172,232 180,226 176,216 C164,175 172,145 182,116 L188,112 C202,104 208,82 196,70 C184,55 161,44 150,44"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M106,44 C95,44 72,55 60,70 C48,82 54,104 68,112 L74,116 C84,145 92,175 80,216 C76,226 84,232 96,232 L160,232 C172,232 180,226 176,216 C164,175 172,145 182,116 L188,112 C202,104 208,82 196,70 C184,55 161,44 150,44 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />
      <path
        d="M84,80 Q128,95 172,80"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <circle cx={128} cy={170} r={6} fill="currentColor" fillOpacity={0.5} />
    </IconFrame>
  );
}

function GenericBodyIcon({ className }) {
  return (
    <IconFrame className={className}>
      <circle
        cx={128}
        cy={64}
        r={20}
        stroke="currentColor"
        strokeWidth={12}
      />
      <circle
        cx={128}
        cy={64}
        r={20}
        fill="currentColor"
        fillOpacity={0.08}
      />
      <path
        d="M88,114 C88,104 96,96 106,96 L150,96 C160,96 168,104 168,114 L168,170 L152,170 L152,224 C152,230 146,236 140,236 L116,236 C110,236 104,230 104,224 L104,170 L88,170 Z"
        stroke="currentColor"
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88,114 C88,104 96,96 106,96 L150,96 C160,96 168,104 168,114 L168,170 L152,170 L152,224 C152,230 146,236 140,236 L116,236 C110,236 104,230 104,224 L104,170 L88,170 Z"
        fill="currentColor"
        fillOpacity={0.08}
      />
    </IconFrame>
  );
}

export default function TsuboRegionIcon({ point, className = "h-8 w-8" }) {
  const key = getTsuboRegionKey(point);

  if (key === "head_neck") return <HeadNeckIcon className={className} />;
  if (key === "hand_wrist") return <HandWristIcon className={className} />;
  if (key === "foot_ankle") return <FootAnkleIcon className={className} />;
  if (key === "trunk") return <TrunkAbdomenIcon className={className} />;

  return <GenericBodyIcon className={className} />;
}
