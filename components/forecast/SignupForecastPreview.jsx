"use client";
import { useEffect, useRef, useState } from "react";
import { ForecastDayStrip } from "./HomeForecastStrip";
import { trackFunnel } from "@/lib/funnelClient";
import { loadSignupForecastPreview, forecastExampleDateLabel, observeForecastPreview } from "@/lib/signupForecastPreview";

export default function SignupForecastPreview({ resultId }) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);
  useEffect(() => {
    setBundle(null);
    setLoading(true);
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    loadSignupForecastPreview(resultId, controller.signal)
      .then(value => { if (active) setBundle(value); })
      .catch(() => { if (active) setBundle(null); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [resultId]);
  useEffect(() => {
    if (!bundle) return;
    return observeForecastPreview(cardRef.current, () => trackFunnel("signup_forecast_preview_view"));
  }, [bundle]);
  return (
    <section aria-label="登録後に見られる予報の例" className="rounded-[22px] bg-[#F4FAF7] p-3">
      <p className="mb-2 text-sm font-bold text-slate-700">あなたの体質で見る、明日の体調予報</p>
      {loading ? <p className="py-3 text-xs text-slate-500">明日の予報例を読み込み中…</p> : bundle ? (
        <div ref={cardRef}>
          <ForecastDayStrip label="東京の明日の予報" coreCode={bundle.core_code} coreTitle={bundle.core_title} dateLabel={forecastExampleDateLabel(bundle.target_date)} bundle={bundle} />
        </div>
      ) : <p className="py-2 text-xs text-slate-500">予報例を読み込めませんでした。登録はそのまま進められます。</p>}
      <p className="mt-2 text-xs leading-5 text-slate-500">今回の体質チェック結果と東京の天気を使っています。登録後に利用地域を選ぶと、その地域に合わせた今日・明日の予報とセルフケアを確認できます。</p>
    </section>
  );
}
