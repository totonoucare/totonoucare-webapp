export default function CareStepCard({ action, actionButton }) {
  if (!action) return null;
  const short = action.short_action || action.label;
  return (
    <div className="mt-3 rounded-[17px] bg-white px-4 py-3 ring-1 ring-[#E1E6E1]">
      <div className="mb-2 text-[12px] font-black leading-5 text-[#2F816E]">{[action.kind_label, action.scene].filter(Boolean).join(" · ")}</div>
      <p className="text-[15px] font-extrabold leading-7 text-slate-700">{short}</p>
      {action.continuity_note ? <p className="mt-2 text-[13px] font-bold leading-6 text-[#2F816E]">{action.continuity_note}</p> : null}
      {action.felt_sense ? <div className="mt-3 rounded-[14px] bg-[#F4FAF7] px-3 py-2 text-[13px] font-bold leading-6 text-slate-600"><span className="font-black text-[#2F816E]">確かめること　</span>{action.felt_sense}</div> : null}
      {(short !== action.label || action.reason || action.reset) ? (
        <details className="mt-3 text-[13px] font-bold leading-6 text-slate-500">
          <summary className="cursor-pointer text-[#2F816E]">やり方と選んだ理由</summary>
          {short !== action.label ? <p className="mt-2">{action.label}</p> : null}
          {action.reason ? <p className="mt-2">{action.reason}</p> : null}
          {action.reset ? <p className="mt-2">{action.reset}</p> : null}
        </details>
      ) : null}
      <div className="mt-3 flex justify-end">{actionButton}</div>
    </div>
  );
}
