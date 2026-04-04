// components/ui/Toast.jsx
"use client";

export default function Toast({ open, message, variant = "info" }) {
  if (!open) return null;

  // 上部からフワッと降りてくる、ダークトーンの美しいカプセル
  const base =
    "fixed top-6 left-1/2 z-[100] flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3.5 text-[14px] font-extrabold shadow-[0_16px_32px_-12px_rgba(0,0,0,0.3)] transition-all duration-300 animate-in fade-in slide-in-from-top-4";

  const styles = {
    info: "bg-slate-900/95 backdrop-blur-md text-white ring-1 ring-white/10",
    success: "bg-[#065f46]/95 backdrop-blur-md text-[#34d399] ring-1 ring-[#047857]",
    error: "bg-[#7f1d1d]/95 backdrop-blur-md text-[#fca5a5] ring-1 ring-[#991b1b]",
  };

  return (
    <div className={`${base} ${styles[variant] || styles.info}`}>
      {variant === "success" && (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      )}
      {variant === "error" && (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      )}
      {variant === "info" && (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 opacity-70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      )}
      <span>{message}</span>
    </div>
  );
}
