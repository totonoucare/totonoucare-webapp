import { createElement as h } from "react";

export default function CareExplanationDetails({ explanation, title = "東洋医学での考え方と取り入れ方", tone = "#7B6588" }) {
  if (!explanation) return null;
  return h("details", { className: "mt-3 border-t border-current/10 pt-2 text-[12px] text-slate-600", "data-mimoru-care-explanation": explanation.item_key },
    h("summary", { className: "cursor-pointer py-1 font-bold leading-6", style: { color: tone } }, title),
    ...[["", explanation.theory], ["取り入れる加減", explanation.guidance], ["確かめること", explanation.check]].filter(([, text]) => text).map(([label, text]) =>
      h("div", { key: label || "theory", className: "mt-2" },
        label ? h("div", { className: "text-[11px] font-bold", style: { color: tone } }, label) : null,
        h("p", { className: "whitespace-pre-wrap break-words font-medium leading-6" }, text),
      )),
  );
}
