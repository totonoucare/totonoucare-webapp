import { createElement as h } from "react";
import { IconBody } from "../illust/icons/app";

export default function ResultCareExample({ example }) {
  if (!example) return null;
  return h("section", { "aria-label": "あなたに合うほぐすケアの例", className: "rounded-[24px] bg-[#F6EFF8] p-5 ring-1 ring-[#E2D6E7]" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { "aria-hidden": true, className: "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/85 text-[#7B6588]" },
        h(IconBody, { className: "h-6 w-6" }),
      ),
      h("div", null,
        h("div", { className: "text-[11px] font-bold text-[#7B6588]" }, "あなたに合うケアの一例"),
        h("h3", { className: "mt-0.5 text-[16px] font-black text-slate-900" }, "ほぐして整えるなら"),
      ),
    ),
    h("p", { className: "mt-4 text-[17px] font-black leading-7 text-slate-800" }, example.title),
    h("p", { className: "mt-2 text-[14px] font-bold leading-6 text-slate-700" }, example.action),
    h("img", {
      ...example.image,
      alt: `${example.title}の動作図`,
      className: "mx-auto mt-3 h-auto max-h-[180px] w-full rounded-[16px] object-contain",
      loading: "lazy",
    }),
    h("p", { className: "mt-3 text-[13px] font-bold leading-6 text-[#7B6588]" }, example.short_reason),
    h("p", { className: "mt-2 text-[13px] font-medium leading-6 text-slate-600" }, example.check_prompt),
    h("p", { className: "mt-1 text-[12px] font-medium leading-5 text-slate-500" }, example.guidance),
    h("details", { className: "mt-2 text-[12px] text-slate-600" },
      h("summary", { className: "cursor-pointer py-1.5 font-bold text-[#7B6588]" }, "このケアを選んだ理由"),
      h("p", { className: "pt-2 leading-6" }, example.public_reason),
    ),
    h("p", { className: "mt-3 text-[11px] font-medium leading-5 text-slate-500" }, example.basis_label),
  );
}
