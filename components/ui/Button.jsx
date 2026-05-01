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
      "bg-[var(--accent)] text-white shadow-[0_12px_22px_-10px_rgba(49,115,100,0.42)] hover:bg-[var(--accent-ink)] hover:shadow-[0_16px_28px_-10px_rgba(49,115,100,0.48)]",
    secondary:
      "bg-white text-[#4f5968] ring-1 ring-inset ring-[color:var(--ring)] shadow-sm hover:bg-[#fafaf7] hover:text-slate-900",
    ghost:
      "bg-transparent text-[#6b7481] hover:bg-[color-mix(in_srgb,var(--mint),white_12%)] hover:text-slate-900",
    danger:
      "bg-rose-600 text-white shadow-[0_8px_16px_-6px_rgba(225,29,72,0.2)] hover:bg-rose-500",
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


