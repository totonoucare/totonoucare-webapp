// app/guide/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { IconSpark, IconCheck, IconRadar, IconBolt } from "@/components/illust/icons/guide";

/* -----------------------------
 * Segments (ピル型タブUI)
 * ---------------------------- */
function SegmentedTabs({ items, active, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
      {items.map((it) => {
        const a = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              "flex-1 h-[34px] rounded-full text-[13px] font-black tracking-tight transition-all duration-200",
              a
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
 * MiniCard (SaaS風ソフトパネル)
 * ---------------------------- */
function MiniCard({ title, icon, children }) {
  return (
    <div className="rounded-[24px] bg-slate-50 px-5 py-5 ring-1 ring-inset ring-[var(--ring)] transition-all hover:bg-slate-100/70">
      <div className="flex items-center gap-3 mb-3">
        <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
          {icon}
        </div>
        <div className="text-[15px] font-black tracking-tight text-slate-900">
          {title}
        </div>
      </div>
      <div className="text-[13px] font-bold leading-6 text-slate-600">
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
      { key: "start", label: "まず最初に" },
      { key: "check", label: "体質チェック" },
      { key: "radar", label: "体調予報" },
    ],
    []
  );

  return (
    <AppShell
      title="使い方"
      noTabs={true}
      headerLeft={
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
    >
      {/* Hero */}
      <Module>
        <ModuleHeader icon={<IconSpark />} title="未病レーダーの使い方" sub="体質 × 気象で、崩れる前に先回りする" />
        
        <div className="px-5 pb-6 pt-4 space-y-5">
          <div className="relative overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--mint),white_45%)] ring-1 ring-[var(--ring)] shadow-sm">
            <div className="relative z-10 p-6">
              <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                目的
              </div>
              <div className="mt-1.5 text-[18px] font-black tracking-tight text-slate-900 leading-snug">
                不調が来る前に「危ないタイミング」を知って、先回りで軽く済ませる
              </div>
              <div className="mt-3 text-[13px] font-bold leading-6 text-slate-700">
                体質チェックで「崩れ方のクセ」を掴み、体調予報で“揺れやすいタイミング”を先回りで備えます。
              </div>
            </div>
          </div>
        </div>
      </Module>

      {/* スティッキー（追従）配置のタブ */}
      <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70 py-2 mb-2">
        <SegmentedTabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      {tab === "start" ? (
        <Module className="mb-8">
          <ModuleHeader icon={<IconSpark />} title="全体の流れ（3ステップ）" sub="迷ったらここだけ読めばOK" />
          <div className="px-5 pb-6 pt-4 space-y-4">
            <MiniCard title="① 体質チェック" icon={<IconCheck />}>
              直近2週間の傾向＋簡単な動作テストで、あなたの「崩れ方のクセ」を整理します。
            </MiniCard>
            <MiniCard title="② 体調予報（危険度）" icon={<IconRadar />}>
              気象の揺れと体質を重ねて、崩れやすいタイミングを見える化します。
              無料でも使えます（表示範囲はプランで変わります）。
            </MiniCard>
            <MiniCard title="③ 危ない日の先回り" icon={<IconBolt />}>
              危険度が高い日は、その日の負担を軽くする“先回り”が出ます。
              まずは「やる/やらない」で迷わない状態を作るのが目的です。
            </MiniCard>

            <div className="flex flex-col gap-3 pt-3">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                体質チェックをはじめる
              </Button>
              <Button variant="secondary" onClick={() => router.push("/radar")} className="w-full">
                体調予報を見る
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "check" ? (
        <Module className="mb-8">
          <ModuleHeader icon={<IconCheck />} title="体質チェックの読み方" sub="何を測って、何が返る？" />
          <div className="px-5 pb-6 pt-4 space-y-4">
            <MiniCard title="体質の軸（コアタイプ）" icon={<IconSpark />}>
              「性格診断」ではなく、体調の波の出方をまとめた“型”です。覚えやすい名称＋裏の説明で理解できる設計にします。
            </MiniCard>
            <MiniCard title="整えポイント（最大2つ）" icon={<IconBolt />}>
              今回の回答から、優先して整えると効率が良い領域を2つまで示します。全部盛りより再現性重視です。
            </MiniCard>
            <MiniCard title="張りやすい場所（ライン）" icon={<IconRadar />}>
              動作で違和感が出やすかったパターンを、体の“出やすいライン”として表示します。
            </MiniCard>

            <div className="pt-3">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                体質チェックへ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "radar" ? (
        <Module className="mb-8">
          <ModuleHeader icon={<IconRadar />} title="体調予報の見方" sub="危険度の意味と使いどころ" />
          <div className="px-5 pb-6 pt-4 space-y-4">
            <MiniCard title="危険度＝崩れやすさの指標" icon={<IconRadar />}>
              体質と気象の組み合わせで「崩れやすい側か」を見ます。高い日は“攻め”より先に“守り”を入れる日です。
            </MiniCard>
            <MiniCard title="先回りは短くていい" icon={<IconBolt />}>
              危ない日は、時間をかけるほど良いとは限りません。30秒〜数分で「悪化のきっかけ」を潰す設計が一番効きます。
            </MiniCard>
            <MiniCard title="表示範囲はプランで変わる" icon={<IconSpark />}>
              無料でも使えます。より先の予報や、より細かい提案はプランで拡張されます。まずは見逃さない状態づくりが最優先です。
            </MiniCard>

            <div className="pt-3">
              <Button onClick={() => router.push("/radar")} className="w-full shadow-md">
                体調予報へ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}
    </AppShell>
  );
}
