"use client";

import { useEffect, useMemo, useState } from "react";
import { SYMPTOM_LABELS } from "@/lib/diagnosis/v2/labels";
import { supabase } from "@/lib/supabaseClient";
import { GUIDED_SCOPE_META, GUIDED_SCOPE_OPTIONS } from "@/lib/care-shop/guidedCatalog";
import {
  buildBaselineFromProfile,
  buildGuidedSearchResult,
  ingredientConnections,
  normalizeConcernText,
} from "@/lib/care-shop/guidedEngine";

const OTHER_CONCERN = { key: "other", label: "その他" };
const CONCERNS = [...Object.entries(SYMPTOM_LABELS).map(([key, label]) => ({ key, label })), OTHER_CONCERN];

const OPTION_SETS = {
  duration: [
    { key: "today", label: "今日から" }, { key: "days", label: "数日" },
    { key: "weeks", label: "数週間" }, { key: "months", label: "数か月以上" },
  ],
  intensity: [
    { key: "mild", label: "軽い" }, { key: "moderate", label: "気になる" },
    { key: "strong", label: "かなりつらい" }, { key: "worsening", label: "急に悪化" },
  ],
  thermal: [
    { key: "cold", label: "冷えが気になる" }, { key: "heat", label: "熱感・ほてり" },
    { key: "mixed", label: "両方ある" }, { key: "neutral", label: "特にない" },
  ],
  moisture: [
    { key: "damp", label: "重い・むくむ" }, { key: "dry", label: "乾く" },
    { key: "mixed", label: "両方ある" }, { key: "neutral", label: "特にない" },
  ],
  reserve: [
    { key: "low", label: "休んでも余力が少ない" }, { key: "standard", label: "普段どおり" },
    { key: "high", label: "動けるが張りやすい" },
  ],
  digestion: [
    { key: "appetite_low", label: "食欲が落ちた" }, { key: "postmeal_heavy", label: "食後に重い" },
    { key: "bowel_change", label: "便通が変わった" }, { key: "none", label: "特にない" },
  ],
  response: [
    { key: "warm_better", label: "温めると楽" }, { key: "move_better", label: "動くと楽" },
    { key: "rest_better", label: "休むと楽" }, { key: "none", label: "わからない" },
  ],
};

const RED_FLAGS = [
  { key: "chest_breath", label: "胸の痛み・強い息苦しさ" },
  { key: "neuro", label: "麻痺・ろれつ・意識の異常" },
  { key: "sudden_headache", label: "突然の激しい頭痛" },
  { key: "bleeding", label: "吐血・血便・黒い便" },
  { key: "dehydration", label: "水分が取れない・何度も吐く" },
  { key: "one_leg", label: "片脚だけ急に腫れた・痛む" },
  { key: "hearing", label: "急に聞こえにくくなった" },
  { key: "self_harm", label: "自分を傷つけたい気持ち" },
];

function makeSearchUrl(query) {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(String(query || "ケア用品").trim())}/`;
}

function ToggleChip({ active, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full px-3 py-2 text-[12px] font-black ring-1 transition-colors disabled:opacity-45",
        active ? "bg-[#349B83] text-white ring-[#349B83]" : "bg-white text-slate-600 ring-[#D5E2DA] hover:bg-[#F3F8F5]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ChoiceField({ label, name, value, options, onChange, note = "" }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-black text-slate-800">{label}</legend>
      {note ? <p className="mt-1 text-[12px] font-bold leading-5 text-slate-400">{note}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <ToggleChip key={option.key} active={value === option.key} onClick={() => onChange(name, option.key)}>
            {option.label}
          </ToggleChip>
        ))}
      </div>
    </fieldset>
  );
}

function Progress({ step }) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label={`3ステップ中${step}`}>
      {[1, 2, 3].map((number) => (
        <div key={number} className={["h-1.5 rounded-full", number <= step ? "bg-[#349B83]" : "bg-[#DCE8E1]"].join(" ")} />
      ))}
    </div>
  );
}

function safetyTone(level) {
  if (level === "stop") return "bg-[#FFF1EE] text-[#9A4435] ring-[#F0C0B6]";
  if (level === "consult") return "bg-[#FFF8E8] text-[#825D12] ring-[#EBD39A]";
  return "bg-[#EAF7F1] text-[#296F60] ring-[#B7DCCE]";
}

function candidateItem(candidate) {
  const category = candidate.type === "selfcare" ? "point" : candidate.type === "food" ? "eat" : "eat";
  return {
    title: candidate.title,
    category,
    itemUrl: makeSearchUrl(candidate.query),
    query: candidate.query,
    source: "guided_candidate",
    sourceType: "guided_candidate",
    buttonText: "楽天で比較",
    useGuide: candidate.direction,
    reason: candidate.reason,
    productRole: GUIDED_SCOPE_META[candidate.type]?.label || "比較候補",
    regulatoryCategory: candidate.type,
    ingredientIds: candidate.ingredientIds,
    dataConfidence: candidate.trust,
    candidateId: candidate.id,
    sourceKey: candidate.id,
    activeUse: false,
  };
}

function CandidateCard({ candidate, safety, saved, saving, onSave }) {
  const meta = GUIDED_SCOPE_META[candidate.type];
  const oral = ["supplement", "kampo", "otc"].includes(candidate.type);
  const linkBlocked = oral && safety.level === "consult";
  const connections = ingredientConnections(candidate).slice(0, 3);
  return (
    <article className="rounded-[22px] bg-white p-4 ring-1 ring-[#DCE7E0]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-black tracking-[0.1em] text-[#608077]">{meta?.eyebrow}</div>
          <h4 className="mt-1 text-[16px] font-black leading-6 text-slate-900">{candidate.title}</h4>
        </div>
        <span className="shrink-0 rounded-full bg-[#F4F7F5] px-2 py-1 text-[12px] font-black text-slate-500 ring-1 ring-[#DCE7E0]">{candidate.trust}</span>
      </div>
      <div className="mt-3 rounded-[16px] bg-[#F4F9F6] px-3 py-2.5">
        <div className="text-[12px] font-black text-[#2F816E]">見るポイント</div>
        <p className="mt-1 text-[13px] font-bold leading-5 text-slate-700">{candidate.reason}</p>
      </div>
      {candidate.duplicateIngredients.length ? (
        <div className="mt-2 rounded-[14px] bg-[#FFF1EE] px-3 py-2 text-[12px] font-black leading-5 text-[#9A4435] ring-1 ring-[#F0C0B6]">
          使用中として保存した候補と同じ成分があります。重複を確認してください。
        </div>
      ) : null}
      {connections.length ? (
        <details className="mt-2 rounded-[14px] bg-[#FAFBFA] ring-1 ring-[#E2E9E4]">
          <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-black text-slate-600 [&::-webkit-details-marker]:hidden">同じ素材を含む区分を見る ＋</summary>
          <div className="border-t border-[#E2E9E4] px-3 py-2">
            {connections.map((item) => <p key={item.id} className="text-[12px] font-bold leading-5 text-slate-500"><span className="font-black text-slate-700">{item.label}：</span>{item.note}</p>)}
          </div>
        </details>
      ) : null}
      {candidate.caution ? <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">確認：{candidate.caution}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={saving || saved} onClick={() => onSave?.(candidateItem(candidate))} className="rounded-[15px] bg-white px-3 py-2.5 text-[12px] font-black text-[#2F816E] ring-1 ring-[#BFD8CC] disabled:text-slate-400 disabled:ring-[#DCE7E0]">
          {saving ? "保存中…" : saved ? "♥ 保存済み" : "♡ 気になる"}
        </button>
        {linkBlocked ? (
          <span className="grid place-items-center rounded-[15px] bg-[#F2F4F3] px-3 py-2.5 text-center text-[12px] font-black text-slate-400">先に専門家へ確認</span>
        ) : (
          <a href={makeSearchUrl(candidate.query)} target="_blank" rel="sponsored nofollow noopener noreferrer" className="rounded-[15px] bg-[#D39422] px-3 py-2.5 text-center text-[12px] font-black text-white">楽天で比較</a>
        )}
      </div>
    </article>
  );
}

function GuidedResult({ result, entries, savingKey, onSave, onReset }) {
  const savedIds = useMemo(() => new Set(entries.map((entry) => entry?.item?.candidateId).filter(Boolean)), [entries]);
  return (
    <div className="grid gap-4">
      <div className={["rounded-[22px] p-4 ring-1", safetyTone(result.safety.level)].join(" ")}>
        <div className="text-[12px] font-black tracking-[0.12em] opacity-70">安全確認</div>
        <div className="mt-1 text-[16px] font-black leading-6">{result.safety.label}</div>
        <p className="mt-1 text-[12px] font-bold leading-5 opacity-80">{result.safety.reasons.join("・")}</p>
      </div>

      {result.safety.level === "stop" ? (
        <div className="rounded-[22px] bg-white p-5 text-center ring-1 ring-[#E4DDD8]">
          <p className="text-[14px] font-black leading-6 text-slate-800">商品候補は表示しません。緊急性がある場合は119、迷う場合は地域の救急相談や医療機関へ相談してください。</p>
          <button type="button" onClick={onReset} className="mt-4 rounded-full bg-white px-4 py-2 text-[12px] font-black text-slate-600 ring-1 ring-[#D5E2DA]">入力を見直す</button>
        </div>
      ) : (
        <>
          <section className="rounded-[24px] bg-[#EDF7F2] p-4 ring-1 ring-[#CFE4D8]">
            <div className="text-[12px] font-black tracking-[0.12em] text-[#2F816E]">今の状態の整理</div>
            <h3 className="mt-1 text-[18px] font-black leading-7 text-slate-900">{result.currentState.summary}</h3>
            {result.directions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.directions.map((direction) => <span key={direction} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[#376F62] ring-1 ring-[#CFE4D8]">{direction}</span>)}
              </div>
            ) : null}
            <p className="mt-3 text-[12px] font-bold leading-5 text-slate-500">体質は土台として使い、今選んだ症状と状態を優先して並べています。診断結果ではありません。</p>
          </section>

          {result.groups.length ? result.groups.map((group) => (
            <section key={group.type}>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black tracking-[0.12em] text-slate-400">{GUIDED_SCOPE_META[group.type]?.eyebrow}</div>
                  <h3 className="mt-0.5 text-[17px] font-black text-slate-900">{GUIDED_SCOPE_META[group.type]?.label}</h3>
                </div>
                <span className="text-[12px] font-bold text-slate-400">{group.candidates.length}候補</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} safety={result.safety} saved={savedIds.has(candidate.id)} saving={savingKey.includes(candidate.id)} onSave={onSave} />
                ))}
              </div>
            </section>
          )) : (
            <div className="rounded-[22px] bg-white p-5 text-center ring-1 ring-[#DCE7E0]">
              <div className="text-[14px] font-black text-slate-800">条件に合う比較候補を絞れませんでした</div>
              <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">症状を一つにするか、「まとめて見る」で条件を見直してください。</p>
            </div>
          )}
          <button type="button" onClick={onReset} className="w-full rounded-[18px] bg-white px-4 py-3 text-[12px] font-black text-[#2F816E] ring-1 ring-[#BFD8CC]">条件を見直す</button>
          <p className="text-[12px] font-bold leading-5 text-slate-400">医薬品・健康食品は、商品名ではなく処方名・有効成分・原材料から比較します。購入前に必ず最新の添付文書・商品表示を確認してください。</p>
        </>
      )}
    </div>
  );
}

export default function GuidedCareSearch({ profile, registeredSymptomKey = "", entries = [], savingKey = "", onSave }) {
  const baseline = useMemo(() => buildBaselineFromProfile(profile), [profile]);
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("self");
  const [concerns, setConcerns] = useState([]);
  const [freeText, setFreeText] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [answers, setAnswers] = useState({
    duration: "days", intensity: "moderate", thermal: "neutral", moisture: "neutral",
    reserve: "standard", digestion: "none", response: "none", scope: "all",
    ageBand: "adult", pregnancy: "no", medication: "no", allergy: "no", redFlags: [],
  });
  const [profileApplied, setProfileApplied] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (profileApplied) return;
    if (registeredSymptomKey) setConcerns([registeredSymptomKey]);
    setAnswers((prev) => ({
      ...prev,
      reserve: baseline.reserve || prev.reserve,
      thermal: baseline.thermal === "cold" || baseline.thermal === "heat" ? baseline.thermal : prev.thermal,
    }));
    if (profile || registeredSymptomKey) setProfileApplied(true);
  }, [baseline, profile, profileApplied, registeredSymptomKey]);

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleConcern(key) {
    setConcerns((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key].slice(0, 3));
  }

  function toggleRedFlag(key) {
    setAnswers((prev) => ({ ...prev, redFlags: prev.redFlags.includes(key) ? prev.redFlags.filter((item) => item !== key) : [...prev.redFlags, key] }));
  }

  async function organizeWithAi() {
    const text = freeText.trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("AI整理はログイン後に使えます。選択だけならそのまま検索できます。");
      const response = await fetch("/api/care-shop/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "AIで整理できませんでした。");
      const normalized = json?.data || normalizeConcernText(text);
      setAiResult(normalized);
      if (normalized.symptom_keys?.length) setConcerns((prev) => [...new Set([...prev, ...normalized.symptom_keys])].slice(0, 3));
      if (normalized.duration_hint && normalized.duration_hint !== "unknown") setAnswer("duration", normalized.duration_hint);
    } catch (error) {
      const fallback = normalizeConcernText(text);
      setAiResult(fallback);
      if (fallback.symptom_keys.length) setConcerns((prev) => [...new Set([...prev, ...fallback.symptom_keys])].slice(0, 3));
      setAiError(`${error?.message || "AI整理を使えませんでした。"} 端末内の簡易整理に切り替えました。`);
    } finally {
      setAiLoading(false);
    }
  }

  const oralSelected = answers.scope === "all" || ["supplement", "kampo", "otc"].includes(answers.scope);
  const canNextFromOne = concerns.length > 0 || freeText.trim().length > 1;

  function runSearch() {
    const mergedConcerns = [...new Set([...concerns, ...(aiResult?.symptom_keys || [])])];
    const input = { subject, concerns: mergedConcerns.length ? mergedConcerns : ["other"], freeText, ...answers };
    setResult(buildGuidedSearchResult(input, profile, entries));
  }

  if (result) return <GuidedResult result={result} entries={entries} savingKey={savingKey} onSave={onSave} onReset={() => { setResult(null); setStep(1); }} />;

  return (
    <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#D5E5DB] shadow-[0_20px_48px_-36px_rgba(36,86,76,0.3)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#EAF7F1] text-[20px] ring-1 ring-[#CFE7DE]">⌕</div>
        <div>
          <h2 className="text-[19px] font-black tracking-tight text-slate-900">今の状態から探す</h2>
          <p className="mt-1 text-[13px] font-bold leading-5 text-slate-500">商品名を当てるのではなく、状態を整理して「何を比較するか」まで絞ります。</p>
        </div>
      </div>
      <div className="mt-4"><Progress step={step} /></div>

      {step === 1 ? (
        <div className="mt-5 grid gap-5">
          <ChoiceField label="誰のことですか？" name="subject" value={subject} options={[{ key: "self", label: "自分" }, { key: "other", label: "家族・ほかの人" }]} onChange={(_, value) => { setSubject(value); if (value === "other") setAnswer("ageBand", "unknown"); }} />
          <fieldset>
            <legend className="text-[13px] font-black text-slate-800">いちばん気になることは？</legend>
            <p className="mt-1 text-[12px] font-bold text-slate-400">最大3つ。登録中の不調は先に選んであります。</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONCERNS.map((item) => <ToggleChip key={item.key} active={concerns.includes(item.key)} disabled={!concerns.includes(item.key) && concerns.length >= 3} onClick={() => toggleConcern(item.key)}>{item.label}</ToggleChip>)}
            </div>
          </fieldset>
          <div>
            <label htmlFor="guided-concern-text" className="text-[13px] font-black text-slate-800">言葉で補足する <span className="text-slate-400">（任意）</span></label>
            <textarea id="guided-concern-text" value={freeText} onChange={(event) => { setFreeText(event.target.value.slice(0, 500)); setAiResult(null); }} placeholder="例：3日前から、夕方に脚が重くむくむ。温めてもあまり変わらない" className="mt-2 min-h-[96px] w-full rounded-[18px] bg-[#FAFCFA] px-4 py-3 text-[14px] font-bold leading-6 text-slate-700 outline-none ring-1 ring-[#D5E2DA] focus:ring-2 focus:ring-[#77BCA9]" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={organizeWithAi} disabled={!freeText.trim() || aiLoading} className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-[#2F816E] ring-1 ring-[#BFD8CC] disabled:opacity-45">{aiLoading ? "AIで整理中…" : "AIで入力内容を整理（任意）"}</button>
              <span className="text-[12px] font-bold text-slate-400">このボタンを押した時だけAIを使います</span>
            </div>
            {aiResult?.summary ? <div className="mt-2 rounded-[14px] bg-[#F1F8F4] px-3 py-2 text-[12px] font-bold leading-5 text-[#3F7467] ring-1 ring-[#D1E5DA]">整理結果：{aiResult.summary}</div> : null}
            {aiError ? <p className="mt-2 text-[12px] font-bold leading-5 text-[#9A5A31]">{aiError}</p> : null}
          </div>
          <button type="button" disabled={!canNextFromOne} onClick={() => setStep(2)} className="w-full rounded-[18px] bg-[#349B83] px-4 py-3.5 text-[14px] font-black text-white disabled:bg-slate-300">今の状態を確認する</button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 grid gap-5">
          <ChoiceField label="いつから？" name="duration" value={answers.duration} options={OPTION_SETS.duration} onChange={setAnswer} />
          <ChoiceField label="今のつらさは？" name="intensity" value={answers.intensity} options={OPTION_SETS.intensity} onChange={setAnswer} />
          <ChoiceField label="冷え・熱感は？" name="thermal" value={answers.thermal} options={OPTION_SETS.thermal} onChange={setAnswer} note={baseline.thermal !== "neutral" ? "体質チェックの傾向を先に入れています。今の状態が違えば変更してください。" : ""} />
          <ChoiceField label="重さ・乾きは？" name="moisture" value={answers.moisture} options={OPTION_SETS.moisture} onChange={setAnswer} />
          <ChoiceField label="今の余力は？" name="reserve" value={answers.reserve} options={OPTION_SETS.reserve} onChange={setAnswer} note={profile ? "体質チェックの傾向を先に入れています。今の状態を優先してください。" : ""} />
          {(concerns.some((key) => ["fatigue", "digestion", "swelling", "dizziness"].includes(key)) || freeText.includes("胃") || freeText.includes("食")) ? <ChoiceField label="食事・胃腸は？" name="digestion" value={answers.digestion} options={OPTION_SETS.digestion} onChange={setAnswer} /> : null}
          <ChoiceField label="何をすると少し楽？" name="response" value={answers.response} options={OPTION_SETS.response} onChange={setAnswer} />
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setStep(1)} className="rounded-[18px] bg-white px-4 py-3 text-[13px] font-black text-slate-500 ring-1 ring-[#D5E2DA]">戻る</button>
            <button type="button" onClick={() => setStep(3)} className="rounded-[18px] bg-[#349B83] px-4 py-3 text-[13px] font-black text-white">探す範囲を選ぶ</button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-5 grid gap-5">
          <fieldset>
            <legend className="text-[13px] font-black text-slate-800">何を探しますか？</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GUIDED_SCOPE_OPTIONS.map((option) => (
                <button key={option.key} type="button" onClick={() => setAnswer("scope", option.key)} className={["rounded-[17px] px-3 py-3 text-left text-[12px] font-black ring-1", answers.scope === option.key ? "bg-[#EAF7F1] text-[#2F816E] ring-[#93C8B7]" : "bg-white text-slate-600 ring-[#D5E2DA]"].join(" ")}>
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {oralSelected ? (
            <div className="grid gap-5 rounded-[22px] bg-[#FFF9EC] p-4 ring-1 ring-[#EBD8AD]">
              <div>
                <div className="text-[13px] font-black text-[#825D12]">飲むものの安全確認</div>
                <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">当てはまっても候補は整理できますが、購入前に専門家確認へ切り替えます。</p>
              </div>
              <ChoiceField label="年齢" name="ageBand" value={answers.ageBand} options={[{ key: "under15", label: "15歳未満" }, { key: "adult", label: "15〜64歳" }, { key: "older", label: "65歳以上" }, { key: "unknown", label: "不明" }]} onChange={setAnswer} />
              <ChoiceField label="妊娠・授乳中、または可能性" name="pregnancy" value={answers.pregnancy} options={[{ key: "no", label: "ない" }, { key: "yes", label: "ある" }]} onChange={setAnswer} />
              <ChoiceField label="治療中・服薬中" name="medication" value={answers.medication} options={[{ key: "no", label: "ない" }, { key: "yes", label: "ある" }]} onChange={setAnswer} />
              <ChoiceField label="薬・食品・生薬のアレルギー歴" name="allergy" value={answers.allergy} options={[{ key: "no", label: "ない" }, { key: "yes", label: "ある" }]} onChange={setAnswer} />
            </div>
          ) : null}

          <fieldset>
            <legend className="text-[13px] font-black text-slate-800">今、当てはまるものはありますか？</legend>
            <p className="mt-1 text-[12px] font-bold leading-5 text-slate-400">一つでもあれば、商品探しより相談・受診を優先します。</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {RED_FLAGS.map((item) => (
                <label key={item.key} className={["flex cursor-pointer items-start gap-2 rounded-[15px] px-3 py-2.5 ring-1", answers.redFlags.includes(item.key) ? "bg-[#FFF1EE] ring-[#E9B5AA]" : "bg-white ring-[#DCE7E0]"].join(" ")}>
                  <input type="checkbox" checked={answers.redFlags.includes(item.key)} onChange={() => toggleRedFlag(item.key)} className="mt-0.5 h-4 w-4 accent-[#B55443]" />
                  <span className="text-[12px] font-black leading-5 text-slate-600">{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setStep(2)} className="rounded-[18px] bg-white px-4 py-3 text-[13px] font-black text-slate-500 ring-1 ring-[#D5E2DA]">戻る</button>
            <button type="button" onClick={runSearch} className="rounded-[18px] bg-[#349B83] px-4 py-3 text-[13px] font-black text-white">状態を整理して候補を見る</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
