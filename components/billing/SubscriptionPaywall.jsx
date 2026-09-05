"use client";

import CheckoutButton from "@/components/billing/CheckoutButton";

const FEATURE_COPY = {
  forecast: {
    eyebrow: "体調予報・対策ケア",
    title: "あなた向けの予報を続ける",
    body: "体質と天気を重ねた今日・明日の体調予報と、暮らす・食べる・ほぐすの対策ケアを利用できます。",
  },
  analysis: {
    eyebrow: "振り返り",
    title: "記録から、自分の傾向を知る",
    body: "体調予報・実感・ケアを見比べ、分かったことと次に試す一手をミモルが整理します。",
  },
  consult: {
    eyebrow: "ミモル相談",
    title: "毎回、最初から説明しなくていい",
    body: "あなたの体質、今日・明日の体調予報、最近の記録とケアを把握したミモルへ相談できます。",
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
  access = null,
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
          {access?.trial_expired ? (
            <div className="mt-4 rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#DCE8DD]">
              <div className="text-[12px] font-black tracking-[0.1em] text-slate-400">14日間の体験は終了しました</div>
              <div className="mt-1 text-[14px] font-bold leading-5 text-slate-600">体質結果、ケアショップ、これまでの記録とAI回答は引き続き見返せます。</div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {[
              ["自分の傾向を振り返る", "予報と実感、ケアの記録を同じ条件で見比べます。"],
              ["次に試すことを一つ決める", "情報を並べるだけでなく、次の行動まで整理します。"],
              ["自分を把握したミモルへ相談", "体質や最近の調子を、毎回最初から説明する必要がありません。"],
            ].map(([title, lead]) => (
              <div key={title} className="rounded-[18px] bg-white/85 px-4 py-3 ring-1 ring-white">
                <div className="text-[13px] font-black text-slate-900">{title}</div>
                <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{lead}</div>
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-[16px] bg-white/70 px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-600 ring-1 ring-[#DCE8DD]">
            <summary className="cursor-pointer font-black text-[#2F816E]">利用できる内容</summary>
            <div className="mt-2 space-y-1">
              <div>・体調予報と対策ケア</div>
              <div>・新しい体調・ケア記録</div>
              <div>・AI振り返りとミモル相談</div>
              <div>・体調予報のプッシュ通知</div>
              <div>・過去の記録とAI回答は契約後もそのまま継続</div>
            </div>
          </details>
          <CheckoutButton returnPath={returnPath} className="mt-4 w-full">
            月額580円の内容を確認する
          </CheckoutButton>
          <div className="mt-3 text-center text-[12px] font-bold leading-4 text-slate-400">
            料金と請求間隔は、申込み前にStripe画面で確認できます。
          </div>
        </div>
      </section>
    </div>
  );
}
