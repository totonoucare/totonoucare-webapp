"use client";

import { trackJourney } from "@/lib/journeyClient";
import {experienceSignal} from '@/lib/experience/client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import CheckoutButton from "@/components/billing/CheckoutButton";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import {
  EKIKEN_DISPLAY_NAME,
  LIVE_SUPPORT_CONSULTATION_STATUS_OPTIONS,
  consultationStatusLabel,
} from "@/lib/records/liveSupport";
import { activeUrgentMessage, showRoutinePrompts } from "@/lib/records/liveSupportUi";
import { replyContextForAssistantMessage } from "@/lib/records/replyContext";

function AiConsent({ access, consent, saving, onAccept, onRevoke }) {
  if (!access?.consult_enabled) {
    return (
      <div className="rounded-[22px] bg-[#F7FAF8] px-4 py-4 text-[14px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        ミモルへの質問は現在準備中です。記録とオンライン相談の案内は引き続き利用できます。
      </div>
    );
  }
  if (consent?.active) {
    return (
      <details className="rounded-[16px] bg-[#F7FAF8] px-3.5 py-3 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#E8F0EB]">
        <summary className="cursor-pointer font-black text-slate-600">AIへのデータ共有：同意済み</summary>
        <div className="mt-2">ミモルには、体質トリセツ、今日・明日の予報とケア、最近の実感・記録、任意の受診状況、この会話を送ります。氏名・メール・住所・体質チェックの生回答は自動送信しません。記録メモや会話欄に自分で入力した内容は送信対象です。</div>
        <button type="button" disabled={saving} onClick={onRevoke} className="mt-2 font-black text-slate-500 underline underline-offset-2">同意を取り消す</button>
      </details>
    );
  }
  return (
    <div className="rounded-[22px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
      <div className="text-[12px] font-black tracking-[0.12em] text-[#A56C18]">AI利用前の確認</div>
      <div className="mt-1 text-[14px] font-black text-slate-900">体質・予報・最近の記録を使って質問に答えます</div>
      <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">氏名・メールアドレス・住所と、体質チェックの生回答は自動送信しません。</div>
      <details className="mt-3 rounded-[16px] bg-white/70 px-3 py-2.5 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#EED8B4]">
        <summary className="cursor-pointer font-black text-[#8F651E]">送信内容とAIの範囲</summary>
        <div className="mt-2">送信するのは、解釈済み体質トリセツ、今日・明日の予報とケア、直近14日の記録要約、直近3日の詳細、任意の受診・相談状況、この会話です。結果画面・予報のAI解説にも解釈済みの体質と選択中の不調を使います。入力したメモや会話は送信対象になります。AIは診断や薬の個別判断を行いません。</div>
      </details>
      <Button disabled={saving} onClick={onAccept} className="mt-3 w-full">{saving ? "保存中…" : "ミモルに質問する"}</Button>
    </div>
  );
}

function ConsultationStatusCard({ status, saving, editing, onEdit, onSelect }) {
  const label = consultationStatusLabel(status);
  if (status && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3.5 py-3 ring-1 ring-[#DCE8DD]">
        <div className="min-w-0">
          <div className="text-[12px] font-black tracking-[0.1em] text-slate-500">現在の受診・相談状況</div>
          <div className="mt-1 text-[13px] font-black leading-6 text-slate-700">{label}</div>
        </div>
        <button type="button" disabled={saving} onClick={onEdit} className="shrink-0 rounded-full bg-[#F4FAF7] px-3 py-2 text-[12px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">変更</button>
      </div>
    );
  }
  return (
    <div className="rounded-[20px] bg-[#F7FAF8] p-3.5 ring-1 ring-[#DCE8DD]">
      <div className="text-[12px] font-black text-slate-800">現在の受診・相談状況（任意）</div>
      <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">一度選ぶと、次回から同じ確認を省けます。</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {LIVE_SUPPORT_CONSULTATION_STATUS_OPTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={saving}
            onClick={() => onSelect(item.key)}
            className={[
              "rounded-full px-3 py-2 text-left text-[12px] font-black leading-5 ring-1 transition",
              status === item.key
                ? "bg-[#EAF7F1] text-[#2F816E] ring-[#9FD6C6]"
                : "bg-white text-slate-600 ring-[#DCE8DD]",
            ].join(" ")}
          >
            {saving && status === item.key ? "保存中…" : item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, receipts }) {
  const receiptRef = useRef(null);
  useEffect(() => {
    if (message.role !== "assistant" || !message.request_id || !receipts || receipts.current.has(message.request_id) || !receiptRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { receipts.current.add(message.request_id); trackJourney("chat_response_view"); observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(receiptRef.current);
    return () => observer.disconnect();
  }, [message.role, message.request_id, receipts]);
  const user = message.role === "user";
  const urgent = message.safety_level === "urgent";
  const replyContext = user ? message.reply_to_follow_up : null;
  return (
    <div ref={receiptRef} className={user ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
      <div className={[
        "whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[14px] font-bold leading-6 ring-1",
        user
          ? "bg-[#349B83] text-white ring-[#349B83]"
          : urgent
            ? "bg-[#FFF0EC] text-[#8F3E2A] ring-[#F1C8BA]"
            : "bg-white text-slate-600 ring-[#DCE8DD]",
      ].join(" ")}>
        {replyContext?.question ? (
          <div className="mb-2 border-b border-white/25 pb-2 text-[12px] font-bold leading-5 text-white/80">
            <div className="mb-0.5 font-black tracking-[0.08em] text-white/65">ミモルからの確認</div>
            <div>{replyContext.question}</div>
          </div>
        ) : null}
        {message.consult_context?.target_date ? <div className="mb-1 text-[10px] opacity-70">{message.consult_context.label || (message.consult_context.target_date + "のケアについて")}</div> : null}
        {message.content}
      </div>
    </div>
  );
}

function LiveFeedbackButtons({ requestId, authedFetch, feedbackByRequest, setFeedbackByRequest, negativeReasonFor, setNegativeReasonFor }) {
  if (!requestId) return null;

  async function send(feedback, reason = null) {
    if (feedbackByRequest[requestId]) return;
    setFeedbackByRequest((current) => ({ ...current, [requestId]: feedback }));
    setNegativeReasonFor("");
    try {
      await authedFetch("/api/records/feedback", {
        method: "POST",
        body: JSON.stringify({ request_id: requestId, feedback, reason, surface: "live_support" }),
      });
      experienceSignal('feedback');
    } catch {
      setFeedbackByRequest((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    }
  }

  return (
    <div className="mt-1.5 max-w-[90%] px-1">
      <div className="flex flex-wrap items-center gap-2 text-[12px] font-black text-slate-500">
        <span>この返事はどうでしたか？</span>
        <button type="button" onClick={() => send(1)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === 1 ? "bg-[#EAF7F1] text-[#2F816E] ring-[#CFE7DE]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👍 役に立った</button>
        <button type="button" onClick={() => setNegativeReasonFor(requestId)} className={["rounded-full px-2 py-1 ring-1", feedbackByRequest[requestId] === -1 ? "bg-[#FFF0EC] text-[#B75C3E] ring-[#F1C8BA]" : "bg-white ring-[#E8F0EB]"].join(" ")}>👎 ちょっと違った</button>
      </div>
      {negativeReasonFor === requestId && !feedbackByRequest[requestId] ? (
        <div className="mt-2 rounded-[16px] bg-[#FFF8EC] p-2.5 ring-1 ring-[#EED8B4]">
          <div className="text-[12px] font-black text-[#A56C18]">どこが合いませんでしたか？</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ["too_cold", "少し冷たく感じた"],
              ["too_many_safety_questions", "安全確認が多すぎた"],
              ["hard_to_understand", "分かりにくかった"],
              ["felt_unsafe", "内容が不安だった"],
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

export function useLiveSupport({ active, authedFetch, initialPrompt = "", onConsumePrompt, onAccessChange, onRestoreContext, selectedContext = null }) {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);
  const [consent, setConsent] = useState(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [starter, setStarter] = useState(null);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mood, setMood] = useState("listening");
  const [suggestions, setSuggestions] = useState([]);
  const [followUp, setFollowUp] = useState(null);
  const [replyToFollowUp, setReplyToFollowUp] = useState(null);
  const [consultationStatus, setConsultationStatus] = useState("");
  const [consultationStatusSaving, setConsultationStatusSaving] = useState(false);
  const [consultationStatusEditing, setConsultationStatusEditing] = useState(false);
  const [feedbackByRequest, setFeedbackByRequest] = useState({});
  const [negativeReasonFor, setNegativeReasonFor] = useState("");
  const chatScrollRef = useRef(null);
  const viewedMessagesRef = useRef(new Set());
  const loadIdRef = useRef(0);
  const sendingRef = useRef(false);
  const inputRef = useRef(null);

  const urgentMessage = useMemo(() => activeUrgentMessage(messages), [messages]);
  const pendingFollowUp = !urgentMessage && Boolean(followUp?.kind && followUp.kind !== "none" && followUp.question);
  const routinePromptsVisible = showRoutinePrompts(messages, sending) && !pendingFollowUp;
  const remaining = useMemo(() => {
    return usage?.chat ? Math.max(0, usage.chat.limit - usage.chat.used) : null;
  }, [access, usage]);
  const historyOnly = Boolean(access?.consult_history_enabled && !access?.consult_enabled);

  const load = useCallback(async () => {
    if (sendingRef.current) return;
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/live-chat");
      if (loadId !== loadIdRef.current) return;
      onRestoreContext?.(data.last_consult_context || null);
      setAccess(data.access || null);
      onAccessChange?.(data.access || null);
      setConsent(data.consent || { active: false });
      setStarter(data.starter || null);
      setThreadId(data.thread?.id || "");
      setMessages(data.messages || []);
      setUsage(data.usage || null);
      setConsultationStatus(data.consultation_status?.key || "");
      setConsultationStatusEditing(!data.consultation_status?.key);
      const lastAssistant = [...(data.messages || [])].reverse().find((item) => item.role === "assistant");
      setMood(lastAssistant?.mood || "listening");
      setFollowUp(lastAssistant?.follow_up?.question
        ? { ...lastAssistant.follow_up, assistant_message_id: lastAssistant.id }
        : null);
      setReplyToFollowUp(current => current && (data.messages || []).some(message => message.id === current.assistant_message_id) ? current : null);
      setSuggestions(lastAssistant?.suggested_questions || data.starter?.quick_prompts || []);
    } catch (loadError) {
      if (loadId === loadIdRef.current) setError(loadError?.message || "ミモルとの会話を読み込めませんでした");
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  }, [authedFetch, onAccessChange, onRestoreContext]);

  useEffect(() => {
    if (!active) return;
    load();
  }, [active, load]);

  useEffect(() => {
    if (!active || !initialPrompt) return;
    setInput(initialPrompt);
    setReplyToFollowUp(null);
    requestAnimationFrame(() => inputRef.current?.focus());
    onConsumePrompt?.();
  }, [active, initialPrompt, onConsumePrompt]);

  useEffect(() => {
    if (!active || loading) return;
    const element = chatScrollRef.current;
    if (!element) return;
    requestAnimationFrame(() => {
      element.scrollTo({ top: element.scrollHeight, behavior: messages.length ? "smooth" : "auto" });
    });
  }, [active, loading, messages.length, sending]);

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
    if (value && pendingFollowUp && !replyToFollowUp) {
      setReplyToFollowUp(replyContextForAssistantMessage(followUp, followUp?.assistant_message_id));
    }
  }

  function detachFollowUp() {
    setReplyToFollowUp(null);
    setFollowUp(null);
  }

  async function saveConsultationStatus(nextStatus) {
    if (!nextStatus || consultationStatusSaving) return;
    setConsultationStatus(nextStatus);
    setConsultationStatusSaving(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/live-chat", {
        method: "PATCH",
        body: JSON.stringify({ consultation_status: nextStatus }),
      });
      setThreadId(data.thread_id || threadId);
      setConsultationStatus(data.consultation_status?.key || nextStatus);
      setConsultationStatusEditing(false);
    } catch (statusError) {
      setError(statusError?.message || "受診・相談状況を保存できませんでした");
      setConsultationStatusEditing(true);
    } finally {
      setConsultationStatusSaving(false);
    }
  }

  async function acceptConsent() {
    setConsentSaving(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/consent", {
        method: "POST",
        body: JSON.stringify({ consent: true }),
      });
      setConsent(data?.consent || { active: true });
      window.dispatchEvent(new Event("mimoru:consent-changed"));
      await load();
    } catch (consentError) {
      setError(consentError?.message || "同意を保存できませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function revokeConsent() {
    setConsentSaving(true);
    try {
      const data = await authedFetch("/api/records/consent", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      setConsent(data?.consent || { active: false });
      window.dispatchEvent(new Event("mimoru:consent-changed"));
      setMessages([]);
      setThreadId("");
      setReplyToFollowUp(null);
    } catch (consentError) {
      setError(consentError?.message || "同意を取り消せませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function sendMessage(value = input) {
    const content = String(value || "").trim();
    if (!content || sending || !consent?.active || !access?.consult_enabled) return;
    const replyContext = replyToFollowUp;
    sendingRef.current = true;
    ++loadIdRef.current;
    setLoading(false);
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, {
      id: localId,
      role: "user",
      content,
      reply_to_follow_up: replyContext,
      consult_context: selectedContext,
    }]);
    setInput("");
    setReplyToFollowUp(null);
    setSending(true);
    setError("");
    setFollowUp(null);
    setSuggestions([]);
    try {
      const data = await authedFetch("/api/records/live-chat", {
        method: "POST",
        body: JSON.stringify({
          thread_id: threadId || null,
          message: content,
          reply_to_follow_up: replyContext,
          consult_context: selectedContext,
        }),
      });
      trackJourney("chat_message_sent", { position: selectedContext ? "care_inline" : "chat_bubble" });
      setThreadId(data.thread_id || threadId);
      setMessages((current) => [...current, {
        id: data.message_id || `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "うまく言葉にできませんでした。",
        request_id: data.request_id || "",
        mood: data.mood || "listening",
        suggested_questions: data.suggested_questions || [],
        follow_up: data.follow_up || null,
        safety_level: data.safety_level || "routine",
        consult_context: selectedContext,
      }]);
      setMood(data.mood || "listening");
      setFollowUp(data.follow_up?.question
        ? { ...data.follow_up, assistant_message_id: data.message_id }
        : null);
      setSuggestions(data.suggested_questions || []);
      setUsage(data.usage || usage);
      if (data.access) {
        setAccess(data.access);
        onAccessChange?.(data.access);
      }
    } catch (sendError) {
      setError(sendError?.message || "ミモルへ送信できませんでした");
      setMessages((current) => current.filter((item) => item.id !== localId));
      setInput(content);
      setReplyToFollowUp(replyContext);
    } finally {
      sendingRef.current = false;
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
    if (!window.confirm("今の体調相談の会話を削除しますか？削除後は元に戻せません。")) return;
    try {
      await authedFetch("/api/records/live-chat", {
        method: "DELETE",
        body: JSON.stringify({ thread_id: threadId }),
      });
      setMessages([]);
      setMood("listening");
      setFollowUp(null);
      setReplyToFollowUp(null);
      setSuggestions(starter?.quick_prompts || []);
    } catch (clearError) {
      setError(clearError?.message || "会話を削除できませんでした");
    }
  }

  useEffect(() => {
    if (!active) return;
    const refresh = () => load();
    window.addEventListener("mimoru:consent-changed", refresh);
    return () => window.removeEventListener("mimoru:consent-changed", refresh);
  }, [active, load]);

  return { loading, access, consent, consentSaving, starter, threadId, messages, usage, input, sending, error, mood,
    suggestions, followUp, replyToFollowUp, consultationStatus, consultationStatusSaving, consultationStatusEditing,
    feedbackByRequest, negativeReasonFor, chatScrollRef, inputRef, urgentMessage, pendingFollowUp, routinePromptsVisible,
    remaining, historyOnly, viewedMessagesRef, authedFetch, fillInput, fillFollowUpOption, handleInputChange, detachFollowUp,
    saveConsultationStatus, acceptConsent, revokeConsent, sendMessage, clearConversation,
    setConsultationStatusEditing, setFeedbackByRequest, setNegativeReasonFor };
}

export function LiveSupportView({ chat, inline = false }) {
  const { loading, access, consent, consentSaving, starter, messages, input, sending, error,
    suggestions, followUp, replyToFollowUp, consultationStatus, consultationStatusSaving, consultationStatusEditing,
    feedbackByRequest, negativeReasonFor, chatScrollRef, inputRef, urgentMessage, pendingFollowUp, routinePromptsVisible,
    remaining, historyOnly, viewedMessagesRef, authedFetch, fillInput, fillFollowUpOption, handleInputChange, detachFollowUp,
    saveConsultationStatus, acceptConsent, revokeConsent, sendMessage, clearConversation,
    setConsultationStatusEditing, setFeedbackByRequest, setNegativeReasonFor } = chat;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3" aria-label="ミモルとの会話" role="log" aria-live="polite" aria-busy={sending}>
      {loading ? <div role="status" className="py-6 text-center text-[13px] text-slate-500">会話を読み込んでいます…</div> : null}
      {!loading && !historyOnly && !consent?.active ? <AiConsent access={access} consent={consent} saving={consentSaving} onAccept={acceptConsent} onRevoke={revokeConsent} /> : null}
      {!loading && consent?.active && access?.consult_enabled ? <details className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-500 ring-1 ring-[#E1EBE4]">
        <summary className="cursor-pointer font-bold">参照情報・相談設定</summary>
        <p className="mt-2 leading-6">体質トリセツ、今日・明日の予報、最近の記録を使います。記録がなくても相談できます。</p>
        <details className="mt-2 leading-6"><summary className="cursor-pointer font-bold">AI相談の範囲</summary>
          <p>ミモルは一般的な違い・選び方・確認点を整理できます。診断や、薬・漢方・サプリの開始・中止・用量・併用可否の最終判断は行いません。</p>
        </details>
        <div className="mt-2"><ConsultationStatusCard status={consultationStatus} saving={consultationStatusSaving} editing={consultationStatusEditing} onEdit={() => setConsultationStatusEditing(true)} onSelect={saveConsultationStatus} /></div>
        <div className="mt-2"><AiConsent access={access} consent={consent} saving={consentSaving} onAccept={acceptConsent} onRevoke={revokeConsent} /></div>
        <button type="button" onClick={clearConversation} className="mt-3 min-h-10 font-bold underline">会話を削除する</button>
      </details> : null}
      {!loading && historyOnly ? <div className="rounded-xl bg-[#FFF8EC] p-3 text-[12px] leading-6 text-[#87662F]">
        体験期間が終了しました。これまでの会話は引き続き見返せます。
        <CheckoutButton returnPath="/records?tab=consult" className="mt-2 w-full">月額580円の内容を確認する</CheckoutButton>
      </div> : null}
      {!loading && !messages.length && consent?.active && access?.consult_enabled ? <div className="py-4 text-[14px] leading-7 text-slate-600">今、気になっている体調を教えてね。体質や予報を踏まえて、一緒に整理するよ。</div> : null}
      {messages.map((message, index) => <div key={message.id || index}>
        <Bubble message={message} receipts={viewedMessagesRef} />
        {message.role === "assistant" && message.request_id ? <LiveFeedbackButtons requestId={message.request_id} authedFetch={authedFetch} feedbackByRequest={feedbackByRequest} setFeedbackByRequest={setFeedbackByRequest} negativeReasonFor={negativeReasonFor} setNegativeReasonFor={setNegativeReasonFor} /> : null}
      </div>)}
      {sending ? <div role="status" className="text-[12px] leading-6 text-slate-500">ミモルが考えています…</div> : null}
      {urgentMessage ? <div className="rounded-xl bg-[#FFF0EC] p-3 text-[12px] leading-6 text-[#8F3E2A]">今は安全の確認を優先してください。通常のケア候補は一時的に隠しています。安全を確保できたことも、下の入力欄から伝えられます。</div> : null}
      {pendingFollowUp ? <div className="rounded-xl bg-[#FFF8EC] p-3 text-[12px] leading-6 text-slate-700">
        <p className="font-bold">{followUp.question}</p><div className="mt-2 flex flex-wrap gap-2">{(followUp.options || []).map(option => <button key={option} type="button" onClick={() => fillFollowUpOption(option)} className="rounded-full bg-white px-3 py-2 text-[#A56C18] ring-1 ring-[#EED8B4]">{option}</button>)}</div>
        <button type="button" onClick={detachFollowUp} className="mt-2 min-h-10 underline">この質問には答えず、別のことを話す</button>
      </div> : null}
      {routinePromptsVisible && consent?.active && access?.consult_enabled ? <div className="flex flex-wrap gap-2"><p className="w-full text-[10px] text-slate-500">タップで入力欄に入ります。送る前に編集できます。</p>{(suggestions.length ? suggestions : starter?.quick_prompts || []).slice(0, 4).map(question => <button key={question} type="button" onClick={() => fillInput(question)} className="rounded-2xl bg-white px-3 py-2 text-left text-[12px] leading-6 text-[#2F816E] ring-1 ring-[#CFE7DE]">{question}</button>)}</div> : null}
      {error ? <div role="alert" className="rounded-xl bg-[#FFF0EC] p-3 text-[12px] leading-6 text-[#B75C3E]">{error}</div> : null}
    </div>
    {consent?.active && access?.consult_enabled ? <div className="shrink-0 border-t border-[#DCE8DD] bg-white p-2">
      {replyToFollowUp?.question ? <div className="mb-1 flex items-start justify-between gap-2 px-2 text-[11px] leading-5 text-[#A56C18]"><span>この確認への回答：{replyToFollowUp.question}</span><button type="button" onClick={detachFollowUp} className="shrink-0 underline">外す</button></div> : null}
      <div className="flex items-end gap-2 rounded-[20px] bg-[#F2F7F1] p-2 ring-1 ring-[#DCE8DD]">
        <textarea ref={inputRef} value={input} onChange={handleInputChange} rows={inline ? 2 : 2} maxLength={1200}
          aria-label="ミモルへのメッセージ" placeholder={urgentMessage ? "安全を確保できたことなどを伝えてください" : "気になることを、そのままどうぞ"}
          className="max-h-28 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-[16px] leading-6 text-slate-700 outline-none" />
        <button type="button" aria-label="メッセージを送る" disabled={!input.trim() || sending} onClick={() => sendMessage()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#349B83] text-white disabled:opacity-40"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-6 6 6-6 6 6" /></svg></button>
      </div>
      {remaining != null ? <div className="mt-1 px-2 text-right text-[10px] text-slate-400">今月あと{remaining}回</div> : null}
    </div> : null}
  </div>;
}

export default function LiveSupportPanel(props) {
  const chat = useLiveSupport(props);
  return <section className="flex h-[600px] min-h-0 flex-col overflow-hidden rounded-[24px] bg-[#F7FAF6] ring-1 ring-[#CFE7DE]"><LiveSupportView chat={chat} /></section>;
}
