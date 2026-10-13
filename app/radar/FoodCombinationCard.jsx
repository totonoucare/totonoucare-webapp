import { createElement as h } from "react";

// A pair is a proposal; the existing action controls record each ingredient.
export default function FoodCombinationCard({ card, actions = [], renderAction }) {
  const proposal = card.proposal;
  if (!proposal) return null;
  const names = proposal.focus_ingredients || card.items || [];
  return h("div", { className: "mt-3 rounded-[18px] bg-[#FFF5E6] p-3.5 ring-1 ring-[#F1E5D1]" },
    h("div", { className: "text-[11px] font-bold text-[#9A6B20]" }, "取り入れたい組み合わせ"),
    h("div", { className: "mt-1 text-[17px] font-black leading-7 text-slate-800" }, names.join(" ＋ ")),
    h("div", { className: "mt-3 rounded-[14px] bg-white/85 px-3 py-2.5" },
      h("div", { className: "text-[11px] font-bold text-[#9A6B20]" }, "この2つを使う料理例"),
      h("div", { className: "mt-1 text-[14px] font-bold leading-6 text-slate-800" }, proposal.meal_example),
      proposal.preparation ? h("p", { className: "mt-1 text-[12px] font-medium leading-6 text-slate-600" }, proposal.preparation) : null,
    ),
    h("p", { className: "mt-3 text-[12px] font-medium leading-6 text-slate-600" }, proposal.public_reason),
    Array.isArray(proposal.reasons) && proposal.reasons.length ? h("details", { className: "mt-2 text-[12px] text-slate-600" },
      h("summary", { className: "cursor-pointer font-bold text-[#9A6B20]" }, "今回選んだ理由"),
      h("div", { className: "mt-2 space-y-1.5" }, ...proposal.reasons.map((reason, i) =>
        h("p", { key: `${reason.label}-${i}`, className: "leading-5" }, h("span", { className: "mr-2 font-bold" }, reason.label), reason.text),
      )),
    ) : null,
    actions.length ? h("div", { className: "mt-3 border-t border-[#EEDFC7] pt-3" },
      h("div", { className: "mb-2 text-[11px] font-medium text-slate-500" }, "実際に食べた食材を記録"),
      h("div", { className: "space-y-2" }, ...(card.items || []).map((name, index) =>
        h("div", { key: name, role: "group", "aria-label": `${name}の摂取記録`, className: "flex min-h-[44px] items-center justify-between gap-3 rounded-[12px] bg-white/85 px-3 py-1.5" },
          h("span", { className: "min-w-0 text-[13px] font-bold text-slate-700" }, name),
          renderAction(actions[index], { compact: true }),
        ),
      )),
    ) : null,
  );
}
