"use client";

import CheckoutButton from "@/components/billing/CheckoutButton";

const FEATURE_COPY = {
  analysis: {
    eyebrow: "AI分析",
    title: "記録を、次の整え方へつなげる",
    body: "期間別グラフ、AIによる個別分析、記録を引き継いだEkkenとの振り返りを利用できます。",
  },
  consult: {
    eyebrow: "Ekken相談",
    title: "今の体調を、一人で整理しなくていい",
    body: "体質トリセツ、今日・明日の予報、最近の記録を引き継いで、Ekkenへ相談できます。",
  },
};

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 14v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SubscriptionPaywall({
  feature = "analysis",
  returnPath = "/records",
}) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.analysis;
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="bg-[radial-gradient(circle_at_85%_15%,rgba(231,185,102,0.22),transparent_36%)] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-white text-[#2F816E] ring-1 ring-[#CFE7DE] shadow-sm">
              <IconLock />
            </div>
            <div>
              <div className="text-[12px] font-black tracking-[0.14em] text-[#2F816E]/70">プレミアム・{copy.eyebrow}</div>
              <div className="mt-1 text-[18px] font-black leading-7 text-slate-900">{copy.title}</div>
            </div>
          </div>
          <div className="mt-4 text-[14px] font-bold leading-6 text-slate-600">{copy.body}</div>
          <details className="mt-4 rounded-[16px] bg-white/80 px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-600 ring-1 ring-[#DCE8DD]">
            <summary className="cursor-pointer font-black text-[#2F816E]">利用できる内容</summary>
            <div className="mt-2 space-y-1">
              <div>・記録カレンダーはこれからも無料</div>
              <div>・AI分析とEkken相談を利用</div>
              <div>・支払い管理はStripe画面で完結</div>
            </div>
          </details>
          <CheckoutButton returnPath={returnPath} className="mt-4 w-full">
            プレミアムの内容を確認する
          </CheckoutButton>
          <div className="mt-3 text-center text-[12px] font-bold leading-4 text-slate-400">
            料金と請求間隔は、申込み前にStripe画面で確認できます。
          </div>
        </div>
      </section>
    </div>
  );
}
