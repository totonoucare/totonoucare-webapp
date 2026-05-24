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
      <Module className="mb-4 overflow-hidden border-none ring-1 ring-[var(--ring)] shadow-sm">
        <div className="relative px-6 py-7 bg-gradient-to-br from-[color-mix(in_srgb,var(--mint),white_35%)] to-[color-mix(in_srgb,var(--mint),white_75%)]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/70 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
              <IconSpark className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]">
                未病レーダーの使い方
              </span>
            </div>

            <div className="mt-5 text-[22px] font-black tracking-tight text-slate-900 leading-[1.35]">
              体質と天気から、<br />
              今日・明日の<span className="text-[var(--accent-ink)]">整え方</span>を選ぶ。
            </div>

            <div className="mt-3.5 text-[13px] font-bold leading-relaxed text-slate-700/90">
              未病レーダーは、体質チェックで分かる「崩れ方のクセ」と、気圧・気温・湿度などの天気変化を合わせて、暮らす・食べる・ほぐすのケアを提案します。
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

            <GuideCard tone="mint" title="今気になる不調を切り替える" icon={<IconBodyLine />} compact>
              予報ページでは、頭痛・首肩・腰・むくみなど、今いちばん見たい不調を切り替えられます。切り替えると、予報カードやケア文言もその不調に合わせて変わります。
            </GuideCard>

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
              カルテは一度作ると、未病予報の土台になります。気になる不調が変わった時は、予報ページ側で「今気になる不調」を切り替えて見られます。
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
              今日・明日の天気影響がどのくらい出そうかを確認します。「影響は少なめ」「少し響きやすい」「守りたい日」のように、ケアの強さを決める目安になります。
            </GuideCard>

            <GuideCard tone="mint" title="この日の方針を見る" icon={<IconSpark />}>
              「しずめる」「ながす」「ささえる」など、その日のケア全体の方向性をまとめたカードです。ここで大まかな見立てをつかみ、実際に何をするかは下のカードから選びます。
            </GuideCard>

            <GuideCard tone="teal" title="暮らすを見る" icon={<IconCalendar />}>
              服装、予定量、休み方、動き出しなど、生活の中ですぐ試しやすい工夫をまとめています。時間がない時は、まず暮らすカードを見るのが使いやすいです。
              <CheckList
                items={[
                  "今日タブは、今日これ以上崩さないための工夫。",
                  "明日タブは、今夜〜明朝に備えるための工夫。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="mint" title="食べるを見る" icon={<IconBowl />}>
              食事を完璧に変える場所ではありません。今日・明日に合わせて「足すもの」「重ねすぎ注意」「迷ったらこれ」を見る場所です。
              <CheckList
                items={[
                  "足す：温かい汁物、軽めの主食、温かい飲み物など。",
                  "重ねすぎ注意：お酒、甘いもの、冷たいもの、塩気、脂っこさなど。",
                  "迷ったら：その日の条件に合う無理のない選択肢。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="violet" title="ほぐすを見る" icon={<IconTsubo />}>
              天気や今気になる不調に合わせて、軽くほぐしたいツボを表示します。ツボ詳細では、選んだ理由、ほぐし方の目安、場所の確認ができます。
              <CheckList
                items={[
                  "場所が分かりにくい時は、ツボ詳細の画像検索から確認できます。",
                  "強く押し込まず、気持ちよい範囲で短く行います。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="indigo" title="地域設定も忘れずに" icon={<IconCalendar />}>
              未病予報は、設定した地域の天気をもとに作られます。引っ越しや旅行などで見る地域を変えたい時は、設定ページから地域を変更してください。
            </GuideCard>

            <MiniNote>
              不調マップやPlusは、自分の傾向をさらに詳しく見るための入口です。まずは、カルテと今日・明日の予報を日常で使うところから始めてください。
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
