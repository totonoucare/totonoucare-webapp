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
  IconConstitution,
  IconBodyLine,
  IconTsubo,
  IconBowl,
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
 * ガイドカード
 * ---------------------------- */
function GuideCard({ title, icon, tone = "mint", compact = false, children }) {
  const tones = {
    mint: "text-[var(--accent-ink)] bg-[#E2F1EA]",
    amber: "text-amber-800 bg-amber-100",
    indigo: "text-indigo-800 bg-indigo-100",
    violet: "text-violet-800 bg-violet-100",
    teal: "text-teal-800 bg-teal-100",
  };

  return (
    <div
      className={[
        "rounded-[24px] bg-white ring-1 ring-[var(--ring)] shadow-sm",
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <div className={compact ? "flex items-center gap-2.5" : "flex items-center gap-3"}>
        <div
          className={[
            "grid shrink-0 place-items-center ring-1 ring-[var(--ring)] shadow-sm",
            compact ? "h-10 w-10 rounded-[13px]" : "h-11 w-11 rounded-[14px]",
            tones[tone],
          ].join(" ")}
        >
          {icon}
        </div>
        <div
          className={[
            "font-black tracking-tight text-slate-900",
            compact ? "text-[14px]" : "text-[16px]",
          ].join(" ")}
        >
          {title}
        </div>
      </div>
      <div
        className={[
          "font-bold text-slate-700",
          compact ? "mt-3 text-[12px] leading-5" : "mt-3.5 text-[13px] leading-6",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function MiniNote({ children }) {
  return (
    <div className="rounded-[20px] bg-[#E2F1EA]/55 p-4 text-[12px] font-extrabold leading-6 text-[#255F4F] ring-1 ring-[#BFD9CC]/70">
      {children}
    </div>
  );
}

function CheckList({ items }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-[12px] font-bold leading-5 text-slate-600">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

const CARE_POLICY_GUIDE_ITEMS = [
  ["しずめる", "熱・冴え・高ぶりを落ち着ける"],
  ["ゆるめる", "力み・こわばり・緊張をほどく"],
  ["めぐらせる", "滞りやこもりに逃げ道を作る"],
  ["ながす", "湿気・重だるさ・水っぽさをためない"],
  ["うるおす", "乾き・消耗を残さない"],
  ["ぬくめる", "冷えの入口を守る"],
  ["ささえる", "胃腸・回復力・余力を削らない"],
];

function PolicyMeaningList() {
  return (
    <div className="mt-3 grid gap-2">
      {CARE_POLICY_GUIDE_ITEMS.map(([label, meaning]) => (
        <div key={label} className="rounded-[14px] bg-[#E2F1EA]/55 px-3 py-2 ring-1 ring-[#BFD9CC]/60">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[12px] font-black text-[#255F4F]">{label}</span>
            <span className="text-[11px] font-extrabold leading-5 text-slate-600">{meaning}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowItem({ num, title, children }) {
  return (
    <div className="flex gap-3.5 rounded-[22px] bg-[#E2F1EA]/55 p-4 ring-1 ring-[#BFD9CC]/70">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[13px] font-black text-[#255F4F] ring-1 ring-[#BFD9CC]">
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-black leading-6 text-slate-900">{title}</div>
        <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
          {children}
        </div>
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
      { key: "check", label: "①カルテ" },
      { key: "radar", label: "②予報" },
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
      <Module className="mb-4 overflow-hidden border-none bg-transparent shadow-none ring-0">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#DDEFE6] via-[#F4FAF7] to-white px-6 py-7 shadow-[0_18px_45px_rgba(37,95,79,0.12)] ring-1 ring-[#BFD9CC]/70">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/80 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[#8DC7AD]/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-5 right-5 h-20 w-20 rounded-full border border-white/70 bg-white/20" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-1.5 shadow-sm ring-1 ring-[#BFD9CC]/70 backdrop-blur-md">
              <IconSpark className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]">
                未病レーダーの使い方
              </span>
            </div>

            <div className="mt-5 text-[24px] font-black tracking-tight text-slate-900 leading-[1.32]">
              体質と天気から、<br />
              今日・明日の<span className="text-[var(--accent-ink)]">整え方</span>を選ぶ。
            </div>

            <div className="mt-3.5 text-[13px] font-bold leading-relaxed text-slate-700/90">
              カルテで自分の崩れ方のクセを知り、予報で今日・明日の過ごし方を選びます。迷ったら、まずは暮らすカードから見てください。
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-[18px] bg-white/80 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC]">
                  <IconConstitution className="h-4 w-4" />
                </div>
                <div className="mt-2 text-[11px] font-black text-slate-900">カルテ</div>
                <div className="mt-0.5 text-[10px] font-bold leading-4 text-slate-500">体質を知る</div>
              </div>
              <div className="rounded-[18px] bg-white/80 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC]">
                  <IconWeather className="h-4 w-4" />
                </div>
                <div className="mt-2 text-[11px] font-black text-slate-900">予報</div>
                <div className="mt-0.5 text-[10px] font-bold leading-4 text-slate-500">影響を見る</div>
              </div>
              <div className="rounded-[18px] bg-white/80 p-3 shadow-sm ring-1 ring-white/80 backdrop-blur">
                <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#E2F1EA] text-[#255F4F] ring-1 ring-[#BFD9CC]">
                  <IconChecklist className="h-4 w-4" />
                </div>
                <div className="mt-2 text-[11px] font-black text-slate-900">ケア</div>
                <div className="mt-0.5 text-[10px] font-bold leading-4 text-slate-500">選んで整える</div>
              </div>
            </div>
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
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            基本の流れ
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            まずカルテを作り、その日の予報を見て、必要なケアだけ選びます。
          </div>

          <div className="space-y-4">
            <FlowItem num="1" title="未病カルテを作る">
              質問に答えて、体質・天気との相性・負担が出やすい場所を見える化します。
            </FlowItem>
            <FlowItem num="2" title="未病予報を見る">
              今日と明日の天気が、今の体質や不調にどう響きそうかを確認します。
            </FlowItem>
            <FlowItem num="3" title="暮らす・食べる・ほぐすを選ぶ">
              全部やる必要はありません。服装、食事、ツボケアの中から、その日に取り入れやすいものを選びます。
            </FlowItem>

            <MiniNote>
              基本はこの3ステップです。詳しい見方は、①カルテ・②予報のタブで確認できます。
            </MiniNote>

            <div className="grid gap-3 pt-4">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                未病カルテを作る
              </Button>
              <Button variant="secondary" onClick={() => router.push("/radar")} className="w-full">
                未病予報を見る
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 2. 体質チェック詳細タブ */}
      {tab === "check" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            未病カルテで分かること
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            病名を当てるのではなく、体調が崩れやすい方向を整理するためのカルテです。
          </div>

          <div className="space-y-4">
            <GuideCard tone="mint" title="ベース体質" icon={<IconConstitution />}>
              余力の大きさと、アクセル・ブレーキの入りやすさから、あなたの基本的な崩れ方のクセを整理します。
            </GuideCard>
            <GuideCard tone="teal" title="気・血・水の偏り" icon={<IconSpark />}>
              疲れやすさ、巡りにくさ、重だるさ、乾きやすさなど、今の不調につながりやすい偏りを見ます。
            </GuideCard>
            <GuideCard tone="violet" title="負担が出やすい体のライン" icon={<IconBodyLine />}>
              動作チェックの違和感から、首肩、腰、体側、脚など、こわばりやすいラインを見ます。
            </GuideCard>
            <GuideCard tone="amber" title="天気との相性" icon={<IconWeather />}>
              気圧低下、冷え込み、湿気、暑さ、乾燥など、どの天気変化で不調が出やすいかを予報に使います。
            </GuideCard>

            <MiniNote>
              カルテは一度作ると、未病予報の土台になります。未病カルテPlus（不調マップ）は、自分の傾向をさらに詳しく見るための追加ページです。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                未病カルテへ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 3. 未病予報詳細タブ */}
      {tab === "radar" ? (
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900 mb-2">
            未病予報の見方
          </div>
          <div className="text-[13px] font-bold leading-6 text-slate-600 mb-5">
            予報は「影響の強さ」だけでなく、今日どう過ごすかまで見るページです。
          </div>

          <div className="space-y-4">
            <GuideCard tone="amber" title="まずゲージを見る" icon={<IconWeather />}>
              今日・明日の天気影響がどのくらい出そうかを確認します。「安定モード」「いたわりモード」「守りモード」として、その日のケアの量や優先度を決める目安になります。
            </GuideCard>

            <GuideCard tone="mint" title="この日の方針を見る" icon={<IconSpark />}>
              「しずめる」「ながす」「ささえる」など、その日のケア全体の方向性をまとめたカードです。ここで大まかな見立てをつかみ、実際に何をするかは「暮らす」「食べる」「ほぐす」の各タブで提案します。
              <PolicyMeaningList />
            </GuideCard>

            <GuideCard tone="teal" title="「暮らす」タブを見る" icon={<IconCalendar />}>
              服装、予定量、休み方、動き出しなど、生活の中ですぐ試しやすい工夫をまとめています。時間がない時は、まず暮らすカードを見るのが使いやすいです。
              <CheckList
                items={[
                  "今日タブは、今日これ以上崩さないための工夫。",
                  "明日タブは、今夜〜明朝に備えるための工夫。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="mint" title="「食べる」タブを見る" icon={<IconBowl />}>
              食事を完璧に変える場所ではありません。今日・明日に合わせて「足すもの」「重ねすぎ注意」「迷ったらこれ」を見る場所です。
              <CheckList
                items={[
                  "足す：温かい汁物、軽めの主食、温かい飲み物など。",
                  "重ねすぎ注意：お酒、甘いもの、冷たいもの、塩気、脂っこさなど。",
                  "迷ったら：その日の条件に合う無理のない選択肢。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="violet" title="「ほぐす」タブを見る" icon={<IconTsubo />}>
              天気や今気になる不調に合わせて、軽くほぐしたいツボを表示します。ツボ詳細では、選んだ理由、ほぐし方の目安、場所の確認ができます。
              <CheckList
                items={[
                  "場所が分かりにくい時は、ツボ詳細の画像検索から確認できます。",
                  "強く押し込まず、気持ちよい範囲で短く行います。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="indigo" title="地域と不調も確認する" icon={<IconCalendar />}>
              未病予報は、設定した地域の天気と、今見ている不調をもとに作られます。引っ越しや旅行の時は設定ページで地域を変更し、頭痛・首肩・腰・むくみなど見たい不調は予報ページで切り替えてください。
            </GuideCard>

            <MiniNote>
              ゲージとこの日の方針で大まかな方向を見て、実際にやることは暮らす・食べる・ほぐすから選びます。必要なところだけ見れば大丈夫です。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/radar")} className="w-full shadow-md">
                未病予報へ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}
    </AppShell>
  );
}


