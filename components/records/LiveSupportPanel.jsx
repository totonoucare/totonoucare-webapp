"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import { EKIKEN_DISPLAY_NAME } from "@/lib/records/liveSupport";

function AiConsent({ access, consent, saving, onAccept, onRevoke }) {
  if (!access?.ai_enabled) {
    return (
      <div className="rounded-[22px] bg-[#F7FAF8] px-4 py-4 text-[11px] font-bold leading-6 text-slate-500 ring-1 ring-[#DCE8DD]">
        EKIKEN相談は現在準備中です。記録とオンライン相談の案内は引き続き利用できます。
      </div>
    );
  }
  if (consent?.active) {
    return (
      <div className="rounded-[16px] bg-[#F7FAF8] px-3.5 py-3 text-[9px] font-bold leading-5 text-slate-400 ring-1 ring-[#E8F0EB]">
        EKIKENには、解釈済みの体質トリセツ、今日・明日の予報と対策ケア、直近の実感・ケア・メモ、この相談の会話を送ります。氏名・メール・住所、体質チェックの生回答は送りません。
        <button type="button" disabled={saving} onClick={onRevoke} className="ml-2 font-black text-slate-500 underline underline-offset-2">同意を取り消す</button>
      </div>
    );
  }
  return (
    <div className="rounded-[22px] bg-[#FFF8EC] p-4 ring-1 ring-[#EED8B4]">
      <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">AI利用前の確認</div>
      <div className="mt-1 text-[14px] font-black text-slate-900">今の相談に必要なアプリ内データを使います</div>
      <div className="mt-2 text-[11px] font-bold leading-6 text-slate-600">
        送信するのは、解釈済みの体質トリセツ、今日・明日の計算済み予報と表示ケア、直近14日の記録要約、直近3日の詳細、この相談の会話です。氏名・メール・住所、体質チェックの生回答は送りません。AIは診断や薬の個別判断を行いません。
      </div>
      <Button disabled={saving} onClick={onAccept} className="mt-3 w-full">{saving ? "保存中…" : "内容を確認し、EKIKENに相談する"}</Button>
    </div>
  );
}

function Bubble({ message }) {
  const user = message.role === "user";
  const urgent = message.safety_level === "urgent";
  return (
    <div className={user ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
      <div className={[
        "whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[12px] font-bold leading-6 ring-1",
        user
          ? "bg-[#349B83] text-white ring-[#349B83]"
          : urgent
            ? "bg-[#FFF0EC] text-[#8F3E2A] ring-[#F1C8BA]"
            : "bg-white text-slate-600 ring-[#DCE8DD]",
      ].join(" ")}>{message.content}</div>
    </div>
  );
}

export default function LiveSupportPanel({ active, authedFetch, initialPrompt = "", onConsumePrompt }) {
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

  const pendingFollowUp = Boolean(followUp?.kind && followUp.kind !== "none" && followUp.question);
  const remaining = useMemo(() => usage?.chat ? Math.max(0, usage.chat.limit - usage.chat.used) : null, [usage]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await authedFetch("/api/records/live-chat");
      setAccess(data.access || null);
      setConsent(data.consent || { active: false });
      setStarter(data.starter || null);
      setThreadId(data.thread?.id || "");
      setMessages(data.messages || []);
      setUsage(data.usage || null);
      const lastAssistant = [...(data.messages || [])].reverse().find((item) => item.role === "assistant");
      setMood(lastAssistant?.mood || "listening");
      setFollowUp(lastAssistant?.follow_up || null);
      setSuggestions(lastAssistant?.suggested_questions || data.starter?.quick_prompts || []);
    } catch (loadError) {
      setError(loadError?.message || "EKIKENとの会話を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (!active) return;
    load();
  }, [active, load]);

  useEffect(() => {
    if (!active || !initialPrompt) return;
    setInput(initialPrompt);
    onConsumePrompt?.();
  }, [active, initialPrompt, onConsumePrompt]);

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
    } catch (consentError) {
      setError(consentError?.message || "同意を取り消せませんでした");
    } finally {
      setConsentSaving(false);
    }
  }

  async function sendMessage(value = input) {
    const content = String(value || "").trim();
    if (!content || sending || !consent?.active || !access?.ai_enabled) return;
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content }]);
    setInput("");
    setSending(true);
    setError("");
    setFollowUp(null);
    setSuggestions([]);
    try {
      const data = await authedFetch("/api/records/live-chat", {
        method: "POST",
        body: JSON.stringify({ thread_id: threadId || null, message: content }),
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
      setFollowUp(data.follow_up || null);
      setSuggestions(data.suggested_questions || []);
      setUsage(data.usage || usage);
    } catch (sendError) {
      setError(sendError?.message || "EKIKENへ送信できませんでした");
    } finally {
      setSending(false);
    }
  }

  async function clearConversation() {
    if (!threadId) {
      setMessages([]);
      return;
    }
    if (!window.confirm("今の体調相談の会話を削除しますか？削除後は元に戻せません。")) return;
    try {
      await authedFetch("/api/records/live-chat", {
        method: "DELETE",
        body: JSON.stringify({ thread_id: threadId }),
      });
      setThreadId("");
      setMessages([]);
      setMood("listening");
      setFollowUp(null);
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
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">ケアナビAI</div>
            <div className="mt-1 text-[17px] font-black text-slate-900">{EKIKEN_DISPLAY_NAME}</div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-slate-500">今のつらさや迷いを、一言から一緒に整理します。</div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <AiConsent access={access} consent={consent} saving={consentSaving} onAccept={acceptConsent} onRevoke={revokeConsent} />

          {loading ? (
            <div className="h-44 animate-pulse rounded-[22px] bg-white/70 ring-1 ring-[#E8F0EB]" />
          ) : consent?.active && access?.ai_enabled ? (
            <>
              <div className="max-h-[500px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
                {messages.length === 0 && starter?.greeting ? (
                  <Bubble message={{ role: "assistant", content: starter.greeting, safety_level: "routine" }} />
                ) : null}
                {messages.map((message, index) => <Bubble key={message.id || `${message.role}-${index}`} message={message} />)}
                {sending ? <div className="max-w-[90%] rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#DCE8DD]">今日の予報と記録を確認しながら考えています…</div> : null}
              </div>

              {pendingFollowUp ? (
                <div className="rounded-[20px] bg-[#FFF8EC] p-3 ring-1 ring-[#EED8B4]">
                  <div className="text-[9px] font-black tracking-[0.12em] text-[#A56C18]/75">EKIKENから一つ確認</div>
                  <div className="mt-1 text-[11px] font-black leading-5 text-slate-700">{followUp.question}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(followUp.options || []).map((option) => (
                      <button key={option} type="button" onClick={() => sendMessage(`EKIKENからの確認への回答：${option}`)} className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">{option}</button>
                    ))}
                  </div>
                </div>
              ) : null}

              {!pendingFollowUp && !sending ? (
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
                    <span className="text-[9px] font-black tracking-[0.12em] text-[#2F816E]/75">一言から相談</span>
                    <span className="text-[9px] font-bold text-slate-400">タップするとそのまま送信します。</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(suggestions.length ? suggestions : starter?.quick_prompts || []).map((question) => (
                      <button key={question} type="button" onClick={() => sendMessage(question)} className="rounded-full bg-white px-3 py-2 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">{question}</button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[22px] bg-white p-2 ring-1 ring-[#DCE8DD] shadow-sm">
                <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} maxLength={1200} placeholder="例）急に頭が重くなって、少しイライラします" className="w-full resize-none bg-transparent px-2 py-2 text-[13px] font-bold leading-6 text-slate-700 outline-none" />
                <div className="flex items-center justify-between gap-3 px-1 pb-1">
                  <button type="button" onClick={clearConversation} className="text-[10px] font-black text-slate-400">会話を削除</button>
                  <Button size="sm" disabled={!input.trim() || sending} onClick={() => sendMessage()}>{sending ? "送信中…" : "EKIKENに話す"}</Button>
                </div>
              </div>

              {remaining != null ? <div className="px-1 text-right text-[9px] font-black text-slate-400">今月あと{remaining}回</div> : null}
            </>
          ) : null}

          {error ? <div className="rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[11px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">{error}</div> : null}
          <div className="text-[9px] font-bold leading-4 text-slate-400">EKIKENは診断や治療、薬・漢方・サプリの個別判断を行いません。突然の強い症状や緊急性がある場合は、AI相談より医療機関への連絡を優先してください。</div>
        </div>
      </section>
    </div>
  );
}
