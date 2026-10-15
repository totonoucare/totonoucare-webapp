import { createElement as h } from "react";
import CareTheoryDetails from "./CareTheoryDetails";

export default function DrinkCareCard({ label, detail = {}, action = null }) {
  return h("div", { className: "rounded-[15px] bg-[#FFF5E6] px-3 py-3 ring-1 ring-[#F1E5D1]" },
    h("div", { className: "flex items-center justify-between gap-2" },
      h("h3", { className: "min-w-0 flex-1 text-[13px] font-black leading-6 text-slate-800" }, label),
      action,
    ),
    detail.public_reason ? h("p", { className: "mt-2 text-[12px] font-medium leading-6 text-slate-600" }, detail.public_reason) : null,
    detail.how_to ? h("p", { className: "mt-2 text-[12px] font-medium leading-6 text-slate-600" }, detail.how_to) : null,
    detail.caffeine_label ? h("span", { className: "mt-2 inline-flex rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-[#EEDFC7]" }, detail.caffeine_label) : null,
    h(CareTheoryDetails, { details: detail.theory_details || [] }),
  );
}
