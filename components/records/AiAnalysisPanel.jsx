"use client";

import { useEffect, useMemo, useState } from "react";
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
  const toneClass =
    tone === "amber"
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

function AnalysisBlock({ label, children }) {
  if (!children) return null;
  return (
    <div className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-[#E8F0EB]">
      <div className="text-[9px] font-black tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1.5 whitespace-pre-wrap text-[12px] font-bold leading-6 text-slate-600">{children}</div>
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

export default function AiAnalysisPanel({
  active,
  today,
  userId,
  authedFetch,
  initialPrompt = "",
  onConsumePrompt,
  onSelectDate,
}) {
  const [periodKey, setPeriodKey] = useState("30d");
  const [bundle, setBundle] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMood, setChatMood] = useState("normal");
  const [chatSuggestions, setChatSuggestions] = useState([]);
  const [chatUsage, setChatUsage] = useState(null);
  const [feedbackByRequest, setFeedbackByRequest] = useState({});
  const [negativeReasonFor, setNegativeReasonFor] = useState("");

  const range = useMemo(() => getPeriodRange(today, periodKey), [today, periodKey]);
  const summary = useMemo(
    () => bundle?.summary || buildRecordsSummary(bundle?.rows || []),
    [bundle]
  );
  const fallbackAnalysis = useMemo(() => deterministicAnalysis(summary), [summary]);
  const displayedAnalysis = analysis || fallbackAnalysis;

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const key = `mibyo-records-chat:${userId}`;
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
      if (Array.isArray(stored)) setMessages(stored.slice(-20));
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const key = `mibyo-records-chat:${userId}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages, userId]);

  useEffect(() => {
    if (!active || !authedFetch) return;
    let cancelled = false;

    async function load() {
      setRangeLoading(true);
      setError("");
      setAnalysis(null);
      setAnalysisMeta(null);
      try {
        const data = await authedFetch(
          `/api/records/range?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
        );
        if (!cancelled) setBundle(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || "記録を読み込めませんでした");
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [active, authedFetch, range.start, range.end]);

  useEffect(() => {
    if (!active || !bundle || analysisLoading || analysis) return;
    let cancelled = false;

    async function run() {
      setAnalysisLoading(true);
      try {
        const data = await authedFetch("/api/records/analysis", {
          method: "POST",
          body: JSON.stringify({
            start: range.start,
            end: range.end,
            period_key: periodKey,
          }),
        });
        if (!cancelled) {
          setAnalysis(data.analysis || null);
          setAnalysisMeta({
            source: data.source,
            model: data.model,
            cached: data.cached,
          });
          setChatSuggestions(data.analysis?.suggested_questions || []);
          setChatMood(data.analysis?.mood || "normal");
        }
      } catch (analysisError) {
        if (!cancelled) setError(analysisError?.message || "AI分析を読み込めませんでした");
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [active, bundle, analysis, authedFetch, range.start, range.end, periodKey]);

  useEffect(() => {
    if (!active || !initialPrompt) return;
    setInput(initialPrompt);
    onConsumePrompt?.();
  }, [active, initialPrompt, onConsumePrompt]);

  async function sendMessage(value = input) {
    const content = String(value || "").trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError("");

    try {
      const data = await authedFetch("/api/records/chat", {
        method: "POST",
        body: JSON.stringify({
          start: range.start,
          end: range.end,
          analysis: displayedAnalysis,
          messages: nextMessages,
        }),
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.message || "うまく言葉にできませんでした。",
          request_id: data.request_id || "",
        },
      ]);
      setChatMood(data.mood || "listening");
      setChatSuggestions(data.suggested_questions || []);
      setChatUsage(data.usage || null);
    } catch (sendError) {
      setError(sendError?.message || "AIへ送信できませんでした");
    } finally {
      setSending(false);
    }
  }


  async function sendFeedback(requestId, feedback, reason = null) {
    if (!requestId || feedbackByRequest[requestId]) return;
    setFeedbackByRequest((current) => ({ ...current, [requestId]: feedback }));
    setNegativeReasonFor("");
    try {
      await authedFetch("/api/records/feedback", {
        method: "POST",
        body: JSON.stringify({
          request_id: requestId,
          feedback,
          reason,
        }),
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
    <div className="space-y-5">
      <div className="rounded-[24px] bg-[#FFF8EC] px-4 py-3.5 ring-1 ring-[#EED8B4]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-[#A56C18]">AI分析 先行体験版</div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
              品質向上期間として無料公開中です。分析内容や機能は変更される場合があります。
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#A56C18] ring-1 ring-[#EED8B4]">
            FREE BETA
          </span>
        </div>
      </div>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">ANALYSIS PERIOD</div>
            <div className="mt-1 text-[17px] font-black text-slate-900">どの期間を振り返る？</div>
          </div>
          <div className="text-[10px] font-black text-slate-400">{formatRange(range.start, range.end)}</div>
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPeriodKey(option.key)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-[11px] font-black ring-1 transition-all",
                periodKey === option.key
                  ? "bg-[#349B83] text-white ring-[#349B83]"
                  : "bg-white text-slate-600 ring-[#DCE8DD] hover:bg-[#F4FAF7]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <SummaryTile value={`${summary.recorded_days || 0}日`} label="記録できた日" />
          <SummaryTile value={`${summary.aligned_days || 0}日`} label="予報と実感が近かった" />
          <SummaryTile value={`${summary.better_than_forecast_days || 0}日`} label="予報より穏やかだった" tone="amber" />
          <SummaryTile value={`${summary.worse_than_forecast_days || 0}日`} label="予報よりゆらいだ" tone="rose" />
        </div>

        <div className="mt-4">
          {rangeLoading ? (
            <div className="h-[280px] animate-pulse rounded-[26px] bg-[#F7FAF8] ring-1 ring-[#DCE8DD]" />
          ) : (
            <RecordsTrendChart
              rows={bundle?.rows || []}
              periodDays={range.days}
              onSelectDate={onSelectDate}
            />
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] bg-[#F4FAF7] ring-1 ring-[#CFE7DE] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-end gap-3 px-4 pt-5">
          <GuideBotAvatar
            mood={analysisLoading ? "thinking" : displayedAnalysis.mood}
            className="h-[86px] w-[86px] shrink-0"
          />
          <div className="relative mb-3 min-w-0 flex-1 rounded-[20px] bg-white px-4 py-3 ring-1 ring-[#CFE7DE] shadow-sm">
            <span className="absolute -left-1.5 bottom-6 h-3 w-3 rotate-45 border-b border-l border-[#CFE7DE] bg-white" />
            <div className="text-[9px] font-black tracking-[0.14em] text-[#2F816E]/65">AI ANALYSIS</div>
            <div className="mt-1 text-[14px] font-black leading-6 text-slate-900">
              {analysisLoading ? "記録を見比べています…" : displayedAnalysis.headline}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 px-4 pb-4">
          <AnalysisBlock label="まず伝えたいこと">
            {analysisLoading ? "少し待ってください。予報・実感・ケアを順番に確認しています。" : displayedAnalysis.empathy}
          </AnalysisBlock>
          {!analysisLoading ? (
            <>
              <AnalysisBlock label="記録から確認できること">{displayedAnalysis.observed}</AnalysisBlock>
              <AnalysisBlock label="考えられること">{displayedAnalysis.hypotheses}</AnalysisBlock>
              <AnalysisBlock label="次に試すこと">{displayedAnalysis.next_step}</AnalysisBlock>
              <div className="rounded-[18px] bg-[#EAF7F1] px-4 py-3 text-[12px] font-black leading-6 text-[#2F816E] ring-1 ring-[#CFE7DE]">
                {displayedAnalysis.question}
              </div>
            </>
          ) : null}

          {analysisMeta?.source ? (
            <div className="px-1 text-[9px] font-bold text-slate-400">
              {analysisMeta.source === "ai" ? "AIと集計ロジックによる分析" : "記録数に応じた基本分析"}
              {analysisMeta.cached ? "・保存済み分析を表示" : ""}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[30px] bg-white p-4 ring-1 ring-[#DCE8DD] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.34)]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[#EFF8F4] ring-1 ring-[#CFE7DE]">
            <GuideBotAvatar mood={chatMood} className="h-10 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black text-slate-900">この期間についてAIに聞く</div>
            <div className="mt-0.5 text-[10px] font-bold text-slate-400">記録と分析を引き継いで話します</div>
          </div>
          {chatUsage?.available ? (
            <div className="shrink-0 rounded-full bg-[#F4FAF7] px-2.5 py-1 text-[9px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]">
              今月あと{Math.max(0, chatUsage.limit - chatUsage.used)}回
            </div>
          ) : null}
        </div>

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-[22px] bg-[#F7FAF8] p-3 ring-1 ring-[#E8F0EB]">
          {messages.length === 0 ? (
            <div className="rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold leading-6 text-slate-500 ring-1 ring-[#E8F0EB]">
              気になった日や、ケアの種類・タイミングについて聞いてください。分からないことは断定せず、一緒に整理します。
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[90%]" : "max-w-[90%]"}>
              <div
                className={[
                  "whitespace-pre-wrap rounded-[18px] px-4 py-3 text-[12px] font-bold leading-6 ring-1",
                  message.role === "user"
                    ? "bg-[#349B83] text-white ring-[#349B83]"
                    : "bg-white text-slate-600 ring-[#DCE8DD]",
                ].join(" ")}
              >
                {message.content}
              </div>
              {message.role === "assistant" && message.request_id ? (
                <div className="mt-1.5 flex items-center gap-2 px-1 text-[9px] font-black text-slate-400">
                  <span>役に立ちましたか？</span>
                  <button
                    type="button"
                    onClick={() => sendFeedback(message.request_id, 1)}
                    className={[
                      "rounded-full px-2 py-1 ring-1",
                      feedbackByRequest[message.request_id] === 1
                        ? "bg-[#EAF7F1] text-[#2F816E] ring-[#CFE7DE]"
                        : "bg-white ring-[#E8F0EB]",
                    ].join(" ")}
                  >
                    👍 役に立った
                  </button>
                  <button
                    type="button"
                    onClick={() => setNegativeReasonFor(message.request_id)}
                    className={[
                      "rounded-full px-2 py-1 ring-1",
                      feedbackByRequest[message.request_id] === -1
                        ? "bg-[#FFF0EC] text-[#B75C3E] ring-[#F1C8BA]"
                        : "bg-white ring-[#E8F0EB]",
                    ].join(" ")}
                  >
                    👎 ちょっと違った
                  </button>
                </div>
              ) : null}
              {message.role === "assistant" && negativeReasonFor === message.request_id && !feedbackByRequest[message.request_id] ? (
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
                      <button
                        key={reason}
                        type="button"
                        onClick={() => sendFeedback(message.request_id, -1, reason)}
                        className="rounded-full bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-600 ring-1 ring-[#EED8B4]"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}

          {sending ? (
            <div className="max-w-[90%] rounded-[18px] bg-white px-4 py-3 text-[12px] font-bold text-slate-400 ring-1 ring-[#DCE8DD]">
              記録を確認しながら考えています…
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(chatSuggestions.length ? chatSuggestions : displayedAnalysis.suggested_questions || []).map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => setInput(question)}
              className="rounded-full bg-[#F4FAF7] px-3 py-2 text-[10px] font-black text-[#2F816E] ring-1 ring-[#CFE7DE]"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[22px] bg-white p-2 ring-1 ring-[#DCE8DD] shadow-sm">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="例）予報よりつらかった日を一緒に整理して"
            className="w-full resize-none bg-transparent px-2 py-2 text-[13px] font-bold leading-6 text-slate-700 outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setChatSuggestions([]);
              }}
              className="text-[10px] font-black text-slate-400"
            >
              会話をクリア
            </button>
            <Button
              size="sm"
              disabled={!input.trim() || sending}
              onClick={() => sendMessage()}
            >
              {sending ? "送信中…" : "AIに聞く"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-[16px] bg-[#FFF0EC] px-3.5 py-3 text-[11px] font-bold leading-5 text-[#B75C3E] ring-1 ring-[#F1C8BA]">
            {error}
          </div>
        ) : null}

        <div className="mt-3 text-[9px] font-bold leading-4 text-slate-400">
          AIは診断や治療、薬・漢方・サプリの個別判断は行いません。強い症状や急な変化がある場合は、医療機関などへ相談してください。
        </div>
      </section>
    </div>
  );
}
