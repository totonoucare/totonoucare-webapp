"use client";

const GREEN = "#1F6F5C";
const GREEN_2 = "#2F6F5F";
const MINT = "#DDF4EC";
const MINT_2 = "#EEF7F2";
const GOLD = "#D9AE3E";
const GOLD_2 = "#D9AB3E";
const CREAM = "#FFF3CF";
const CREAM_2 = "#FBF8ED";
const WARN = "#FFF4E3";

function Svg({ className = "h-7 w-7", children, ...props }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" role="img" {...props}>
      {children}
    </svg>
  );
}

export function IconCheck({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <circle cx="32" cy="32" r="24" fill={MINT} />
      <path d="m21 32 7 7 16-18" fill="none" stroke={GREEN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconKarte({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={CREAM_2} />
      <path d="M22 17h15l8 8v22H22z" fill="#fff" stroke={GREEN_2} strokeWidth="3" strokeLinejoin="round" />
      <path d="M37 17v9h8" fill="none" stroke={GREEN_2} strokeWidth="3" strokeLinejoin="round" />
      <path d="M27 34h13M27 41h10" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function IconRadar({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill="#EDF7F4" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#7BC4B3" strokeWidth="4" />
      <path d="M32 13v7M32 44v7M13 32h7M44 32h7" stroke={GREEN_2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 32l10-6" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill={GOLD} />
    </Svg>
  );
}

export function IconCare({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={MINT_2} />
      <path d="M20 38c7 7 17 7 24 0" fill="none" stroke={GREEN_2} strokeWidth="4" strokeLinecap="round" />
      <path d="M25 28c0-5 7-8 7-13 0 5 7 8 7 13 0 4-3 8-7 8s-7-4-7-8z" fill="#D8E9E1" stroke={GREEN_2} strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 46h28" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function IconNotify({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill="#F0F7F4" />
      <path d="M21 42h22l-3-5v-9c0-5-3-9-8-9s-8 4-8 9v9z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M28 46c1 3 7 3 8 0" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M45 17l4-4M19 17l-4-4" stroke="#7BC4B3" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function IconSign({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={WARN} />
      <path d="M32 16l18 32H14z" fill="#fff" stroke={GOLD} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M32 27v9" stroke={GREEN_2} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="43" r="2.7" fill={GREEN_2} />
    </Svg>
  );
}

export function IconLive({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="10" y="26" width="44" height="28" rx="8" fill={MINT} />
      <path d="M16 30 32 17l16 13v22H16V30Z" fill="#fff" stroke={GREEN} strokeWidth="4" strokeLinejoin="round" />
      <path d="M28 52V38h8v14" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconEat({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <circle cx="32" cy="32" r="24" fill={CREAM} />
      <path d="M20 35h24a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10Z" fill="#fff" stroke={GREEN} strokeWidth="4" />
      <path d="M26 23c-4-5 4-6 0-11M36 23c-4-5 4-6 0-11" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPoint({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <circle cx="32" cy="32" r="24" fill="#E8F8F2" />
      <path d="M22 14c2 13 2 24-4 35M42 14c-2 13-2 24 4 35" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="6" fill={GOLD_2} />
      <path d="M25 45h14" stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconHome({ className = "h-7 w-7", ...props }) {
  return <IconLive className={className} {...props} />;
}

export function IconSettings({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill="#F0F7F4" />
      <circle cx="32" cy="32" r="8" fill="#fff" stroke={GREEN_2} strokeWidth="4" />
      <path d="M32 14v6M32 44v6M14 32h6M44 32h6M19.3 19.3l4.2 4.2M40.5 40.5l4.2 4.2M44.7 19.3l-4.2 4.2M23.5 40.5l-4.2 4.2" stroke={GREEN_2} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill={GOLD} />
    </Svg>
  );
}

export function IconHistory({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={MINT_2} />
      <circle cx="32" cy="32" r="15" fill="#fff" stroke={GREEN_2} strokeWidth="4" />
      <path d="M32 23v10l7 5" fill="none" stroke={GREEN_2} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 18l-4 1 1-4" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconMemo({ className = "h-7 w-7", ...props }) {
  return <IconKarte className={className} {...props} />;
}

export function IconAnalysis({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={CREAM_2} />
      <path d="M20 17h22v28H20z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M25 27h12M25 34h8" stroke={GREEN_2} strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="42" r="7" fill="#DDF4EC" stroke={GREEN_2} strokeWidth="3" />
      <path d="M47 47l5 5" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconBody({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={MINT_2} />
      <circle cx="32" cy="19" r="7" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" />
      <path d="M20 50v-9c0-8 5-14 12-14s12 6 12 14v9" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 28v20" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 6" />
      <circle cx="32" cy="38" r="3" fill={GOLD} />
    </Svg>
  );
}

export function IconLocation({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill="#F0F7F4" />
      <path d="M32 51s14-11 14-25a14 14 0 1 0-28 0c0 14 14 25 14 25z" fill="#fff" stroke={GREEN_2} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="32" cy="26" r="5" fill={GOLD} />
    </Svg>
  );
}

export function IconMap({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={CREAM_2} />
      <path d="M18 20l10-4 10 4 8-3v28l-10 4-10-4-8 3z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M28 16v29M38 20v29" stroke="#7BC4B3" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill={GOLD} />
    </Svg>
  );
}

export function IconInfo({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <circle cx="32" cy="32" r="24" fill={MINT} />
      <path d="M32 29v14" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="21" r="3" fill={GREEN} />
    </Svg>
  );
}

export function IconSave({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={MINT_2} />
      <path d="M20 18h20l6 6v22H20z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M26 18v12h13V18" fill="#DDF4EC" stroke={GREEN_2} strokeWidth="3" strokeLinejoin="round" />
      <path d="M27 43h14" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function IconLock({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={WARN} />
      <rect x="19" y="29" width="26" height="18" rx="5" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" />
      <path d="M24 29v-6c0-5 3.5-9 8-9s8 4 8 9v6" fill="none" stroke={GREEN_2} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="38" r="3" fill={GOLD} />
    </Svg>
  );
}

export function IconMessage({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={MINT_2} />
      <path d="M18 20h28v20H31l-9 7v-7h-4z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M25 29h14M25 36h9" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function IconTarget({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <circle cx="32" cy="32" r="24" fill={MINT} />
      <circle cx="32" cy="32" r="15" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" />
      <circle cx="32" cy="32" r="7" fill="#fff" stroke="#7BC4B3" strokeWidth="3" />
      <circle cx="32" cy="32" r="3" fill={GOLD} />
    </Svg>
  );
}

export function IconSpark({ className = "h-7 w-7", ...props }) {
  return (
    <Svg className={className} {...props}>
      <rect x="6" y="6" width="52" height="52" rx="18" fill={CREAM_2} />
      <path d="M32 14l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fff" stroke={GREEN_2} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M48 15l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={GOLD} />
    </Svg>
  );
}

export function IconChevron({ className = "h-5 w-5 transition-transform group-open:rotate-180", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export const IconWeather = IconRadar;
export const IconCalendar = IconLive;
export const IconBowl = IconEat;
export const IconTsubo = IconPoint;
export const IconForecast = IconRadar;
export const IconSignal = IconSign;
