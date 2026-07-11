"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import {
  RECORD_CARE_OPTIONS,
  RECORD_CONDITION_OPTIONS,
  RECORD_DOMAIN_OPTIONS,
  RECORD_FACTOR_OPTIONS,
  RECORD_TIMING_OPTIONS,
  buildActionTags,
  careLabel,
  careTimingLabel,
  classifyRecord,
  conditionLabel,
  factorLabel,
  reviewCareDomains,
  reviewCareTiming,
  reviewFactors,
  signalLabel,
  signalTone,
} from "@/lib/records/analysis";

function formatDate(value) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function ChoiceButton({ active, label, sub, onClick, tone = "mint" }) {
  const activeClass = tone === "amber"
    ? "bg-[#E2AE45] text-white ring-[#E2AE45]"
    : tone === "violet"
      ? "bg-[#A78BB3] text-white ring-[#A78BB3]"
      : "bg-[#66B9A3] text-white ring-[#66B9A3]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[18px] px-2 py-3 text-center transition-all ring-1",
        active
          ? `${activeClass} shadow-[0_14px_26px_-20px_rgba(15,23,42,0.38)]`
          : "bg-white text-slate-600 ring-[#DCE8DD] hover:bg-[#F7FAF8]",
      ].join(" ")}
    >
      <div className="text-[11px] font-black leading-4 sm:text-[12px]">{label}</div>
      {sub ? <div className={["mt-1 text-[9px] font-bold", active ? "text-white/80" : "text-slate-400"].join(" ")}>{sub}</div> : null}
    </button>
  );
}

function TogglePill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-2 text-[10px] font-black ring-1 transition-all",
        active ? "bg-[#66B9A3] text-white ring-[#66B9A3]" : "bg-white text-slate-600 ring-[#DCE8DD]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function DailyRecordCard({
  date,
  isToday = true,
  row,
  saving = false,
  justSaved = false,
  editable = true,
  editWindowLabel = "直近7日",
  onSave,
  onGoAnalysis,
}) {
  const review = row?.review || null;
  const forecast = row?.forecast || null;
  const [condition, setCondition] = useState(null);
  const [care, setCare] = useState(null);
  const [domains, setDomains] = useState([]);
  const [timing, setTiming] = useState("");
  const [factors, setFactors] = useState([]);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(editable && !review);

  useEffect(() => {
    setCondition(review?.condition_level == null ? null : Number(review.condition_level));
    setCare(review?.prevent_level == null ? null : Number(review.prevent_level));
    setDomains(reviewCareDomains(review));
    setTiming(reviewCareTiming(review));
    setFactors(reviewFactors(review));
    setNote(review?.note || "");
    setEditing(editable && !review);
  }, [date, review?.id, review?.updated_at, review?.created_at, editable]);

  const previewRow = useMemo(() => ({
    date,
    forecast,
    review: condition == null || care == null
      ? review
      : {
          ...(review || {}),
          condition_level: condition,
          prevent_level: care,
          care_domains: domains,
          care_timing: timing,
          context_factors: factors,
          action_tags: buildActionTags({ domains, timing, factors, existing: review?.action_tags }),
          note,
        },
  }), [date, forecast, review, condition, care, domains, timing, factors, note]);

  const classification = classifyRecord(previewRow);
  const forecastTone = signalTone(forecast?.signal);

  function toggleDomain(value) {
    setDomains((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function toggleFactor(value) {
    setFactors((current) => {
      if (value === "none") return current.includes("none") ? [] : ["none"];
      const withoutNone = current.filter((item) => item !== "none");
      return withoutNone.includes(value)
        ? withoutNone.filter((item) => item !== value)
        : [...withoutNone, value];
    });
  }

  async function submit() {
    if (condition == null || care == null) return;
    const savedFactors = classification.mismatch ? factors : [];
    await onSave?.({
      date,
      condition_level: condition,
      prevent_level: care,
      care_domains: care > 0 ? domains : [],
      care_timing: care > 0 ? timing : "",
      context_factors: savedFactors,
      action_tags: buildActionTags({
        domains: care > 0 ? domains : [],
        timing: care > 0 ? timing : "",
        factors: savedFactors,
        existing: review?.action_tags,
      }),
      note,
    });
    setEditing(false);
  }

  const botMood = justSaved && !editing
    ? "complete"
    : condition != null && condition <= 1
      ? "listening"
      : "normal";
  const botMessage = justSaved && !editing
    ? "記録できました。今日のことを残してくれてありがとう。"
    : review && !editing
      ? `${isToday ? "今日" : "この日"}の記録はできています。${editable ? "必要なら、あとから直せます。" : ""}`
      : editable
        ? `${isToday ? "今日一日の" : "この日の"}体調はどうでしたか？無理のない範囲で教えてください。`
        : `${editWindowLabel}を過ぎた日は、保存済みの記録だけ見返せます。`;

  return (
    <section className="overflow-hidden rounded-[30px] bg-white ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.38)]">
      <div className="bg-[#F4FAF7] px-4 pb-4 pt-5">
        <div className="flex items-end gap-3">
          <GuideBotAvatar mood={botMood} className="h-[82px] w-[82px] shrink-0" />
          <div className="relative mb-2 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">記録サポート</div>
            <div className="mt-1">{botMessage}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-white/85 px-3.5 py-3 ring-1 ring-white shadow-sm">
          <div>
            <div className="text-[10px] font-black tracking-widest text-slate-400">RECORD DATE</div>
            <div className="mt-1 text-[14px] font-black text-slate-900">{formatDate(date)}</div>
          </div>
          {forecast ? (
            <span className={["rounded-full px-3 py-1.5 text-[10px] font-black ring-1", forecastTone.surface, forecastTone.text, forecastTone.ring].join(" ")}>
              予報：{signalLabel(forecast.signal)}
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-400 ring-1 ring-slate-200">予報なし</span>
          )}
        </div>
      </div>

      {review && !editing ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[20px] bg-[#F7FAF8] p-3.5 ring-1 ring-[#DCE8DD]">
              <div className="text-[10px] font-black text-slate-400">実際の体調</div>
              <div className="mt-1 text-[14px] font-black text-slate-900">{conditionLabel(review.condition_level)}</div>
            </div>
            <div className="rounded-[20px] bg-[#F7FAF8] p-3.5 ring-1 ring-[#DCE8DD]">
              <div className="text-[10px] font-black text-slate-400">先回りケア</div>
              <div className="mt-1 text-[14px] font-black text-slate-900">{careLabel(review.prevent_level)}</div>
            </div>
          </div>

          {reviewCareDomains(review).length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {reviewCareDomains(review).map((domain) => {
                const meta = RECORD_DOMAIN_OPTIONS.find((item) => item.value === domain);
                return (
                  <span key={domain} className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 ring-1 ring-[#DCE8DD]" style={{ borderLeft: `4px solid ${meta?.color || "#DCE8DD"}` }}>
                    {meta?.label || domain}
                  </span>
                );
              })}
              {reviewCareTiming(review) ? (
                <span className="rounded-full bg-[#F7FAF8] px-3 py-1.5 text-[10px] font-black text-slate-500 ring-1 ring-[#DCE8DD]">
                  {careTimingLabel(reviewCareTiming(review))}
                </span>
              ) : null}
            </div>
          ) : null}

          {reviewFactors(review).length ? (
            <div className="mt-3 rounded-[18px] bg-[#FFF8EC] px-4 py-3 ring-1 ring-[#EED8B4]">
              <div className="text-[9px] font-black text-[#A56C18]">予報との差で思い当たること</div>
              <div className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
                {reviewFactors(review).map(factorLabel).join("・")}
              </div>
            </div>
          ) : null}

          {review.note ? (
            <div className="mt-3 rounded-[18px] bg-[#F7FAF8] px-4 py-3 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-[#E8F0EB]">{review.note}</div>
          ) : null}

          <div className="mt-4 rounded-[20px] bg-[#EFF8F4] p-4 ring-1 ring-[#CFE7DE]">
            <div className="text-[10px] font-black tracking-widest text-[#2F816E]/70">この日の見比べ</div>
            <div className="mt-1 text-[14px] font-black text-slate-900">{classification.label}</div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
              {!classification.comparable
                ? "予報が残っていないため、体調記録として見返します。"
                : classification.mismatch
                  ? "予報との違いも、あなたの調子を知る大切な手がかりです。"
                  : "似た条件の日が増えると、より自分らしい傾向が見えてきます。"}
            </div>
          </div>

          <div className={["mt-4 grid gap-2", editable ? "sm:grid-cols-2" : ""].join(" ")}>
            {editable ? (
              <Button variant="secondary" onClick={() => setEditing(true)} className="w-full bg-white">記録を編集</Button>
            ) : null}
            <Button onClick={() => onGoAnalysis?.({ date, classification })} className="w-full">AIと振り返る</Button>
          </div>
        </div>
      ) : !editable ? (
        <div className="p-4">
          <div className="rounded-[20px] bg-[#F7FAF8] px-4 py-4 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
            未記録の日を後から追加できるのは{editWindowLabel}までです。今後の記録から少しずつ傾向をためていきましょう。
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div>
            <div className="mb-2 text-[11px] font-black tracking-[0.1em] text-slate-400">体調</div>
            <div className="grid grid-cols-3 gap-2">
              {RECORD_CONDITION_OPTIONS.map((item) => (
                <ChoiceButton key={item.value} active={condition === item.value} label={`${item.symbol} ${item.label}`} onClick={() => setCondition(item.value)} />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[11px] font-black tracking-[0.1em] text-slate-400">先回りケア</div>
            <div className="grid grid-cols-3 gap-2">
              {RECORD_CARE_OPTIONS.map((item) => (
                <ChoiceButton
                  key={item.value}
                  active={care === item.value}
                  label={item.label}
                  onClick={() => {
                    setCare(item.value);
                    if (item.value === 0) {
                      setDomains([]);
                      setTiming("");
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {care > 0 ? (
            <>
              <div className="mt-5 rounded-[22px] bg-[#F7FAF8] p-3.5 ring-1 ring-[#DCE8DD]">
                <div className="text-[11px] font-black tracking-[0.1em] text-slate-400">やったこと</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {RECORD_DOMAIN_OPTIONS.map((item) => (
                    <ChoiceButton key={item.value} active={domains.includes(item.value)} label={item.label} onClick={() => toggleDomain(item.value)} tone={item.value === "eat" ? "amber" : item.value === "loosen" ? "violet" : "mint"} />
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-[22px] bg-[#F7FAF8] p-3.5 ring-1 ring-[#DCE8DD]">
                <div className="text-[11px] font-black tracking-[0.1em] text-slate-400">いつケアした？</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {RECORD_TIMING_OPTIONS.map((item) => (
                    <TogglePill key={item.value} active={timing === item.value} onClick={() => setTiming(item.value)}>{item.label}</TogglePill>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {condition != null && care != null && classification.mismatch ? (
            <div className="mt-3 rounded-[22px] bg-[#FFF8EC] p-3.5 ring-1 ring-[#EED8B4]">
              <div className="text-[11px] font-black text-[#A56C18]">今日は予報と少し違ったようです</div>
              <div className="mt-1 text-[10px] font-bold leading-5 text-slate-500">思い当たることがあれば教えてください。予報ロジックには混ぜず、振り返りの材料にします。</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {RECORD_FACTOR_OPTIONS.map((item) => (
                  <TogglePill key={item.value} active={factors.includes(item.value)} onClick={() => toggleFactor(item.value)}>{item.label}</TogglePill>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="mb-2 text-[11px] font-black tracking-[0.1em] text-slate-400">ひとことメモ <span className="text-slate-300">任意</span></div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="仕事が忙しかった、よく眠れた、夕方から重かった など"
              className="w-full resize-none rounded-[20px] bg-[#F7FAF8] px-4 py-3 text-[13px] font-bold leading-6 text-slate-700 outline-none ring-1 ring-[#DCE8DD] focus:ring-2 focus:ring-[#66B9A3]"
            />
          </div>

          <Button
            disabled={saving || condition == null || care == null || (care > 0 && (domains.length === 0 || !timing))}
            onClick={submit}
            className="mt-5 w-full py-4"
          >
            {saving ? "記録しています…" : review ? "変更を保存する" : isToday ? "今日を記録する" : "この日を記録する"}
          </Button>
          {care > 0 && !timing ? <div className="mt-2 text-center text-[10px] font-bold text-slate-400">ケアした時間も選ぶと保存できます</div> : null}
          {review ? (
            <button type="button" onClick={() => setEditing(false)} className="mt-3 w-full text-center text-[11px] font-black text-slate-400">編集をやめる</button>
          ) : null}
        </div>
      )}
    </section>
  );
}
