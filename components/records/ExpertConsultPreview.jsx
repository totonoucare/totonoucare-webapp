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
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">国家資格者によるオンライン相談</div>
            <div className="mt-1 text-[14px] font-black leading-6 text-slate-900">セルフケアだけでは足りない不調を、オンラインで相談。</div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-[22px] bg-white/80 p-4 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-white">
            検査では異常が見つからなかったのに不調が続く、日常の軽いケアだけでは追いつかない。そんな時に、体質や毎日の記録をもとに、鍼灸師などの国家資格者が今の状態と自宅でできる対策を個別に確認するサービスを準備しています。
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">アプリの記録が相談前の情報になります</div>
        <div className="mt-2 rounded-[20px] bg-[#F7FAF8] px-4 py-3.5 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-[#E8F0EB]">
          体質トリセツ、気になる不調、毎日の予報・実感、試したケアがすでにまとまっています。一から状況を説明する時間を減らし、詳しい確認と実践のために相談時間を使えます。
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">オンラインで行う予定のこと</div>
        <div className="mt-3 grid gap-2.5">
          <Feature title="詳しい聞き取りと個別の見立て" lead="記録だけでは分からない経過や生活背景を確認し、今の不調で優先したいことを整理します。" />
          <Feature title="舌・姿勢・動作などを参考に確認" lead="画面越しに舌の状態、姿勢、動き方などを見ながら、体質チェック時に確認した体の反応も必要に応じて確かめます。" />
          <Feature title="自宅でできるケアを一緒に練習" lead="市販灸・円皮鍼・ツボ、食養生、生活習慣などから必要なものを選び、自分で安全に再現できるところまで確認します。" />
          <Feature title="相談後のケアプラン" lead="今週優先すること、天気が変わる時の備え方、医療機関への相談を考える目安を持ち帰れる形にまとめます。" />
        </div>
        <div className="mt-3 rounded-[18px] bg-[#FFF8EC] px-3.5 py-3 text-[11px] font-bold leading-5 text-slate-600 ring-1 ring-[#EED8B4]">
          担当者の資格と対応範囲に応じて、一般用漢方薬を検討する際の考え方や、適切な相談先についても整理します。
        </div>
      </section>

      <section className="rounded-[30px] bg-[#EFF8F4] p-4 ring-1 ring-[#CFE7DE]">
        <div className="text-[12px] font-black text-[#2F816E]">AI分析の続きではありません</div>
        <div className="mt-1.5 text-[11px] font-bold leading-5 text-slate-600">
          AI分析を使っていなくても相談できます。人が直接話を聞き、画面越しに状態を確認し、実践方法を個別に調整するための別サービスです。
        </div>
      </section>

      <section className="rounded-[30px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
        <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">準備中</div>
        <div className="mt-1 text-[16px] font-black text-slate-900">国家資格者によるオンライン相談</div>
        <div className="mt-2 text-[12px] font-bold leading-6 text-slate-600">
          不調について人に詳しく相談したい時に利用できる形を準備しています。開始時にお知らせを受け取りたい方は、下のボタンから登録できます。
        </div>
        <div className="mt-3 rounded-[18px] bg-white/75 px-3.5 py-3 text-[11px] font-bold leading-5 text-slate-500 ring-1 ring-white">
          医療機関での診断・治療に代わるものではありません。強い症状、急な変化、緊急性がある場合は、医療機関へ相談してください。
        </div>

        <Button
          variant={interested ? "secondary" : "primary"}
          disabled={loading || saving}
          onClick={toggleInterest}
          className="mt-4 w-full py-4"
        >
          {saving ? "保存中…" : interested ? "お知らせ希望を登録済み ✓" : "開始したら知らせてほしい"}
        </Button>
        <div className="mt-2 text-center text-[9px] font-bold leading-4 text-slate-400">
          押しても予約や料金は発生しません。もう一度押すと取り消せます。
        </div>
        {error ? <div className="mt-3 text-center text-[10px] font-bold text-[#B75C3E]">{error}</div> : null}
      </section>
    </div>
  );
}
