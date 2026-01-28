// components/ui/Card.jsx
import React from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className = "", ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={cn("p-4 pb-0", className)} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900", className)} {...props} />
  );
}

export function CardDescription({ className = "", ...props }) {
  return (
    <p className={cn("text-sm text-slate-600", className)} {...props} />
  );
}

export function CardContent({ className = "", ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className = "", ...props }) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

// default export も追加
export default Card;
