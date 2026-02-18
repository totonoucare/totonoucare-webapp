// app/guide/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

/* -----------------------------
 * Inline Icons（軽量）
 * ---------------------------- */
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2z" />
      <path d="M19 13l.7 3L22 17l-2.3 1-.7 3-.7-3L16 17l2.3-1 .7-3z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 12l8-4" />
      <path d="M12 12a8 8 0 1 0 8 8" />
      <path d="M12 12V4" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

/* -----------------------------
 * UI primitives（Result page taste）
 * ---------------------------- */
function AppBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="mx-auto w-full max-w-[440px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
          >
            <span className="text-slate-400">←</span>もどる
          </button>
          <div className="text-sm font-extrabold tracking-tight text-slate-800">{title}</div>
          <div className="w-[88px]" />
        </div>
      </div>
    </div>
  );
}

function Module({ children, className = "" }) {
  return (
    <section
      className={[
        "rounded-[26px] bg-[var(--panel)] shadow-sm ring-1 ring-[var(--ring)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function ModuleHeader({ icon, title, sub }) {
  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[var(--mint)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{title}</div>
            {sub ? <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-black/5" />
    </div>
  );
}

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

function Card({ title, icon, children }) {
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
    <div className="min-h-screen bg-app pb-10">
      <AppBar title="使い方" onBack={() => router.push("/")} />

      <div className="mx-auto w-full max-w-[440px] px-4">
        <div className="space-y-5 pb-3">
          {/* Hero */}
          <Module>
            <ModuleHeader
              icon={<IconSpark />}
              title="未病レーダーの使い方"
              sub="体質 × 気象で、崩れる前に先回りする"
            />
            <div className="px-5 pb-6 pt-4 space-y-4">
              <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_45%)] p-5 ring-1 ring-[var(--ring)]">
                <div className="text-xs font-bold text-[var(--accent-ink)]/80">目的</div>
                <div className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
                  不調が来る前に「危ない日」を知り、先回りして軽く済ませる
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
                <Card title="① 体質チェック" icon={<IconCheck />}>
                  直近2週間の傾向＋簡単な動作テストで、あなたの「崩れ方のクセ」を整理します。
                  結果は“軸”と“整えポイント”として表示されます。
                </Card>
                <Card title="② 体調予報（危険度）" icon={<IconRadar />}>
                  気象の揺れと体質を重ねて、崩れやすいタイミングを見える化します。
                  無料でも使えます（表示範囲はプランで変わります）。
                </Card>
                <Card title="③ 危ない日の先回り" icon={<IconBolt />}>
                  危険度が高い日は、その日の負担を軽くする“先回り”が出ます。
                  まずは「やる/やらない」を迷わない状態にするのが目的です。
                </Card>

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
                <Card title="軸（コアタイプ）" icon={<IconSpark />}>
                  体の“傾き”と“余力”を組み合わせて、崩れやすいパターンをまとめます。
                  「性格診断」ではなく、体調の波の出方の整理です。
                </Card>
                <Card title="整えポイント（最大2つ）" icon={<IconBolt />}>
                  今回の回答から、優先して整えると効率が良い領域を2つまで示します。
                  全部を一気に変えるより、まず2点に絞る方が再現性が出ます。
                </Card>
                <Card title="張りやすい場所（ライン）" icon={<IconRadar />}>
                  動作で違和感が出やすかったパターンを、体の“出やすいライン”として表示します。
                  不調が出たときの「場所の傾向」を掴むための指標です。
                </Card>

                <Button onClick={() => router.push("/check")}>体質チェックへ</Button>
              </div>
            </Module>
          ) : null}

          {tab === "radar" ? (
            <Module>
              <ModuleHeader icon={<IconRadar />} title="体調予報の見方" sub="危険度の意味と使いどころ" />
              <div className="px-5 pb-6 pt-4 space-y-3">
                <Card title="危険度＝崩れやすさの指標" icon={<IconRadar />}>
                  体質と気象の組み合わせで、今日は“崩れやすい側か”を見ます。
                  高い日は「頑張りが効く/効かない」より、先に“守り”を入れる日です。
                </Card>
                <Card title="先回りは短くていい" icon={<IconBolt />}>
                  危ない日は、時間をかけるほど良いとは限りません。
                  30秒〜数分で「悪化のきっかけ」を潰す設計が一番効きます。
                </Card>
                <Card title="表示範囲はプランで変わる" icon={<IconSpark />}>
                  無料でも使えます。より先の予報や、より細かいケア提案はプランで拡張されます。
                  まずは“危ない日を見逃さない”状態を作るのが最優先です。
                </Card>

                <Button onClick={() => router.push("/radar")}>体調予報へ</Button>
              </div>
            </Module>
          ) : null}
        </div>
      </div>
    </div>
  );
}
