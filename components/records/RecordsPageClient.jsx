// components/records/RecordsPageClient.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import ReviewFormSheet from "@/components/records/ReviewFormSheet";
import Button from "@/components/ui/Button";
import {
  actionTagLabel,
  conditionLabel,
  formatDateLabel,
  preventLabel,
  signalBadgeClass,
  signalLabel,
  triggerLabel,
} from "@/components/records/reviewConfig";

function ym(d) {
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

function ymdStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(y, m) {
  return new Date(y, m - 1, 1);
}

function endOfMonth(y, m) {
  return new Date(y, m, 0);
}

function hasRecorded(review) {
  return !!review;
}

// カレンダーのセルの色
function cardTone(row) {
  if (row?.review?.condition_level === 0) return "ring-rose-200 bg-rose-50 text-rose-900";
  if (row?.review?.condition_level === 2) return "ring-emerald-200 bg-emerald-50 text-emerald-900";
  if (row?.review) return "ring-amber-200 bg-amber-50 text-amber-900";
  return "ring-[var(--ring)] bg-slate-50 text-slate-400";
}

function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="flex rounded-full bg-slate-200/50 p-1 ring-1 ring-inset ring-slate-200/50">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "flex-1 h-[34px] rounded-full text-[13px] font-black tracking-tight transition-all duration-200",
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RecordsPageClient({ initialTab = "calendar" }) {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(ym(today).y);
  const [month, setMonth] = useState(ym(today).m);
  const [selectedDate, setSelectedDate] = useState(ymdStr(today));

  const [tab, setTab] = useState(initialTab === "report" ? "report" : "calendar");

  const [monthRows, setMonthRows] = useState([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState("");

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const [weeklyAi, setWeeklyAi] = useState(null);
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(true);
  const [weeklyAiError, setWeeklyAiError] = useState("");
  const [weeklyAiGenerating, setWeeklyAiGenerating] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTab(initialTab === "report" ? "report" : "calendar");
  }, [initialTab]);

  async function authedFetch(path, opts = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingSession(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) return;
      setMonthLoading(true);
      setMonthError("");
      try {
        const res = await authedFetch(`/api/calendar/month?year=${year}&month=${month}`);
        setMonthRows(res.data || []);
      } catch (e) {
        setMonthError(e?.message || "記録カレンダーの読み込みに失敗しました。");
      } finally {
        setMonthLoading(false);
      }
    })();
  }, [session, year, month]);

  useEffect(() => {
    (async () => {
      if (!session) return;
      setReportLoading(true);
      setReportError("");
      try {
        const res = await authedFetch("/api/insights/14days?days=7");
        setReport(res.data || null);
      } catch (e) {
        setReportError(e?.message || "週次レポートの読み込みに失敗しました。");
      } finally {
        setReportLoading(false);
      }
    })();
  }, [session]);

  useEffect(() => {
    (async () => {
      if (!session) return;
      setWeeklyAiLoading(true);
      setWeeklyAiError("");
      try {
        const res = await authedFetch("/api/insights/weekly-ai");
        setWeeklyAi(res.data || null);
      } catch (e) {
        setWeeklyAiError(e?.message || "AI週次レポートの読み込みに失敗しました。");
      } finally {
        setWeeklyAiLoading(false);
      }
    })();
  }, [session]);

  const monthMap = useMemo(() => new Map(monthRows.map((row) => [row.date, row])), [monthRows]);
  const selectedRow = monthMap.get(selectedDate) || { date: selectedDate, review: null, forecast: null };

  async function saveReview(payload) {
    try {
      setSaving(true);
      await authedFetch("/api/radar/review", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setEditorOpen(false);

      const [monthRes, reportRes, weeklyAiRes] = await Promise.all([
        authedFetch(`/api/calendar/month?year=${year}&month=${month}`),
        authedFetch("/api/insights/14days?days=7"),
        authedFetch("/api/insights/weekly-ai"),
      ]);

      setMonthRows(monthRes.data || []);
      setReport(reportRes.data || null);
      setWeeklyAi(weeklyAiRes.data || null);
    } catch (e) {
      alert(e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function generateWeeklyAi() {
    try {
      setWeeklyAiGenerating(true);
      setWeeklyAiError("");

      const res = await authedFetch("/api/insights/weekly-ai", {
        method: "POST",
        body: JSON.stringify({}),
      });

      setWeeklyAi(res.data || null);
    } catch (e) {
      setWeeklyAiError(e?.message || "AI週次レポートの生成に失敗しました。");
    } finally {
      setWeeklyAiGenerating(false);
    }
  }

  function changeTab(nextTab) {
    setTab(nextTab);
    router.replace(`/records?tab=${nextTab}`, { scroll: false });
  }

  if (loadingSession) {
    return (
      <AppShell title="記録と振り返り" subtitle="読み込み中…">
        <div className="space-y-4 pt-2">
          <div className="h-12 w-full rounded-full bg-slate-200 animate-pulse" />
          <div className="h-64 w-full rounded-[32px] bg-slate-200 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="記録と振り返り" subtitle="ログインが必要です">
        <Module className="p-6">
          <div className="text-[18px] font-black tracking-tight text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
            記録カレンダーや週次レポートは、ログイン後にご利用いただけます。
          </div>
          <div className="mt-6 space-y-3">
            <Button onClick={() => router.push("/signup")} className="w-full shadow-md">
              無料で登録・ログイン
            </Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  const first = startOfMonth(year, month);
  const last = endOfMonth(year, month);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = ymdStr(d);
    days.push({ date: key, summary: monthMap.get(key) || null });
  }

  return (
    <AppShell
      title="記録と振り返り"
      headerRight={
        <button
          onClick={() => router.push("/radar")}
          className="rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] transition-all hover:bg-slate-50 active:scale-95"
        >
          レーダーへ
        </button>
      }
    >
      <div className="sticky top-[60px] z-20 bg-app/90 backdrop-blur supports-[backdrop-filter]:bg-app/70 py-2 mb-2">
        <SegmentedTabs
          tabs={[
            { key: "calendar", label: "カレンダー" },
            { key: "report", label: "週次レポート" },
          ]}
          value={tab}
          onChange={changeTab}
        />
      </div>

      {tab === "calendar" ? (
        <div className="space-y-6">
          {/* カレンダーモジュール */}
          <Module className="p-5">
            <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-full ring-1 ring-inset ring-[var(--ring)] p-1">
              <button
                onClick={() => {
                  const d = new Date(year, month - 2, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth() + 1);
                }}
                className="rounded-full bg-white px-4 py-2.5 text-[12px] font-extrabold text-slate-600 shadow-sm ring-1 ring-black/5 hover:text-slate-900 transition-colors"
              >
                ← 先月
              </button>
              <div className="text-[15px] font-black tracking-tight text-slate-900">
                {year}年 {month}月
              </div>
              <button
                onClick={() => {
                  const d = new Date(year, month, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth() + 1);
                }}
                className="rounded-full bg-white px-4 py-2.5 text-[12px] font-extrabold text-slate-600 shadow-sm ring-1 ring-black/5 hover:text-slate-900 transition-colors"
              >
                次月 →
              </button>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              {["日", "月", "火", "水", "木", "金", "土"].map((x) => (
                <div key={x}>{x}</div>
              ))}
            </div>

            {monthLoading ? (
              <div className="mt-6 text-center text-[13px] font-bold text-slate-500">読み込み中…</div>
            ) : monthError ? (
              <div className="mt-4 rounded-[16px] bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                {monthError}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {Array.from({ length: first.getDay() }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map((day) => {
                  const row = day.summary;
                  const isSelected = selectedDate === day.date;
                  const isRecorded = hasRecorded(row?.review);

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={[
                        "aspect-[4/5] rounded-[16px] p-1.5 text-center transition-all duration-200 flex flex-col items-center ring-1 ring-inset",
                        cardTone(row),
                        isSelected ? "ring-2 ring-slate-400 scale-105 shadow-md z-10" : "hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <div className={`text-[13px] font-black ${isSelected ? "text-slate-900" : ""}`}>
                        {Number(day.date.slice(-2))}
                      </div>

                      <div className="mt-auto w-full flex flex-col items-center gap-0.5">
                        {row?.forecast ? (
                          <div
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              row.forecast.signal === 2
                                ? "bg-rose-500"
                                : row.forecast.signal === 1
                                  ? "bg-amber-400"
                                  : "bg-emerald-500",
                            ].join(" ")}
                          />
                        ) : (
                          <div className="h-1.5" />
                        )}
                        <div className="text-[9px] font-extrabold opacity-70 w-full truncate px-0.5">
                          {isRecorded ? conditionLabel(row.review.condition_level).slice(0, 3) : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Module>

          {/* 選択した日の詳細モジュール */}
          <Module className="p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                  {formatDateLabel(selectedDate)}
                </div>
                <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">その日の記録</div>
              </div>
              <Button
                size="sm"
                variant={selectedRow?.review ? "secondary" : "primary"}
                onClick={() => setEditorOpen(true)}
              >
                {selectedRow?.review ? "編集する" : "記録する"}
              </Button>
            </div>

            {selectedRow?.forecast ? (
              <div className="rounded-[20px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)] mb-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                  保存されている予報
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm ring-1 ring-inset",
                      signalBadgeClass(selectedRow.forecast.signal),
                    ].join(" ")}
                  >
                    {signalLabel(selectedRow.forecast.signal)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                    {selectedRow.forecast.score_0_10}/10
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                    {triggerLabel(selectedRow.forecast.main_trigger, selectedRow.forecast.trigger_dir)}
                  </span>
                </div>
              </div>
            ) : null}

            {selectedRow?.review ? (
              <div className="space-y-3">
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">体調はどうだった？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {conditionLabel(selectedRow.review.condition_level)}
                  </div>
                </div>
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">先回りできた？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {preventLabel(selectedRow.review.prevent_level)}
                  </div>
                </div>
                <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">やったこと</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedRow.review.action_tags || []).length ? (
                      selectedRow.review.action_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
                        >
                          {actionTagLabel(tag)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] font-bold text-slate-500">記録なし</span>
                    )}
                  </div>
                </div>
                {selectedRow.review.note ? (
                  <div className="rounded-[20px] bg-white px-5 py-4 ring-1 ring-inset ring-[var(--ring)] shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">メモ</div>
                    <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-700">
                      {selectedRow.review.note}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
                <div className="text-[14px] font-black text-slate-700">まだ記録がありません</div>
                <div className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                  しんどかった日だけでも残しておくと、週次レポートの精度が上がります。
                </div>
              </div>
            )}
          </Module>
        </div>
      ) : (
        /* 週次レポート */
        <div className="space-y-6">
          <Module className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[18px] font-black tracking-tight text-slate-900">
                  今週のふり返り
                </div>
                <div className="mt-1.5 text-[13px] font-bold leading-6 text-slate-600">
                  記録の数字は小さく、ふり返りはAIを主役にしています。
                </div>
              </div>
            </div>

            {reportLoading ? (
              <div className="mt-6 text-[13px] font-bold text-slate-500">読み込み中…</div>
            ) : reportError ? (
              <div className="mt-6 rounded-[16px] bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                {reportError}
              </div>
            ) : (
              <>
                <div className="mt-5 text-[12px] font-black tracking-wide text-[var(--accent-ink)]/70">
                  {report?.start} 〜 {report?.end}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-[var(--ring)]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      記録
                    </div>
                    <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                      {report?.summary?.recorded_days ?? 0}日
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-[var(--ring)]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      つらい
                    </div>
                    <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                      {report?.summary?.hard_days ?? 0}日
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-[var(--ring)]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      少しつらい
                    </div>
                    <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                      {report?.summary?.mild_bad_days ?? 0}日
                    </div>
                  </div>

                  <div className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-[var(--ring)]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      強い予報
                    </div>
                    <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">
                      {report?.summary?.strong_forecast_days ?? 0}日
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    onClick={generateWeeklyAi}
                    disabled={weeklyAiGenerating}
                    className="w-full shadow-md"
                  >
                    {weeklyAiGenerating ? "AIレポート生成中…" : "AIで今週を振り返る"}
                  </Button>

                  <div className="mt-2 text-[11px] font-bold leading-5 text-slate-500">
                    同じ内容なら前回のレポートを再表示します。今週の再生成は最大2回です。
                  </div>
                </div>

                {weeklyAiLoading ? (
                  <div className="mt-6 text-[13px] font-bold text-slate-500">AIレポートを確認中…</div>
                ) : weeklyAiError ? (
                  <div className="mt-6 rounded-[16px] bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                    {weeklyAiError}
                  </div>
                ) : weeklyAi?.report ? (
                  <div className="mt-6 rounded-[28px] bg-white p-6 ring-1 ring-[var(--ring)] shadow-sm">
                    <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
                      AI WEEKLY REPORT
                    </div>

                    <div className="mt-5 space-y-5">
                      {weeklyAi.report.summary ? (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            今週の傾向
                          </div>
                          <div className="mt-1.5 text-[14px] font-bold leading-7 text-slate-800">
                            {weeklyAi.report.summary}
                          </div>
                        </div>
                      ) : null}

                      {weeklyAi.report.patterns ? (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            響きやすかった条件
                          </div>
                          <div className="mt-1.5 text-[14px] font-bold leading-7 text-slate-800">
                            {weeklyAi.report.patterns}
                          </div>
                        </div>
                      ) : null}

                      {weeklyAi.report.wins ? (
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            今週うまくいったこと
                          </div>
                          <div className="mt-1.5 text-[14px] font-bold leading-7 text-slate-800">
                            {weeklyAi.report.wins}
                          </div>
                        </div>
                      ) : null}

                      {weeklyAi.report.next_week ? (
                        <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--mint),white_70%)] px-5 py-4 ring-1 ring-[var(--ring)]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/80">
                            来週の一言
                          </div>
                          <div className="mt-1.5 text-[14px] font-extrabold leading-7 text-[var(--accent-ink)]">
                            {weeklyAi.report.next_week}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] font-bold leading-5 text-slate-500">
                      <div>
                        最終生成:{" "}
                        {weeklyAi.generated_at
                          ? new Date(weeklyAi.generated_at).toLocaleString("ja-JP")
                          : "—"}
                      </div>
                      <div className="mt-1">
                        今週の再生成残り: {weeklyAi.remaining_regenerations ?? 0}回
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                    <div className="text-[14px] font-black text-slate-700">
                      まだAIレポートは生成されていません
                    </div>
                    <div className="mt-2 text-[12px] font-bold leading-6 text-slate-500">
                      今週の記録がある程度たまったら、「AIで今週を振り返る」を押してください。
                    </div>
                  </div>
                )}
              </>
            )}
          </Module>
        </div>
      )}

      <ReviewFormSheet
        open={editorOpen}
        date={selectedDate}
        review={selectedRow?.review || null}
        forecast={selectedRow?.forecast || null}
        saving={saving}
        title={selectedRow?.review ? "記録を編集する" : "記録する"}
        onClose={() => setEditorOpen(false)}
        onSave={saveReview}
      />
    </AppShell>
  );
}
