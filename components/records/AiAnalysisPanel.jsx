"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import RecordsTrendChart from "@/components/records/RecordsTrendChart";
import {
  PERIOD_OPTIONS,
  buildRecordsSummary,
  deterministicAnalysis,
  getPeriodRange,
} from "@/lib/records/analysis";

function SummaryTile({ value, label, tone = "mint" }) {
  const toneClass = tone === "amber"
    ? "bg-[#FFF8EC] text-[#A56C18] ring-[#EED8B4]"
    : tone === "violet"
      ? "bg-[#F8F4FA] text-[#7B6588] ring-[#E2D6E7]"
      : tone === "rose"
        ? "bg-[#FFF0EC] text-[#B75C3E] ring-[#F1C8BA]"
        : "bg-[#EFF8F4] text-[#2F816E] ring-[#CFE7DE]";
  return (
    <div className={["rounded-[20px] p-3.5 ring-1", toneClass].join(" ")}>
      <div className="text-[21px] font-black tracking-tight">{value}</div>
      <div className="mt-1 text-[10px] font-black leading-4 opacity-75">{label}</div>
    </div>
  );
}

function CompactAnalysisSummary({ analysis }) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-3.5 ring-1 ring-[#E8F0EB]">
      <div className="text-[9px] font-black tracking-[0.14em] text-slate-400">この期間の要点</div>
      <div className="mt-1.5 text-[12px] font-bold leading-6 text-slate-700">{analysis.empathy}</div>
      <div className="mt-1 text-[12px] font-bold leading-6 text-slate-600">{analysis.observed}</div>
      {analysis.hypotheses ? (
        <div className="mt-2 border-t border-[#EEF3EF] pt-2 text-[11px] font-bold leading-5 text-slate-500">
          <span className="font-black text-[#7B6588]">考えられること：</span>{analysis.hypotheses}
        </div>
      ) : null}
    </div>
  );
}

function formatRange(start, end) {
  const short = (value) => {
    const [, month, day] = String(value || "").split("-");
    return `${Number(month)}/${Number(day)}`;
  };
  return `${short(start)}〜${short(end)}`;
}

function formatBetaEnd(value) {
  if (!value) return "期間限定";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+09:00` : value);
  if (Number.isNaN(date.getTime())) return "期間限定";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日まで`;
}

function FeedbackButtons({ requestId, surface, authedFetch, feedbackByRequest, setFeedbackByRequest, negativeReasonFor, setNegativeReasonFor }) {
  if (!requestId) return null;

  async function send(feedback, reason = null) {
    if (feedbackByRequest[requestId]) return;
    setFeedbackByRequest((current) => ({ ...current, [requestId]: feedback }));
    setNegativeReasonFor("");
    try {
      await authedFetch("/api/records/feedback", {
        method: "POST",
        body: JSON.stringify({ request_id: requestId, feedback, reason, surface }),
      });
    } catch {
      setFeedbackByRequest((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2 px-1 text-[9px] font-black text-slate-400">
        <span>役に立ちましたか？</span>
        <button type="button" onClick={() => send(1)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === 1 ? "bg-[#EAF7F1] text-[#2F816E] ring-[#CFE7DE]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👍 役に立った</button>
        <button type="button" onClick={() => setNegativeReasonFor(requestId)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === -1 ? "bg-[#FFF0EC] text-[#B75C3E] ring-[#F1C8BA]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👎 ちょっと違った</button>
      </div>
      {negativeReasonFor === requestId && !feedbackByRequest[requestId] ? (
        <div className="mt-2 rounded-[16px] bg-[#FFF8EC] p-2.5 ring-1 ring-[#EED8B4]">
          <div className="text-[9px] font-black text-[#A56C18]">どこが少し違いましたか？</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ["too_general", "一般的すぎた"],
              ["not_grounded", "記録を反映していない"],
              ["hard_to_understand", "分かりにくい"],
              ["felt_unsafe", "内容が不安"],
              ["other", "その他"],
            ].map(([reason, label]) => (
              <button key={reason} type="button" onClick={() => send(-1, reason)} className="rounded-full bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-600 ring-1 ring-[#EED8B4]">{label}</button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConsentCard({ consent, access, loading, saving, onConsent, onRevoke }) {
  if (loading) return <div className="h-32 animate-pulse rounded-[24px] bg-[#F7FAF8] ring-1 ring-[#DCE8DD]" />;
  if (!access?.ai_enabled) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-4 ring-1 ring-[#DCE8DD]">
        <div className="text-[13px] font-black text-slate-900">AI分析は現在プレビュー表示です</div>
        <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">グラフと記録の振り返りは利用できます。対象期間または対象プランになると、AIによる個別の振り返りと会話が開きます。</div>
      </div>
    );
  }
  if (consent?.active) {
    return (
      <div className="rounded-[18px] bg-[#F7FAF8] px-3.5 py-3 text-[9px] font-bold leading-5 text-slate-400 ring-1 ring-[#E8F0EB]">
        AIには氏名・メール・住所を含めず、選択期間の解釈済み体質要約・計算済み予報根拠・表示ケア・実際に記録した具体的ケアとタイミング・体調記録・メモ・会話だけを送ります。体質チェックの生回答は送りません。OpenAIの応答保存機能は無効化しますが、不正利用監視ログ等は提供元の方針に従います。
        <button type="button" disabled={saving} onClick={onRevoke} className="ml-2 font-black text-slate-500 underline underline-offset-2">同意を取り消す</button>
      </div>
    );
  }
  return (
    <div className="rounded-[24px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
      <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">AI利用前の確認</div>
      <div className="mt-1 text-[14px] font-black text-slate-900">記録の一部をAIへ送って分析します</div>
      <div className="mt-2 text-[11px] font-bold leading-6 text-slate-600">
        送信するのは、選択期間の解釈済み体質要約・計算済み予報根拠・表示ケア・実際に記録した具体的ケアとタイミング・体調記録・メモ・会話です。体質チェックの生回答、氏名、メール、住所は送りません。OpenAIの応答保存機能は無効化しますが、不正利用監視ログ等は提供元の方針に従います。AIは診断や薬の個別判断を行いません。
      </div>
      <Button disabled={saving} onClick={onConsent} className="mt-3 w-full">{saving ? "保存中…" : "内容を確認し、AI分析を使う"}</Button>
    </div>
  );
}


export default function AiAnalysisPanel({
  active,
  today,
  authedFetch,
  initialPrompt = "",
  onConsumePrompt,
  onSelectDate,
  onTrackEvent,
}) {
  const [periodKey, setPeriodKey] = useState("30d");
  const [bundle, setBundle] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [error, setError] = useState("");
  const [access, setAccess] = useState(null);
  const [consent, setConsent] = useState(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMood, setChatMood] = useState("normal");
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [followUp, setFollowUp] = useState(null);
  const [chatUsage, setChatUsage] = useState(null);
  const [feedbackByRequest, setFeedbackByRequest] = useState({});
  const [negativeReasonFor, setNegativeReasonFor] = useState("");

  const range = useMemo(() => getPeriodRange(today, periodKey), [today, periodKey]);
  const summary = useMemo(() => bundle?.summary || buildRecordsSummary(bundle?.rows || []), [bundle]);
  const fallbackAnalysis = useMemo(() => deterministicAnalysis(summary), [summary]);
  const displayedAnalysis = analysis || fallbackAnalysis;
  const hasPendingFollowUp = Boolean(
    followUp?.kind && followUp.kind !== "none" && followUp.question
  );

  const loadConsent = useCallback(async () => {
    setConsentLoading(true);
    try {
      const data = await authedFetch("/api/records/consent");
      setConsent(data?.consent || { active: false });
      setAccess(data?.access || null);
    } catch (loadError) {
      setConsent({ active: false, unavailable: true });
      setError(loadError?.message || "AI利用の準備状況を確認できませんでした");
    } finally {
      setConsentLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (!active) return;
    loadConsent();
  }, [active, loadConsent]);

  useEffect(() => {
    if (!active || !authedFetch) return;
    let cancelled = false;
    (async () => {
      setRangeLoading(true);
      setError("");
      setAnalysis(null);
      setAnalysisMeta(null);
      try {
        const data = await authedFetch(`/api/records/range?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`);
        if (!cancelled) {
          setBundle(data);
          if (data?.access) setAccess(data.access);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "記録を読み込めませんでした");
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, authedFetch, range.start, range.end]);

  useEffect(() => {
    if (!active || !bundle || analysis) return;
    let cancelled = false;
    (async () => {
      setAnalysisLoading(true);
      setAnalysisNotice("");
      setError("");
      try {
        const data = await authedFetch("/api/records/analysis", {
          method: "POST",
          body: JSON.stringify({ start: range.start, end: range.end, period_key: periodKey }),
        });
        if (!cancelled) {
          setAnalysis(data.analysis || null);
          setAnalysisMeta({
            source: data.source,
            model: data.model,
            cached: data.cached,
            request_id: data.request_id,
            consent_required: data.consent_required,
            reason: data.algorithm_reason,
          });
          setChatSuggestions(data.analysis?.suggested_questions || []);
          setChatMood(data.analysis?.mood || "normal");
          if (data.usage) setChatUsage(data.usage);
        }
      } catch (analysisError) {
        if (!cancelled) {
          if (analysisError?.code === "daily_analysis_limit") {
            setAnalysisNotice(analysisError?.message || "本日のAI分析更新上限に達しました。保存済みの分析は引き続き確認できます。");
          } else {
            setError(analysisError?.message || "AI分析を読み込めませんでした");
          }
        }
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, bundle, analysis, authedFetch, range.start, range.end, periodKey]);

  useEffect(() => {
    if (!active || !consent?.active || !access?.ai_enabled) {
      setThreadId("");
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setThreadLoading(true);
      try {
        const data = await authedFetch(`/api/records/threads?period_key=${encodeURIComponent(periodKey)}&start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`);
        if (!cancelled) {
          setThreadId(data?.thread?.id || "");
          setMessages(data?.messages || []);
          const lastAssistant = [...(data?.messages || [])].reverse().find((item) => item.role === "assistant");
          setChatMood(lastAssistant?.mood || displayedAnalysis.mood || "normal");
          const nextFollowUp = lastAssistant?.follow_up || null;
          setFollowUp(nextFollowUp);
          setChatSuggestions(
            nextFollowUp?.kind && nextFollowUp.kind !== "none"
              ? []
              : displayedAnalysis.suggested_questions || []
          );
        }
      } catch (threadError) {
        if (!cancelled) setError(threadError?.message || "AI会話を読み込めませんでした");
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active, consent?.active, access?.ai_enabled, authedFetch, periodKey, range.start, range.end]);

  useEffect(() => {
    if (!active || !initialPrompt) return;
    setInput(initialPrompt);
    onConsumePrompt?.();
  }, [active, initialPrompt, onConsumePrompt]);

  async function acceptConsent() {
    setConsentSaving(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/consent", { method: "POST", body: JSON.stringify({ consent: true }) });
      setConsent(data?.consent || { active: true });
      setAnalysis(null);
      setAnalysisMeta(null);
    } catch (consentError) {
      setError(consentError?.message || "同意を保存できませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function revokeConsent() {
    setConsentSaving(true);
    try {
      const data = await authedFetch("/api/records/consent", { method: "DELETE", body: JSON.stringify({}) });
      setConsent(data?.consent || { active: false });
      setThreadId("");
      setMessages([]);
      setAnalysis(null);
      setAnalysisMeta(null);
    } catch (consentError) {
      setError(consentError?.message || "同意を取り消せませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function sendMessage(value = input) {
    const content = String(value || "").trim();
    if (!content || sending || !consent?.active || !access?.ai_enabled) return;
    const optimistic = { id: `local-${Date.now()}`, role: "user", content };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setSending(true);
    setError("");
    setFollowUp(null);
    try {
      const data = await authedFetch("/api/records/chat", {
        method: "POST",
        body: JSON.stringify({
          start: range.start,
          end: range.end,
          period_key: periodKey,
          thread_id: threadId || null,
          message: content,
        }),
      });
      setThreadId(data.thread_id || threadId);
      setMessages((current) => [...current, {
        id: data.message_id || `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "うまく言葉にできませんでした。",
        request_id: data.request_id || "",
        mood: data.mood,
        suggested_questions: data.suggested_questions || [],
        follow_up: data.follow_up || null,
        safety_level: data.safety_level || "routine",
      }]);
      const nextFollowUp = data.follow_up || null;
      setChatMood(data.mood || "listening");
      setFollowUp(nextFollowUp);
      setChatSuggestions(
        nextFollowUp?.kind && nextFollowUp.kind !== "none"
          ? []
          : data.suggested_questions || []
      );
      setChatUsage(data.usage || null);
    } catch (sendError) {
      setError(sendError?.message || "AIへ送信できませんでした");
    } finally {
      setSending(false);
    }
  }

  async function clearConversation() {
    if (!threadId) {
      setMessages([]);
      return;
    }
    if (!window.confirm("この期間のAI会話を削除しますか？削除後は元に戻せません。")) return;
    try {
      await authedFetch("/api/records/threads", { method: "DELETE", body: JSON.stringify({ thread_id: threadId }) });
      setThreadId("");
      setMessages([]);
      setChatSuggestions(displayedAnalysis.suggested_questions || []);
      setFollowUp(null);
    } catch (clearError) {
      setError(clearError?.message || "会話を削除できませんでした");
    }
  }

  function choosePeriod(nextKey) {
    setPeriodKey(nextKey);
    setAnalysis(null);
    setAnalysisMeta(null);
    setAnalysisNotice("");
    setThreadId("");
    setMessages([]);
    onTrackEvent?.("analysis_period_selected", { period_key: nextKey });
  }

  const feedbackProps = {
    authedFetch,
    feedbackByRequest,
    setFeedbackByRequest,
    negativeReasonFor,
    setNegativeReasonFor,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] bg-[#FFF8EC] px-4 py-3.5 ring-1 ring-[#EED8B4]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">AI分析 先行体験版</div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
              {access?.beta_enabled ? `${formatBetaEnd(access.beta_ends_at)}、品質向上のため無料公開中です。` : "グラフと記録の振り返りは無料で確認できます。"}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">{access?.beta_enabled ? "先行体験中" : "AI"}</span>
        </div>
      </div>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">振り返る期間</div>
            <div className="mt-1 text-[17px] font-black text-slate-900">どの期間を振り返る？</div>
          </div>
          <div className="text-[10px] font-black text-slate-400">{formatRange(range.start, range.end)}</div>
        </div>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIOD_OPTIONS.map((option) => (
            <button key={option.key} type="button" onClick={() => choosePeriod(option.key)} className={["shrink-0 rounded-full px-4 py-2 text-[11px] font-black ring-1 transition-all", periodKey === option.key ? "bg-[#349B83] text-white ring-[#349B83]" : "bg-white text-slate-600 ring-[#DCE8DD] hover:bg-[#F4FAF7]"].join(" ")}>{option.label}</button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <SummaryTile value={`${summary.recorded_days || 0}日`} label="記録できた日" />
          <SummaryTile value={`${summary.good_days || 0}日`} label="穏やかだった日" />
          <SummaryTile value={`${summary.difficult_days || 0}日`} label="つらさがあった日" tone="rose" />
          <SummaryTile value={`${summary.care_days || 0}日`} label="ケアをした日" tone="amber" />
        </div>
        <div className="mt-4">
          {rangeLoading ? <div className="h-[280px] animate-pulse rounded-[26px] bg-[#F7FAF8] ring-1 ring-[#DCE8DD]" /> : <RecordsTrendChart rows={bundle?.rows || []} periodDays={range.days} onSelectDate={onSelectDate} />}
        </div>
        <div className="mt-3 rounded-[18px] bg-[#F7FAF8] px-3.5 py-3 text-[9px] font-bold leading-4 text-slate-400 ring-1 ring-[#E8F0EB]">
          体調ゆらぎ度は固定された予報です。記録で予報を変えず、似た予報条件の日をそろえて、ケアと実感の関係を振り返ります。
        </div>
      </section>

      <ConsentCard consent={consent} access={access} loading={consentLoading} saving={consentSaving} onConsent={acceptConsent} onRevoke={revokeConsent} />

      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-4">
          <GuideBotAvatar mood={analysisLoading ? "thinking" : displayedAnalysis.mood} className="h-[78px] w-[78px] shrink-0" />
          <div className="relative mb-2 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">{analysisMeta?.source === "ai" ? "AIからの振り返り" : "記録から分かったこと"}</div>
            <div className="mt-1 text-[14px] font-black leading-6 text-slate-900">{analysisLoading ? "記録を見比べています…" : displayedAnalysis.headline}</div>
          </div>
        </div>
        <div className="space-y-2.5 px-4 pb-4">
          {analysisLoading ? (
            <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#E8F0EB]">
              少し待ってください。予報・実感・ケアを順番に確認しています。
            </div>
          ) : (
            <>
              <CompactAnalysisSummary analysis={displayedAnalysis} />
              <div className="rounded-[18px] bg-[#FFF8EC] px-4 py-3 ring-1 ring-[#EED8B4]">
                <div className="text-[9px] font-black tracking-[0.14em] text-[#A56C18]/75">次に一つだけ</div>
                <div className="mt-1 text-[12px] font-black leading-6 text-slate-700">{displayedAnalysis.next_step}</div>
              </div>
              <div className="rounded-[18px] bg-[#EAF7F1] px-4 py-3 text-[12px] font-black leading-6 text-[#2F816E] ring-1 ring-[#CFE7DE]">{displayedAnalysis.question}</div>
              {displayedAnalysis.evidence?.length ? (
                <details className="rounded-[16px] bg-white/65 px-3.5 py-2.5 text-[10px] font-bold text-slate-500 ring-1 ring-[#E8F0EB]">
                  <summary className="cursor-pointer font-black text-slate-500">根拠を確認</summary>
                  <div className="mt-2 space-y-1 leading-5">
                    {displayedAnalysis.evidence.map((item) => <div key={item}>・{item}</div>)}
                  </div>
                </details>
              ) : null}
            </>
          )}
          {analysisMeta?.source ? (
            <div className="px-1 text-[9px] font-bold text-slate-400">{analysisMeta.source === "ai" ? "AIと集計ロジックによる分析" : "記録数・利用状態に応じた基本分析"}{analysisMeta.cached ? "・保存済み分析を表示" : ""}</div>
          ) : null}
          {analysisMeta?.source === "ai" && analysisMeta.request_id ? <FeedbackButtons requestId={analysisMeta.request_id} surface="analysis" {...feedbackProps} /> : null}
          {analysisNotice ? (
            <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[11px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">
              {analysisNotice}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[#EFF8F4] ring-1 ring-[#CFE7DE]"><GuideBotAvatar mood={chatMood} className="h-10 w-10" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black text-slate-900">この期間についてAIに聞く</div>
            <div className="mt-0.5 text-[10px] font-bold text-slate-400">記録と分析を引き継いで話します</div>
          </div>
          {chatUsage?.chat ? <div className="shrink-0 rounded-full bg-[#F4FAF7] px-2.5 py-1 text-[9px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">今月あと{Math.max(0, chatUsage.chat.limit - chatUsage.chat.used)}回</div> : null}
        </div>

        {!consent?.active || !access?.ai_enabled ? (
          <div className="mt-4 rounded-[22px] bg-[#F7FAF8] px-4 py-4 text-[11px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">上のAI利用確認を完了すると、選択期間の記録を引き継いだ会話を始められます。</div>
        ) : (
          <>
            <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
              {threadLoading ? <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#E8F0EB]">会話を読み込んでいます…</div> : null}
              {!threadLoading && messages.length === 0 ? <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#E8F0EB]">気になった日や、ケアの種類・タイミングについて聞いてください。分からないことは断定せず、一緒に整理します。</div> : null}
              {messages.map((message, index) => (
                <div key={message.id || `${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
                  <div className={["whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[12px] font-bold leading-6 ring-1", message.role === "user" ? "bg-[#349B83] text-white ring-[#349B83]" : message.safety_level === "urgent" ? "bg-[#FFF0EC] text-[#8F3E2A] ring-[#F1C8BA]" : "bg-white text-slate-600 ring-[#DCE8DD]"].join(" ")}>{message.content}</div>
                  {message.role === "assistant" && message.request_id ? <FeedbackButtons requestId={message.request_id} surface="chat" {...feedbackProps} /> : null}
                </div>
              ))}
              {sending ? <div className="max-w-[90%] rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#DCE8DD]">記録を確認しながら考えています…</div> : null}
            </div>

            {hasPendingFollowUp ? (
              <div className="mt-3 rounded-[20px] bg-[#FFF8EC] p-3 ring-1 ring-[#EED8B4]">
                <div className="text-[9px] font-black tracking-[0.12em] text-[#A56C18]/75">AIからの確認</div>
                <div className="mt-1 text-[11px] font-black leading-5 text-slate-700">{followUp.question}</div>
                <div className="mt-1 text-[9px] font-bold leading-4 text-slate-400">選ぶと、この確認への回答として送信されます。</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(followUp.options || []).map((option) => <button key={option} type="button" onClick={() => sendMessage(`AIからの確認への回答：${option}`)} className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">{option}</button>)}
                </div>
              </div>
            ) : null}

            {!hasPendingFollowUp && !sending ? (
              <div className="mt-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
                  <span className="text-[9px] font-black tracking-[0.12em] text-[#2F816E]/75">AIに聞く候補</span>
                  <span className="text-[9px] font-bold text-slate-400">タップすると入力欄に入ります。送信前に編集できます。</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(chatSuggestions.length ? chatSuggestions : displayedAnalysis.suggested_questions || []).map((question) => <button key={question} type="button" onClick={() => setInput(question)} className="rounded-full bg-[#F4FAF7] px-3 py-2 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">{question}</button>)}
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-[22px] bg-white p-2 ring-1 ring-[#DCE8DD] shadow-sm">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} maxLength={1200} placeholder="例）湿気が主な日のケアと実感を整理して" className="w-full resize-none bg-transparent px-2 py-2 text-[13px] font-bold leading-6 text-slate-700 outline-none" />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <button type="button" onClick={clearConversation} className="text-[10px] font-black text-slate-400">会話を削除</button>
                <Button size="sm" disabled={!input.trim() || sending} onClick={() => sendMessage()}>{sending ? "送信中…" : "AIに聞く"}</Button>
              </div>
            </div>
          </>
        )}

        {error ? <div className="mt-3 rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[11px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{error}</div> : null}
        <div className="mt-3 text-[9px] font-bold leading-4 text-slate-400">AIは診断や治療、薬・漢方・サプリの個別判断は行いません。強い症状や急な変化がある場合は、医療機関などへ相談してください。</div>
      </section>
    </div>
  );
}
