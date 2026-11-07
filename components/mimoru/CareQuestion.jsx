"use client";
import { useId } from "react";
import { useMimoru, InlineMimoruChat } from "./MimoruProvider";
export default function CareQuestion({ item, forecastId, forecastRevision, targetDate, mode, symptomFocus, lifestyleScene, reason = "" }) {
  const m = useMimoru();
  const instanceId = useId();
  if (!m?.userId || !item?.item_key || !forecastId || item.kind === "owned_care_item") return null;
  const id = "mimoru-care-" + instanceId;
  return <div className="mt-2 w-full min-w-0 text-left" onClick={e => e.stopPropagation()} data-care-question>
    {reason ? <p className="mb-1 text-[12px] font-medium leading-6 text-slate-600" data-mimoru-care-reason>{reason}</p> : null}
    <button type="button" disabled={m.chat.sending} onClick={() => m.openChat({
      inlineId: id, prompt: "このケアについて教えて。生活に取り入れる工夫を相談したい。",
      context: { label: targetDate + "の「" + (item.meta?.consumed_name || item.label) + "」", request: { kind: "care", forecast_id: forecastId,
        target_date: targetDate, mode, ...(forecastRevision ? { forecast_revision: forecastRevision } : {}), symptom_focus: symptomFocus, lifestyle_scene: lifestyleScene || "general", item_key: item.canonical_key || item.item_key } },
    })} className="min-h-10 px-1 text-[11px] font-bold text-[#2F816E] underline underline-offset-4 disabled:opacity-50">このケアについて質問する</button>
    <InlineMimoruChat id={id} />
  </div>;
}

