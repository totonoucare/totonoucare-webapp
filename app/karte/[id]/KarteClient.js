"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { IconRadar } from "@/components/illust/icons/app";

const PRICE_LABEL = "¥1,980";
const PLUS_COMING_SOON = true;

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function GenerationLabel({ generation }) {
  if (!generation?.aiEnabled) return null;
  const label =
    generation.source === "openai-generated"
      ? "AI生成しました"
      : generation.source === "openai-cache"
        ? "AI生成済み"
        : generation.source === "rules-ai-fallback"
          ? "標準本文で表示中"
          : "標準本文";

  return (
    <span className="rounded-full border border-[#d7e6df] bg-white/80 px-3 py-1 text-[11px] font-black text-[#2f7567]">
      {label}
    </span>
  );
}

function MiniStat({ label, value, tone = "green" }) {
  const toneClass =
    tone === "amber"
      ? "border-[#ead7a5] bg-[#fffaf0] text-[#9a5b1e]"
      : "border-[#e6eee9] bg-[#f8fbf9] text-[#2f7567]";

  return (
    <div className={cn("rounded-[24px] border p-4", toneClass)}>
      <div className="text-[11px] font-black tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-2 text-[18px] font-black tracking-[-0.03em]">{value || "—"}</div>
    </div>
  );
}

function TakeawayCards({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-[28px] border border-[#e6eee9] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eff8f4] text-[16px] font-black text-[#2f7567]">
            {index + 1}
          </div>
          <div className="text-[11px] font-black tracking-[0.16em] text-[#9aa7b8]">{item.label}</div>
          <div className="mt-2 text-[18px] font-black leading-[1.45] tracking-[-0.04em] text-[#10182d]">{item.value}</div>
          {item.note ? <p className="mt-3 text-[13px] font-bold leading-6 text-[#64748b]">{item.note}</p> : null}
        </div>
      ))}
    </section>
  );
}

function MapFlow({ items = [] }) {
  if (!items.length) return null;

  return (
    <section className="rounded-[34px] border border-[#d9e3dc] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] md:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[12px] font-black tracking-[0.18em] text-[#2f7567]">KARTE GUIDE</div>
          <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-[#10182d]">カルテの読み方</h2>
        </div>
        <span className="hidden rounded-full border border-[#ead7a5] bg-[#fffaf0] px-3 py-2 text-[11px] font-black text-[#b17425] md:inline-flex">
          順番で読む
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="relative rounded-[26px] border border-[#e6eee9] bg-[#f8fbf9] p-4">
            {index < items.length - 1 ? (
              <div className="absolute -right-[11px] top-1/2 z-10 hidden h-[2px] w-[20px] bg-[#d9e3dc] md:block" />
            ) : null}
            <div className="text-[11px] font-black tracking-[0.16em] text-[#9aa7b8]">{item.label}</div>
            <div className="mt-2 text-[16px] font-black leading-[1.55] text-[#10182d]">{item.title}</div>
            <p className="mt-2 text-[12px] font-bold leading-6 text-[#64748b]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForecastCTA({ usage }) {
  if (!usage) return null;
  const bullets = Array.isArray(usage.bullets) ? usage.bullets : [];

  return (
    <section className="rounded-[34px] border border-[#ead7a5] bg-[#fffaf0] p-6 shadow-[0_14px_34px_rgba(180,116,37,0.08)]">
      <div className="text-[12px] font-black tracking-[0.18em] text-[#b17425]">DAILY FORECAST</div>
      <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-[#10182d]">{usage.title || "今日・明日のケアは予報ページで確認"}</h2>
      {usage.body ? <p className="mt-3 text-[14px] font-bold leading-7 text-[#6b4a2a]">{usage.body}</p> : null}
      {bullets.length ? (
        <div className="mt-5 grid gap-2">
          {bullets.slice(0, 3).map((item, index) => (
            <div key={`${item}-${index}`} className="flex gap-3 rounded-[22px] border border-[#ead7a5] bg-white/70 px-4 py-3 text-[13px] font-black leading-6 text-[#6b4a2a]">
              <span className="text-[#b17425]"><IconRadar className="h-4 w-4" /></span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Link
        href={usage.href || "/radar"}
        className="mt-5 inline-flex rounded-full bg-[#2f7567] px-6 py-3 text-[14px] font-black text-white shadow-[0_12px_26px_rgba(47,117,103,0.24)]"
      >
        予報ページを見る
      </Link>
    </section>
  );
}

const SUB_TERM_LABELS = {
  qi_stagnation: "気滞（きたい）",
  qi_deficiency: "気虚（ききょ）",
  blood_deficiency: "血虚（けっきょ）",
  blood_stasis: "血瘀（けつお）",
  fluid_damp: "痰湿（たんしつ）",
  fluid_deficiency: "津液不足（しんえきぶそく）",
};

const LOCKED_SECTION_LABELS = {
  "my-torisetsu-card": "トリセツ",
  "loop-core": "ループ",
  "early-signs": "前触れ",
  "ng-combo-checker": "重ねすぎ",
  "ng-combo-cards": "重ねすぎ",
  "body-lines": "負担ライン",
  "season-guard": "季節",
  "forecast-bridge": "予報活用",
  "consultation-sheet": "相談メモ",
  "loop-overview": "全体像",
  "body-pattern": "土台",
  "weather-trigger": "天気",
  "daily-loop": "生活",
  "care-priority": "戻し方",
  "seven-day-plan": "旧プラン",
  "season-strategy": "季節",
  // 旧レポート互換
  "core-pattern": "体質",
  "inner-pattern": "気血水",
  "weather-switch": "天気",
  "early-signs": "前触れ",
  "meridian-care": "経絡",
  "alert-day-care": "警戒日",
  "season-care": "季節",
  "consult-list": "相談",
};

function buildLockedPreviewBody({ section, karte, core, symptom, patternText, weatherText }) {
  const meridian = karte?.meridianPreview || {};
  const primaryLine = meridian.primary;
  const secondaryLine = meridian.secondary;
  const primaryLineText = primaryLine?.description || primaryLine?.lineTitle;
  const secondaryLineText = secondaryLine?.description || secondaryLine?.lineTitle;

  switch (section?.id) {
    case "my-torisetsu-card":
      return `${core}・${symptom}・${weatherText}を、あとで見返せる1枚のトリセツとして整理します。`;
    case "loop-core":
      return `${core}・${patternText}・${weatherText}・生活負荷がどう重なり、${symptom}として出やすいかを整理します。`;
    case "early-signs":
      return `${symptom}が強くなる前の小さなサインを、観察しやすい生活語にします。`;
    case "ng-combo-checker":
    case "ng-combo-cards":
      return `避けたい習慣・飲食の組み合わせをカード化し、警戒日前に外す負担を整理します。`;
    case "body-lines":
      return `動作負担チェックで見えた身体ラインと、保存版のツボ候補カードを表示します。`;
    case "season-guard":
      return "季節ごとの注意ポイントと、早めに守りたい生活の調整を整理します。";
    case "forecast-bridge":
      return "Plusを保存版、予報ページを当日の作戦表として使う見方を整理します。";
    case "loop-overview":
      return `${core}・${patternText}・${weatherText}・${symptom}をつなげ、不調がくり返されやすい流れを整理します。`;
    case "body-pattern":
      return `${patternText}を、だるさ・こわばり・眠気・気分の波など生活の体感に翻訳します。`;
    case "weather-trigger":
      return `${weatherText}が、${symptom}や軽いサインにどうつながるかを体質と一緒に読みます。`;
    case "daily-loop":
      return `${symptom}が強くなる前に出やすいサインと、生活内で固定化しやすい流れを整理します。`;
    case "care-priority":
      return `7つの方針を背景材料として、戻しやすい方向と外したい負担を整理します。`;
    case "seven-day-plan":
      return `旧レポート互換の項目です。新しいPlusでは、重ねすぎ注意カードと予報ページ活用に役割を分けます。`;
    case "season-strategy":
      return "季節ごとの注意ポイントと、早めに守りたい生活の調整を整理します。";
    case "consultation-sheet":
      return "相談時に、体質・天気・不調・時間帯・悪化条件・動作ラインを短く共有できる形にします。";
    case "core-pattern":
      return `${core}のタイプから、天気・予定量・疲れが重なったときの崩れ方を整理します。`;
    case "inner-pattern":
      return `${patternText}を、だるさ・こわばり・眠気・気分の波など生活の体感に翻訳します。`;
    case "weather-switch":
      return `${weatherText}が、${symptom}や軽いサインにどうつながるかを体質と一緒に読みます。`;
    case "early-signs":
      return `${symptom}が強くなる前に出やすいサインと、今後も注意したい軽い不調を整理します。`;
    case "meridian-care":
      if (primaryLineText && secondaryLineText && primaryLine?.lineTitle !== secondaryLine?.lineTitle) {
        return `動作負担チェックでは、${primaryLineText}と${secondaryLineText}にサイン。購入後は、不調の背景でどう関わるかと、予報ページのツボケアへの使い方を整理します。`;
      }
      if (primaryLineText) {
        return `動作負担チェックでは、${primaryLineText}にサイン。購入後は、このラインが不調の背景でどう関わるかと、予報ページのツボケアへの使い方を整理します。`;
      }
      return "動作負担チェックから、不調の背景にある経絡ラインとケアの見方を整理します。";
    case "alert-day-care":
      return "予報ページの点数・主因・ツボ・食養生を、警戒日の前日〜当日の行動に落とし込む見方を整理します。";
    case "season-care":
      return "季節ごとの注意ポイントと、早めに守りたい生活の調整を整理します。";
    case "consult-list":
      return "鍼灸・整体・漢方などで相談するときに、体質・天気・不調・動作の要点を短く伝えられる形にします。";
    default:
      return section?.teaser || section?.preview || "購入後に本文を表示します。";
  }
}

function LockedPreview({ karte }) {
  const weatherList = Array.isArray(karte?.weatherRankings) && karte.weatherRankings.length
    ? karte.weatherRankings.map((item) => item.label).filter(Boolean)
    : [karte?.mainWeatherLabel].filter(Boolean);
  const weatherText = weatherList.length ? weatherList.join("・") : "注意天気";
  const symptom = karte?.symptomLabel || "今お困りの不調";
  const core = karte?.coreTitle || "あなたの体質";
  const patterns = [karte?.primarySub?.code, karte?.secondarySub?.code]
    .map((code) => SUB_TERM_LABELS[code])
    .filter(Boolean);
  const patternText = patterns.length ? patterns.join("・") : "気血津液（きけつしんえき）の偏り";
  const sections = Array.isArray(karte?.sections) ? karte.sections : [];
  const previewItems = sections.map((section, index) => ({
    label: `${index + 1}｜${LOCKED_SECTION_LABELS[section.id] || section.badge || "項目"}`,
    title: section.title,
    body: buildLockedPreviewBody({ section, karte, core, symptom, patternText, weatherText }),
  }));
  const beauty = karte?.beautyColumn;

  return (
    <section className="rounded-[34px] border border-[#d9e3dc] bg-white p-6 shadow-[0_16px_42px_rgba(15,23,42,0.06)] md:p-7">
      <div className="mb-5">
        <div className="text-[12px] font-black tracking-[0.18em] text-[#2f7567]">PREVIEW</div>
        <h2 className="mt-2 text-[24px] font-black tracking-[-0.05em] text-[#10182d]">購入後に読める8項目＋同梱ツール</h2>
        <p className="mt-3 text-[14px] font-bold leading-7 text-[#64748b]">
          {core}・{patternText}・{weatherText}・{symptom}をもとに、不調がくり返されやすい流れ、NG組み合わせ、身体ライン、予報ページの使いどころまでまとめます。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {previewItems.map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
            <div className="text-[11px] font-black tracking-[0.16em] text-[#9aa7b8]">{item.label}</div>
            <div className="mt-2 text-[16px] font-black leading-[1.5] tracking-[-0.04em] text-[#10182d]">{item.title}</div>
            <p className="mt-2 text-[13px] font-bold leading-6 text-[#64748b]">{item.body}</p>
          </div>
        ))}
        {beauty ? (
          <div className="rounded-[26px] border border-[#ead7a5] bg-[#fffaf0] p-5 md:col-span-2">
            <div className="text-[11px] font-black tracking-[0.16em] text-[#b17425]">まとめ</div>
            <div className="mt-2 text-[16px] font-black leading-[1.5] tracking-[-0.04em] text-[#10182d]">{beauty.title}</div>
            <p className="mt-2 text-[13px] font-bold leading-6 text-[#6b4a2a]">{beauty.teaser || beauty.preview}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BeautyColumn({ column }) {
  if (!column) return null;
  const body = Array.isArray(column.body) ? column.body : [];
  const points = Array.isArray(column.points) ? column.points : [];

  return (
    <section className="rounded-[34px] border border-[#ead7a5] bg-[#fffaf0] p-6 shadow-[0_14px_34px_rgba(180,116,37,0.08)] md:p-7">
      <div className="mb-3 inline-flex rounded-full border border-[#ead7a5] bg-white/70 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-[#b17425]">
        {column.badge || "まとめ"}
      </div>
      <h2 className="text-[24px] font-black leading-[1.45] tracking-[-0.05em] text-[#10182d] md:text-[29px]">
        {column.title}
      </h2>
      {column.teaser ? <p className="mt-3 text-[14px] font-black leading-7 text-[#6b4a2a]">{column.teaser}</p> : null}
      {body.length ? (
        <div className="mt-5 space-y-4">
          {body.slice(0, 3).map((text, index) => (
            <p key={`beauty-p-${index}`} className="text-[15px] font-bold leading-[1.9] text-[#334155]">
              {text}
            </p>
          ))}
        </div>
      ) : null}
      {points.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {points.slice(0, 3).map((item, index) => (
            <span key={`beauty-point-${index}`} className="rounded-full border border-[#ead7a5] bg-white/80 px-4 py-2 text-[13px] font-black leading-6 text-[#6b4a2a]">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}


function SectionCard({ section, locked, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const body = Array.isArray(section.body) ? section.body : [];
  const bullets = Array.isArray(section.bullets) ? section.bullets : [];
  const steps = Array.isArray(section.steps) ? section.steps : [];
  const cards = Array.isArray(section.cards) ? section.cards : [];
  const hideExtraLists = ["consult-list", "consultation-sheet"].includes(section.id);
  const showSteps = !hideExtraLists && steps.length > 0;
  const showBullets = !hideExtraLists && bullets.length > 0 && !showSteps;
  const hasDetail = body.length || showBullets || showSteps || cards.length > 0;

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#d9e3dc] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
      <div className="p-6 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#ead7a5] bg-[#fff8df] px-3 py-1 text-[11px] font-black tracking-[0.18em] text-[#b17425]">
            {section.badge}
          </span>
          <span className="text-[11px] font-black tracking-[0.18em] text-[#9aa7b8]">PERSONAL FILE</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[24px] font-black leading-[1.45] tracking-[-0.05em] text-[#10182d] md:text-[29px]">
              {section.title}
            </h2>
            {section.teaser ? <p className="mt-3 text-[14px] font-black leading-7 text-[#64748b]">{section.teaser}</p> : null}
          </div>

          {!locked && hasDetail ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="shrink-0 rounded-full border border-[#d9e3dc] bg-[#f8fbf9] px-5 py-3 text-[13px] font-black text-[#2f7567] shadow-sm"
            >
              {open ? "閉じる" : "詳しく読む"}
            </button>
          ) : null}
        </div>

        {(!open || locked) ? (
          <div className="mt-6 rounded-[28px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
            <div className="mb-2 text-[11px] font-black tracking-[0.16em] text-[#9aa7b8]">要点</div>
            <p className="text-[15px] font-black leading-[1.9] text-[#39475a]">{section.preview || body[0]}</p>
          </div>
        ) : null}

        {locked ? (
          <div className="relative mt-4 rounded-[28px] border border-[#e4ebe6] bg-[#f7faf8] p-5">
            <p className="line-clamp-3 text-[15px] font-bold leading-[2] text-[#64748b]">
              {body[0] || section.preview || "続きでは、具体的な見分け方と戻し方まで整理します。"}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f7faf8] via-[#f7faf8]/90 to-transparent" />
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 text-[13px] font-black text-[#2f7567] shadow-sm">
              <span>🔒</span>
              <span>続きはアンロック後に表示</span>
            </div>
          </div>
        ) : null}
      </div>

      {!locked && open ? (
        <div className="border-t border-[#edf2ef] bg-white px-6 pb-6 md:px-8 md:pb-8">
          {body.length ? (
            <div className="space-y-4 pt-6">
              {body.slice(0, 2).map((text, index) => (
                <p key={`${section.id}-p-${index}`} className="text-[15px] font-bold leading-[1.9] text-[#334155]">
                  {text}
                </p>
              ))}
            </div>
          ) : null}


          {cards.length ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {cards.slice(0, 8).map((card, index) => (
                <div key={`${section.id}-card-${card.code || card.title || index}`} className="rounded-[26px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-[#d7e6df] bg-white px-3 py-1 text-[11px] font-black tracking-[0.12em] text-[#2f7567]">
                      {card.type === "mtest_point" ? "ツボ候補" : card.type === "food" ? "飲食" : card.type === "torisetsu" ? "カード" : "NG候補"}
                    </span>
                    <span className="text-[11px] font-black text-[#9aa7b8]">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="text-[17px] font-black leading-[1.5] tracking-[-0.04em] text-[#10182d]">{card.title}</div>
                  {card.risk ? <p className="mt-2 text-[13px] font-black leading-6 text-[#2f7567]">{card.risk}</p> : null}
                  {card.reason ? <p className="mt-3 text-[13px] font-bold leading-6 text-[#64748b]">{card.reason}</p> : null}
                  {card.swap ? <p className="mt-3 rounded-[20px] border border-[#e6eee9] bg-white px-4 py-3 text-[13px] font-black leading-6 text-[#334155]">{card.swap}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {showBullets ? (
            <div className="mt-6 rounded-[26px] border border-[#e6eee9] bg-[#f8fbf9] p-5">
              <div className="mb-3 text-[12px] font-black tracking-[0.14em] text-[#9aa7b8]">見るポイント</div>
              <div className="flex flex-wrap gap-2">
                {bullets.slice(0, 2).map((item, index) => (
                  <span key={`${section.id}-b-${index}`} className="rounded-full border border-[#d7e6df] bg-white px-4 py-2 text-[13px] font-black leading-6 text-[#334155]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {showSteps ? (
            <div className="mt-5 grid gap-3">
              {steps.slice(0, 2).map((item, index) => (
                <div key={`${section.id}-s-${index}`} className="flex gap-4 rounded-[24px] border border-[#e6eee9] bg-[#f8fbf9] px-5 py-4 text-[14px] font-black leading-7 text-[#334155]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f7567] text-[12px] text-white">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-[#f7f7f1] px-6 py-20 text-center">
      <div className="mx-auto max-w-[680px] rounded-[34px] border border-[#d9e3dc] bg-white p-8 shadow-sm">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-[#dfeee8]" />
        <p className="text-[16px] font-black text-[#64748b]">カルテを読み込み中です。</p>
      </div>
    </div>
  );
}

function ErrorView({ message }) {
  return (
    <div className="min-h-screen bg-[#f7f7f1] px-6 py-20">
      <div className="mx-auto max-w-[680px] rounded-[34px] border border-[#d9e3dc] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-black text-[#10182d]">カルテを表示できませんでした</p>
        <p className="mt-3 text-[14px] font-bold leading-7 text-[#64748b]">{message}</p>
        <Link href="/" className="mt-7 inline-flex rounded-full bg-[#2f7567] px-8 py-4 text-[15px] font-black text-white shadow-[0_10px_22px_rgba(47,117,103,0.24)]">
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}

export default function KarteClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const checkoutState = searchParams.get("checkout");

  async function loadKarte() {
    setLoading(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/karte/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "カルテの取得に失敗しました。");
      setData(json);
    } catch (err) {
      setError(err?.message || "カルテの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadKarte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (checkoutState === "success") {
      const timer = setTimeout(() => loadKarte(), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutState]);

  const karte = data?.karte;
  const locked = data ? !data.unlocked : true;
  const generation = data?.generation || {};

  const completionLabel = useMemo(() => {
    if (!karte?.sections?.length) return "8項目＋相談前シート";
    return karte?.beautyColumn ? `${karte.sections.length}項目＋相談前シート` : `${karte.sections.length}項目`;
  }, [karte]);

  const quickTakeaways = useMemo(() => {
    if (karte?.quickTakeaways?.length) return karte.quickTakeaways;
    const firstSections = Array.isArray(karte?.sections) ? karte.sections.slice(0, 3) : [];
    return firstSections.map((section) => ({
      label: section.badge || "要点",
      value: section.title,
      note: section.preview || section.teaser,
    }));
  }, [karte]);

  async function startCheckout() {
    if (PLUS_COMING_SOON) {
      setError("未病カルテ Plus はただいま準備中です。公開まで少しお待ちください。");
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        const next = encodeURIComponent(`/karte/${id}`);
        router.push(`/signup?result=${encodeURIComponent(id)}&next=${next}`);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: "personal_mibyo_karte",
          resultId: id,
        }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "決済ページを開けませんでした。");
      window.location.href = json.url;
    } catch (err) {
      setError(err?.message || "決済ページを開けませんでした。");
      setCheckoutLoading(false);
    }
  }

  if (loading) return <LoadingView />;
  if (error && !data) return <ErrorView message={error} />;
  if (!karte) return <ErrorView message="カルテ情報が見つかりませんでした。" />;

  return (
    <main className="min-h-screen bg-[#f7f7f1] pb-16 text-[#10182d]">
      <div className="sticky top-0 z-20 border-b border-[#eef1ed] bg-white/88 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[780px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-[#d9e3dc] bg-white px-5 py-3 text-[14px] font-black text-[#334155] shadow-sm"
          >
            ← 戻る
          </button>
          <div className="text-center">
            <div className="text-[18px] font-black tracking-[-0.04em]">未病カルテ Plus</div>
            <div className="text-[12px] font-black text-[#8290a4]">LOOP REPORT</div>
          </div>
          <Link href="/" className="rounded-full border border-[#d9e3dc] bg-white px-5 py-3 text-[14px] font-black text-[#334155] shadow-sm">
            ホーム
          </Link>
        </div>
      </div>

      {checkoutState === "success" && !data?.unlocked ? (
        <div className="mx-auto mt-5 max-w-[780px] px-5">
          <div className="rounded-[24px] border border-[#d7e6df] bg-[#eff8f4] px-5 py-4 text-[14px] font-black leading-7 text-[#2f7567]">
            決済を確認中です。数秒後にカルテが開かない場合は、ページを再読み込みしてください。
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mt-5 max-w-[780px] px-5">
          <div className="rounded-[24px] border border-[#f6d4c5] bg-[#fff7ed] px-5 py-4 text-[14px] font-black leading-7 text-[#9a4b20]">
            {error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-[780px] space-y-7 px-5 pt-8">
        <section className="overflow-hidden rounded-[38px] border border-[#d9e3dc] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="relative p-7 md:p-9">
            <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#f7e8b9] opacity-60" />
            <div className="pointer-events-none absolute right-10 top-20 h-28 w-28 rounded-full border border-[#d9e3dc]" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-[#d9e3dc] bg-[#f8fbf9] px-4 py-2 text-[12px] font-black tracking-[0.16em] text-[#2f7567]">
                LOOP REPORT
              </span>
              <h1 className="mt-5 text-[34px] font-black leading-tight tracking-[-0.06em] text-[#10182d] md:text-[44px]">
                {karte.productName}
              </h1>
              <p className="mt-4 text-[17px] font-black leading-[1.8] text-[#475569]">{karte.subtitle}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniStat label="体質軸" value={karte.coreTitle} />
                <MiniStat label="今お困りの不調" value={karte.symptomLabel} tone="green" />
                <MiniStat label="収録" value={completionLabel} tone="amber" />
              </div>
              <p className="mt-6 rounded-[26px] border border-[#e6eee9] bg-white/78 p-5 text-[15px] font-bold leading-[1.9] text-[#475569]">
                {karte.heroLead}
              </p>
            </div>
          </div>
        </section>

        {locked ? (
          <section className="rounded-[34px] border border-[#d7e6df] bg-[#eff8f4] p-6 shadow-[0_14px_38px_rgba(47,117,103,0.10)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[12px] font-black tracking-[0.16em] text-[#2f7567]">COMING SOON</div>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#10182d]">
                  未病カルテ Plus を準備中です
                </h2>
                <p className="mt-2 text-[14px] font-bold leading-7 text-[#475569]">
                  体質・気血津液・注意天気・経絡ラインをつなげて、警戒日の前日〜当日に使える判断基準まで見返せる保存版カルテを準備しています。
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-[#d7e6df] bg-white px-6 py-4 text-[14px] font-black text-[#2f7567] shadow-sm">
                公開までお待ちください
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-wrap items-center gap-3 rounded-[34px] border border-[#d7e6df] bg-[#eff8f4] p-5 text-[15px] font-black leading-7 text-[#2f7567]">
            <span>✅ アンロック済みです。このカルテはアプリ上でいつでも見返せます。</span>
            <GenerationLabel generation={generation} />
          </section>
        )}

        {locked ? (
          <LockedPreview karte={karte} />
        ) : (
          <div className="grid gap-5">
            {(karte.sections || []).map((section, index) => (
              <SectionCard key={section.id || index} section={section} locked={locked} defaultOpen={index === 0} />
            ))}
          </div>
        )}

        {!locked ? <BeautyColumn column={karte.beautyColumn} /> : null}

        {!locked ? <ForecastCTA usage={karte.forecastUsage} /> : null}

        {locked ? (
          <section className="rounded-[34px] border border-[#ead7a5] bg-[#fffaf0] p-6 text-center shadow-sm">
            <div className="text-[12px] font-black tracking-[0.16em] text-[#b17425]">PREVIEW ONLY</div>
            <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#10182d]">読み返せる未病ケアの見立てを準備中</h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-bold leading-7 text-[#6b4a2a]">
              体質・注意天気・生活負荷・NG組み合わせ・身体ラインをつなげた不調ループの読み物として、あとから何度でも見返せる形にする予定です。現在は予告プレビューのみ公開しています。
            </p>
            <div className="mt-6 inline-flex rounded-full border border-[#ead7a5] bg-white px-6 py-3 text-[14px] font-black text-[#8a4b1d] shadow-sm">
              公開時期は後日ご案内します
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

