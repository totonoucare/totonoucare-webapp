"use client";

import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";

function Feature({ title, lead }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-[#DCE8DD]">
      <div className="text-[13px] font-black text-slate-900">{title}</div>
      <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{lead}</div>
    </div>
  );
}

export default function ExpertConsultPreview() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-5">
          <GuideBotAvatar mood="listening" className="h-[88px] w-[88px] shrink-0" />
          <div className="relative mb-3 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">EXPERT CONSULT</div>
            <div className="mt-1 text-[14px] font-black leading-6 text-slate-900">
              AIだけでは整理しきれない時は、専門家へつなぐ予定です。
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-[22px] bg-white/80 p-4 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-white">
            体質トリセツ、毎日の記録、AI分析を一緒に見ながら、不調やセルフケアを専門家と整理するオンライン相談を準備しています。
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">相談できる予定のこと</div>
        <div className="mt-3 grid gap-2.5">
          <Feature
            title="不調を本格的に整理したい"
            lead="記録や体質傾向を見ながら、次にどんな選択肢を考えるか一緒に整理します。"
          />
          <Feature
            title="専門的なセルフケアを相談したい"
            lead="ツボ、お灸、暮らし方など、アプリのケア提案を一歩深めて確認します。"
          />
          <Feature
            title="治療へ進む前に相談したい"
            lead="施術や医療機関への相談を検討する前の、心理的なワンクッションとして利用できます。"
          />
        </div>
      </section>

      <section className="rounded-[30px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
        <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">準備中</div>
        <div className="mt-1 text-[16px] font-black text-slate-900">オンライン相談は次の段階で公開予定</div>
        <div className="mt-2 text-[12px] font-bold leading-6 text-slate-600">
          Google Meetによる相談、単発利用、AI伴走とのセットプランを検討しています。予約時の体質・記録データを安全にまとめるカルテ設計後に公開します。
        </div>
        <div className="mt-3 rounded-[18px] bg-white/75 px-3.5 py-3 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-white">
          現在の先行体験版では、記録・グラフ・AI分析・AIチャットまで利用できます。
        </div>
      </section>
    </div>
  );
}
