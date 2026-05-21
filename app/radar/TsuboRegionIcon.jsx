"use client";

import { useId } from "react";

const TSUBO_HAND_PREFIXES = new Set(["LI", "LU", "PC", "HT", "SI", "TE"]);
const TSUBO_FOOT_PREFIXES = new Set(["ST", "SP", "LR", "GB", "KI", "BL"]);
const TSUBO_TRUNK_PREFIXES = new Set(["CV", "GV"]);

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
  if (key === "foot_ankle") return "足・足首まわり";
  if (key === "trunk") return "体幹・お腹まわり";
  return "からだのツボ";
}

const SKIN = {
  light: "#F8DDC4",
  base: "#EDC29E",
  shade: "#D79A73",
  deep: "#B97855",
  blush: "#F3C6AA",
  outline: "#C58A66",
};

function IconSvg({ children, className, label }) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <rect x="3" y="3" width="90" height="90" rx="25" fill="#FFFDF9" />
      <rect
        x="4"
        y="4"
        width="88"
        height="88"
        rx="24"
        fill="none"
        stroke="#E5EFE8"
        strokeWidth="3"
      />
      {children}
    </svg>
  );
}

function SvgDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-skin`} x1="22" y1="14" x2="74" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={SKIN.light} />
        <stop offset="0.58" stopColor={SKIN.base} />
        <stop offset="1" stopColor={SKIN.shade} />
      </linearGradient>
      <linearGradient id={`${id}-shadow`} x1="34" y1="14" x2="68" y2="86" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={SKIN.blush} stopOpacity="0.3" />
        <stop offset="1" stopColor={SKIN.deep} stopOpacity="0.48" />
      </linearGradient>
    </defs>
  );
}

function HandWristIcon({ className }) {
  const id = useId().replaceAll(":", "");
  return (
    <IconSvg className={className} label="手・手首まわり">
      <SvgDefs id={id} />
      {/* wrist */}
      <path
        d="M37 76h27c2.8 0 5 2.2 5 5v8H32v-8c0-2.8 2.2-5 5-5Z"
        fill={`url(#${id}-skin)`}
      />
      <path d="M33 80h36v7H33z" fill={SKIN.shade} opacity="0.22" />

      {/* palm */}
      <path
        d="M29 38c0-7.5 6.1-13.5 13.6-13.5h11.9c8.4 0 15.3 6.8 15.3 15.2v26.6c0 8.7-7 15.7-15.7 15.7H43.4C35.4 82 29 75.6 29 67.6V38Z"
        fill={`url(#${id}-skin)`}
      />

      {/* fingers: five visible rounded digits */}
      <rect x="31.5" y="15" width="8.8" height="31" rx="4.4" fill={`url(#${id}-skin)`} />
      <rect x="41" y="10" width="9.2" height="36" rx="4.6" fill={`url(#${id}-skin)`} />
      <rect x="51" y="12" width="9" height="34" rx="4.5" fill={`url(#${id}-skin)`} />
      <rect x="60.5" y="18" width="8.2" height="28" rx="4.1" fill={`url(#${id}-skin)`} />

      {/* thumb */}
      <path
        d="M29.5 49.5 21 43.8c-3.4-2.3-4.3-6.9-2-10.3 2.4-3.5 7.2-4.2 10.5-1.6l10.2 8.1-10.2 9.5Z"
        fill={`url(#${id}-skin)`}
      />

      {/* soft shadows */}
      <path
        d="M61.5 42c4.9 4.8 7.8 11.8 7.8 20.1 0 9.5-6.4 18.5-16 20H64c7.2 0 13-5.8 13-13V42c0-7.5-4.9-13.8-11.6-16 .8 5.5-.2 11.2-3.9 16Z"
        fill={`url(#${id}-shadow)`}
      />
      <path
        d="M30.5 49.8c4.5 4.5 8.5 5.8 12.4 4.9"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.35"
      />
      {[36, 46, 56, 65].map((x) => (
        <path
          key={x}
          d={`M${x} 47v20`}
          stroke={SKIN.outline}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.18"
        />
      ))}
    </IconSvg>
  );
}

function FootAnkleIcon({ className }) {
  const id = useId().replaceAll(":", "");
  return (
    <IconSvg className={className} label="足・足首まわり">
      <SvgDefs id={id} />
      {/* lower leg */}
      <path
        d="M41 11h22c1.8 0 3.1 1.6 2.8 3.4l-6 37.5c-.9 5.7 1.2 11.5 5.5 15.3l2.6 2.3H42.4l2.4-7c2.1-6.2 2.3-12.8.5-19.1L38.2 14.7c-.4-1.9 1-3.7 2.8-3.7Z"
        fill={`url(#${id}-skin)`}
      />

      {/* ankle + heel + foot silhouette */}
      <path
        d="M43.5 58.2c5.6 3.3 13.1 3.3 19.2 0 2.1 7.2 6.6 11.5 14 14.2l6.5 2.3c4.7 1.7 7.5 6.3 6.5 11.1-.7 3.3-3.7 5.7-7.1 5.7H22.5c-5.7 0-9.8-5.5-8.2-10.9.9-3.2 3.6-5.6 7-6.3l10.5-2.2c6.5-1.4 10.2-6.1 11.7-13.9Z"
        fill={`url(#${id}-skin)`}
      />

      {/* instep and arch shading */}
      <path
        d="M56.5 63.5c3.5 7.2 10.3 12 20.4 14.3 4.8 1.1 7.4 4.1 7.7 8.6H52.9c7.5-5.5 8.7-13.1 3.6-22.9Z"
        fill={`url(#${id}-shadow)`}
      />
      <path
        d="M20.5 81.5c8.8 1.2 17.1-.6 24.7-5.4 9.1 8.3 22.3 11.2 39.4 8.8"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.25"
      />

      {/* ankle bone and toe bumps */}
      <circle cx="59" cy="64" r="4.6" fill={SKIN.deep} opacity="0.22" />
      {[76, 81, 85].map((x, i) => (
        <circle key={x} cx={x} cy={83.8 + i * 0.2} r={2.2 - i * 0.2} fill={SKIN.deep} opacity="0.18" />
      ))}
    </IconSvg>
  );
}

function TrunkAbdomenIcon({ className }) {
  const id = useId().replaceAll(":", "");
  return (
    <IconSvg className={className} label="体幹・お腹まわり">
      <SvgDefs id={id} />
      {/* neck */}
      <path
        d="M38.5 10h19v16.5c0 5.2-4.2 9.5-9.5 9.5s-9.5-4.3-9.5-9.5V10Z"
        fill={`url(#${id}-skin)`}
      />
      {/* shoulders, chest, abdomen and waist as one clear trunk silhouette */}
      <path
        d="M28 25.8c8 5.6 14.7 8.3 20 8.3s12-2.7 20-8.3c10.2 3.8 17.4 12.8 18.7 23.6l4 32.9c.7 5.5-3.6 10.4-9.2 10.4h-67c-5.6 0-9.9-4.9-9.2-10.4l4-32.9C10.6 38.6 17.8 29.6 28 25.8Z"
        fill={`url(#${id}-skin)`}
      />
      {/* soft abdomen plane */}
      <path
        d="M16.2 52c8.9 7.5 19.5 11.2 31.8 11.2S71.4 59.5 80.3 52l3.5 28.7c.4 3.4-2.2 6.3-5.6 6.3H17.8c-3.4 0-6-2.9-5.6-6.3L16.2 52Z"
        fill={`url(#${id}-shadow)`}
        opacity="0.72"
      />
      {/* side waist shadows */}
      <path
        d="M22.5 42c4.6 13.6 4.7 29.8.3 48"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d="M73.5 42c-4.6 13.6-4.7 29.8-.3 48"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.18"
      />
      {/* minimal center line and navel to read as front abdomen */}
      <path
        d="M48 48c-2.2 10.5-2.2 22.7 0 33.5"
        stroke={SKIN.outline}
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.15"
      />
      <ellipse cx="48" cy="72" rx="3.4" ry="2.1" fill={SKIN.deep} opacity="0.28" />
      <path
        d="M30.5 35.2c5.5 4.3 11.3 6.4 17.5 6.4s12-2.1 17.5-6.4"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.12"
      />
    </IconSvg>
  );
}

function HeadNeckIcon({ className }) {
  const id = useId().replaceAll(":", "");
  return (
    <IconSvg className={className} label="頭・首まわり">
      <SvgDefs id={id} />
      {/* head */}
      <path
        d="M48 9c16.3 0 28.5 13.5 28.5 31.2 0 13.4-6.3 25.7-16.3 30.9-7.5 3.9-16.9 3.9-24.4 0-10-5.2-16.3-17.5-16.3-30.9C19.5 22.5 31.7 9 48 9Z"
        fill={`url(#${id}-skin)`}
      />
      <path
        d="M65.2 23.3c4.8 12.5 2.3 28-6.7 39.8-5 6.6-11.6 10.3-19.8 11.2 7.3 2.5 15.7 2 22.3-1.6C71 67.2 77.1 54.2 76.5 40.2c-.4-7.6-2.9-14.2-6.9-19.4-1.4.8-2.9 1.6-4.4 2.5Z"
        fill={`url(#${id}-shadow)`}
      />
      {/* neck and shoulders */}
      <path
        d="M37.8 67.2h20.4v12.3c0 4.9 3.1 9.2 7.7 10.7l11.6 3.8H18.5l11.6-3.8c4.6-1.5 7.7-5.8 7.7-10.7V67.2Z"
        fill={`url(#${id}-skin)`}
      />
      <path
        d="M37.8 70c5.7 4.5 14.7 4.6 20.4 0v7.4c-6.1 4.3-14.3 4.3-20.4 0V70Z"
        fill={SKIN.shade}
        opacity="0.3"
      />
      <path
        d="M18.5 94c8-10.4 18-15.6 29.5-15.6S69.5 83.6 77.5 94h-59Z"
        fill={SKIN.light}
      />
      <path
        d="M29.5 69.5c8.8 8.7 28.2 8.7 37 0"
        fill="none"
        stroke={SKIN.outline}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.2"
      />
    </IconSvg>
  );
}

function GenericBodyIcon({ className }) {
  const id = useId().replaceAll(":", "");
  return (
    <IconSvg className={className} label="からだのツボ">
      <SvgDefs id={id} />
      <circle cx="48" cy="19" r="12" fill={`url(#${id}-skin)`} />
      <path
        d="M31 36c8-5.2 26-5.2 34 0 5.2 3.4 8.3 9 8.8 15.2L76 83H20l2.2-31.8C22.7 45 25.8 39.4 31 36Z"
        fill={`url(#${id}-skin)`}
      />
      <path d="M48 31c12 .8 20 8.1 24 21.8L76 83H48V31Z" fill={`url(#${id}-shadow)`} />
    </IconSvg>
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

