"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function wdayLabel(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
}

function mmdd(ymd) {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
}

function levelLabel(level) {
  return ["安定", "注意", "警戒", "要対策"][level] ?? "—";
}

function levelChipClass(level) {
  if (level === 0) return "bg-slate-100 text-slate-800 border-slate-200";
  if (level === 1) return "bg-slate-200 text-slate-900 border-slate-300";
  if (level === 2) return "bg-slate-800 text-white border-slate-800";
  if (level === 3) return "bg-black text-white border-black";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function condLabel(v) {
  if (v == null) return "—";
  if (v === 0) return "良";
  if (v === 1) return "普";
  return "不";
}

function bigStamp({ main_done, food_level }) {
  // “達成感”最優先：メイン◎があれば◎、なければ食（◎△×）、なければ空
  if (main_done) return "◎";
  if (food_level == null) return "";
  if (food_level === 2) return "◎";
  if (food_level === 1) return "△";
  return "×";
}

function miniSixin(top = []) {
  // 表示は最小：最大2個まで
  return (top || []).slice(0, 2).join("・");
}

export default function InsightsPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState("");

  async function authedFetch(path) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
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
      setErr("");
      try {
        const res = await authedFetch("/api/insights/14days?days=14");
        setPayload(res.data);
      } catch (e) {
        setErr(e?.message || "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const stats = useMemo(() => {
    const rows = payload?.rows || [];
    const recorded = rows.filter(
      (r) =>
        r?.care?.main_done ||
        r?.care?.food_level != null ||
        r?.checkin?.condition_am != null ||
        r?.checkin?.condition_pm != null
    ).length;

    const badDays = rows.filter((r) => (r?.radar?.level ?? 0) >= 2).length;
    const badAndMain = rows.filter((r) => (r?.radar?.level ?? 0) >= 2 && r?.care?.main_done).length;

    return {
      recorded,
      total: rows.length,
      badDays,
      badAndMain,
    };
  }, [payload]);

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">傾向（14日）</h1>
        <Card title="ログインが必要です">
          <a href="/signup">
            <Button>メールでログイン</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">傾向（直近14日）</h1>
          <p className="mt-1 text-xs text-slate-500">
            “崩れやすい日”と“ケアできた日”の並びで、自分のパターンが見えてきます。
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/radar">
            <Button variant="secondary">レーダー</Button>
          </a>
          <a href="/calendar">
            <Button variant="secondary">カレンダー</Button>
          </a>
        </div>
      </div>

      {/* サマリー（最小だけ） */}
      <div className="grid grid-cols-2 gap-3">
        <Card title="記録した日数">
          <div className="text-2xl font-extrabold">
            {stats.recorded}/{stats.total}
          </div>
          <div className="mt-1 text-xs text-slate-600">まずは“埋める”だけで勝ち</div>
        </Card>
        <Card title="警戒以上の日にケア◎">
          <div className="text-2xl font-extrabold">
            {stats.badAndMain}/{stats.badDays || 0}
          </div>
          <div className="mt-1 text-xs text-slate-600">ここが増えるほど攻略感が出る</div>
        </Card>
      </div>

      <Card title="14日タイムライン（横スクロール）">
        {loading ? (
          <p className="text-sm text-slate-600">読み込み中…</p>
        ) : err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : (
          <div className="-mx-4 px-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {(payload?.rows || []).map((r) => {
                const stamp = bigStamp(r.care);
                const level = r?.radar?.level ?? null;
                const sixin = miniSixin(r?.radar?.top_sixin?.length ? r.radar.top_sixin : r?.external?.top_sixin);

                const isBad = (level ?? 0) >= 2;
                const isGoodNight = r?.checkin?.condition_pm === 0;

                return (
                  <div
                    key={r.date}
                    className={[
                      "shrink-0 w-[140px] rounded-2xl border p-3",
                      "bg-white shadow-sm",
                      isBad ? "border-slate-400" : "border-slate-200",
                    ].join(" ")}
                  >
                    {/* ヘッダ */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-slate-500">{wdayLabel(r.date)}</div>
                        <div className="text-sm font-semibold">{mmdd(r.date)}</div>
                      </div>
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
                          levelChipClass(level),
                        ].join(" ")}
                      >
                        {level == null ? "—" : levelLabel(level)}
                      </span>
                    </div>

                    {/* スタンプ（達成感の核） */}
                    <div className="mt-3 flex items-center justify-center">
                      <div className="select-none text-5xl font-extrabold">{stamp || " "}</div>
                    </div>

                    {/* サブ情報：六淫/気圧差 */}
                    <div className="mt-2 text-center text-[11px] text-slate-600">
                      {sixin ? `外因: ${sixin}` : "外因: —"}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                        <div className="text-slate-500">朝</div>
                        <div className="text-sm font-semibold">{condLabel(r?.checkin?.condition_am)}</div>
                      </div>
                      <div
                        className={[
                          "rounded-lg px-2 py-2 text-center",
                          isGoodNight ? "bg-slate-100" : "bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="text-slate-500">夜</div>
                        <div className="text-sm font-semibold">{condLabel(r?.checkin?.condition_pm)}</div>
                      </div>
                    </div>

                    {/* “攻略感”のヒント（最小） */}
                    <div className="mt-2 text-[11px] text-slate-500">
                      {isBad && r?.care?.main_done
                        ? "警戒でも耐えた日"
                        : isBad
                        ? "崩れやすい日"
                        : r?.care?.main_done
                        ? "整えた日"
                        : " "}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              左右にスワイプして見比べてください（“警戒”の日と“◎”の日が並ぶと気づきが出ます）。
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
