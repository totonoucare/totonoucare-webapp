// app/guide/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import {
  IconSpark,
  IconChecklist,
  IconWeather,
  IconCalendar,
  IconCore,
  IconBodyLine,
} from "@/components/illust/icons/guide";

/* -----------------------------
 * ピル型タブ UI
 * ---------------------------- */
function SegmentedTabs({ items, active, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              "flex-1 h-[34px] rounded-full text-[12px] font-black tracking-tight transition-all duration-200",
              isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* -----------------------------
 * プレミアム・ガイドカード
 * ---------------------------- */
function GuideCard({ title, icon, tone = "mint", children }) {
  const tones = {
    mint: "text-[var(--accent-ink)] bg-[color-mix(in_srgb,var(--mint),white_40%)]",
    amber: "text-amber-800 bg-amber-100",
    indigo: "text-indigo-800 bg-indigo-100",
    violet: "text-violet-800 bg-violet-100",
    teal: "text-teal-800 bg-teal-100",
  };

  return (
    <div className="rounded-[24px] bg-white ring-1 ring-[var(--ring)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-[14px] ring-1 ring-[var(--ring)] shadow-sm ${tones[tone]}`}>
          {icon}
        </div>
        <div className="text-[16px] font-black tracking-tight text-slate-900">
          {title}
        </div>
      </div>
      <div className="mt-3.5 text-[13px] font-bold leading-6 text-slate-700">
        {children}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();
  const [tab, setTab] = useState("start");

  const tabs = useMemo(
    () => [
      { key: "start", label: "全体像" },
      { key: "check", label: "①チェック" },
      { key: "radar", label: "②予報" },
      { key: "record", label: "③記録" },
    ],
    []
  );

  const headerLeft = (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
    >
      ← 戻る
    </button>
  );

  return (
    <AppShell title="使い方ガイド" noTabs={true} headerLeft={headerLeft}>
      {/* ヒーローセクション */}
      <Module className="mb-4">
        <div className="relative overflow-hidden p-6 bg-[color-mix(in_srgb,var(--mint),white_45%)]">
          <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
            未病レーダーの目的
          </div>
          <div className="mt-1 text-[22px] font-black tracking-tight text-slate-900 leading-[1.3]">
            不調の波を先読みして、<br />
            崩れる前に「先回り」する。
          </div>
          <div className="mt-3 text-[13px] font-bold leading-6 text-slate-700">
            自分の「崩れ方のクセ」を知り、気象変化による負担をあらかじめ避けるためのセルフケアアプリです。
          </div>
        </div>
      </Module>

      {/* タブナビゲーション */}
      <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70 py-2 mb-2">
        <SegmentedTabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {/* 1. 全体像タブ */}
      {tab === "start" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-5">
            基本の３ステップ
          </div>
          <div className="space-y-4">
            <GuideCard tone="mint" title="① 体質チェック" icon={<IconChecklist />}>
              直近の体調や簡単な動作テストから、あなたの「ベース体質」や「負担が出やすい場所」を割り出します。
            </GuideCard>
            <GuideCard tone="amber" title="② 体調予報（レーダー）" icon={<IconWeather />}>
              あなたの体質と、現在地の「気圧・気温・湿度」の予報を掛け合わせ、今日明日の崩れやすさ（危険度）を見える化します。
            </GuideCard>
            <GuideCard tone="indigo" title="③ 記録と振り返り" icon={<IconCalendar />}>
              1日の終わりに「実際どうだったか」を記録します。データが溜まると、週次レポートで自分の不調パターンが分かってきます。
            </GuideCard>

            <div className="grid gap-3 pt-4">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">体質チェックをはじめる</Button>
              <Button variant="secondary" onClick={() => router.push("/radar")} className="w-full">体調予報を見る</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 2. 体質チェック詳細タブ */}
      {tab === "check" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            体質チェックで分かること
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            ただの性格診断ではなく、東洋医学に基づく「体調の波の出方」を分析します。
          </div>
          
          <div className="space-y-4">
            <GuideCard tone="mint" title="ベース体質（コア）" icon={<IconCore />}>
              バッテリー（余力）の大きさと、アクセル/ブレーキの踏みやすさを掛け合わせた、あなたの根本的な性質です。
            </GuideCard>
            <GuideCard tone="teal" title="気・血・水のバランス" icon={<IconSpark />}>
              エネルギー不足（気虚）や、潤い不足（津液不足）など、今現在どの要素が崩れているか（サブ体質）を表示します。
            </GuideCard>
            <GuideCard tone="violet" title="張りやすい場所（経絡）" icon={<IconBodyLine />}>
              動作テストの違和感から、首・肩、背中、体側など、負担が蓄積しやすい「体のライン」を特定します。
            </GuideCard>

            <div className="pt-2">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">体質チェックへ</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 3. 体調予報詳細タブ */}
      {tab === "radar" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            体調予報の見方
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            毎日の気象ダメージを避け、効率よく整えるためのダッシュボードです。
          </div>

          <div className="space-y-4">
            <GuideCard tone="amber" title="崩れやすさ（10段階）" icon={<IconWeather />}>
              気圧低下、寒暖差、湿気などの気象変化に対して、あなたの体質がどれくらいダメージを受けやすいかをスコア化します。
            </GuideCard>
            <GuideCard tone="teal" title="今夜の先回りツボ" icon={<IconBodyLine />}>
              明日が「崩れやすい日」なら、前夜のうちに押しておきたいツボを提案します。お風呂上がりなどに30秒でOKです。
            </GuideCard>
            <GuideCard tone="mint" title="食養生（食事の工夫）" icon={<IconSpark />}>
              胃腸に負担をかけない食事や、冷えを防ぐ食材など、その日の天候と体質に合った「食事の取り入れ方」が分かります。
            </GuideCard>

            <div className="pt-2">
              <Button onClick={() => router.push("/radar")} className="w-full shadow-md">体調予報へ</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 4. 記録と振り返り詳細タブ */}
      {tab === "record" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            記録機能の使い方
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            予報と実際の体調の「答え合わせ」をすることで、精度が上がっていきます。
          </div>

          <div className="space-y-4">
            <GuideCard tone="indigo" title="1日1回の簡単な記録" icon={<IconChecklist />}>
              体調予報の画面から、「実際どうだったか」「先回りできたか」を数タップで記録できます。
            </GuideCard>
            <GuideCard tone="violet" title="記録カレンダー" icon={<IconCalendar />}>
              月ごとのカレンダーで、予報の危険度と実際の体調を一覧できます。自分の不調の波が可視化されます。
            </GuideCard>
            <GuideCard tone="amber" title="週次レポート" icon={<IconSpark />}>
              1週間の記録が溜まると、「今週は気圧低下に弱かった」「よくこのケアをしていた」といった分析と来週のヒントが届きます。
            </GuideCard>

            <div className="pt-2">
              <Button onClick={() => router.push("/records?tab=calendar")} className="w-full shadow-md">記録ページへ</Button>
            </div>
          </div>
        </Module>
      ) : null}
    </AppShell>
  );
}
