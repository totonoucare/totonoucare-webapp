// components/illust/icons/app.jsx
"use client";

function baseProps(className, props) {
  return {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.15",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    ...props,
  };
}

function IconShell({ className = "h-6 w-6", children, ...props }) {
  return <svg {...baseProps(className, props)}>{children}</svg>;
}

export function IconHome({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M3.5 10.8 12 4l8.5 6.8" />
      <path d="M5.5 10.5v9h13v-9" />
      <path d="M9.5 19.5v-5h5v5" />
    </IconShell>
  );
}

export function IconKarte({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <rect x="5" y="4" width="14" height="17" rx="3.2" fill="currentColor" fillOpacity="0.12" stroke="none" />
      <rect x="5" y="4" width="14" height="17" rx="3.2" />
      <path d="M9 4V2.8M15 4V2.8" />
      <path d="M8.5 10.2h7" />
      <path d="M8.5 14h3.2" />
      <path d="M13.2 15.2l1.5 1.5 3-3.3" strokeWidth="2.35" />
    </IconShell>
  );
}

export function IconRadar({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="9.2" opacity="0.36" />
      <circle cx="12" cy="12" r="5.2" opacity="0.36" />
      <path d="M12 12V3" />
      <path d="M12 12l6.3-6.3" strokeDasharray="1 3" />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

export function IconWeather({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="8.2" cy="8" r="3.1" fill="currentColor" fillOpacity="0.12" />
      <path d="M8.2 2.8v1.2M8.2 12v1.2M3 8h1.2M12.2 8h1.2" opacity="0.82" />
      <path d="M16.2 6.5c1.5 1.8 3.3 4.6 3.3 7.2a3.4 3.4 0 0 1-6.8 0c0-2.6 2-5.4 3.5-7.2Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M4.5 18.5c1.8-1 3.6-1 5.4 0s3.6 1 5.4 0 3.2-.9 4.2-.3" opacity="0.82" />
    </IconShell>
  );
}

export function IconCare({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M12 3.4l1.2 4.2L17.5 9l-4.3 1.4L12 14.6l-1.2-4.2L6.5 9l4.3-1.4L12 3.4Z" fill="currentColor" fillOpacity="0.14" />
      <path d="M18 15l.7 2.1L21 18l-2.3.9L18 21l-.7-2.1L15 18l2.3-.9L18 15Z" fill="currentColor" stroke="none" />
      <path d="M6.5 16.5c1.6 2.4 3.3 3.4 5.5 3.4 1.3 0 2.5-.4 3.5-1.2" opacity="0.75" />
    </IconShell>
  );
}

export function IconCheck({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <circle cx="12" cy="12" r="8.8" />
      <path d="M8.2 12.2l2.4 2.5 5.3-5.8" strokeWidth="2.45" />
    </IconShell>
  );
}

export function IconLifestyle({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M4.5 11.2 12 5l7.5 6.2" />
      <path d="M6.2 10.5v9h11.6v-9" fill="currentColor" fillOpacity="0.08" />
      <path d="M9.2 19.5v-5h5.6v5" />
      <path d="M16.7 5.8h1.9v3.8" opacity="0.75" />
      <path d="M8.4 8.4c1.4-.8 2.6-.8 3.6 0" opacity="0.6" />
    </IconShell>
  );
}

export function IconFood({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M4.5 11.5h15v2.2a7.5 7.5 0 0 1-15 0v-2.2Z" fill="currentColor" fillOpacity="0.12" stroke="none" />
      <path d="M4.5 11.5h15v2.2a7.5 7.5 0 0 1-15 0v-2.2Z" />
      <path d="M8.2 5.2c.9.9.9 1.8 0 2.7M12 4.5c.9 1 .9 2 0 3M15.8 5.2c-.9.9-.9 1.8 0 2.7" opacity="0.75" />
    </IconShell>
  );
}

export function IconTsubo({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M8.8 10.8V5.9a1.35 1.35 0 0 1 2.7 0v5.2" />
      <path d="M11.5 10.7V4.9a1.35 1.35 0 0 1 2.7 0v6" />
      <path d="M14.2 11.1V6.4a1.35 1.35 0 0 1 2.7 0v7.2" />
      <path d="M8.8 11.8 7.5 10.7a1.35 1.35 0 0 0-1.9 1.9l4.1 5.1a5.2 5.2 0 0 0 4.1 2h1.1a4.4 4.4 0 0 0 4.4-4.4v-4.4a1.35 1.35 0 0 0-2.7 0v2.5" />
      <circle cx="13.2" cy="14.2" r="1.45" fill="currentColor" stroke="none" />
      <path d="M13.2 11.5v5.4M10.5 14.2h5.4" opacity="0.45" strokeWidth="1.65" />
    </IconShell>
  );
}

export function IconBody({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="5.5" r="2.8" fill="currentColor" fillOpacity="0.1" />
      <path d="M7 21v-6.2c0-3 2-5.2 5-5.2s5 2.2 5 5.2V21" fill="currentColor" fillOpacity="0.06" />
      <path d="M12 9.5v11" strokeDasharray="2 3" opacity="0.75" />
      <circle cx="12" cy="15" r="1.8" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

export function IconMemo({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="3" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <rect x="5" y="3.5" width="14" height="17" rx="3" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" />
    </IconShell>
  );
}

export function IconAnalysis({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <rect x="4" y="4" width="12" height="15.5" rx="3" fill="currentColor" fillOpacity="0.08" stroke="none" />
      <rect x="4" y="4" width="12" height="15.5" rx="3" />
      <path d="M7.5 8.5h5M7.5 12h3" />
      <circle cx="16" cy="15.8" r="3.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M18.6 18.4 21 20.8" />
    </IconShell>
  );
}

export function IconLocation({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" fill="currentColor" fillOpacity="0.1" />
      <circle cx="12" cy="10" r="2.4" />
    </IconShell>
  );
}

export function IconHistory({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.5v5l3.2 2" />
    </IconShell>
  );
}

export function IconSettings({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M19.2 14.6a1.6 1.6 0 0 0 .32 1.76l.03.03a2 2 0 0 1-2.83 2.83l-.03-.03a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.47v.08a2 2 0 0 1-4 0v-.08a1.6 1.6 0 0 0-.97-1.47 1.6 1.6 0 0 0-1.76.32l-.03.03a2 2 0 0 1-2.83-2.83l.03-.03a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.47-.97h-.08a2 2 0 0 1 0-4h.08a1.6 1.6 0 0 0 1.47-.97 1.6 1.6 0 0 0-.32-1.76l-.03-.03a2 2 0 0 1 2.83-2.83l.03.03a1.6 1.6 0 0 0 1.76.32 1.6 1.6 0 0 0 .97-1.47v-.08a2 2 0 0 1 4 0v.08a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.76-.32l.03-.03a2 2 0 0 1 2.83 2.83l-.03.03a1.6 1.6 0 0 0-.32 1.76 1.6 1.6 0 0 0 1.47.97h.08a2 2 0 0 1 0 4h-.08a1.6 1.6 0 0 0-1.47.97Z" opacity="0.92" />
    </IconShell>
  );
}

export function IconInfo({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11.5v5" />
      <circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none" />
    </IconShell>
  );
}

export function IconPlus({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 8v8M8 12h8" />
    </IconShell>
  );
}

export function IconChevron({ className = "h-5 w-5", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M9 18l6-6-6-6" />
    </IconShell>
  );
}

export function IconSignal({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M13 2.8 4.5 13.5h6.3L9.5 21.2l9-10.9h-6.3L13 2.8Z" fill="currentColor" fillOpacity="0.12" />
    </IconShell>
  );
}

export function IconSave({ className = "h-6 w-6", ...props }) {
  return (
    <IconShell className={className} {...props}>
      <path d="M6 4.5h12v16l-6-3.4-6 3.4v-16Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M9 9h6M9 12.5h4" />
    </IconShell>
  );
}

export function AppIcon({ name, className = "h-6 w-6", ...props }) {
  const icons = {
    home: IconHome,
    karte: IconKarte,
    check: IconCheck,
    radar: IconRadar,
    forecast: IconRadar,
    weather: IconWeather,
    care: IconCare,
    policy: IconCare,
    lifestyle: IconLifestyle,
    live: IconLifestyle,
    food: IconFood,
    eat: IconFood,
    tsubo: IconTsubo,
    point: IconTsubo,
    body: IconBody,
    memo: IconMemo,
    analysis: IconAnalysis,
    location: IconLocation,
    history: IconHistory,
    settings: IconSettings,
    info: IconInfo,
    plus: IconPlus,
    chevron: IconChevron,
    signal: IconSignal,
    bolt: IconSignal,
    save: IconSave,
  };
  const Icon = icons[name] || IconInfo;
  return <Icon className={className} {...props} />;
}

// Backward-compatible aliases used in older pages.
export const IconChecklist = IconCare;
export const IconConstitution = IconKarte;
export const IconSpark = IconCare;
export const IconForecast = IconRadar;
export const IconCalendar = IconLifestyle;
export const IconBodyLine = IconBody;
export const IconBowl = IconFood;
export const IconCloud = IconWeather;
export const IconCompass = IconCare;
export const IconBolt = IconSignal;
export const IconRipple = IconTsubo;
export const IconResult = IconKarte;
export const IconRobot = IconAnalysis;
