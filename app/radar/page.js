// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

function levelLabel3(level) {
  return ["安定", "注意", "要警戒"][level] ?? "—";
}
function levelBadgeClass3(level) {
  if (level === 0) return "bg-slate-100 text-slate-800 border-slate-200";
  if (level === 1) return "bg-amber-100 text-amber-900 border-amber-200";
  if (level === 2) return "bg-red-600 text-white border-red-600";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

const SIXIN_JA = {
  wind: "ゆらぎ",
  cold: "冷え",
  heat: "暑さ",
  damp: "湿気",
  dry: "乾燥",
};

const CHIP_JA = (s) => {
  if (!s) return "";
  // ここは “今出てる謎チップ” をユーザー向けに丸める（必要に応じて追加）
  const map = {
    "cold strong": "冷えが強い",
    "heat strong": "暑さが強い",
    "damp strong": "湿気が強い",
    "dry strong": "乾燥が強い",
    "wind strong": "変化が大きい",
  };

  // 既に日本語ならそのまま
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(s)) return s;

  // よくある英字トークンを潰す
  if (map[s]) return map[s];

  // fallback：英字は出さず「要因」扱いに落とす
  return "影響要因";
};

function fmtNow(external) {
  const t = typeof external?.temp === "number" ? `${external.temp.toFixed(1)}℃` : "—";
  const h = typeof external?.humidity === "number" ? `${external.humidity.toFixed(0)}%` : "—";
  const p = typeof external?.pressure === "number" ? `${external.pressure.toFixed(1)}hPa` : "—";
  return `現在：気温 ${t} / 湿度 ${h} / 気圧 ${p}`;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function hhmm(t) {
  if (!t) return "";
  return String(t).slice(11, 16);
}

function formatRange(start, end) {
  if (!start) return "";
  if (!end) return `${hhmm(start)}頃`;
  return `${hhmm(start)}〜${hhmm(end)}頃`;
}

/**
 * 1時間ごとの windows を「連続区間」に圧縮する
 * - level3 が同じ & top_sixin が同じ ならつなぐ
 * - さらに同じ区間が多い問題に対処：表示は “上位N区間” に絞る
 */
function groupWindows(windows) {
  const ws = safeArr(windows)
    .filter((w) => (w?.level3 ?? 0) >= 1)
    .slice()
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  if (!ws.length) return [];

  const normKey = (w) => {
    const lv = w.level3 ?? 0;
    const six = safeArr(w.top_sixin).join("|");
    return `${lv}::${six}`;
  };

  const groups = [];
  let cur = { ...ws[0], start: ws[0].time, end: ws[0].time, count: 1 };

  for (let i = 1; i < ws.length; i++) {
    const w = ws[i];
    if (normKey(w) === normKey(cur)) {
      cur.end = w.time;
      cur.count += 1;
    } else {
      groups.push(cur);
      cur = { ...w, start: w.time, end: w.time, count: 1 };
    }
  }
  groups.push(cur);

  // “山”の優先度：risk > level3 > 長さ
  return groups
    .slice()
    .sort((a, b) => {
      const ra = a.risk ?? 0;
      const rb = b.risk ?? 0;
      if (rb !== ra) return rb - ra;
      const la = a.level3 ?? 0;
      const lb = b.level3 ?? 0;
      if (lb !== la) return lb - la;
      return (b.count ?? 0) - (a.count ?? 0);
    });
}

/**
 * explain.text を見出しで分割してカード化する（最速のUX改善）
 * 見出し：今日の予報（3段階） / 注意が必要な時間帯 / 基本対策（無料版）
 */
function splitExplain(text) {
  const t = (text || "").trim();
  if (!t) return null;

  const headings = ["今日の予報（3段階）", "注意が必要な時間帯", "基本対策（無料版）"];

  // どれも含まれないなら “そのまま” を一つの塊で返す
  const hasAny = headings.some((h) => t.includes(h));
  if (!hasAny) return { blocks: [{ title: "AIの提案", body: t }] };

  const blocks = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const nextH = headings[i + 1];

    const start = t.indexOf(h);
    if (start < 0) continue;

    const bodyStart = start + h.length;
    const end = nextH ? t.indexOf(nextH, bodyStart) : t.length;
    const body = t.slice(bodyStart, end).trim();

    blocks.push({ title: h, body });
  }

  return { blocks };
}

export default function RadarPage() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [toast, setToast] = useState({ open: false, message: "", variant: "info" });
  const [toastTimer, setToastTimer] = useState(null);

  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const notify = (message, variant = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ open: true, message, variant });
    const t = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
    setToastTimer(t);
  };

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        if (!supabase) {
          setSession(null);
          setLoadingAuth(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        setSession(data.session || null);
        setLoadingAuth(false);

        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
        unsub = sub?.subscription;
      } catch (e) {
        console.error(e);
        setSession(null);
        setLoadingAuth(false);
      }
    })();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  async function authedFetch(path, opts = {}) {
    if (!supabase) throw new Error("supabase not ready");
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("not logged in");

    const res = await fetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  async function loadAll() {
    if (!session) return;

    setLoadingData(true);
    setLoadingExplain(true);
    setExplain(null);

    try {
      const r1 = await authedFetch("/api/radar/today");
      setData(r1?.data || null);

      const r2 = await authedFetch("/api/radar/today/explain");
      setExplain(r2?.data || null);
    } catch (e) {
      console.error(e);
      notify(e?.message || "読み込みに失敗しました", "error");
      setData(null);
      setExplain(null);
    } finally {
      setLoadingData(false);
      setLoadingExplain(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const radar = data?.radar || {};
  const external = data?.external || {};

  const topSixinJa = useMemo(() => {
    const top = safeArr(radar?.top_sixin);
    if (!top.length) return "—";
    return top.map((c) => SIXIN_JA[c] || "影響").join("・");
  }, [radar?.top_sixin]);

  const chipsJa = useMemo(() => {
    return safeArr(radar?.chips).map(CHIP_JA).filter(Boolean).slice(0, 6);
  }, [radar?.chips]);

  const grouped = useMemo(() => groupWindows(data?.time_windows), [data?.time_windows]);
  const topGroups = grouped.slice(0, 3); // “重要な山”だけ見せる（多すぎ問題をUIでまず解消）

  const explainBlocks = useMemo(() => splitExplain(explain?.text), [explain?.text]);

  if (loadingAuth) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <p className="text-sm text-slate-600">読み込み中…</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <Card title="ログインが必要です">
            <p className="text-slate-700">レーダーはログイン後に利用できます。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/signup">
                <Button>ログイン / 登録</Button>
              </a>
              <a href="/check">
                <Button variant="secondary">体質チェック</Button>
              </a>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (loadingData) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <p className="text-sm text-slate-600">読み込み中…</p>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>
          <Card title="読み込みに失敗しました">
            <p className="text-slate-600">再読み込みしてください。</p>
            <div className="mt-3">
              <Button onClick={loadAll}>再読み込み</Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast open={toast.open} message={toast.message} variant={toast.variant} />

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">未病レーダー</h1>
            <p className="text-xs text-slate-500">今日の予報と対策を、短く分かりやすく。</p>
          </div>
          <div className="flex gap-2">
            <a href="/history" className="shrink-0">
              <Button variant="secondary">履歴</Button>
            </a>
            <a href="/check" className="shrink-0">
              <Button variant="secondary">体質チェック</Button>
            </a>
          </div>
        </div>

        {/* ✅ 結論カード */}
        <Card
          title={
            <div className="flex items-center justify-between gap-3">
              <span>今日の予報</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${levelBadgeClass3(
                  radar.level
                )}`}
              >
                {levelLabel3(radar.level)}
              </span>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="text-sm text-slate-700">
              影響の中心：<span className="font-semibold">{topSixinJa}</span>
            </div>

            {/* reason_text は短くしないと死ぬので、UIでは“要点表示”に寄せる */}
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {radar.reason_text || "—"}
            </div>

            {/* ✅ 根拠バッジ（日本語に丸める） */}
            {chipsJa.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {chipsJa.map((c) => (
                  <span key={c} className="rounded-full border bg-white px-3 py-1 text-xs text-slate-700">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="pt-2 text-xs text-slate-500">{fmtNow(external)}</div>
          </div>
        </Card>

        {/* ✅ 時間帯：区間で出す */}
        <Card title="注意が出やすい時間帯（次の24時間）">
          {!topGroups.length ? (
            <p className="text-sm text-slate-600">目立つ山は小さめです。</p>
          ) : (
            <div className="space-y-2">
              {topGroups.map((g) => {
                const six = safeArr(g.top_sixin).map((c) => SIXIN_JA[c] || "影響").join("・");
                return (
                  <div key={`${g.start}-${six}-${g.level3}`} className="rounded-xl border bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{formatRange(g.start, g.end)}</div>
                        <div className="mt-1 text-xs text-slate-600">要因：{six || "—"}</div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${levelBadgeClass3(
                          g.level3
                        )}`}
                      >
                        {levelLabel3(g.level3)}
                      </span>
                    </div>

                    {/* “この時間にやること”はAIに頼る前に固定でOK（無料版） */}
                    <div className="mt-2 text-sm text-slate-800">
                      この時間は「冷やさない・詰め込みすぎない」が効きます。
                    </div>
                  </div>
                );
              })}
              <div className="pt-1 text-xs text-slate-500">
                ※ 1時間ごとの表示はやめて、連続する時間帯をまとめています。
              </div>
            </div>
          )}
        </Card>

        {/* ✅ AI：カード分割表示 */}
        <Card title="基本対策（AI）">
          {loadingExplain ? (
            <p className="text-sm text-slate-600">生成中…</p>
          ) : explainBlocks?.blocks?.length ? (
            <div className="space-y-3">
              {explainBlocks.blocks.map((b) => (
                <div key={b.title} className="rounded-xl border bg-white px-3 py-3">
                  <div className="text-sm font-semibold">{b.title}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {/* 画面に内部コードが出ないよう最低限の置換 */}
                    {(b.body || "")
                      .replaceAll("cold_low", "冷えがベース寄り")
                      .replaceAll("cold_high", "冷え寄り（回復は比較的早め）")
                      .replaceAll("heat_low", "熱がこもりやすい寄り")
                      .replaceAll("heat_high", "熱寄り（回復は比較的早め）")
                      .replaceAll("mixed_low", "寒暖差に振れやすい寄り")
                      .replaceAll("mixed_high", "寒暖差に振れやすい（回復は比較的早め）")
                      .replaceAll("neutral_low", "偏りは少ないが引きずりやすい寄り")
                      .replaceAll("neutral_high", "偏りは少なく回復は比較的早め")
                      .replaceAll("blood_stasis", "めぐりが滞りやすい")
                      .replaceAll("fluid_damp", "余分な水分がたまりやすい")
                      .replaceAll("recovery_score", "回復余力")}
                  </div>
                </div>
              ))}
              <div className="text-xs text-slate-500">
                ※ 無料版は「基本対策」に限定（食材提案や手順は控えめに表示）。
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">（まだ生成情報がありません）</p>
              <Button onClick={loadAll}>もう一度読み込む</Button>
            </div>
          )}
        </Card>

        <div className="flex gap-2">
          <Button onClick={loadAll}>更新</Button>
          <a href="/radar/settings">
            <Button variant="secondary">地域設定</Button>
          </a>
        </div>

        <div className="text-center text-[11px] font-bold text-slate-400">date: {data?.date || "—"}</div>
      </div>
    </>
  );
}
