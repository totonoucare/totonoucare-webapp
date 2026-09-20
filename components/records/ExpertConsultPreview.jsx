"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

function ExpertAvatar({ className = "h-[88px] w-[88px]" }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="expert-avatar-bg" x1="18" y1="8" x2="78" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FCFA" />
          <stop offset="1" stopColor="#DDEFE8" />
        </linearGradient>
        <filter id="expert-avatar-shadow" x="8" y="8" width="80" height="84" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#315C50" floodOpacity="0.16" />
        </filter>
      </defs>
      <circle cx="48" cy="48" r="43" fill="url(#expert-avatar-bg)" stroke="#BFDCCF" strokeWidth="1.5" />
      <g filter="url(#expert-avatar-shadow)">
        <circle cx="48" cy="34" r="14" fill="#F0CDB9" />
        <path d="M34.5 33.5c0-10 5.8-16.5 13.7-16.5 8.6 0 14.4 6.5 14.4 16.5-4.8-1.3-9.3-4.1-12.6-8.1-3.9 4.3-8.8 7-15.5 8.1Z" fill="#345E55" />
        <path d="M25 77.5c1.2-17.1 9.4-27 23-27s21.8 9.9 23 27H25Z" fill="#3C9D84" />
        <path d="M38 52.5 48 64l10-11.5 5.2 2.7-5.1 22.3H37.9l-5.1-22.3 5.2-2.7Z" fill="#FDFEFE" />
        <path d="M45.2 57.8 48 64l2.8-6.2" fill="none" stroke="#D3A646" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(65 63)">
        <circle cx="9" cy="9" r="10.5" fill="#FFF8E8" stroke="#DDB85F" strokeWidth="1.5" />
        <path d="m4.8 9 2.7 2.7 5.8-6" fill="none" stroke="#9D7624" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function Feature({ title, lead }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-[#DCE8DD]">
      <div className="text-[14px] font-black leading-6 text-slate-900">{title}</div>
      <div className="mt-1 text-[14px] font-bold leading-6 text-slate-500">{lead}</div>
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
          <ExpertAvatar className="h-[88px] w-[88px] shrink-0" />
          <div className="relative mb-3 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[12px] font-black tracking-[0.12em] text-[#2F816E]/75">鍼灸師（国家資格者）へのオンライン相談</div>
            <div className="mt-1 text-[16px] font-black leading-7 text-slate-900">自分に合うケアを、鍼灸師と一緒に</div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="rounded-[22px] bg-white/85 p-4 text-[14px] font-bold leading-6 text-slate-600 ring-1 ring-white">体質チェックや記録をもとに不調を整理し、画面越しにツボの探し方やお灸・ストレッチを確かめる相談を準備しています。</div>
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="text-[15px] font-black text-slate-900">いつものデータから、具体的なケアへ</div>
        <div className="mt-1 text-[14px] font-bold leading-6 text-slate-500">共有したい記録やAIの振り返りを使い、説明を繰り返す負担を軽くします。</div>
        <details className="mt-3 rounded-[20px] bg-[#F4FAF7] px-3.5 py-3 ring-1 ring-[#DCE8DD]">
          <summary className="cursor-pointer text-[12px] font-black text-[#2F816E]">相談でできること</summary>
          <div className="mt-3 grid gap-2.5">
            <Feature title="体質と記録を一緒に整理" lead="体質チェック・記録・AIの振り返りから、気になる不調と試したケアを整理します。" />
            <Feature title="ツボや道具の使い方を確認" lead="ツボの位置と触れ方、お灸やシール鍼の使い方を画面越しに確認します。" />
            <Feature title="動きを見ながらケアを調整" lead="ラインのストレッチなどを一緒に確かめ、日々続けられるケアに整えます。" />
          </div>
          <div className="mt-3 text-[12px] font-bold leading-5 text-slate-500">担当者の資格と対応範囲に応じて、一般用漢方薬を検討する時の考え方や、適切な相談先も整理します。</div>
        </details>
      </section>

      <section className="rounded-[30px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
        <div className="text-[12px] font-black tracking-[0.12em] text-[#A56C18]">準備中</div>
        <div className="mt-1 text-[17px] font-black text-slate-900">オンライン相談の開始をお知らせします</div>
        <div className="mt-2 text-[14px] font-bold leading-6 text-slate-600">登録すると、開始時にお知らせします。</div>

        <Button
          variant={interested ? "secondary" : "primary"}
          disabled={loading || saving}
          onClick={toggleInterest}
          className="mt-4 w-full py-4"
        >
          {saving ? "保存中…" : interested ? "お知らせ希望を登録済み ✓" : "開始したら知らせてほしい"}
        </Button>
        <div className="mt-2 text-center text-[14px] font-bold leading-5 text-slate-500">
          予約や料金は発生しません。もう一度押すと取り消せます。
        </div>
        {error ? <div className="mt-3 text-center text-[12px] font-bold text-[#B75C3E]">{error}</div> : null}

        <details className="mt-4 border-t border-[#EED8B4] pt-3 text-[12px] font-bold leading-5 text-slate-500">
          <summary className="cursor-pointer font-black">利用上の注意</summary>
          <div className="mt-2">オンライン相談は、医療機関での診断・治療に代わるものではありません。強い症状や急な変化がある場合は、医療機関へ相談してください。</div>
        </details>
      </section>
    </div>
  );
}
