export default function Card({ title, children, footer }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title ? <h3 className="mb-2 text-base font-semibold">{title}</h3> : null}
      <div className="text-sm text-slate-800">{children}</div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}
