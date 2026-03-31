"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import ReviewFormSheet from "@/components/records/ReviewFormSheet";
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

function cardTone(row) {
  if (row?.review?.condition_level === 0) return "border-rose-200 bg-rose-50";
  if (row?.review?.condition_level === 2) return "border-emerald-200 bg-emerald-50";
  if (row?.review) return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
}

export default function RecordsPageClient({ initialTab = "calendar" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(ym(today).y);
  const [month, setMonth] = useState(ym(today).m);
  const [selectedDate, setSelectedDate] = useState(ymdStr(today));

  const [tab, setTab] = useState(searchParams?.get("tab") || initialTab);

  const [monthRows, setMonthRows] = useState([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState("");

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextTab = searchParams?.get("tab") || initialTab;
    setTab(nextTab === "report" ? "report" : "calendar");
  }, [searchParams, initialTab]);

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
      const [monthRes, reportRes] = await Promise.all([
        authedFetch(`/api/calendar/month?year=${year}&month=${month}`),
        authedFetch("/api/insights/14days?days=7"),
      ]);
      setMonthRows(monthRes.data || []);
      setReport(reportRes.data || null);
    } catch (e) {
      alert(e?.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function changeTab(nextTab) {
    setTab(nextTab);
    router.replace(`/records?tab=${nextTab}`, { scroll: false });
  }

  if (loadingSession) {
    return (
      <AppShell title="記録" subtitle="読み込み中…">
        <div className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="記録" subtitle="ログインが必要です">
        <Module className="p-6">
          <div className="text-xl font-extrabold text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-600">
            記録と週次レポートはログイン後に使えます。
          </div>
          <button
            onClick={() => router.push("/signup")}
            className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white"
          >
            無料で登録・ログイン
          </button>
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
      title="記録"
      subtitle="記録カレンダーと週次レポート"
      headerRight={
        <button
          onClick={() => router.push("/radar")}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
        >
          レーダーへ
        </button>
      }
    >
      <Module className="p-5">
        <div className="text-lg font-extrabold text-slate-900">記録と振り返り</div>
        <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
          その日の記録をあとから見返して、1週間の傾向をまとめて確認できます。
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => changeTab("calendar")}
            className={[
              "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
              tab === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            記録カレンダー
          </button>
          <button
            onClick={() => changeTab("report")}
            className={[
              "rounded-[1rem] px-4 py-3 text-sm font-extrabold transition",
              tab === "report" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            週次レポート
          </button>
        </div>
      </Module>

      {tab === "calendar" ? (
        <>
          <Module className="p-5">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const d = new Date(year, month - 2, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth() + 1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                ← 前月
              </button>
              <div className="text-sm font-extrabold text-slate-900">
                {year}年 {month}月
              </div>
              <button
                onClick={() => {
                  const d = new Date(year, month, 1);
                  setYear(d.getFullYear());
                  setMonth(d.getMonth() + 1);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
              >
                次月 →
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-extrabold text-slate-500">
              {["日", "月", "火", "水", "木", "金", "土"].map((x) => (
                <div key={x}>{x}</div>
              ))}
            </div>

            {monthLoading ? (
              <div className="mt-4 text-sm font-bold text-slate-600">読み込み中…</div>
            ) : monthError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {monthError}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-7 gap-2">
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
                        "aspect-square rounded-2xl border p-2 text-left transition",
                        cardTone(row),
                        isSelected ? "ring-2 ring-slate-300" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="text-xs font-extrabold text-slate-900">
                          {Number(day.date.slice(-2))}
                        </div>
                        {row?.forecast ? (
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-extrabold",
                              signalBadgeClass(row.forecast.signal),
                            ].join(" ")}
                          >
                            {signalLabel(row.forecast.signal)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 text-center text-[11px] font-extrabold text-slate-700">
                        {isRecorded ? conditionLabel(row.review.condition_level) : "未記録"}
                      </div>
                      <div className="mt-1 text-center text-[10px] font-bold text-slate-500">
                        {isRecorded ? preventLabel(row.review.prevent_level) : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Module>

          <Module className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-slate-500">
                  {formatDateLabel(selectedDate)}
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">その日の記録</div>
              </div>
              <button
                onClick={() => setEditorOpen(true)}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-extrabold text-white"
              >
                {selectedRow?.review ? "編集する" : "記録する"}
              </button>
            </div>

            {selectedRow?.forecast ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                      signalBadgeClass(selectedRow.forecast.signal),
                    ].join(" ")}
                  >
                    {signalLabel(selectedRow.forecast.signal)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                    {selectedRow.forecast.score_0_10}/10
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                    {triggerLabel(selectedRow.forecast.main_trigger, selectedRow.forecast.trigger_dir)}
                  </span>
                </div>
                <div className="mt-2 text-[12px] font-bold leading-5 text-slate-700">
                  {selectedRow.forecast.why_short || "その日の予報が保存されています。"}
                </div>
              </div>
            ) : null}

            {selectedRow?.review ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">実際どうだった？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {conditionLabel(selectedRow.review.condition_level)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">先回りできた？</div>
                  <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                    {preventLabel(selectedRow.review.prevent_level)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                  <div className="text-[11px] font-extrabold text-slate-500">やったこと</div>
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
                      <span className="text-sm font-bold text-slate-500">記録なし</span>
                    )}
                  </div>
                </div>
                {selectedRow.review.note ? (
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">メモ</div>
                    <div className="mt-1 text-[13px] font-bold leading-6 text-slate-700">
                      {selectedRow.review.note}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold leading-6 text-slate-600">
                まだ記録がありません。しんどかった日だけでも残しておくと、週次レポートの精度が上がります。
              </div>
            )}
          </Module>
        </>
      ) : (
        <>
          <Module className="p-5">
            <div className="text-[11px] font-extrabold text-slate-500">今週のまとめ</div>
            {reportLoading ? (
              <div className="mt-3 text-sm font-bold text-slate-600">読み込み中…</div>
            ) : reportError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {reportError}
              </div>
            ) : (
              <>
                <div className="mt-2 text-lg font-extrabold leading-7 text-slate-900">
                  {report?.summary?.weekly_comment || "直近1週間の傾向をまとめます。"}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">記録した日</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {report?.summary?.recorded_days || 0}/{report?.summary?.total_days || 7}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">先回りできた日</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {report?.summary?.well_prevented_days || 0}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Module>

          {!reportLoading && !reportError ? (
            <>
              <Module className="p-5">
                <div className="text-base font-extrabold text-slate-900">崩れやすかった条件</div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">主に重なりやすかったもの</div>
                    <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                      {report?.summary?.top_trigger_label || "まだ判定中"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-extrabold text-slate-500">つらかった日</div>
                    <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                      {report?.summary?.hard_days || 0}日
                    </div>
                  </div>
                </div>
              </Module>

              <Module className="p-5">
                <div className="text-base font-extrabold text-slate-900">予報と実際の並び</div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {(report?.rows || []).map((row) => (
                    <div
                      key={row.date}
                      className="w-[148px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="text-[11px] font-extrabold text-slate-500">
                        {formatDateLabel(row.date)}
                      </div>
                      {row.forecast ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-extrabold",
                              signalBadgeClass(row.forecast.signal),
                            ].join(" ")}
                          >
                            {signalLabel(row.forecast.signal)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">
                            {triggerLabel(row.forecast.main_trigger, row.forecast.trigger_dir)}
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-3 text-[11px] font-extrabold text-slate-500">実際どうだった？</div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {row.review ? conditionLabel(row.review.condition_level) : "未記録"}
                      </div>
                      <div className="mt-2 text-[11px] font-extrabold text-slate-500">先回り</div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {row.review ? preventLabel(row.review.prevent_level) : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </Module>

              <Module className="p-5">
                <div className="text-base font-extrabold text-slate-900">対策の傾向</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(report?.summary?.top_action_tags || []).length ? (
                    report.summary.top_action_tags.map((tag) => (
                      <span
                        key={tag.value}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700"
                      >
                        {actionTagLabel(tag.value)} × {tag.count}
                      </span>
                    ))
                  ) : (
                    <div className="text-sm font-bold text-slate-500">まだ集計できるほど記録がありません。</div>
                  )}
                </div>
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <div className="text-[11px] font-extrabold text-emerald-700">来週のひとこと</div>
                  <div className="mt-1 text-[13px] font-bold leading-6 text-emerald-900">
                    {report?.summary?.next_tip}
                  </div>
                </div>
              </Module>
            </>
          ) : null}
        </>
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
