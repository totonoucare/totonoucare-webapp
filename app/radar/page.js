"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  RADAR_LOCATION_PRESETS,
  flattenRadarLocationPresets,
} from "@/lib/radar_v1/locationPresets";

function formatTargetDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return dateStr;

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function signalLabel(signal) {
  if (signal === 2) return "要警戒";
  if (signal === 1) return "注意";
  return "安定";
}

function signalBadgeClass(signal) {
  if (signal === 2) return "bg-rose-50 text-rose-700 border-rose-200";
  if (signal === 1) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function signalDotClass(signal) {
  if (signal === 2) return "bg-rose-500";
  if (signal === 1) return "bg-amber-400";
  return "bg-emerald-500";
}

function sourceLabel(source) {
  if (source === "mtest") return "ライン";
  return "体質";
}

function sourceBadgeClass(source) {
  if (source === "mtest") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-700";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function getForecastText(bundle) {
  return (
    bundle?.forecast?.gpt_summary ||
    bundle?.forecast?.why_short ||
    "今日は大きく崩れない見込みですが、先回りして整えておくと明日が軽くなりやすい日です。"
  );
}

const FLAT_PRESETS = flattenRadarLocationPresets();

function LocationEditor({
  error,
  locating,
  savingPreset,
  selectedPresetKey,
  setSelectedPresetKey,
  onUseCurrentLocation,
  onSavePresetLocation,
  onClose,
  showClose = true,
}) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">地域を設定する</div>
          <div className="mt-1 text-[13px] font-bold leading-6 text-slate-600">
            現在地か、生活圏に近い代表地点を設定できます。
            変更した場合は次回の予報から反映されます。
          </div>
        </div>

        {showClose ? (
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600"
          >
            閉じる
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
        <div className="text-sm font-extrabold text-slate-900">現在地を使う</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          いまいる場所をそのまま保存します。
        </div>
        <button
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {locating ? "位置情報を取得中…" : "現在地を使う"}
        </button>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-white p-4">
        <div className="text-sm font-extrabold text-slate-900">地域を選んで設定する</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          GPSを使わなくても、生活圏に近い地点を選べば使えます。
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[12px] font-extrabold text-slate-500">
            地域
          </label>
          <select
            value={selectedPresetKey}
            onChange={(e) => setSelectedPresetKey(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none"
          >
            <option value="">選んでください</option>
            {RADAR_LOCATION_PRESETS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          onClick={onSavePresetLocation}
          disabled={!selectedPresetKey || savingPreset}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {savingPreset ? "設定中…" : "この地域で設定する"}
        </button>
      </div>
    </div>
  );
}

export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState("");

  const [needsLocation, setNeedsLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");

  const [tab, setTab] = useState("forecast");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchForecast({
    lat = null,
    lon = null,
    force = false,
    locationChanged = false,
  } = {}) {
    if (!session) return;

    try {
      setError("");
      if (force) setRefreshing(true);
      if (!bundle) setLoading(true);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("No token");

      const qs = new URLSearchParams();
      if (lat != null && lon != null) {
        qs.set("lat", String(lat));
        qs.set("lon", String(lon));
      }

      const url = `/api/radar/v1/forecast${qs.toString() ? `?${qs.toString()}` : ""}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        if (json?.error?.includes("No radar location found")) {
          setNeedsLocation(true);
          setBundle(null);
          return;
        }
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      setNeedsLocation(false);
      setBundle(json);

      if (locationChanged) {
        setLocationNotice("地域を更新しました。変更は次回の予報から反映されます。");
      }
    } catch (e) {
      setError(e?.message || "予報の取得に失敗しました。");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (session) fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("この端末では位置情報が使えません。");
      return;
    }

    setLocating(true);
    setError("");
    setLocationNotice("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        await fetchForecast({
          lat,
          lon,
          force: true,
          locationChanged: !needsLocation,
        });

        setLocating(false);
        if (!needsLocation) {
          setShowLocationEditor(false);
        }
      },
      (geoErr) => {
        setLocating(false);
        if (geoErr?.code === 1) {
          setError("位置情報の使用が拒否されました。下の「地域を選んで設定する」を使ってください。");
        } else {
          setError(geoErr?.message || "位置情報を取得できませんでした。");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  async function savePresetLocation() {
    const preset = FLAT_PRESETS.find((p) => p.key === selectedPresetKey);
    if (!preset) {
      setError("地域を選んでください。");
      return;
    }

    try {
      setSavingPreset(true);
      setError("");
      setLocationNotice("");

      await fetchForecast({
        lat: preset.lat,
        lon: preset.lon,
        force: true,
        locationChanged: !needsLocation,
      });

      if (!needsLocation) {
        setShowLocationEditor(false);
      }
    } finally {
      setSavingPreset(false);
    }
  }

  const forecast = bundle?.forecast || null;
  const carePlan = bundle?.care_plan || null;

  const tsuboSet = carePlan?.night_tsubo_set || {};
  const tsuboPoints = safeArray(tsuboSet?.points);

  const food = carePlan?.tomorrow_food_context || {};
  const reviewSchema = carePlan?.review_schema || {};

  const targetDateLabel = useMemo(
    () => formatTargetDate(bundle?.target_date),
    [bundle?.target_date]
  );

  const forecastText = useMemo(() => getForecastText(bundle), [bundle]);

  if (loadingAuth || loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="max-w-[440px] mx-auto space-y-4">
          <div className="h-8 w-40 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-44 rounded-[2rem] bg-slate-200 animate-pulse" />
          <div className="h-32 rounded-[2rem] bg-slate-200 animate-pulse" />
          <div className="h-32 rounded-[2rem] bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-[440px] mx-auto rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-xl font-extrabold text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
            未病レーダーはログイン後に使えます。
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-extrabold text-white"
            >
              無料で登録・ログイン
            </button>
            <button
              onClick={() => router.push("/check")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-extrabold text-slate-700"
            >
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (needsLocation) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-[440px] mx-auto">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="text-xl font-extrabold text-slate-900">位置情報の設定が必要です</div>
            <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
              予報を固定保存するために、最初に現在地か生活圏の代表地点を設定してください。
            </div>
          </div>

          <div className="mt-4">
            <LocationEditor
              error={error}
              locating={locating}
              savingPreset={savingPreset}
              selectedPresetKey={selectedPresetKey}
              setSelectedPresetKey={setSelectedPresetKey}
              onUseCurrentLocation={useCurrentLocation}
              onSavePresetLocation={savePresetLocation}
              onClose={() => {}}
              showClose={false}
            />
          </div>

          <button
            onClick={() => router.push("/check")}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-extrabold text-slate-700"
          >
            体質チェックへ戻る
          </button>
        </div>
      </div>
    );
  }

  if (!bundle || !forecast || !carePlan) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="max-w-[440px] mx-auto rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">予報を読み込めませんでした</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {error || "時間をおいてもう一度お試しください。"}
          </div>
          <button
            onClick={() => fetchForecast({ force: true })}
            className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-[440px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-slate-900">未病レーダー</div>
              <div className="text-[11px] font-extrabold text-slate-500">
                {targetDateLabel} の予報
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLocationEditor(true)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm"
              >
                地域変更
              </button>

              <button
                onClick={() => fetchForecast({ force: true })}
                disabled={refreshing}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm disabled:opacity-60"
              >
                {refreshing ? "更新中…" : bundle?.cached ? "再表示" : "更新"}
              </button>
            </div>
          </div>

          {locationNotice ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-extrabold text-emerald-800">
              {locationNotice}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[440px] px-4 py-5">
        {showLocationEditor ? (
          <div className="mb-4">
            <LocationEditor
              error={error}
              locating={locating}
              savingPreset={savingPreset}
              selectedPresetKey={selectedPresetKey}
              setSelectedPresetKey={setSelectedPresetKey}
              onUseCurrentLocation={useCurrentLocation}
              onSavePresetLocation={savePresetLocation}
              onClose={() => {
                setShowLocationEditor(false);
                setError("");
              }}
              showClose
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setTab("forecast")}
            className={[
              "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
              tab === "forecast" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            予報・対策
          </button>
          <button
            onClick={() => setTab("record")}
            className={[
              "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
              tab === "record" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            カレンダー・記録
          </button>
        </div>

        {error && !showLocationEditor ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        ) : null}

        {tab === "forecast" ? (
          <div className="mt-4 space-y-4">
            <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-extrabold text-slate-500">
                    {targetDateLabel} の予報
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {forecast.score_0_10}
                    </span>
                    <span className="pb-1 text-sm font-extrabold text-slate-500">/ 10</span>
                  </div>
                </div>

                <div
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold",
                    signalBadgeClass(forecast.signal),
                  ].join(" ")}
                >
                  <span className={["h-2.5 w-2.5 rounded-full", signalDotClass(forecast.signal)].join(" ")} />
                  {forecast.signal_label || signalLabel(forecast.signal)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">崩れやすい時間帯</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">
                    {forecast.peak_start && forecast.peak_end
                      ? `${String(forecast.peak_start).slice(0, 5)}–${String(forecast.peak_end).slice(0, 5)}`
                      : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">主な引き金</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">
                    {forecast.main_trigger === "pressure"
                      ? "気圧"
                      : forecast.main_trigger === "humidity"
                      ? "湿度"
                      : "気温"}
                    {forecast.trigger_dir === "down"
                      ? "↓"
                      : forecast.trigger_dir === "up"
                      ? "↑"
                      : ""}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-4">
                <div className="text-sm font-extrabold text-slate-900">
                  {forecast.main_trigger_label || "今日の見立て"}
                </div>
                <div className="mt-2 text-[13px] font-bold leading-6 text-slate-700">
                  {forecastText}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">今夜の先回りツボ</div>
              <div className="mt-1 text-[12px] font-extrabold text-slate-500">
                今夜のうちに整えておきたい3点セット
              </div>

              <div className="mt-4 space-y-3">
                {tsuboPoints.map((p, i) => (
                  <div
                    key={`${p.code}-${i}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-slate-700 shadow-sm">
                          {p.code}
                        </div>

                        <div>
                          <div className="text-base font-extrabold text-slate-900">
                            {p.name_ja || p.code}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                                sourceBadgeClass(p.source),
                              ].join(" ")}
                            >
                              {sourceLabel(p.source)}
                            </span>

                            {p.point_region ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-500">
                                {p.point_region === "abdomen"
                                  ? "腹部"
                                  : p.point_region === "head_neck"
                                  ? "頭頸"
                                  : "四肢"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {safeArray(p.tcm_actions).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.tcm_actions.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <div className="text-sm font-extrabold text-emerald-900">今夜の注意</div>
                <div className="mt-2 text-[13px] font-bold leading-6 text-emerald-900">
                  {carePlan?.night_note || "今夜のうちに軽く整えておくと、明日のぶれを抑えやすくなります。"}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">明日の食養生</div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">おすすめのタイミング</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">
                    {food.timing || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">意識したいこと</div>
                  <div className="mt-1 text-[14px] font-extrabold leading-6 text-slate-900">
                    {food.focus || "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-extrabold text-slate-500">避けたいこと</div>
                  <div className="mt-1 text-[14px] font-extrabold leading-6 text-slate-900">
                    {food.avoid || "—"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">明日気をつけたいこと</div>
              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[13px] font-bold leading-6 text-slate-700">
                {carePlan?.tomorrow_caution || "無理に頑張りきるより、少し余白を残す方が合う日です。"}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">翌日夜のレビュー</div>
              <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
                予報の答え合わせは、翌日夜に1回まとめて行う設計です。
                体調と、対策をどれくらい意識できたかを軽く残していきます。
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">体調</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {safeArray(reviewSchema.condition_options).map((opt) => (
                      <span
                        key={`cond-${opt.value}`}
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700"
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">対策できたか</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {safeArray(reviewSchema.prevent_options).map((opt) => (
                      <span
                        key={`prev-${opt.value}`}
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700"
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">任意メモ</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {safeArray(reviewSchema.action_tag_options).map((opt) => (
                      <span
                        key={`tag-${opt.value}`}
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-slate-700"
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-base font-extrabold text-slate-900">カレンダーで振り返る</div>
              <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
                予報スコアと記録を並べて見返せるように、記録画面はカレンダー導線でつないでいきます。
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.push("/calendar")}
                  className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
                >
                  カレンダーへ
                </button>
                <button
                  onClick={() => router.push("/insights")}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-extrabold text-slate-700"
                >
                  傾向を見る
                </button>
              </div>
            </section>
          </div>
        )}

        <div className="mt-6 pb-8 text-[11px] font-bold leading-5 text-slate-400">
          ※ 未病レーダーはセルフケア支援です。強い症状がある場合は無理をせず、必要に応じて医療機関に相談してください。
        </div>
      </div>
    </div>
  );
}
