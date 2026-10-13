import { createElement as h } from "react";
import { IconFood } from "../illust/icons/app";

export default function ResultCareExample({ example }) {
  if (!example) return null;
  return h("section", { "aria-label": "あなたに合う食べるケアの例", className: "rounded-[24px] bg-[#FFF5E6] p-5 ring-1 ring-[#F1E5D1]" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { "aria-hidden": true, className: "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/85 text-[#9A6B20]" },
        h(IconFood, { className: "h-6 w-6" }),
      ),
      h("div", null,
        h("div", { className: "text-[11px] font-bold text-[#9A6B20]" }, "あなたに合うケアの一例"),
        h("h3", { className: "mt-0.5 text-[16px] font-black text-slate-900" }, "食事で取り入れるなら"),
      ),
    ),
    h("p", { className: "mt-4 text-[17px] font-black leading-7 text-slate-800" }, example.focus_ingredients.join(" ＋ ")),
    h("div", { className: "mt-3 rounded-[16px] bg-white/90 p-3.5" },
      h("div", { className: "text-[11px] font-bold text-[#9A6B20]" }, "この2つを使う料理例"),
      h("p", { className: "mt-1 text-[15px] font-bold leading-6 text-slate-800" }, example.meal_example),
      h("p", { className: "mt-1.5 text-[13px] font-medium leading-6 text-slate-600" }, example.preparation),
    ),
    h("p", { className: "mt-3 text-[13px] font-bold leading-6 text-slate-600" }, example.short_reason),
    h("details", { className: "mt-2 text-[12px] text-slate-600" },
      h("summary", { className: "cursor-pointer py-1.5 font-bold text-[#9A6B20]" }, "食材を選んだ理由"),
      h("p", { className: "pt-2 leading-6" }, example.public_reason),
    ),
    h("p", { className: "mt-3 text-[11px] font-medium leading-5 text-slate-500" }, example.basis_label),
  );
}
