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
          if (++count > 45) throw new Error("AI解説を準備しています。しばらくしてからお試しください。");
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

export default function InsightPanel({ insight, part = "overview", title, context = null, children, statusOnly = false }) {
  const m = useMimoru();
  const ref = useRef(null);
  const data = insight?.data;
  const text = statusOnly ? null : part === "forecast" ? data?.daily_summary : part === "care" ? null : part === "weather" && !statusOnly ? null : data?.overview;
  useEffect(() => {
    if (!data || !ref.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(x => x.isIntersecting)) {
        trackJourney(part === "forecast" ? "forecast_insight_view" : "result_insight_view");
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [data, part]);
  if (!insight?.available) return null;
  return <section ref={ref} className="my-3 rounded-[22px] bg-[#F2F8F4] p-4 text-left ring-1 ring-[#D4E7DC]" data-mimoru-insight={part}>
    <div className="mb-2 flex items-center gap-2"><GuideBotAvatar mood={insight.loading ? "thinking" : "insight"} className="h-10 w-10 shrink-0" />
      <div><h3 className="text-[14px] font-black leading-6 text-[#24564C]">{title}</h3>
        <span className="text-[10px] font-bold text-slate-500">ミモルの見立て · GPTを使用</span></div></div>
    {insight.loading ? <div role="status" className="text-[13px] leading-6 text-slate-500">体質とお悩みのつながりを整理しています…</div>
      : insight.code === "ai_consent_required" ? <div className="text-[12px] leading-6 text-slate-600">
        体質・選んだ不調・天気・ケアの情報をOpenAIに送り、関連の見立てを説明します。
        氏名・メール・住所・体質チェックの生回答は自動送信しません。相談時の入力や記録メモは送信対象です。
        <button type="button" onClick={insight.acceptConsent} className="mt-2 block min-h-11 rounded-xl bg-[#349B83] px-4 py-2.5 font-bold text-white">共有内容を確認してAI解説を見る</button>
      </div>
      : insight.error ? <div className="text-[12px] leading-6 text-slate-500" role="status">{insight.error}
        <button type="button" onClick={insight.retry} className="ml-2 min-h-10 font-bold text-[#2F816E] underline underline-offset-2">もう一度試す</button></div>
      : data ? <>
        {text ? <p className="whitespace-pre-wrap text-[14px] font-medium leading-7 text-slate-700">{text}</p> : null}
        {part === "weather" && !statusOnly ? data.weather_connections?.map(row => <div key={row.key} className="mb-3 text-[13px] leading-7 text-slate-700"><div className="font-black text-[#24564C]">{WEATHER_LABELS[row.key] || row.key}</div>{row.explanation}</div>) : null}
        {part === "care" && !statusOnly ? data.care_connections?.map(row => <div key={row.key} className="mb-3 text-[13px] leading-7 text-slate-700"><div className="font-black text-[#24564C]">{CARE_LABELS[row.key] || row.key}</div>{row.explanation}</div>) : null}
        {part === "overview" && data.basis_summary ? <details className="mt-3 text-[12px] leading-6 text-slate-500"><summary className="cursor-pointer font-bold">この見立てに使った傾向</summary><p className="mt-1">{data.basis_summary}</p></details> : null}
        {part === "forecast" && data.signs?.length ? <ul className="mt-2 space-y-1 text-[12px] leading-6 text-slate-600">{data.signs.map(sign => <li key={sign}>・{sign}</li>)}</ul> : null}
        {data.uncertainty_note ? <p className="mt-2 text-[11px] leading-6 text-slate-500">{data.uncertainty_note}</p> : null}
        {children}
        {context ? <button type="button" onClick={() => m.openChat({ context, prompt: "この見立てについて、もう少し詳しく教えて。" })}
          className="mt-3 min-h-10 text-[12px] font-bold text-[#2F816E] underline underline-offset-4">この見立てについて質問する</button> : null}
      </> : null}
  </section>;
}
const WEATHER_LABELS = { pressure_up: "気圧が上がる変化", pressure_down: "気圧が下がる変化", temp_shift: "寒暖差", cold: "寒さ", heat: "暑さ", damp: "湿気", dry: "乾燥" };
const CARE_LABELS = { yurumeru: "ゆるめる", meguraseru: "めぐらせる", nagasu: "ながす", nukumeru: "ぬくめる", sasaeru: "ささえる", uruosu: "うるおす", shizumeru: "しずめる" };

