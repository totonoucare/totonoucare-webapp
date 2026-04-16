// components/ui/Button.jsx
import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  // プレミアムな触り心地：タップ時に少し沈み込む（active:scale-[0.98]）
  const base =
    "inline-flex items-center justify-center font-extrabold transition-all duration-200 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] " +
    "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants = {
  primary:
    "bg-[var(--accent)] text-white shadow-[0_10px_20px_-10px_rgba(49,84,58,0.45)] hover:bg-[var(--accent-ink)] hover:shadow-[0_14px_24px_-10px_rgba(49,84,58,0.5)]",
  secondary:
    "bg-white text-slate-800 ring-1 ring-inset ring-[var(--ring)] shadow-sm hover:bg-slate-50 hover:text-slate-900",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
  danger:
    "bg-rose-600 text-white shadow-[0_8px_16px_-6px_rgba(225,29,72,0.2)] hover:bg-rose-500",
};

  const sizes = {
    // モバイルで押しやすい高さに調整し、角丸をリッチに
    sm: "h-9 px-4 text-[13px] rounded-[12px]",
    md: "h-12 px-6 text-[15px] rounded-[16px]",
    lg: "h-14 px-8 text-[16px] rounded-[20px]",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export default Button;
