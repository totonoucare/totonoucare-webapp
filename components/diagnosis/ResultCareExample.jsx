import { createElement as h } from "react";
import { IconBody } from "../illust/icons/app";
import CareExplanationDetails from "../mimoru/CareExplanationDetails";

export default function ResultCareExample({ example, explanation = null }) {
  if (!example) return null;
  const copy = explanation?.item_key === example.id ? explanation : null;
  return h("section", { "aria-label": "あなたに合うほぐすケアの例", className: "rounded-[24px] bg-[#F6EFF8] p-4 ring-1 ring-[#E2D6E7]" },
    h("div", { className: "flex items-center gap-2.5" },
      h("div", { "aria-hidden": true, className: "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/85 text-[#7B6588]" },
        h(IconBody, { className: "h-6 w-6" }),
      ),
      h("div", { className: "min-w-0 flex-1" },
        h("div", { className: "text-[11px] font-bold text-[#7B6588]" }, "この体質に合うケアの一例"),
        h("h3", { className: "mt-0.5 text-[16px] font-black leading-6 text-slate-900" }, example.title),
      ),
    ),
    h("p", { className: "mt-3 text-[14px] font-bold leading-6 text-slate-700" }, example.action),
    h("img", {
      ...example.image,
      alt: `${example.title}の動作図`,
      className: "mx-auto mt-3 h-auto max-h-[180px] w-full rounded-[16px] object-contain",
      loading: "lazy",
    }),
    h("p", { className: "mt-2 text-[12px] font-medium leading-5 text-slate-500" }, example.guidance),
    copy?.reason ? h("p", { className: "mt-3 text-[13px] font-bold leading-6 text-[#7B6588]", "data-mimoru-care-reason": true }, copy.reason) : null,
    h(CareExplanationDetails, { explanation: copy, title: "選んだ理由と取り入れ方" }),
  );
}
