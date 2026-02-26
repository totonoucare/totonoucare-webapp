// app/guide/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { IconSpark, IconCheck, IconRadar, IconBolt } from "@/components/illust/icons/guide";

/* -----------------------------
 * Segments + Card (軽量UI)
 * ---------------------------- */
function Segments({ items, active, onChange }) {
  return (
    <div className="rounded-[18px] bg-white ring-1 ring-[var(--ring)] p-1 flex gap-1">
      {items.map((it) => {
        const a = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              "flex-1 rounded-[14px] px-3 py-2 text-xs font-extrabold transition",
              a ? "bg-[var(--mint)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)]" : "text-slate-500",
            ].join(" ")}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniCard({ title, icon, children }) {
  return (
    <div className="rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[color-mix(in_srgb,var(--mint),white_55%)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
          {icon}
        </div>
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-700">{children}</div>
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
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
    >
      {/* Hero */}
      <Module>
        <ModuleHeader icon={<IconSpark />} title="未病レーダーの使い方" sub="体質 × 気象で、崩れる前に先回りする" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
            <div className="text-xs font-bold text-[var(--accent-ink)]/80">目的</div>
            <div className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
              不調が来る前に「危ないタイミング」を知って、先回りで軽く済ませる
            </div>
            <div className="mt-2 text-sm leading-7 text-slate-700">
              体質チェックで「崩れ方のクセ」を掴み、体調予報で“揺れやすいタイミング”を先回りで備えます。
            </div>
          </div>

          <Segments items={tabs} active={tab} onChange={setTab} />
        </div>
      </Module>

      {/* Content */}
      {tab === "start" ? (
        <Module>
          <ModuleHeader icon={<IconSpark />} title="全体の流れ（3ステップ）" sub="迷ったらここだけ読めばOK" />
          <div className="px-5 pb-6 pt-4 space-y-3">
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

            <div className="grid gap-2 pt-2">
              <Button onClick={() => router.push("/check")}>体質チェックをはじめる</Button>
              <Button variant="secondary" onClick={() => router.push("/radar")}>
                体調予報を見る
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "check" ? (
        <Module>
          <ModuleHeader icon={<IconCheck />} title="体質チェックの読み方" sub="何を測って、何が返る？" />
          <div className="px-5 pb-6 pt-4 space-y-3">
            <MiniCard title="体質の軸（コアタイプ）" icon={<IconSpark />}>
              「性格診断」ではなく、体調の波の出方をまとめた“型”です。覚えやすい名称＋裏の説明で理解できる設計にします。
            </MiniCard>
            <MiniCard title="整えポイント（最大2つ）" icon={<IconBolt />}>
              今回の回答から、優先して整えると効率が良い領域を2つまで示します。全部盛りより再現性重視です。
            </MiniCard>
            <MiniCard title="張りやすい場所（ライン）" icon={<IconRadar />}>
              動作で違和感が出やすかったパターンを、体の“出やすいライン”として表示します。
            </MiniCard>

            <Button onClick={() => router.push("/check")}>体質チェックへ</Button>
          </div>
        </Module>
      ) : null}

      {tab === "radar" ? (
        <Module>
          <ModuleHeader icon={<IconRadar />} title="体調予報の見方" sub="危険度の意味と使いどころ" />
          <div className="px-5 pb-6 pt-4 space-y-3">
            <MiniCard title="危険度＝崩れやすさの指標" icon={<IconRadar />}>
              体質と気象の組み合わせで「崩れやすい側か」を見ます。高い日は“攻め”より先に“守り”を入れる日です。
            </MiniCard>
            <MiniCard title="先回りは短くていい" icon={<IconBolt />}>
              危ない日は、時間をかけるほど良いとは限りません。30秒〜数分で「悪化のきっかけ」を潰す設計が一番効きます。
            </MiniCard>
            <MiniCard title="表示範囲はプランで変わる" icon={<IconSpark />}>
              無料でも使えます。より先の予報や、より細かい提案はプランで拡張されます。まずは見逃さない状態づくりが最優先です。
            </MiniCard>

            <Button onClick={() => router.push("/radar")}>体調予報へ</Button>
          </div>
        </Module>
      ) : null}
    </AppShell>
  );
}
