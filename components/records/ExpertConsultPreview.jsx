"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";

function Feature({ title, lead }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-[#DCE8DD]">
      <div className="text-[13px] font-black text-slate-900">{title}</div>
      <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">{lead}</div>
    </div>
  );
}

export default function ExpertConsultPreview({ authedFetch }) {
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authedFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch("/api/records/expert-interest");
        if (!cancelled) setInterested(Boolean(data?.interested));
      } catch {
        if (!cancelled) setError("希望状況を読み込めませんでした");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authedFetch]);

  async function toggleInterest() {
    const next = !interested;
    setSaving(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/expert-interest", {
        method: "POST",
        body: JSON.stringify({ interested: next }),
      });
      setInterested(Boolean(data?.interested));
    } catch (saveError) {
      setError(saveError?.message || "希望を保存できませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-5">
          <GuideBotAvatar mood="listening" className="h-[88px] w-[88px] shrink-0" />
          <div className="relative mb-3 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">EXPERT CONSULT</div>
            <div className="mt-1 text-[14px] font-black leading-6 text-slate-900">AIだけでは整理しきれない時は、専門家へつなぐ予定です。</div>
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
          <Feature title="不調を本格的に整理したい" lead="記録や体質傾向を見ながら、次にどんな選択肢を考えるか一緒に整理します。" />
          <Feature title="専門的なセルフケアを相談したい" lead="ツボ、お灸、暮らし方など、アプリのケア提案を一歩深めて確認します。" />
          <Feature title="治療へ進む前に相談したい" lead="施術や医療機関への相談を検討する前の、心理的なワンクッションとして利用できます。" />
        </div>
      </section>

      <section className="rounded-[30px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
        <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">準備中</div>
        <div className="mt-1 text-[16px] font-black text-slate-900">Google Meetによるオンライン相談</div>
        <div className="mt-2 text-[12px] font-bold leading-6 text-slate-600">
          単発利用と、AI伴走＋月1回相談のセットを検討しています。予約時の体質・記録データを安全にまとめるカルテ設計後に公開します。
        </div>
        <div className="mt-3 rounded-[18px] bg-white/75 px-3.5 py-3 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-white">
          相談内容は診断・処方ではなく、不調の整理、セルフケアの選択肢、必要に応じた受診・施術相談の論点整理を中心にする予定です。
        </div>

        <Button
          variant={interested ? "secondary" : "primary"}
          disabled={loading || saving}
          onClick={toggleInterest}
          className="mt-4 w-full py-4"
        >
          {saving ? "保存中…" : interested ? "利用希望を送信済み ✓" : "利用してみたい"}
        </Button>
        <div className="mt-2 text-center text-[9px] font-bold leading-4 text-slate-400">
          これは需要確認です。予約や決済はまだ発生しません。もう一度押すと取り消せます。
        </div>
        {error ? <div className="mt-3 text-center text-[10px] font-bold text-[#B75C3E]">{error}</div> : null}
      </section>
    </div>
  );
}
