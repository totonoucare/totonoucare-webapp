"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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

function stampMain(mainDone) {
  return mainDone ? "◎" : "";
}
function stampFood(level) {
  if (level == null) return "";
  if (level === 2) return "◎";
  if (level === 1) return "△";
  return "×";
}
function labelCond(v) {
  if (v == null) return "—";
  if (v === 0) return "良";
  if (v === 1) return "普";
  return "不";
}

export default function CalendarPage() {
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(ym(today).y);
  const [month, setMonth] = useState(ym(today).m);

  async function authedFetch(path, opts = {}) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) return;
      setLoading(true);
      try {
        const res = await authedFetch(`/api/calendar/month?year=${year}&month=${month}`);
        setRows(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, year, month]);

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">カレンダー</h1>
        <Card title="ログインが必要です">
          <a href="/signup">
            <Button>メールでログイン</Button>
          </a>
        </Card>
      </div>
    );
  }

  const first = startOfMonth(year, month);
  const last = endOfMonth(year, month);

  // rows を map 化（date => summary）
  const map = new Map(rows.map((r) => [r.date, r]));

  // 1日〜末日を配列化
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = ymdStr(d);
    days.push({ date: key, w: d.getDay(), summary: map.get(key) || null });
  }

  // 今日のYYYY-MM-DD（ローカルでOK）
  const todayKey = ymdStr(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">カレンダー</h1>
          <p className="mt-1 text-xs text-slate-500">記録がある日はスタンプが入ります。</p>
        </div>
        <a href="/radar">
          <Button variant="secondary">レーダーへ</Button>
        </a>
      </div>

      <Card>
        {/* 月ナビ */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const d = new Date(year, month - 2, 1);
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }}
          >
            ← 前月
          </Button>

          <div className="text-sm font-semibold">
            {year}年 {month}月
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              const d = new Date(year, month, 1);
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }}
          >
            次月 →
          </Button>
        </div>

        {/* 曜日 */}
        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-slate-500">
          {["日", "月", "火", "水", "木", "金", "土"].map((x) => (
            <div key={x} className="text-center">
              {x}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">読み込み中…</p>
        ) : (
          <div className="mt-2 grid grid-cols-7 gap-2">
            {/* 月初の空白 */}
            {Array.from({ length: first.getDay() }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {days.map((d) => {
              const s = d.summary;

              const hasMain = !!s?.main_done;
              const hasFood = s?.food_done_level != null;
              const hasAm = s?.condition_am != null;
              const hasPm = s?.condition_pm != null;
              const hasAny = hasMain || hasFood || hasAm || hasPm;

              const isToday = d.date === todayKey;

              // スタンプ優先順位：メイン◎ > 食◎/△/× > なし
              const bigStamp = hasMain ? stampMain(true) : stampFood(s?.food_done_level);

              return (
                <div
                  key={d.date}
                  className={[
                    "relative aspect-square rounded-xl border p-2",
                    "flex flex-col justify-between",
                    hasAny ? "bg-white border-slate-300 shadow-sm" : "bg-slate-50 border-slate-200",
                    isToday ? "ring-2 ring-slate-300" : "",
                  ].join(" ")}
                >
                  {/* 日付 */}
                  <div className="flex items-start justify-between">
                    <div className="text-xs font-semibold text-slate-800">
                      {Number(d.date.slice(-2))}
                    </div>
                    {hasAny ? (
                      <div className="text-[10px] text-slate-500">記録</div>
                    ) : (
                      <div className="text-[10px] text-slate-400">—</div>
                    )}
                  </div>

                  {/* スタンプ（中央） */}
                  <div className="flex flex-1 items-center justify-center">
                    <div className="select-none text-3xl font-extrabold text-slate-900">
                      {bigStamp || " "}
                    </div>
                  </div>

                  {/* 朝/夜（下部） */}
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700">
                    <div className="rounded-md bg-slate-50 px-2 py-1">
                      <span className="text-slate-500">朝</span>{" "}
                      <span className="font-semibold">{labelCond(s?.condition_am)}</span>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2 py-1 text-right">
                      <span className="text-slate-500">夜</span>{" "}
                      <span className="font-semibold">{labelCond(s?.condition_pm)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 凡例 */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-700">見方</div>
          <div className="mt-1">
            スタンプ：メイン（◎）が最優先。メイン未記録の日は食養生（◎/△/×）を表示。
          </div>
          <div className="mt-1">朝/夜：良＝0 / 普＝1 / 不＝2 を簡略表示。</div>
        </div>
      </Card>
    </div>
  );
}
