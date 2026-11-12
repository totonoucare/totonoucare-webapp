import { createElement as h } from "react";
import { WeatherIcon } from "../illust/icons/weather";
import { IconBolt } from "../illust/icons/app";
import { buildForecastWeatherInfluences, formatWeatherInfluenceTime } from "../../lib/radar_v1/forecastPresentation";

export default function WeatherInfluences({ groups = [], dayLabel = "今日", signal = null, compact = false }) {
  const { state, primary, others, partial } = buildForecastWeatherInfluences(groups, { signal });
  const time = primary ? formatWeatherInfluenceTime(primary.peakStart, primary.peakEnd) : "";
  return h("section", {
    "aria-label": `${dayLabel}の気になる影響`, "data-weather-influences": state,
    className: `${compact ? "mt-2 px-3 py-3" : "mt-4 px-4 py-3.5"} min-w-0 rounded-[24px] bg-white/35 ring-1 ring-white/70 shadow-[inset_0_2px_8px_rgba(15,23,42,0.05)]`,
  },
    h("div", { className: "mb-2.5 text-[12px] font-black tracking-[0.12em] text-slate-500" }, "気になる影響"),
    primary ? h("div", { "data-weather-primary": primary.group, className: "min-w-0 rounded-[18px] bg-white/95 px-3.5 py-3 ring-1 ring-[#DDE8DF] shadow-sm" },
      h("div", { className: "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2" },
        h("span", { className: "flex min-w-0 flex-1 items-center gap-2.5" },
          h(WeatherIcon, { triggerKey: primary.key, direction: primary.direction, className: "h-7 w-7 shrink-0", "aria-hidden": true }),
          h("span", { className: `${compact ? "text-[18px]" : "text-[21px]"} min-w-0 font-black leading-7 tracking-tight text-slate-800` }, primary.detailLabel),
        ),
        time ? h("span", { "data-weather-time": true, className: "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#FFF7E6] px-2.5 py-1.5 text-[12px] font-black text-[#9A6A16] ring-1 ring-[#EED8B4]" },
          h(IconBolt, { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true }), time,
        ) : null,
      ),
    ) : h("p", { className: "rounded-[18px] bg-white/80 px-3.5 py-3 text-[14px] font-bold leading-6 text-[#2F7566]" },
      state === "unavailable" ? "天気の詳しい内訳を確認できません" : partial ? "確認できた範囲では、目立った影響なし" : `${dayLabel}は目立った影響なし`,
    ),
    others.length ? h("div", { "data-weather-others": true, className: "mt-2.5 rounded-[16px] bg-white/65 px-3.5 py-2.5 ring-1 ring-white/80" },
      h("div", { className: "mb-1.5 text-[11px] font-bold text-slate-500" }, "その他"),
      h("ul", { className: "flex min-w-0 flex-wrap gap-x-4 gap-y-2" }, ...others.map(factor =>
        h("li", { key: factor.group, className: "inline-flex min-w-0 items-center gap-1.5 text-[12px] font-bold leading-5 text-slate-600" },
          h(WeatherIcon, { triggerKey: factor.key, direction: factor.direction, className: "h-4 w-4 shrink-0", "aria-hidden": true }), factor.detailLabel,
        ),
      )),
    ) : null,
  );
}
