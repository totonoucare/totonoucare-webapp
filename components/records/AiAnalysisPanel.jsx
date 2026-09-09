"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import RecordsTrendChart from "@/components/records/RecordsTrendChart";
import RecordsSimpleTrendChart from "@/components/records/RecordsSimpleTrendChart";
import {
  PERIOD_OPTIONS,
  buildReflectionBenefit,
  buildReflectionEvidenceDetails,
  buildRecordsSummary,
  deterministicAnalysis,
  getPeriodRange,
} from "@/lib/records/analysis";
import { replyContextForAssistantMessage } from "@/lib/records/replyContext";

function BenefitFlow({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
      {items.map((item, index) => (
        <div key={item.key} className="contents">
          <div className="grid min-w-0 place-items-center rounded-[16px] bg-white px-1.5 py-2.5 text-center ring-1 ring-[#DCE8DD]">
            <div className="text-[20px] font-black tracking-tight text-[#2F816E]">{item.value}日</div>
            <div className="mt-0.5 text-[10px] font-black leading-4 text-slate-500 sm:text-[11px]">{item.label}</div>
          </div>
          {index < items.length - 1 ? <div className="grid place-items-center text-[18px] font-black text-[#66B9A3]">›</div> : null}
        </div>
      ))}
    </div>
  );
}

const CONCERN_REFLECTION_STATES = new Set([
  "attention_difficult",
  "proactive_difficult",
  "stable_difficult",
]);

function getReflectionAvatarState({ loading = false, benefitState = "", aiMood = "" } = {}) {
  if (loading) return { signal: 0, mood: "thinking" };
  if (CONCERN_REFLECTION_STATES.has(benefitState)) return { signal: 1, mood: "" };
  return { signal: 0, mood: aiMood || "normal" };
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
      <div className="flex flex-wrap items-center gap-2 px-1 text-[12px] font-black text-slate-400">
        <span>役に立ちましたか？</span>
        <button type="button" onClick={() => send(1)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === 1 ? "bg-[#EAF7F1] text-[#2F816E] ring-[#CFE7DE]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👍 役に立った</button>
        <button type="button" onClick={() => setNegativeReasonFor(requestId)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === -1 ? "bg-[#FFF0EC] text-[#B75C3E] ring-[#F1C8BA]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👎 ちょっと違った</button>
      </div>
      {negativeReasonFor === requestId && !feedbackByRequest[requestId] ? (
        <div className="mt-2 rounded-[16px] bg-[#FFF8EC] p-2.5 ring-1 ring-[#EED8B4]">
          <div className="text-[12px] font-black text-[#A56C18]">どこが少し違いましたか？</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ["too_general", "一般的すぎた"],
              ["not_grounded", "記録を反映していない"],
              ["hard_to_understand", "分かりにくい"],
              ["felt_unsafe", "内容が不安"],
              ["other", "その他"],
            ].map(([reason, label]) => (
              <button key={reason} type="button" onClick={() => send(-1, reason)} className="rounded-full bg-white px-2.5 py-1.5 text-[12px] font-black text-slate-600 ring-1 ring-[#EED8B4]">{label}</button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConsentCard({ consent, access, loading, saving, onConsent, onRevoke }) {
  if (loading) return <div className="h-32 animate-pulse rounded-[24px] bg-[#F7FAF8] ring-1 ring-[#DCE8DD]" />;
  if (!access?.analysis_enabled) {
    return (
      <div className="rounded-[24px] bg-[#F7FAF8] p-4 ring-1 ring-[#DCE8DD]">
        <div className="text-[13px] font-black text-slate-900">振り返りは現在プレビュー表示です</div>
        <div className="mt-1 text-[14px] font-bold leading-5 text-slate-500">グラフと記録の振り返りは利用できます。対象期間または対象プランになると、AIによる個別の振り返りと会話が開きます。</div>
      </div>
    );
  }
  if (consent?.active) {
    return (
      <details className="rounded-[18px] bg-[#F7FAF8] px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#E8F0EB]">
        <summary className="cursor-pointer font-black text-slate-600">AIへのデータ共有：同意済み</summary>
        <div className="mt-2 text-slate-500">
          AIには、解釈済み体質トリセツ、利用する画面に必要な予報・対策ケア・実行ケア・体調記録・メモ・任意の受診・相談状況・会話を送ります。アカウントに登録された氏名・メールアドレス・住所と、体質チェックの生回答は自動送信しません。ただし、記録メモや会話欄に自分で入力した内容は、そのまま送信対象になります。期間の振り返りと今の体調相談の会話は分けて扱います。OpenAIの応答保存機能は無効化しますが、不正利用監視ログ等は提供元の方針に従います。
        </div>
        <button type="button" disabled={saving} onClick={onRevoke} className="mt-2 font-black text-slate-500 underline underline-offset-2">同意を取り消す</button>
      </details>
    );
  }
  return (
    <div className="rounded-[24px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
      <div className="text-[12px] font-black tracking-[0.14em] text-[#A56C18]">AI利用前の確認</div>
      <div className="mt-1 text-[14px] font-black text-slate-900">体質トリセツと予報・記録を使って振り返ります</div>
      <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">氏名・メールアドレス・住所と、体質チェックの生回答は自動送信しません。</div>
      <details className="mt-3 rounded-[16px] bg-white/70 px-3 py-2.5 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#EED8B4]">
        <summary className="cursor-pointer font-black text-[#8F651E]">送信内容とAIの範囲</summary>
        <div className="mt-2">送信するのは、解釈済み体質トリセツ、利用する画面に必要な予報・対策ケア・実行ケア・体調記録・メモ・任意の受診・相談状況・会話です。入力したメモや会話は送信対象になります。OpenAIの応答保存機能は無効化しますが、不正利用監視ログ等は提供元の方針に従います。AIは診断や薬の個別判断を行いません。</div>
      </details>
      <Button disabled={saving} onClick={onConsent} className="mt-3 w-full">{saving ? "保存中…" : "AI利用に同意して進む"}</Button>
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
  const [analysisLookupLoading, setAnalysisLookupLoading] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [analysisError, setAnalysisError] = useState("");
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
  const [replyToFollowUp, setReplyToFollowUp] = useState(null);
  const [chatUsage, setChatUsage] = useState(null);
  const [periodChatOpen, setPeriodChatOpen] = useState(false);
  const [feedbackByRequest, setFeedbackByRequest] = useState({});
  const [negativeReasonFor, setNegativeReasonFor] = useState("");
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);

  const range = useMemo(() => getPeriodRange(today, periodKey), [today, periodKey]);
  const summary = useMemo(() => bundle?.summary || buildRecordsSummary(bundle?.rows || []), [bundle]);
  const fallbackAnalysis = useMemo(() => deterministicAnalysis(summary), [summary]);
  const benefit = useMemo(() => buildReflectionBenefit(summary), [summary]);
  const displayedAnalysis = analysis || fallbackAnalysis;
  const hasAiAnalysis = Boolean(analysis && analysisMeta?.source === "ai");
  const hasCurrentAiAnalysis = Boolean(hasAiAnalysis && !analysisMeta?.stale);
  const currentReflectionAnalysis = hasCurrentAiAnalysis ? displayedAnalysis : fallbackAnalysis;
  const reflectionEvidence = useMemo(
    () => buildReflectionEvidenceDetails(summary, currentReflectionAnalysis.evidence),
    [summary, currentReflectionAnalysis.evidence],
  );
  const currentNextStep = currentReflectionAnalysis.next_step;
  const reflectionAvatar = getReflectionAvatarState({
    loading: rangeLoading || analysisLoading || analysisLookupLoading,
    benefitState: benefit.state,
    aiMood: hasCurrentAiAnalysis ? currentReflectionAnalysis.mood : "",
  });
  const savedAnalysisRange = analysisMeta?.analysis_range;
  const savedRangeLabel = savedAnalysisRange?.start && savedAnalysisRange?.end
    ? formatRange(savedAnalysisRange.start, savedAnalysisRange.end)
    : "";
  const currentRangeLabel = formatRange(range.start, range.end);
  const recordsNeededForAi = Math.max(0, 3 - Number(summary.recorded_days || 0));
  const hasPendingFollowUp = Boolean(
    followUp?.kind && followUp.kind !== "none" && followUp.question
  );
  const premiumActive = Boolean(access?.entitled);
  const betaActive = Boolean(access?.beta_enabled && !premiumActive);
  const trialActive = Boolean(access?.trial_enabled && !premiumActive && !betaActive);
  const historyOnly = Boolean(access?.analysis_history_enabled && !access?.analysis_enabled);
  const accessBadge = betaActive
    ? "先行無料"
    : trialActive
      ? `体験 残り${access?.trial_days_remaining || 0}日`
      : premiumActive
        ? "プレミアム"
        : "閲覧のみ";

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

  const loadAnalysis = useCallback(async ({ generate = false } = {}) => {
    if (!active || !bundle) return;
    if (generate) setAnalysisLoading(true);
    else setAnalysisLookupLoading(true);
    setAnalysisNotice("");
    setAnalysisError("");
    try {
      const data = await authedFetch("/api/records/analysis", {
        method: "POST",
        body: JSON.stringify({
          start: range.start,
          end: range.end,
          period_key: periodKey,
          generate,
        }),
      });
      setAnalysis(data.analysis || null);
      setAnalysisMeta({
        source: data.source,
        model: data.model,
        cached: data.cached,
        stale: data.stale,
        can_generate: data.can_generate,
        generation_required: data.generation_required,
        request_id: data.request_id,
        consent_required: data.consent_required,
        reason: data.algorithm_reason,
        analysis_range: data.analysis_range || null,
        generated_at: data.generated_at || null,
      });
      setChatSuggestions(data.analysis?.suggested_questions || []);
      setChatMood(data.analysis?.mood || "normal");
      if (data.usage) setChatUsage(data.usage);
    } catch (loadError) {
      if (loadError?.code === "daily_analysis_limit") {
        setAnalysisNotice(loadError?.message || "本日の振り返り更新上限に達しました。保存済みの内容は引き続き確認できます。");
      } else {
        setAnalysisError(loadError?.message || "振り返りを読み込めませんでした");
      }
    } finally {
      if (generate) setAnalysisLoading(false);
      else setAnalysisLookupLoading(false);
    }
  }, [active, bundle, authedFetch, range.start, range.end, periodKey]);

  useEffect(() => {
    if (!active || !bundle || consentLoading) return;
    loadAnalysis({ generate: false });
  }, [active, bundle, consentLoading, consent?.active, access?.analysis_enabled, loadAnalysis]);

  useEffect(() => {
    if (!active || (!access?.analysis_enabled && !access?.analysis_history_enabled)) {
      setThreadId("");
      setMessages([]);
      setReplyToFollowUp(null);
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
          const nextFollowUp = lastAssistant?.follow_up?.question
            ? { ...lastAssistant.follow_up, assistant_message_id: lastAssistant.id }
            : null;
          setFollowUp(nextFollowUp);
          setReplyToFollowUp(null);
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
  }, [active, access?.analysis_enabled, access?.analysis_history_enabled, authedFetch, periodKey, range.start, range.end]);

  useEffect(() => {
    if (!active || !initialPrompt) return;
    setPeriodChatOpen(true);
    setInput(initialPrompt);
    setReplyToFollowUp(null);
    requestAnimationFrame(() => inputRef.current?.focus());
    onConsumePrompt?.();
  }, [active, initialPrompt, onConsumePrompt]);

  useEffect(() => {
    if (!active || threadLoading) return;
    const element = chatScrollRef.current;
    if (!element) return;
    requestAnimationFrame(() => {
      element.scrollTo({ top: element.scrollHeight, behavior: messages.length ? "smooth" : "auto" });
    });
  }, [active, threadLoading, messages.length, sending]);

  function fillInput(value) {
    setInput(String(value || ""));
    setReplyToFollowUp(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function fillFollowUpOption(option) {
    const context = replyContextForAssistantMessage(followUp, followUp?.assistant_message_id, option);
    setInput(String(option || ""));
    setReplyToFollowUp(context);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleInputChange(event) {
    const value = event.target.value;
    setInput(value);
    if (value && hasPendingFollowUp && !replyToFollowUp) {
      setReplyToFollowUp(replyContextForAssistantMessage(followUp, followUp?.assistant_message_id));
    }
  }

  function detachFollowUp() {
    setReplyToFollowUp(null);
    setFollowUp(null);
  }

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
      setReplyToFollowUp(null);
    } catch (consentError) {
      setError(consentError?.message || "同意を取り消せませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function sendMessage(value = input) {
    const content = String(value || "").trim();
    if (!content || sending || !consent?.active || !access?.analysis_enabled) return;
    const replyContext = replyToFollowUp;
    const localId = `local-${Date.now()}`;
    const optimistic = {
      id: localId,
      role: "user",
      content,
      reply_to_follow_up: replyContext,
    };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setReplyToFollowUp(null);
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
          reply_to_follow_up: replyContext,
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
      const nextFollowUp = data.follow_up?.question
        ? { ...data.follow_up, assistant_message_id: data.message_id }
        : null;
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
      setMessages((current) => current.filter((item) => item.id !== localId));
      setInput(content);
      setReplyToFollowUp(replyContext);
    } finally {
      setSending(false);
    }
  }

  async function clearConversation() {
    if (!threadId) {
      setMessages([]);
      setFollowUp(null);
      setReplyToFollowUp(null);
      return;
    }
    if (!window.confirm("この期間のAI会話を削除しますか？削除後は元に戻せません。")) return;
    try {
      await authedFetch("/api/records/threads", { method: "DELETE", body: JSON.stringify({ thread_id: threadId }) });
      setThreadId("");
      setMessages([]);
      setChatSuggestions(displayedAnalysis.suggested_questions || []);
      setFollowUp(null);
      setReplyToFollowUp(null);
    } catch (clearError) {
      setError(clearError?.message || "会話を削除できませんでした");
    }
  }

  function choosePeriod(nextKey) {
    setPeriodKey(nextKey);
    setAnalysis(null);
    setAnalysisMeta(null);
    setAnalysisNotice("");
    setAnalysisError("");
    setThreadId("");
    setMessages([]);
    setReplyToFollowUp(null);
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
      <section className="rounded-[28px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-black tracking-[0.14em] text-slate-400">振り返る期間</div>
            <div className="mt-1 text-[16px] font-black text-slate-900">どの期間を見る？</div>
          </div>
          <div className="text-right">
            <span className={[
              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1",
              betaActive || trialActive
                ? "bg-[#FFF8EC] text-[#A56C18] ring-[#EED8B4]"
                : "bg-[#EFF8F4] text-[#2F816E] ring-[#CFE7DE]",
            ].join(" ")} title={betaActive ? `${formatBetaEnd(access?.beta_ends_at)}全機能を無料公開中` : undefined}>
              {accessBadge}
            </span>
            <div className="mt-1 text-[11px] font-black text-slate-400">{formatRange(range.start, range.end)}</div>
          </div>
        </div>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIOD_OPTIONS.map((option) => (
            <button key={option.key} type="button" onClick={() => choosePeriod(option.key)} className={["shrink-0 rounded-full px-4 py-2 text-[12px] font-black ring-1 transition-all", periodKey === option.key ? "bg-[#349B83] text-white ring-[#349B83]" : "bg-white text-slate-600 ring-[#DCE8DD]"].join(" ")}>{option.label}</button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-4">
          <GuideBotAvatar signal={reflectionAvatar.signal} mood={reflectionAvatar.mood} className="h-[78px] w-[78px] shrink-0" />
          <div className="relative mb-2 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[12px] font-black tracking-[0.12em] text-[#2F816E]/70">この期間の手がかり</div>
            <div className="mt-1 text-[15px] font-black leading-6 text-slate-900">
              {rangeLoading
                ? "記録を読み込んでいます…"
                : analysisLoading
                ? "記録を見比べています…"
                : benefit.headline}
            </div>
          </div>
        </div>
        <div className="space-y-2.5 px-4 pb-4">
          {!rangeLoading ? <BenefitFlow items={benefit.flow} /> : null}
          {!rangeLoading ? (
            <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#E8F0EB]">
              <div className="text-[12px] font-black tracking-[0.1em] text-[#7B6588]">
                {hasCurrentAiAnalysis ? "ミモルの見立て" : "この手がかりの見方"}
              </div>
              <div className="mt-1 text-[13px] font-bold leading-5 text-slate-600">
                {hasCurrentAiAnalysis ? currentReflectionAnalysis.headline : benefit.detail}
              </div>
            </div>
          ) : null}

          {!rangeLoading ? (
            <div className="rounded-[18px] bg-[#FFF8EC] px-4 py-3 ring-1 ring-[#EED8B4]">
              <div className="text-[12px] font-black tracking-[0.12em] text-[#A56C18]/80">次に一つだけ</div>
              <div className="mt-1 text-[14px] font-black leading-6 text-slate-700">{currentNextStep}</div>
            </div>
          ) : null}

          {analysisLoading || analysisLookupLoading ? (
            <div className="px-1 text-[12px] font-bold leading-5 text-slate-400">
              {analysisLoading ? "ミモルが予報・実感・ケアを順番に確認しています。" : "保存済みのAI振り返りを確認しています。"}
            </div>
          ) : !hasAiAnalysis ? (
            analysisMeta?.reason === "insufficient_records" ? (
              <div className="rounded-[14px] bg-white px-3 py-2.5 text-[12px] font-black leading-5 text-[#A56C18] ring-1 ring-[#EED8B4]">ミモルの個別振り返りには3日分の記録が必要です。あと{recordsNeededForAi}日です。</div>
            ) : analysisMeta?.reason === "openai_not_configured" ? (
              <div className="px-1 text-[12px] font-black leading-5 text-slate-400">ミモルの個別振り返りは現在準備中です。</div>
            ) : !access?.analysis_enabled ? (
              <div className="px-1 text-[12px] font-black leading-5 text-slate-400">ミモルの個別振り返りは、対象期間または対象プランで利用できます。</div>
            ) : !consent?.active ? (
              <div className="px-1 text-[12px] font-black leading-5 text-slate-400">下の「AI利用前の確認」を完了すると、ミモルが詳しく振り返ります。</div>
            ) : analysisMeta?.can_generate ? (
              <>
                <Button className="w-full" disabled={analysisLoading} onClick={() => loadAnalysis({ generate: true })}>ミモルと詳しく振り返る</Button>
                <div className="px-1 text-[12px] font-bold leading-4 text-slate-400">ボタンを押したときだけAIを使います。タブを開くだけでは回数を使いません。</div>
              </>
            ) : null
          ) : null}

          {!analysisLoading && !analysisLookupLoading && hasAiAnalysis && analysisMeta?.generation_required && analysisMeta?.can_generate && consent?.active && access?.analysis_enabled ? (
            <div className="rounded-[18px] bg-white px-4 py-3.5 ring-1 ring-[#CFE7DE]">
              <div className="text-[12px] font-black leading-5 text-slate-700">
                {analysisMeta.reason === "period_advanced_since_saved_analysis" && savedRangeLabel
                  ? `${savedRangeLabel}の保存済みAI振り返りを表示しています。`
                  : "記録更新前の保存済みAI振り返りを表示しています。"}
              </div>
              <div className="mt-1 text-[12px] font-bold leading-4 text-slate-400">結果は自動で消えません。新しい記録を含めたいときだけ更新してください。</div>
              <Button className="mt-3 w-full" disabled={analysisLoading} onClick={() => loadAnalysis({ generate: true })}>現在の{currentRangeLabel}でAI振り返りを更新</Button>
            </div>
          ) : null}

          {hasAiAnalysis ? (
            <div className="px-1 text-[12px] font-bold text-slate-400">ケアナビAI ミモルによる個別振り返り{savedRangeLabel ? `・${savedRangeLabel}` : ""}{analysisMeta.cached ? "・保存済み" : ""}{analysisMeta.stale ? "・更新前" : ""}</div>
          ) : null}
          {hasAiAnalysis && analysisMeta.request_id ? <FeedbackButtons requestId={analysisMeta.request_id} surface="analysis" {...feedbackProps} /> : null}
          {analysisError ? <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[14px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{analysisError}</div> : null}
          {analysisNotice ? <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[14px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{analysisNotice}</div> : null}
        </div>
      </section>

      <ConsentCard consent={consent} access={access} loading={consentLoading} saving={consentSaving} onConsent={acceptConsent} onRevoke={revokeConsent} />

      <section className="space-y-3">
        {rangeLoading ? <div className="h-[300px] animate-pulse rounded-[26px] bg-[#F7FAF8] ring-1 ring-[#DCE8DD]" /> : <RecordsSimpleTrendChart rows={bundle?.rows || []} periodDays={range.days} onSelectDate={onSelectDate} />}

        <details className="group rounded-[20px] bg-[#F7FAF8] px-3.5 py-3 ring-1 ring-[#E8F0EB]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-[13px] font-black text-slate-700">
                {hasCurrentAiAnalysis ? "ミモルの見立てを詳しく見る" : "この手がかりを詳しく見る"}
              </span>
              <span className="mt-0.5 block text-[11px] font-bold leading-4 text-slate-400">
                {hasCurrentAiAnalysis
                  ? `「${currentReflectionAnalysis.headline}」を、記録と考えられることに分けて確認`
                  : "期間内の予報・実感・ケアを日ごとに確認"}
              </span>
            </span>
            <span className="shrink-0 text-[20px] font-black text-[#2F816E] transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="mt-3 space-y-3">
            {currentReflectionAnalysis.observed ? (
              <div className="rounded-[16px] bg-white px-3.5 py-3 text-[13px] font-bold leading-5 text-slate-600 ring-1 ring-[#E8F0EB]">
                <div className="mb-1 font-black text-[#2F816E]">記録で確認できたこと</div>
                <div>{currentReflectionAnalysis.observed}</div>
              </div>
            ) : null}
            {currentReflectionAnalysis.hypotheses ? (
              <div className="rounded-[16px] bg-white px-3.5 py-3 text-[13px] font-bold leading-5 text-slate-600 ring-1 ring-[#E8F0EB]">
                <div className="mb-1 font-black text-[#7B6588]">そこから考えられること</div>
                <div>{currentReflectionAnalysis.hypotheses}</div>
              </div>
            ) : null}
            {reflectionEvidence.comparisons.length || reflectionEvidence.notes.length ? (
              <div className="rounded-[16px] bg-white px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#E8F0EB]">
                <div className="font-black text-slate-600">この見立てのもとになった記録</div>
                {reflectionEvidence.comparisons.map((comparison) => (
                  <div key={comparison.key} className="mt-2 rounded-[14px] bg-[#F7FAF8] px-3 py-2.5 ring-1 ring-[#E8F0EB]">
                    <div className="font-black text-slate-700">比べた条件</div>
                    <div className="mt-0.5 leading-5 text-slate-500">{comparison.condition}：{comparison.total_days}日</div>
                    <div className="mt-2 space-y-1.5">
                      {comparison.groups.map((group) => (
                        <div key={group.key} className="grid grid-cols-[100px_1fr] gap-2 rounded-[10px] bg-white px-2.5 py-2 ring-1 ring-[#EDF2EF]">
                          <div className="font-black text-slate-600">{group.label}（{group.days}日）</div>
                          <div className="text-slate-500">{group.outcome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {reflectionEvidence.notes.length ? (
                  <div className={reflectionEvidence.comparisons.length ? "mt-2" : "mt-1"}>
                    {reflectionEvidence.comparisons.length ? <div className="mb-0.5 font-black text-slate-600">個別に確認した記録</div> : null}
                    {reflectionEvidence.notes.map((item) => <div key={item}>・{item}</div>)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {!rangeLoading ? <RecordsTrendChart rows={bundle?.rows || []} periodDays={range.days} onSelectDate={onSelectDate} /> : null}
            <div className="text-[12px] font-bold leading-5 text-slate-400">体調警戒度は、実感に合わせて後から書き換えない予報です。詳しいグラフでは、天気ストレスや似た条件の日も確認できます。</div>
          </div>
        </details>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <button type="button" aria-expanded={periodChatOpen} onClick={() => setPeriodChatOpen((current) => !current)} className="flex w-full items-center gap-3 text-left">
          <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#EFF8F4] ring-1 ring-[#CFE7DE]"><GuideBotAvatar mood={chatMood} className="h-11 w-11" /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black text-slate-900">ケアナビAI ミモルに聞く</div>
            <div className="mt-0.5 text-[12px] font-bold leading-5 text-slate-400">選択期間の記録と分析を引き継ぎます</div>
          </div>
          <span className={["text-[22px] font-black text-[#2F816E] transition-transform", periodChatOpen ? "rotate-90" : ""].join(" ")}>›</span>
        </button>

        {periodChatOpen ? (
          <div className="mt-4 border-t border-[#EEF3EF] pt-4">
            {chatUsage?.chat ? <div className="mb-3 text-right text-[12px] font-black text-slate-400">今月あと{Math.max(0, chatUsage.chat.limit - chatUsage.chat.used)}回</div> : null}
            {historyOnly ? (
              <>
                <div className="rounded-[20px] bg-[#FFF8EC] px-4 py-3 ring-1 ring-[#EED8B4]">
                  <div className="text-[13px] font-black text-[#A56C18]">過去の会話を表示しています</div>
                  <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">新しく質問するにはプレミアム登録が必要です。</div>
                </div>
                {messages.length ? (
                  <div ref={chatScrollRef} className="mt-3 max-h-[440px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
                    {messages.map((message, index) => (
                      <div key={message.id || `${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
                        <div className={["whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[14px] font-bold leading-6 ring-1", message.role === "user" ? "bg-[#349B83] text-white ring-[#349B83]" : "bg-white text-slate-600 ring-[#DCE8DD]"].join(" ")}>{message.content}</div>
                      </div>
                    ))}
                  </div>
                ) : <div className="mt-3 text-[12px] font-bold text-slate-400">この期間に保存された会話はありません。</div>}
              </>
            ) : !consent?.active ? (
              <div className="rounded-[22px] bg-[#F7FAF8] px-4 py-4 text-[14px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">AI利用確認を完了すると、この期間について質問できます。</div>
            ) : (
              <>
                <div ref={chatScrollRef} className="max-h-[440px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
                  {threadLoading ? <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#E8F0EB]">会話を読み込んでいます…</div> : null}
                  {!threadLoading && messages.length === 0 ? <div className="rounded-[18px] bg-white px-4 py-3 text-[14px] font-bold leading-6 text-slate-500 ring-1 ring-[#E8F0EB]">気になった日や、ケアの種類・タイミングについて聞けます。</div> : null}
                  {messages.map((message, index) => (
                    <div key={message.id || `${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
                      <div className={["whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[14px] font-bold leading-6 ring-1", message.role === "user" ? "bg-[#349B83] text-white ring-[#349B83]" : message.safety_level === "urgent" ? "bg-[#FFF0EC] text-[#8F3E2A] ring-[#F1C8BA]" : "bg-white text-slate-600 ring-[#DCE8DD]"].join(" ")}>
                        {message.role === "user" && message.reply_to_follow_up?.question ? <div className="mb-2 border-b border-white/25 pb-2 text-[12px] font-bold leading-4 text-white/80"><div className="mb-0.5 font-black tracking-[0.08em] text-white/65">ミモルからの確認</div><div>{message.reply_to_follow_up.question}</div></div> : null}
                        {message.content}
                      </div>
                      {message.role === "assistant" && message.request_id ? <FeedbackButtons requestId={message.request_id} surface="chat" {...feedbackProps} /> : null}
                    </div>
                  ))}
                  {sending ? <div className="max-w-[90%] rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#DCE8DD]">記録を確認しながら考えています…</div> : null}
                </div>

                {hasPendingFollowUp ? <div className="mt-3 rounded-[20px] bg-[#FFF8EC] p-3 ring-1 ring-[#EED8B4]"><div className="text-[12px] font-black tracking-[0.12em] text-[#A56C18]/75">AIからの確認</div><div className="mt-1 text-[14px] font-black leading-6 text-slate-700">{followUp.question}</div><div className="mt-2 flex flex-wrap gap-2">{(followUp.options || []).map((option) => <button key={option} type="button" onClick={() => fillFollowUpOption(option)} className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">{option}</button>)}</div><button type="button" onClick={detachFollowUp} className="mt-2 text-[12px] font-black text-[#A56C18]/70 underline underline-offset-2">この確認には答えない</button></div> : null}

                {!hasPendingFollowUp && !sending ? <div className="mt-3 flex flex-wrap gap-2">{(chatSuggestions.length ? chatSuggestions : displayedAnalysis.suggested_questions || []).map((question) => <button key={question} type="button" onClick={() => fillInput(question)} className="rounded-full bg-[#F4FAF7] px-3 py-2 text-[12px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">{question}</button>)}</div> : null}

                <div className="mt-3 rounded-[22px] bg-white p-2 ring-1 ring-[#DCE8DD] shadow-sm">
                  {replyToFollowUp?.question ? <div className="mx-1 mt-1 rounded-[14px] bg-[#FFF8EC] px-3 py-2 text-[12px] font-bold leading-4 text-[#9A6A27] ring-1 ring-[#EED8B4]">{replyToFollowUp.question}</div> : null}
                  <textarea ref={inputRef} value={input} onChange={handleInputChange} rows={3} maxLength={1200} placeholder="例）湿気が主な日のケアと実感を整理して" className="w-full resize-none bg-transparent px-2 py-2 text-[14px] font-bold leading-6 text-slate-700 outline-none" />
                  <div className="flex items-center justify-between gap-3 px-1 pb-1"><button type="button" onClick={clearConversation} className="text-[12px] font-black text-slate-400">会話を削除</button><Button size="sm" disabled={!input.trim() || sending} onClick={() => sendMessage()}>{sending ? "送信中…" : "ミモルに聞く"}</Button></div>
                </div>
              </>
            )}
            <details className="mt-3 text-[12px] font-bold leading-5 text-slate-400"><summary className="cursor-pointer font-black text-slate-500">AI相談の範囲</summary><div className="mt-2">ミモルは一般的な違い・選び方・確認点を整理できます。診断や薬の個別判断は行いません。</div></details>
          </div>
        ) : null}
      </section>

      {error ? <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[14px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{error}</div> : null}
    </div>
  );
}
