"use client";

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
        ミモル相談は現在準備中です。記録とオンライン相談の案内は引き続き利用できます。
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
      <div className="mt-1 text-[14px] font-black text-slate-900">予報と最近の記録を引き継いで相談します</div>
      <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">氏名・メールアドレス・住所と、体質チェックの生回答は自動送信しません。</div>
      <details className="mt-3 rounded-[16px] bg-white/70 px-3 py-2.5 text-[12px] font-bold leading-5 text-slate-500 ring-1 ring-[#EED8B4]">
        <summary className="cursor-pointer font-black text-[#8F651E]">送信内容とAIの範囲</summary>
        <div className="mt-2">送信するのは、解釈済み体質トリセツ、今日・明日の予報とケア、直近14日の記録要約、直近3日の詳細、任意の受診・相談状況、この会話です。入力したメモや会話は送信対象になります。AIは診断や薬の個別判断を行いません。</div>
      </details>
      <Button disabled={saving} onClick={onAccept} className="mt-3 w-full">{saving ? "保存中…" : "ミモルに相談する"}</Button>
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

function Bubble({ message }) {
  const user = message.role === "user";
  const urgent = message.safety_level === "urgent";
  const replyContext = user ? message.reply_to_follow_up : null;
  return (
    <div className={user ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
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

export default function LiveSupportPanel({ active, authedFetch, initialPrompt = "", onConsumePrompt, onAccessChange }) {
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
  const inputRef = useRef(null);

  const urgentMessage = useMemo(() => activeUrgentMessage(messages), [messages]);
  const pendingFollowUp = !urgentMessage && Boolean(followUp?.kind && followUp.kind !== "none" && followUp.question);
  const routinePromptsVisible = showRoutinePrompts(messages, sending) && !pendingFollowUp;
  const remaining = useMemo(() => {
    if (access?.consult_access_mode === "trial") return Number(access?.consult_trial?.remaining || 0);
    return usage?.chat ? Math.max(0, usage.chat.limit - usage.chat.used) : null;
  }, [access, usage]);
  const historyOnly = Boolean(access?.consult_history_enabled && !access?.consult_enabled);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/live-chat");
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
      setReplyToFollowUp(null);
      setSuggestions(lastAssistant?.suggested_questions || data.starter?.quick_prompts || []);
    } catch (loadError) {
      setError(loadError?.message || "ミモルとの会話を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, [authedFetch, onAccessChange]);

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
    const localId = `local-${Date.now()}`;
    setMessages((current) => [...current, {
      id: localId,
      role: "user",
      content,
      reply_to_follow_up: replyContext,
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
        }),
      });
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

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-4">
          <GuideBotAvatar mood={sending ? "thinking" : mood} className="h-[88px] w-[88px] shrink-0" />
          <div className="relative mb-2 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-black tracking-[0.12em] text-[#2F816E]/75">
              <span>ケアナビAI</span>
              {access?.consult_access_mode === "trial" ? <span className="rounded-full bg-[#FFF8EC] px-2 py-0.5 tracking-normal text-[#A56C18] ring-1 ring-[#EED8B4]">無料体験 残り{access?.consult_trial?.remaining || 0}回</span> : null}
              {access?.consult_access_mode === "paid" ? <span className="rounded-full bg-[#EAF7F1] px-2 py-0.5 tracking-normal text-[#2F816E] ring-1 ring-[#CFE7DE]">プレミアム</span> : null}
            </div>
            <div className="mt-1 text-[17px] font-black text-slate-900">{EKIKEN_DISPLAY_NAME}</div>
            <div className="mt-1 text-[14px] font-bold leading-6 text-slate-500">あなたの体質・今日の予報・最近の記録を踏まえて相談できます。</div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-[20px] bg-white/85 px-4 py-3 ring-1 ring-white">
            <div className="text-[12px] font-black tracking-[0.1em] text-slate-500">今回ミモルが把握していること</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["体質トリセツ", "今日・明日の予報", "直近14日の記録", "取り組んだケア"].map((item) => <span key={item} className="rounded-full bg-[#F4FAF7] px-2.5 py-1.5 text-[12px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">{item}</span>)}
            </div>
            <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">毎回、体質や最近の調子を最初から説明する必要はありません。</div>
          </div>

          {!loading && !historyOnly ? <AiConsent access={access} consent={consent} saving={consentSaving} onAccept={acceptConsent} onRevoke={revokeConsent} /> : null}

          {consent?.active && access?.consult_enabled ? (
            <details className="rounded-[18px] bg-white/70 px-3.5 py-3 ring-1 ring-[#DCE8DD]">
              <summary className="cursor-pointer text-[12px] font-black text-slate-600">受診・相談状況などを確認・変更</summary>
              <div className="mt-3"><ConsultationStatusCard status={consultationStatus} saving={consultationStatusSaving} editing={consultationStatusEditing} onEdit={() => setConsultationStatusEditing(true)} onSelect={saveConsultationStatus} /></div>
            </details>
          ) : null}

          {loading ? (
            <div className="h-44 animate-pulse rounded-[22px] bg-white/70 ring-1 ring-[#E8F0EB]" />
          ) : historyOnly ? (
            <>
              <div className="rounded-[20px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
                <div className="text-[12px] font-black tracking-[0.1em] text-[#A56C18]">無料相談を2回体験しました</div>
                <div className="mt-1 text-[15px] font-black leading-6 text-slate-900">プレミアムでは、この続きを相談できます</div>
                <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">これまでの回答は下でいつでも見返せます。</div>
                <CheckoutButton returnPath="/records?tab=consult" className="mt-3 w-full">プレミアムの内容・料金を確認する</CheckoutButton>
              </div>
              {messages.length ? (
                <div className="max-h-[500px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
                  {messages.map((message, index) => <Bubble key={message.id || `${message.role}-${index}`} message={message} />)}
                </div>
              ) : null}
            </>
          ) : consent?.active && access?.consult_enabled ? (
            <>
              <div ref={chatScrollRef} className="max-h-[500px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
                {messages.length === 0 && starter?.greeting ? (
                  <Bubble message={{ role: "assistant", content: starter.greeting, safety_level: "routine" }} />
                ) : null}
                {messages.map((message, index) => (
                  <div key={message.id || `${message.role}-${index}`}>
                    <Bubble message={message} />
                    {message.role === "assistant" && message.request_id ? (
                      <LiveFeedbackButtons
                        requestId={message.request_id}
                        authedFetch={authedFetch}
                        feedbackByRequest={feedbackByRequest}
                        setFeedbackByRequest={setFeedbackByRequest}
                        negativeReasonFor={negativeReasonFor}
                        setNegativeReasonFor={setNegativeReasonFor}
                      />
                    ) : null}
                  </div>
                ))}
                {sending ? <div className="max-w-[90%] rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#DCE8DD]">今の言葉と、今日の予報・記録をゆっくり整理しています…</div> : null}
              </div>

              {urgentMessage ? (
                <div className="rounded-[20px] bg-[#FFF0EC] p-3.5 ring-1 ring-[#F1C8BA]">
                  <div className="text-[12px] font-black text-[#8F3E2A]">今は安全の確認を優先してください</div>
                  <div className="mt-1 text-[14px] font-bold leading-6 text-[#9A5845]">通常のケア候補は一時的に隠しています。近くの人や緊急窓口へ連絡できたこと、今いる場所の安全などは、下の入力欄から続けて伝えられます。</div>
                </div>
              ) : null}

              {pendingFollowUp ? (
                <div className="rounded-[20px] bg-[#FFF8EC] p-3 ring-1 ring-[#EED8B4]">
                  <div className="text-[12px] font-black tracking-[0.1em] text-[#A56C18]/80">ミモルから一つ確認</div>
                  <div className="mt-1 text-[14px] font-black leading-6 text-slate-700">{followUp.question}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(followUp.options || []).map((option) => (
                      <button key={option} type="button" onClick={() => fillFollowUpOption(option)} className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">{option}</button>
                    ))}
                  </div>
                  <button type="button" onClick={detachFollowUp} className="mt-2 text-[12px] font-black text-[#A56C18]/80 underline underline-offset-2">この質問には答えず、別のことを話す</button>
                </div>
              ) : null}

              {routinePromptsVisible ? (
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
                    <span className="text-[12px] font-black tracking-[0.1em] text-[#2F816E]/80">一言から相談</span>
                    <span className="text-[12px] font-bold text-slate-500">タップすると入力欄に入ります。送る前に編集できます。</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(suggestions.length ? suggestions : starter?.quick_prompts || []).map((question) => (
                      <button key={question} type="button" onClick={() => fillInput(question)} className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">{question}</button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[22px] bg-white p-2 ring-1 ring-[#DCE8DD] shadow-sm">
                {replyToFollowUp?.question ? (
                  <div className="mx-1 mt-1 rounded-[14px] bg-[#FFF8EC] px-3 py-2 text-[12px] font-bold leading-5 text-[#9A6A27] ring-1 ring-[#EED8B4]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black tracking-[0.08em] text-[#A56C18]/75">この確認への回答として送ります</div>
                        <div className="mt-0.5">{replyToFollowUp.question}</div>
                      </div>
                      <button type="button" onClick={detachFollowUp} className="shrink-0 font-black text-[#A56C18] underline underline-offset-2">外す</button>
                    </div>
                  </div>
                ) : null}
                <textarea ref={inputRef} value={input} onChange={handleInputChange} rows={3} maxLength={1200} placeholder={urgentMessage ? "例）近くの人に連絡しました。今は一人ではありません" : "例）急に頭が重くなって、少しイライラします"} className="w-full resize-none bg-transparent px-2 py-2 text-[14px] font-bold leading-6 text-slate-700 outline-none" />
                <div className="flex items-center justify-between gap-3 px-1 pb-1">
                  <button type="button" onClick={clearConversation} className="text-[12px] font-black text-slate-500">会話を削除</button>
                  <Button size="sm" disabled={!input.trim() || sending} onClick={() => sendMessage()}>{sending ? "送信中…" : "ミモルに話す"}</Button>
                </div>
              </div>

              {remaining != null ? <div className="px-1 text-right text-[12px] font-black text-slate-500">{access?.consult_access_mode === "trial" ? `無料体験 あと${remaining}回` : `今月あと${remaining}回`}</div> : null}
            </>
          ) : null}

          {error ? <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[12px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{error}</div> : null}
          <details className="text-[12px] font-bold leading-5 text-slate-500">
            <summary className="cursor-pointer font-black text-slate-600">AI相談の範囲</summary>
            <div className="mt-2">ミモルは一般的な違い・選び方・確認点を整理できます。診断や、薬・漢方・サプリの開始・中止・用量・併用可否の最終判断は行いません。突然の強い症状や緊急性がある場合は、AI相談より医療機関への連絡を優先してください。</div>
          </details>
        </div>
      </section>
    </div>
  );
}
