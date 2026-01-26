export default function Toast({ open, message, variant = "info" }) {
  if (!open) return null;

  const base =
    "fixed bottom-4 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg";

  const styles = {
    info: "bg-white border-slate-200 text-slate-900",
    success: "bg-white border-slate-200 text-slate-900",
    error: "bg-white border-slate-200 text-slate-900",
  };

  return (
    <div className={`${base} ${styles[variant] || styles.info}`}>
      {message}
    </div>
  );
}
