"use client";

import { ForecastGauge } from "@/app/radar/ForecastGauge";
import { buildForecastWeatherLoadGroups, getHeroDecorClass, getHeroPanelClass, signalBadgeClass, signalDotClass } from "@/lib/radar_v1/forecastPresentation";
import { IconRadar } from "@/components/illust/icons/app";
import WeatherInfluences from "./WeatherInfluences";
import Button from "@/components/ui/Button";
import { getForecastTriggerFactors, signalText, scoreToPercent } from "./HomeForecastStrip";

export default function GuestForecastDemo({ title, bundle, loading, onStart }) {
  if (loading) {
    return (
      <div role="status" aria-label="明日の体調予報デモを読み込み中" className="rounded-[26px] bg-[#FFFDF5] p-4 ring-1 ring-[#E9DAB0]">
        <div className="h-10 animate-pulse rounded-xl bg-amber-100/60" />
        <div className="mx-auto my-5 aspect-square w-[80%] animate-pulse rounded-full bg-amber-100/50" />
        <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map(key => <div key={key} className="h-20 animate-pulse rounded-2xl bg-amber-100/50" />)}</div>
      </div>
    );
  }

  if (!bundle?.ok || !bundle.forecast) {
    return (
      <div className="rounded-[26px] bg-white p-4 ring-1 ring-[#CFE0D3]">
        <p role="status" className="text-[14px] font-bold leading-6 text-slate-600">{bundle?.error || "明日の予報を読み込めませんでした。時間をおいてお試しください。"}</p>
        <Button className="mt-4 w-full" variant="secondary" onClick={onStart}>体質チェックを始める</Button>
      </div>
    );
  }

  const forecast = bundle.forecast;
  const score = forecast.score_display_0_10 ?? forecast.score_precise_0_10 ?? forecast.score_0_10;
  const weatherGroups = buildForecastWeatherLoadGroups(forecast, getForecastTriggerFactors(forecast))
    .map((factor, index) => ({ ...factor, fixedOrder: index }))
    .sort((a, b) => {
      const aLoad = a?.load != null && Number.isFinite(Number(a.load)) ? Number(a.load) : -1;
      const bLoad = b?.load != null && Number.isFinite(Number(b.load)) ? Number(b.load) : -1;
      if (Math.abs(bLoad - aLoad) > 0.000001) return bLoad - aLoad;
      if (Boolean(a?.isPrimary) !== Boolean(b?.isPrimary)) return a?.isPrimary ? -1 : 1;
      return Number(a?.fixedOrder || 0) - Number(b?.fixedOrder || 0);
    });
  const mode = signalText(forecast.signal);

  return (
    <button
      type="button"
      onClick={onStart}
      aria-label="体質チェックして自分の体調予報を見る"
      className={["relative w-full overflow-hidden rounded-[26px] p-3 text-left shadow-[0_18px_50px_-22px_rgba(15,23,42,0.20)] transition-shadow hover:shadow-[0_20px_42px_-22px_rgba(47,111,98,0.30)] sm:p-4", getHeroPanelClass(forecast.signal)].join(" ")}
    >
      <div className={["pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full border bg-gradient-to-br opacity-80", getHeroDecorClass(forecast.signal)].join(" ")} />
      <div className={["pointer-events-none absolute right-6 top-8 h-28 w-28 rounded-full border opacity-70", getHeroDecorClass(forecast.signal)].join(" ")} />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-white/80 text-[var(--accent-ink)] shadow-sm ring-1 ring-black/5"><IconRadar className="h-6 w-6" /></div>
            <div className="min-w-0">
              <div className="text-[13px] font-black tracking-tight text-slate-900">明日の体調予報</div>
              <div className="mt-1 text-[11px] font-bold text-slate-500">{title}</div>
            </div>
          </div>
          <span className={["inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-black shadow-sm", signalBadgeClass(forecast.signal)].join(" ")}>
            <span className={["h-2 w-2 rounded-full", signalDotClass(forecast.signal)].join(" ")} />
            {mode}
          </span>
        </div>

        <div
          role="img"
          aria-label={`参考体質の明日の体調警戒度 ${Math.round(scoreToPercent(score))}／100、${mode}`}
          className="mt-3 [&_.backdrop-blur-sm]:whitespace-nowrap"
        >
          <ForecastGauge
            score={score}
            signal={forecast.signal}
            animationKey={`guest-${forecast.target_date}-${bundle.location?.display_name || ""}-${score}-${forecast.signal}`}
            coreCode={null}
          />
        </div>

        <WeatherInfluences groups={weatherGroups} dayLabel="明日" signal={forecast.signal} compact />

        <div className="mt-4 rounded-[18px] bg-white/70 px-3 py-3 text-[12px] font-bold leading-6 text-slate-600 ring-1 ring-black/5">
          体質チェックをすると、あなたに合わせた明日の体調予報とケアを確認できます。
        </div>
      </div>
    </button>
  );
}
