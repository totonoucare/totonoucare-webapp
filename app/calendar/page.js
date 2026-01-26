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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">カレンダー</h1>
        <a href="/radar">
          <Button variant="secondary">レーダーへ</Button>
        </a>
      </div>

      <Card>
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
              const hasAny = !!s && (s.main_done || s.food_done_level != null || s.condition_am != null || s.condition_pm != null);

              return (
                <div
                  key={d.date}
                  className={`rounded-lg border p-2 ${hasAny ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="text-xs font-semibold text-slate-800">{Number(d.date.slice(-2))}</div>

                  <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                    <div>一手: {s?.main_done ? "◎" : "—"}</div>
                    <div>食: {s?.food_done_level == null ? "—" : s.food_done_level === 2 ? "◎" : s.food_done_level === 1 ? "△" : "×"}</div>
                    <div>朝: {s?.condition_am == null ? "—" : s.condition_am === 0 ? "良" : s.condition_am === 1 ? "普" : "不"}</div>
                    <div>夜: {s?.condition_pm == null ? "—" : s.condition_pm === 0 ? "良" : s.condition_pm === 1 ? "普" : "不"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
