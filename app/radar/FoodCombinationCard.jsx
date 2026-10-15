import { createElement as h } from "react";
import CareTheoryDetails from "./CareTheoryDetails";

// A pair is a proposal; the existing action controls record each ingredient.
export default function FoodCombinationCard({ card, actions = [], renderAction }) {
  const proposal = card.proposal;
  if (!proposal) return null;
  const names = proposal.focus_ingredients || card.items || [];
  return h("div", { className: "mt-3 rounded-[18px] bg-[#FFF5E6] p-3.5 ring-1 ring-[#F1E5D1]" },
    h("h3", { className: "text-[17px] font-black leading-7 text-slate-800" }, names.join(" ＋ ")),
    h("p", { className: "mt-2 text-[12px] font-medium leading-6 text-slate-600" }, proposal.public_reason),
    h("div", { className: "mt-3 border-l-2 border-[#E8C990] pl-3" },
      h("div", { className: "text-[11px] font-bold text-[#9A6B20]" }, "料理の一例"),
      h("div", { className: "mt-1 text-[14px] font-bold leading-6 text-slate-800" }, proposal.meal_example),
      proposal.preparation ? h("p", { className: "mt-1 text-[12px] font-medium leading-6 text-slate-600" }, proposal.preparation) : null,
      proposal.additional_foods?.length ? h("p", { className: "mt-1 text-[11px] font-medium leading-5 text-slate-500" }, `一緒に使うもの：${proposal.additional_foods.join("・")}`) : null,
    ),
    h(CareTheoryDetails, { details: proposal.theory_details || [] }),
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
