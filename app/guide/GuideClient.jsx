// app/guide/GuideClient.jsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import {
  IconSpark,
  IconChecklist,
  IconWeather,
  IconRadar,
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
    <div className="flex rounded-[20px] bg-[#EDF2EF] p-1 ring-1 ring-inset ring-[#DDE7E1] shadow-inner">
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={[
              "flex-1 h-[38px] rounded-[16px] text-[12px] font-black tracking-tight transition-all duration-200",
              isActive
                ? "bg-[#EAF7F1] text-[#1F7D67] shadow-[0_10px_22px_-16px_rgba(47,129,110,0.54)] ring-1 ring-[#66B9A3]"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
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
    mint: {
      shell: "bg-[#F4FAF7] ring-[#D6E9E0]",
      icon: "bg-white text-[#2F816E] ring-[#CFE7DE]",
      rail: "bg-[#66B9A3]",
    },
    amber: {
      shell: "bg-[#FFF9EF] ring-[#F0DFC0]",
      icon: "bg-white text-[#A56C18] ring-[#EED8B4]",
      rail: "bg-[#E2AE45]",
    },
    indigo: {
      shell: "bg-[#F5F7FB] ring-[#DEE4F0]",
      icon: "bg-white text-[#5E6F98] ring-[#D7DDEA]",
      rail: "bg-[#8A9BC3]",
    },
    violet: {
      shell: "bg-[#F8F5FA] ring-[#E7DDEB]",
      icon: "bg-white text-[#7B6588] ring-[#E2D6E7]",
      rail: "bg-[#A78BB3]",
    },
    teal: {
      shell: "bg-[#F1F8F6] ring-[#D4E8E2]",
      icon: "bg-white text-[#347F72] ring-[#CCE4DD]",
      rail: "bg-[#67AA9A]",
    },
  };
  const style = tones[tone] || tones.mint;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[24px] ring-1 shadow-[inset_0_2px_8px_rgba(15,23,42,0.035),0_14px_30px_-26px_rgba(15,23,42,0.34)]",
        style.shell,
        compact ? "p-4" : "p-5",
      ].join(" ")}
    >
      <span className={["absolute inset-y-5 left-0 w-1 rounded-r-full", style.rail].join(" ")} />
      <div className={compact ? "flex items-center gap-2.5 pl-1" : "flex items-center gap-3 pl-1"}>
        <div
          className={[
            "grid shrink-0 place-items-center ring-1 shadow-sm",
            compact ? "h-10 w-10 rounded-[13px]" : "h-11 w-11 rounded-[14px]",
            style.icon,
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
          "pl-1 font-bold text-slate-700",
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
    <div className="rounded-[22px] bg-[#EAF7F1] p-4 ring-1 ring-[#CFE7DE] shadow-[inset_0_2px_8px_rgba(47,129,110,0.07),inset_0_-18px_26px_rgba(255,255,255,0.34)]">
      <div className="mb-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-widest text-[#2F816E] ring-1 ring-[#CFE7DE]">
        使い方のコツ
      </div>
      <div className="text-[12px] font-extrabold leading-6 text-slate-700">
        {children}
      </div>
    </div>
  );
}

function CheckList({ items }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-[12px] font-bold leading-5 text-slate-600">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#66B9A3]" />
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
        <div key={label} className="rounded-[14px] bg-white/80 px-3 py-2 ring-1 ring-[#DCE8DD] shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[12px] font-black text-[#2F816E]">{label}</span>
            <span className="text-[11px] font-extrabold leading-5 text-slate-600">{meaning}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowItem({ num, title, children }) {
  return (
    <div className="flex gap-3.5 rounded-[22px] bg-[#F4FAF7] p-4 ring-1 ring-[#D6E9E0] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)]">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#66B9A3] text-[13px] font-black text-white ring-1 ring-[#CFE7DE] shadow-sm">
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
      { key: "check", label: "①トリセツ" },
      { key: "radar", label: "②体調予報" },
      { key: "care", label: "③MYケア" },
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
        <div className="relative overflow-hidden rounded-[32px] bg-[#EFF8F4] px-5 py-6 ring-1 ring-[#CFE7DE] shadow-[0_18px_45px_-34px_rgba(47,129,110,0.38)] sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border border-white/75 bg-white/30" />
          <div className="pointer-events-none absolute right-8 top-10 h-24 w-24 rounded-full border border-[#CFE7DE]/80" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-[#DDEFE7]/70" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-[#CFE7DE]">
              <IconSpark className="h-4 w-4 text-[#2F816E]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#2F816E]">
                未病レーダーの使い方
              </span>
            </div>

            <div className="mt-5 text-[24px] font-black tracking-tight text-slate-900 leading-[1.32]">
              体質と天気から、<br />
              今日・明日の<span className="text-[#2F816E]">体調ゆらぎ</span>を見る。
            </div>

            <div className="mt-3.5 text-[13px] font-bold leading-6 text-slate-700">
              トリセツで自分の崩れ方のクセを知り、予報で今日・明日の作戦を確認。必要な時だけ、MYケアセレクトで続けやすい候補を見ます。
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "トリセツ", sub: "体質を知る", Icon: IconConstitution },
                { label: "体調予報", sub: "ゆらぎを見る", Icon: IconRadar },
                { label: "MYケア", sub: "候補を見る", Icon: IconChecklist },
              ].map(({ label, sub, Icon }, index) => (
                <div key={label} className="rounded-[18px] bg-white/80 p-3 ring-1 ring-white shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#F4FAF7] text-[#2F816E] ring-1 ring-[#CFE7DE]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#66B9A3]">0{index + 1}</span>
                  </div>
                  <div className="mt-2 text-[11px] font-black text-slate-900">{label}</div>
                  <div className="mt-0.5 text-[9px] font-bold leading-4 text-slate-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Module>

      {/* タブナビゲーション */}
      <div className="sticky top-[60px] z-20 -mx-1 mb-2 bg-app/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-app/80">
        <SegmentedTabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {/* 1. 全体像タブ */}
      {tab === "start" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">
            基本の流れ
          </div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            まずトリセツを作り、予報で今日・明日の作戦を見て、必要ならMYケアセレクトでケア用品・食品・サービス候補を見ます。
          </div>

          <div className="space-y-4">
            <FlowItem num="1" title="体質トリセツを作る">
              質問に答えて、体質・天気との相性・負担が出やすい場所を見える化します。
            </FlowItem>
            <FlowItem num="2" title="体調予報を見る">
              今日・明日の天気が、今の体質や不調にどう響きそうかを確認します。予報ページのケアは、道具なしでも今できる工夫が中心です。
            </FlowItem>
            <FlowItem num="3" title="MYケアセレクトで候補を見る">
              予報で出た方針や、体質トリセツ・季節・最近の生活条件をもとに、暮らす・食べる・ほぐすのケア用品・食品・サービス候補を見ます。
            </FlowItem>

            <MiniNote>
              予報ページは「今日どう過ごすか」を決める作戦表、MYケアセレクトは「そのケアを続けやすくする候補を見る場所」です。詳しい見方は、①トリセツ・②予報・③MYケアのタブで確認できます。
            </MiniNote>

            <div className="grid gap-3 pt-4">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                体質トリセツを作る
              </Button>
              <Button variant="secondary" onClick={() => router.push("/radar")} className="w-full">
                体調予報を見る
              </Button>
              <Button variant="secondary" onClick={() => router.push("/care-navi")} className="w-full">
                MYケアセレクトを見る
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 2. 体質チェック詳細タブ */}
      {tab === "check" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">
            体質トリセツで分かること
          </div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            病名を当てるのではなく、体調が崩れやすい方向を整理するためのトリセツです。
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
              トリセツは一度作ると、体調予報やMYケアセレクトの土台になります。体質・天気との相性・負担が出やすい場所を、あとから見返せます。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">
                体質トリセツへ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 3. 体調予報詳細タブ */}
      {tab === "radar" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">
            体調予報の見方
          </div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            予報は「影響の強さ」だけでなく、道具なしでも今日できるケアまで見るページです。
          </div>

          <div className="space-y-4">
            <GuideCard tone="amber" title="まずゲージを見る" icon={<IconRadar />}>
              今日・明日の天気影響がどのくらい出そうかを確認します。「影響は少なめ」「少し響きやすい」「守りたい日」のように、ケアの量や優先度を決める目安になります。
            </GuideCard>

            <GuideCard tone="mint" title="この日の方針を見る" icon={<IconSpark />}>
              「しずめる」「ながす」「ささえる」など、その日のケア全体の方向性をまとめたカードです。ここで大まかな見立てをつかみ、実際に何をするかは「暮らす」「食べる」「ほぐす」の各タブで、道具なしでもできる形に落とし込みます。
              <PolicyMeaningList />
            </GuideCard>

            <GuideCard tone="teal" title="「暮らす」タブを見る" icon={<IconCalendar />}>
              服装、予定量、休み方、動き出しなど、生活の中ですぐ試しやすい工夫をまとめています。アイテムがなくてもできるケアを優先して確認できます。
              <CheckList
                items={[
                  "今日タブは、今日これ以上崩さないための工夫。",
                  "明日タブは、今夜〜明朝に備えるための工夫。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="mint" title="「食べる」タブを見る" icon={<IconBowl />}>
              食事を完璧に変える場所ではありません。今日・明日に合わせて、家にあるものでもできる「足すもの」「重ねすぎ注意」「迷ったらこれ」を見る場所です。
              <CheckList
                items={[
                  "足す：温かい汁物、軽めの主食、温かい飲み物など。",
                  "重ねすぎ注意：お酒、甘いもの、冷たいもの、塩気、脂っこさなど。",
                  "迷ったら：その日の条件に合う無理のない選択肢。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="violet" title="「ほぐす」タブを見る" icon={<IconTsubo />}>
              天気や今気になる不調に合わせて、軽くほぐしたいツボを表示します。基本は手で押すだけでもできる内容です。ツボ詳細では、選んだ理由、ほぐし方の目安、場所の確認ができます。
              <CheckList
                items={[
                  "場所が分かりにくい時は、ツボ詳細の画像検索から確認できます。",
                  "強く押し込まず、気持ちよい範囲で短く行います。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="indigo" title="地域と不調も確認する" icon={<IconCalendar />}>
              体調予報は、設定した地域の天気と、今見ている不調をもとに作られます。引っ越しや旅行の時は設定ページで地域を変更し、頭痛・首肩・腰・むくみなど見たい不調は予報ページで切り替えてください。
            </GuideCard>

            <MiniNote>
              ゲージとこの日の方針で大まかな方向を見て、実際にやることは暮らす・食べる・ほぐすから選びます。まずは道具なしでできるケアを確認し、続けやすくしたい時はMYケアセレクトで関連アイテムを見られます。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/radar")} className="w-full shadow-md">
                体調予報へ
              </Button>
              <Button variant="secondary" onClick={() => router.push("/care-navi")} className="w-full">
                MYケアセレクトで候補を見る
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* 4. MYケアセレクト詳細タブ */}
      {tab === "care" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">
            MYケアセレクトの見方
          </div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            MYケアセレクトは、予報ページのケアを「続けやすくするケア用品・食品・サービス候補」を見るページです。予報の上位互換ではなく、役割が違います。
          </div>

          <div className="space-y-4">
            <GuideCard tone="mint" title="予報ページとの違い" icon={<IconRadar />}>
              予報ページでは、今日・明日に道具なしでもできるケアを確認します。MYケアセレクトでは、そのケアを支えるアイテム候補を、体質や条件に合わせて見られます。
              <CheckList
                items={[
                  "予報：今日どう過ごすか、何を足す・控えるかを見る。",
                  "MYケアセレクト：そのケアを続けやすくするケア用品・食品・サービス候補を見る。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="teal" title="暮らす・食べる・ほぐすで探す" icon={<IconChecklist />}>
              予報ページと同じく、暮らす・食べる・ほぐすの切り口で見られます。ただし、MYケアセレクトでは「方法」だけでなく、使いやすいアイテム候補まで見る場所です。
              <CheckList
                items={[
                  "暮らす：冷え・睡眠・湿気・入浴・衣類などの生活用品。",
                  "食べる：温かい飲み物、汁物、茶類、軽めの食事まわり。",
                  "ほぐす：ツボケア、首肩・足元・こわばりを助ける道具。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="amber" title="見る条件を切り替える" icon={<IconSpark />}>
              トリセツ、明日の予報、季節、最近の生活条件を切り替えると、候補の出方が変わります。今の目的に近いものを選ぶと、探しやすくなります。
              <CheckList
                items={[
                  "トリセツ：自分の崩れ方のクセから探す。",
                  "明日の予報：明日に備える前提で探す。",
                  "季節・最近の生活：冷え、湿気、睡眠不足、食べすぎなどを追加して探す。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="violet" title="買う前に、まず目的を確認する" icon={<IconBowl />}>
              MYケアセレクトは買い物を急がせるページではありません。予報ページで出たケアを、無理なく続けるために「あると便利なもの」を見る場所です。
              <CheckList
                items={[
                  "今日すぐできることは、まず予報ページのケアで十分です。",
                  "続けたい・楽にしたい・家に置いておきたい時に、MYケアセレクトを使います。",
                  "医薬品ではなく、セルフケア用品や食品候補が中心です。",
                ]}
              />
            </GuideCard>

            <MiniNote>
              まず予報ページで今日の作戦を見て、必要になった時だけMYケアセレクトを見る。この順番にすると、情報が散らからず使いやすくなります。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/care-navi")} className="w-full shadow-md">
                MYケアセレクトへ
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

          </AppShell>
  );
}

