// components/ui/Card.jsx
import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className = "", ...props }) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-white ring-1 ring-[var(--ring)] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.05)] overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={cn("p-6 pb-4", className)} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h3 className={cn("text-[18px] font-black tracking-tight text-slate-900", className)} {...props} />
  );
}

export function CardDescription({ className = "", ...props }) {
  return (
    <p className={cn("mt-1.5 text-[13px] font-bold leading-relaxed text-slate-500", className)} {...props} />
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return <div className={cn("p-6 pt-0 flex items-center", className)} {...props} />;
}

export default Card;
