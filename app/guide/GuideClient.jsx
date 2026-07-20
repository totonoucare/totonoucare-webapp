"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import {
  IconSpark,
  IconPencil,
  IconAnalysis,
  IconWeather,
  IconRadar,
  IconCare,
  IconCalendar,
  IconConstitution,
  IconBodyLine,
  IconBowl,
} from "@/components/illust/icons/guide";

function SegmentedTabs({ items, active, onChange }) {
  return (
    <div className="flex rounded-[20px] bg-[#EDF2EF] p-1 ring-1 ring-inset ring-[#DDE7E1] shadow-inner">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              "min-w-0 flex-1 rounded-[16px] px-1.5 py-2.5 text-[10px] font-black leading-4 tracking-tight transition-all duration-200 sm:text-[11px]",
              isActive
                ? "bg-[#EAF7F1] text-[#1F7D67] shadow-[0_10px_22px_-16px_rgba(47,129,110,0.54)] ring-1 ring-[#66B9A3]"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

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

function MiniNote({ label = "使い方のコツ", children }) {
  return (
    <div className="rounded-[22px] bg-[#EAF7F1] p-4 ring-1 ring-[#CFE7DE] shadow-[inset_0_2px_8px_rgba(47,129,110,0.07),inset_0_-18px_26px_rgba(255,255,255,0.34)]">
      <div className="mb-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-widest text-[#2F816E] ring-1 ring-[#CFE7DE]">
        {label}
      </div>
      <div className="text-[12px] font-extrabold leading-6 text-slate-700">{children}</div>
    </div>
  );
}

function CheckList({ items, tone = "mint" }) {
  const dot = tone === "amber" ? "bg-[#E2AE45]" : tone === "violet" ? "bg-[#A78BB3]" : "bg-[#66B9A3]";
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex gap-2 text-[12px] font-bold leading-5 text-slate-600">
          <span className={["mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", dot].join(" ")} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function FlowItem({ num, title, children, tone = "mint" }) {
  const toneClass = tone === "amber"
    ? "bg-[#FFF9EF] ring-[#F0DFC0]"
    : tone === "violet"
      ? "bg-[#F8F5FA] ring-[#E7DDEB]"
      : "bg-[#F4FAF7] ring-[#D6E9E0]";
  const numberClass = tone === "amber"
    ? "bg-[#E2AE45] ring-[#F0DFC0]"
    : tone === "violet"
      ? "bg-[#A78BB3] ring-[#E7DDEB]"
      : "bg-[#66B9A3] ring-[#CFE7DE]";
  return (
    <div className={["flex gap-3.5 rounded-[22px] p-4 ring-1 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)]", toneClass].join(" ")}>
      <div className={["grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-black text-white ring-1 shadow-sm", numberClass].join(" ")}>
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-black leading-6 text-slate-900">{title}</div>
        <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function ModeGuide() {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[
        ["安定", "いつもどおりを保つ", "bg-[#F2FAF6] text-[#2F816E] ring-[#CFE7DE]"],
        ["いたわり", "少し早めに整える", "bg-[#FFF9EF] text-[#A56C18] ring-[#EED8B4]"],
        ["守り", "負担を減らして備える", "bg-[#FFF4F0] text-[#B2604C] ring-[#F1CFC5]"],
      ].map(([label, text, className]) => (
        <div key={label} className={["rounded-[16px] p-2.5 text-center ring-1", className].join(" ")}>
          <div className="text-[11px] font-black">{label}</div>
          <div className="mt-1 text-[9px] font-bold leading-4 opacity-80">{text}</div>
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();
  const [tab, setTab] = useState("flow");

  const tabs = useMemo(
    () => [
      { key: "flow", label: "基本の流れ" },
      { key: "radar", label: "予報・ケア" },
      { key: "records", label: "記録・相談" },
      { key: "care", label: "ショップ" },
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
      <Module className="mb-4 overflow-hidden border-none bg-transparent shadow-none ring-0">
        <div className="relative overflow-hidden rounded-[32px] bg-[#EFF8F4] px-5 py-6 ring-1 ring-[#CFE7DE] shadow-[0_18px_45px_-34px_rgba(47,129,110,0.38)] sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full border border-white/75 bg-white/30" />
          <div className="pointer-events-none absolute right-8 top-10 h-24 w-24 rounded-full border border-[#CFE7DE]/80" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-[#DDEFE7]/70" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-[#CFE7DE]">
              <IconSpark className="h-4 w-4 text-[#2F816E]" />
              <span className="text-[10px] font-black tracking-widest text-[#2F816E]">未病レーダーの使い方</span>
            </div>

            <div className="mt-5 text-[24px] font-black leading-[1.34] tracking-tight text-slate-900">
              予報を見て、ケアを試し、<br />
              <span className="text-[#2F816E]">自分の傾向</span>へつなげる。
            </div>

            <div className="mt-3.5 text-[13px] font-bold leading-6 text-slate-700">
              体質と天気から今日・明日の体調ゆらぎを確認し、できそうなケアだけ試します。夜に実感を残すと、どんな日に何をすると過ごしやすかったかが少しずつ見えてきます。
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                { label: "トリセツ", sub: "自分の体質を知る", Icon: IconConstitution, num: "01" },
                { label: "体調予報", sub: "今日・明日のゆらぎを見る", Icon: IconRadar, num: "02" },
                { label: "対策ケア", sub: "先回りして整える", Icon: IconCare, num: "03" },
                { label: "記録・相談", sub: "実感を残し、AIや人に相談", Icon: IconPencil, num: "04" },
              ].map(({ label, sub, Icon, num }) => (
                <div key={label} className="rounded-[18px] bg-white/80 p-3 ring-1 ring-white shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-[12px] bg-[#F4FAF7] text-[#2F816E] ring-1 ring-[#CFE7DE]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-[#66B9A3]">{num}</span>
                  </div>
                  <div className="mt-2 text-[11px] font-black text-slate-900">{label}</div>
                  <div className="mt-0.5 text-[9px] font-bold leading-4 text-slate-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Module>

      <div className="sticky top-[60px] z-20 -mx-1 mb-2 bg-app/90 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-app/80">
        <SegmentedTabs items={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "flow" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">まず、この流れだけで大丈夫</div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            毎日すべての機能を使う必要はありません。初回にトリセツを作り、普段は予報を見て対策ケアを試し、実感の記録や必要な相談につなげます。
          </div>

          <div className="space-y-4">
            <GuideCard tone="indigo" title="初回：体質トリセツを作る" icon={<IconConstitution />}>
              質問から、ベース体質、気・血・水の傾向、天気との相性、負担が出やすい体のラインを整理します。この結果が体調予報の土台になります。
              <CheckList
                items={[
                  "予報に使う地域を設定します。",
                  "予報で見たい不調は、頭・首肩・胃腸・腰などから切り替えられます。",
                ]}
              />
            </GuideCard>

            <div className="pt-1 text-[12px] font-black tracking-[0.12em] text-slate-400">毎日の基本</div>
            <FlowItem num="1" title="今日・明日の体調ゆらぎを見る">
              体調ゆらぎ度と、安定・いたわり・守りのモードから、その日にどのくらい備えるかを確認します。
            </FlowItem>
            <FlowItem num="2" title="対策ケアで先回りする" tone="amber">
              暮らす・食べる・ほぐすの中から、無理なくできそうなものを一つ選びます。実際に試したら、その場で「やってみた」を押して記録します。
            </FlowItem>
            <FlowItem num="3" title="夜に実感を残す" tone="violet">
              記録ページで、その日の実感を○・△・×から選びます。予報ページでケアを記録済みなら、内容は自動で入り、当日ケアのタイミングだけ確認します。
            </FlowItem>
            <FlowItem num="4" title="自分に合う整え方を見る">
              グラフやAI分析で、ゆらぎやすい日、先回りして試したケア、実際の体調を振り返ります。どんな日に何をすると過ごしやすかったか、次に試すことを整理できます。
            </FlowItem>

            <MiniNote>
              前日の「明日に向けた今夜のケア」と、当日の「今日のケア」は、どちらも同じ対象日のケアとしてまとまります。全部やる必要はなく、無理なく試せたものだけで十分です。
            </MiniNote>

            <GuideCard tone="teal" title="必要な時のサポート" icon={<IconCare />} compact>
              パーソナルケアショップでは、体質・不調・使いどきに合う用品や食品を探せます。セルフケアだけでは足りない不調には、国家資格者によるオンライン相談を準備しています。AI分析を使っていなくても相談できます。
            </GuideCard>

            <div className="grid gap-3 pt-2">
              <Button onClick={() => router.push("/check")} className="w-full shadow-md">体質トリセツを作る</Button>
              <Button variant="secondary" onClick={() => router.push("/radar")} className="w-full">体調予報を見る</Button>
              <Button variant="secondary" onClick={() => router.push("/records?tab=consult")} className="w-full">記録・相談を見る</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "radar" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">体調予報と対策ケア</div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            体調ゆらぎ度で細かな変化を見て、3つのモードで今日の行動を決めます。そのままケア記録までつなげられます。
          </div>

          <div className="space-y-4">
            <GuideCard tone="amber" title="体調ゆらぎ度と3つのモード" icon={<IconRadar />}>
              体調ゆらぎ度は、天気だけではなく、あなたのベース体質と6つの天気ストレスを組み合わせた0〜100の予報値です。症状が出る確率や、実際のつらさの点数ではありません。
              <ModeGuide />
            </GuideCard>

            <GuideCard tone="mint" title="今日と明日の役割" icon={<IconCalendar />}>
              「今日」は今日を整えるための予報、「明日」は今夜から先回りするための予報です。
              <CheckList
                items={[
                  "今日のケア：今日の負担を増やしにくくする工夫。",
                  "明日に向けた今夜のケア：翌日に備えて、前夜からできる工夫。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="teal" title="試したケアはその場で記録" icon={<IconCare />}>
              対策ケアのカードは、ケア方法を確認する場所であり、そのまま実行記録にもなります。実際に行った項目だけ「やってみた」または「意識した」を押してください。
              <CheckList
                items={[
                  "前日に表示された「明日に向けた今夜のケア」は、翌日に向けた先回りケアとして記録されます。",
                  "当日の「今日のケア」は、夜の記録で「つらさの前・後」をまとめて確認します。",
                  "押し間違えた時は、もう一度押すか記録ページから解除できます。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="mint" title="暮らす・食べる・ほぐす" icon={<IconCare />}>
              その日の方針を、実際に取り入れやすい3方向へ分けています。
              <CheckList
                items={[
                  "暮らす：服装、予定、休み方、湿気・冷え対策など。",
                  "食べる：主食・主菜・飲み物、足したいもの、控えたい重なりなど。",
                  "ほぐす：その日の天気と不調に合わせたツボケア。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="violet" title="ケアナビAI Ekkenの役割" icon={<IconSpark />}>
              Ekken（エッケン）は、未病レーダーが体質と天気から選んだケアを分かりやすく案内します。予報モードに合わせて表情が変わり、ケアを記録すると安心した表情になります。
            </GuideCard>

            <MiniNote label="予報の考え方">
              実感記録に合わせて過去の予報を書き換えず、同じ物差しのまま残します。だからこそ、どんな予報の日に何を試し、実際にどう過ごせたかを後から振り返れます。
            </MiniNote>

            <div className="grid gap-3 pt-2">
              <Button onClick={() => router.push("/radar")} className="w-full shadow-md">体調予報へ</Button>
              <Button variant="secondary" onClick={() => router.push("/records")} className="w-full">今日を記録する</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "records" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">記録して、自分の傾向を振り返る</div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            記録ページでは、予報ページで残した対策ケアを引き継ぎ、その日の実感と合わせて1日の記録を完成させます。
          </div>

          <div className="space-y-4">
            <GuideCard tone="mint" title="夜の記録はシンプル" icon={<IconPencil />}>
              その日の実感を○・△・×から選びます。予報ページで具体的な対策ケアを記録していれば、自動で一覧に入るため、当日ケアの大まかなタイミングを選ぶだけです。
              <CheckList
                items={[
                  "前夜の「明日に向けたケア」は、先回りケアとして自動で表示されます。",
                  "当日のケアは、「つらさの前」「つらくなってから」「前後どちらも」「覚えていない」から選びます。",
                  "提案以外のケアをした日は、「した／少しした」と分野（暮らす・食べる・ほぐす）をまとめて残せます。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="indigo" title="グラフは3段で見る" icon={<IconAnalysis />}>
              上段に体調ゆらぎ度、中段に実感○・△・×、下段にケアとタイミングを表示します。体調ゆらぎ度と実感は別の尺度なので、同じ縦軸には重ねません。
              <CheckList
                items={[
                  "日をタップすると、天気ストレス・ケア・メモなどを確認できます。",
                  "注意予報でも体調○などの絞り込みで、振り返りたい日を探せます。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="amber" title="自分に合う整え方が見えてくる" icon={<IconAnalysis />}>
              AIは、予報・試したケア・実際の体調をまとめて振り返り、あなたの日々に役立つ形へ整理します。
              <CheckList
                items={[
                  "どんな天気や日々の条件で、体調がゆらぎやすかったか。",
                  "どのケアを先回りして試した日に、穏やかに過ごせたか。",
                  "まだ分からないことと、次に試して確かめたいこと。",
                ]}
              />
              <div className="mt-3 rounded-[16px] bg-white/75 px-3 py-2.5 text-[10px] font-bold leading-5 text-slate-500 ring-1 ring-white">
                条件の違いによる勘違いを減らすため、同じ天気ストレスや近い体調ゆらぎ度の日を中心に見比べます。記録が少ない時は、効果を断定せず小さな手がかりとして扱います。
              </div>
            </GuideCard>

            <GuideCard tone="violet" title="この振り返りについてEkkenに聞く" icon={<IconAnalysis />}>
              分析した期間の記録だけを引き継ぎ、気になった日、天気ストレス、ケアの種類やタイミングを追加で質問できます。
            </GuideCard>

            <GuideCard tone="mint" title="今の調子をEkkenに相談" icon={<IconSpark />}>
              体調が気になった瞬間は、相談タブからケアナビAI Ekken（エッケン）へ一言から話せます。今日・明日の予報、今日行ったケア、直近の記録を見ながら、今できることを一緒に整理します。
              <CheckList
                items={[
                  "期間の振り返りチャットとは別の会話として保存します。",
                  "診断するのではなく、まず話を聞き、安全を確認し、低リスクなケアを1〜2個に絞ります。",
                  "強い症状や薬・治療の判断は、医療機関や国家資格者への相談を案内します。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="teal" title="国家資格者によるオンライン相談" icon={<IconBodyLine />}>
              不調が長引く、検査では異常が見つからないのにつらい、アプリの軽いセルフケアだけでは足りない。そんな時に、人へ直接相談できる別サービスを準備しています。AI分析の続きではありません。
              <CheckList
                items={[
                  "体質・不調・毎日の実感・試したケアが、相談前の情報としてまとまります。",
                  "オンラインで詳しく話を聞き、舌の状態・姿勢・動作なども参考に確認します。",
                  "市販灸・円皮鍼・ツボ、食養生、生活習慣などを、自宅で再現できるよう個別に整理します。",
                ]}
              />
            </GuideCard>

            <MiniNote label="AIへ送る情報">
              AI分析とEkken相談では、解釈済みの体質トリセツ、利用する画面に必要な予報・表示ケア・実行ケア・実感・メモ・会話を使います。期間の振り返りと今の相談は別の会話として扱います。アカウントに登録された氏名・メールアドレス・住所と、体質チェックの生回答は自動送信しません。ただし、記録メモや会話欄に自分で入力した内容は、そのまま送信対象になります。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/records")} className="w-full shadow-md">記録・相談へ</Button>
            </div>
          </div>
        </Module>
      ) : null}

      {tab === "care" ? (
        <Module className="bg-white p-5 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)] sm:p-6">
          <div className="mb-2 text-[19px] font-black tracking-tight text-slate-900">パーソナルケアショップ</div>
          <div className="mb-5 text-[13px] font-bold leading-6 text-slate-600">
            ケア用品や食品が多すぎて選べない時に、体質と気になる不調から自分向けの商品を探す場所です。
          </div>

          <div className="space-y-4">
            <GuideCard tone="mint" title="予報ページとの違い" icon={<IconRadar />}>
              予報ページは、今日・明日に行うデイリーケアを確認し、実行を記録する場所です。ショップは、そのケアに役立つ商品を選び、購入する場所です。
              <CheckList
                items={[
                  "予報：今日どう過ごすか、何を試すかを決める。",
                  "ショップ：体質・不調・使いどきに合う商品を探す。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="teal" title="暮らす・食べる・ほぐすで探す" icon={<IconCare />}>
              対策ケアと同じ3方向で候補を探せます。
              <CheckList
                items={[
                  "暮らす：冷え、睡眠、湿気、入浴、衣類などの生活用品。",
                  "食べる：温かい飲み物、茶類、汁物、軽めの食事まわり。",
                  "ほぐす：ツボケアや、首肩・足元・こわばりを助ける道具。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="amber" title="商品の選ばれ方" icon={<IconWeather />}>
              体質と気になる不調を土台に商品を選び、季節と近いうちの天気で使いやすい順に整えます。必要な時だけ買い物条件を変更できます。
              <CheckList
                items={[
                  "体質トリセツ：崩れやすい傾向とケア方針の土台にする。",
                  "気になる不調：いま用意したいケアの目的を絞る。",
                  "季節：しばらく続けやすい選択肢を考える。",
                  "近いうちの天気：直近で出番がありそうな商品へ少し注目する。",
                  "買い物条件：優先する不調・カテゴリ・予算・用途を変更する。",
                ]}
              />
            </GuideCard>

            <GuideCard tone="mint" title="気になる商品と購入済み商品" icon={<IconSpark />}>
              比べたい商品は「気になる」に保存できます。購入後に「購入済み」にすると、体調予報のデイリーケアに手持ちアイテムとして表示されます。
            </GuideCard>

            <GuideCard tone="violet" title="買う前に、まず目的を確認" icon={<IconBowl />}>
              商品を使った記録はショップではなく、体調予報のデイリーケアから行います。食品は「今日取り入れた」、用品やほぐす道具は「今日使った」として記録されます。
            </GuideCard>

            <MiniNote>
              体調予報で今日のケアを確認し、必要な道具や食品をショップで選ぶ。購入後はデイリーケアから実行を記録する、という流れです。
            </MiniNote>

            <div className="pt-2">
              <Button onClick={() => router.push("/care-navi")} className="w-full shadow-md">パーソナルケアショップへ</Button>
            </div>
          </div>
        </Module>
      ) : null}
    </AppShell>
  );
}
