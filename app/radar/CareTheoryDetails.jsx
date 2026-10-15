import { createElement as h } from "react";

export default function CareTheoryDetails({ details = [] }) {
  const entries = (Array.isArray(details) ? details : []).filter(item => item && typeof item.text === "string" && item.text.trim());
  if (!entries.length) return null;
  return h("details", { className: "mt-3 border-t border-[#EEDFC7] pt-3 text-[12px] text-slate-600" },
    h("summary", { className: "cursor-pointer font-bold text-[#9A6B20] focus-visible:outline-2 focus-visible:outline-offset-4" }, "東洋医学での考え方"),
    h("div", { className: "mt-3 space-y-3" }, ...entries.map((entry, index) =>
      h("div", { key: `${entry.label || "theory"}-${index}` },
        entry.label ? h("div", { className: "mb-1 font-bold text-slate-700" }, entry.label) : null,
        h("p", { className: "font-medium leading-6" }, entry.text),
      ),
    )),
  );
}
