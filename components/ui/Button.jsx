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
  const base =
    "inline-flex items-center justify-center font-extrabold transition-all duration-200 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] " +
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

  const variants = {
    primary:
      "bg-[var(--accent)] text-white shadow-[0_14px_28px_-12px_rgba(53,95,82,0.44)] hover:bg-[var(--accent-ink)] hover:shadow-[0_18px_34px_-12px_rgba(53,95,82,0.5)]",
    secondary:
      "bg-white text-[#445364] ring-1 ring-inset ring-[color:var(--ring)] shadow-[0_8px_18px_-14px_rgba(40,55,48,0.18)] hover:bg-[#fafaf7] hover:text-slate-900",
    ghost:
      "bg-transparent text-[#617081] hover:bg-[color-mix(in_srgb,var(--mint),white_12%)] hover:text-slate-900",
    danger:
      "bg-rose-600 text-white shadow-[0_10px_20px_-8px_rgba(225,29,72,0.22)] hover:bg-rose-500",
  };

  const sizes = {
    sm: "h-9 rounded-[12px] px-4 text-[13px]",
    md: "h-12 rounded-[16px] px-6 text-[15px]",
    lg: "h-14 rounded-[20px] px-8 text-[16px]",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export default Button;


