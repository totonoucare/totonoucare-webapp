"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMimoru } from "./MimoruProvider";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";
import { trackJourney } from "@/lib/journeyClient";

export function useMimoruInsight(request, enabled = true) {
  const mimoru = useMimoru();
  const key = JSON.stringify(request);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: "", loading: false, data: null, error: "", code: "" });
  const fetchData = mimoru?.fetchData;
  const userId = mimoru?.userId;
  useEffect(() => {
    if (!enabled || !userId || !fetchData) return;
    const abort = new AbortController();
    let disposed = false, timer, count = 0;
    setState({ key, loading: true, data: null, error: "", code: "" });
    const run = async () => {
      try {
        const response = await fetchData("/api/mimoru/insights", { method: "POST", body: key, signal: abort.signal });
        if (disposed) return;
        if (response.state === "pending") {
          if (++count > 60) throw new Error("AI解説を準備しています。しばらくしてからお試しください。");
          timer = setTimeout(run, 2000);
          return;
        }
        setState({ key, loading: false, data: response.insight, error: "", code: "" });
      } catch (error) {
        if (!disposed && error.name !== "AbortError") setState({ key, loading: false, data: null, error: error.message, code: error.code || "" });
      }
    };
    run();
    const refresh = () => setAttempt(x => x + 1);
    window.addEventListener("mimoru:consent-changed", refresh);
    return () => { disposed = true; abort.abort(); clearTimeout(timer); window.removeEventListener("mimoru:consent-changed", refresh); };
  }, [key, enabled, userId, fetchData, attempt]);
  const acceptConsent = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: "" }));
    try {
      await fetchData("/api/records/consent", { method: "POST", body: JSON.stringify({ consent: true }) });
      window.dispatchEvent(new Event("mimoru:consent-changed"));
    } catch (e) { setState(s => ({ ...s, loading: false, error: e.message })); }
  }, [fetchData]);
  const current = state.key === key ? state : { loading: Boolean(enabled && userId), data: null, error: "", code: "" };
  return { ...current, available: Boolean(userId && enabled), acceptConsent, retry: () => setAttempt(x => x + 1) };
}

export default function InsightPanel({ insight, part = "overview", title, context = null, children, statusOnly = false, fallback = null }) {
  const m = useMimoru();
  const ref = useRef(null);
  const data = insight?.data;
  const text = part === "forecast" ? data?.daily_summary : data?.overview;
  useEffect(() => {
    const element = statusOnly ? document.querySelector(part === "weather" ? "[data-mimoru-weather-connections]" : "[data-mimoru-care-connections]") : ref.current;
    if (!data || !element) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(x => x.isIntersecting)) {
        trackJourney(part === "forecast" ? "forecast_insight_view" : "result_insight_view");
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [data, part, statusOnly]);
  if (!insight?.available) return null;
  if (statusOnly && data) return null;
  return <section ref={ref} className="text-left" data-mimoru-insight={part}>
    {!statusOnly ? <div className="mb-2 flex min-w-0 items-center gap-2"><GuideBotAvatar mood={insight.loading ? "thinking" : "insight"} className="h-9 w-9 shrink-0" />
      <h3 className="min-w-0 text-[14px] font-black leading-6 text-[#24564C]">{title}</h3></div> : null}
    {fallback && !data ? <p className="whitespace-pre-wrap text-[14px] font-medium leading-7 text-slate-700">{fallback}</p> : null}
    {insight.loading ? <div role="status" className="mt-2 text-[12px] leading-6 text-slate-500">ミモルが解説を準備しています…</div>
      : insight.code === "ai_consent_required" ? <div className="text-[12px] leading-6 text-slate-600">
        体質・選んだ不調・天気・ケアの情報をOpenAIに送り、関連の見立てを説明します。
        氏名・メール・住所・体質チェックの生回答は自動送信しません。相談時の入力や記録メモは送信対象です。
        <button type="button" onClick={insight.acceptConsent} className="mt-2 block min-h-11 rounded-xl bg-[#349B83] px-4 py-2.5 font-bold text-white">共有内容を確認してAI解説を見る</button>
      </div>
      : insight.error ? <div className="text-[12px] leading-6 text-slate-500" role="status">{insight.error}
        <button type="button" onClick={insight.retry} className="ml-2 min-h-10 font-bold text-[#2F816E] underline underline-offset-2">もう一度試す</button></div>
      : data ? <>
        {text ? <p className="whitespace-pre-wrap text-[14px] font-medium leading-7 text-slate-700">{text}</p> : null}
        {children}
        {context ? <button type="button" onClick={() => m.openChat({ context, prompt: "この見立てについて、もう少し詳しく教えて。" })}
          className="mt-3 min-h-10 text-[12px] font-bold text-[#2F816E] underline underline-offset-4">この見立てについて質問する</button> : null}
      </> : null}
  </section>;
}

