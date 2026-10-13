import { createElement as h } from "react";

const SHORT_POLICY_COPY = {
  shizumeru: "ほてりや高ぶりにつながる、余分な熱を落ち着かせます。",
  yurumeru: "力が入り続けた心身の緊張や、筋肉のこわばりをゆるめます。",
  meguraseru: "張りや詰まりにつながる滞りをほどき、巡りを保ちます。",
  nagasu: "重だるさやむくみにつながる、水分の偏りを整えます。",
  uruosu: "乾きや消耗が気になる体に、養うものとうるおいを補います。",
  nukumeru: "お腹や手足の冷えに目を向け、体を温めることを大切にします。",
  sasaeru: "食事と休息で体を働かせる力を補い、疲れを増やさないことを大切にします。",
};

export default function ResultCarePolicyCard({ item }) {
  if (!item) return null;
  return h("div", { className: "rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[16px] bg-white p-2 shadow-sm ring-1 ring-slate-200" },
        h("img", { src: item.icon, alt: "", className: "h-full w-full object-contain" }),
      ),
      h("div", { className: "min-w-0 flex-1" },
        h("div", { className: "text-[16px] font-black leading-snug text-slate-900" }, item.label),
        h("div", { className: "mt-1 text-[11px] font-bold text-[var(--accent-ink)]" }, item.rankLabel),
      ),
    ),
    h("p", { className: "mt-3 text-[13px] font-bold leading-6 text-slate-600" }, SHORT_POLICY_COPY[item.key] || item.guide),
    h("details", { className: "mt-3 border-t border-slate-200/70 pt-2.5 text-[12px] text-slate-600" },
      h("summary", { className: "cursor-pointer py-1.5 font-bold text-[var(--accent-ink)]" }, "東洋医学での考え方"),
      h("p", { className: "pt-2 font-medium leading-6" }, item.body),
    ),
  );
}
