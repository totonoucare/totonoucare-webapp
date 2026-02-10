// app/radar/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** -------- helpers -------- */

function jpSixin(code) {
  const map = {
    wind: "変化（風）",
    cold: "冷え",
    heat: "暑さ",
    damp: "湿気",
    dry: "乾燥",
    pressure_shift: "気圧変化",
    temp_swing: "寒暖差",
    humidity_up: "湿度↑",
    dryness_up: "乾燥↑",
  };
  return map[code] || String(code || "");
}

function levelLabel3(lv) {
  // 0/1/2 を想定（安定/注意/要警戒）
  return ["安定", "注意", "要警戒"][lv] ?? "—";
}
function levelStyle3(lv) {
  // 色は tailwind のニュートラル寄り（派手すぎない）
  if (lv === 2) return { pill: "bg-red-600 text-white", card: "bg-red-50 border-red-100" };
  if (lv === 1) return { pill: "bg-amber-500 text-white", card: "bg-amber-50 border-amber-100" };
  return { pill: "bg-emerald-600 text-white", card: "bg-emerald-50 border-emerald-100" };
}

function fmt1(n) {
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}
function fmt0(n) {
  return Number.isFinite(n) ? Math.round(n) : "—";
}

function hourLabelJST(iso) {
  try {
    const d = new Date(iso);
    const h = d.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
    return h;
  } catch {
    return "—";
  }
}

// 24h変化の「ユーザーに伝わる短文化」
// ※ “根拠”の内部語は出さない
function heroSummary({ radar, external, profileHint }) {
  const lv = radar?.level3 ?? radar?.level ?? 0;
  const top = Array.isArray(radar?.top_sixin) ? radar.top_sixin : [];
  const topJa = top.map(jpSixin).join("・");

  const dp = external?.d_pressure_24h;
  const dt = external?.d_temp_24h;
  const dh = external?.d_humidity_24h;

  // 変化ストレスとして見せるので「絶対値」はここでは書かない
  const parts = [];
  if (Number.isFinite(dp)) parts.push(`気圧 ${fmt1(dp)}hPa`);
  if (Number.isFinite(dt)) parts.push(`気温 ${fmt1(dt)}℃`);
  if (Number.isFinite(dh)) parts.push(`湿度 ${fmt0(dh)}%`);

  const changeText = parts.length ? `24hの変化：${parts.join(" / ")}` : "24hの変化：—";

  const head =
    lv === 2 ? "今日は“要警戒”。変化が強めです。" :
    lv === 1 ? "今日は“注意”。変化が出ています。" :
               "今日は“安定”。大きな変化は少なめです。";

  const hint = profileHint ? `（あなたの傾向：${profileHint}）` : "";

  // top_sixin が英語でも日本語でも崩れない
  const tags = topJa ? `影響：${topJa}` : "";

  return { head, sub: [changeText, tags, hint].filter(Boolean).join("｜") };
}

function AiIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 0-4 4v1H7a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h1v1a4 4 0 0 0 8 0v-1h1a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-1V6a4 4 0 0 0-4-4Z" />
        <path d="M9 12h.01M15 12h.01" />
        <path d="M9 16c1.5 1 4.5 1 6 0" />
      </svg>
    </div>
  );
}

/** -------- page -------- */

export default function RadarPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [data, setData] = useState(null);
  const [explain, setExplain] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // auth
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session || null);
      } finally {
        setLoadingAuth(false);
      }

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s || null));
      unsub = sub?.subscription;
    })();

    return () => {
      try { unsub?.unsubscribe?.(); } catch {}
    };
  }, []);

  async function loadAll({ soft = false } = {}) {
    if (!session) return;
    try {
      soft ? setRefreshing(true) : setLoading(true);

      const { data: sdata } = await supabase.auth.getSession();
      const token = sdata?.session?.access_token;
      if (!token) throw new Error("No token");

      const headers = { Authorization: `Bearer ${token}` };

      // ✅ あなたの現状に合わせて：/api/radar/today と /api/radar/today/explain 前提
      // （もし explain が /api/ai/explain-today のままなら、下のURLを差し替えてOK）
      const [r1, r2] = await Promise.all([
        fetch("/api/radar/today", { headers, cache: "no-store" }).then((r) => r.json()),
        fetch("/api/radar/today/explain", { headers, cache: "no-store" }).then((r) => r.json()),
      ]);

      setData(r1?.data ?? r1 ?? null);
      setExplain(r2?.data ?? r2 ?? null);
    } catch (e) {
      console.error(e);
      // ここは雑に落とさずUI残す（プロトタイプ段階の体験優先）
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // state
  if (loadingAuth || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-8">
        <div className="mx-auto max-w-[440px] space-y-4">
          <div className="h-7 w-40 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-28 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pt-10">
        <div className="mx-auto max-w-[440px] rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-lg font-bold text-slate-900">ログインが必要です</div>
          <div className="mt-2 text-sm text-slate-600 leading-6">
            未病レーダーは、体質と天気の「変化」から、今日の注意点を先回りで出します。
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={() => router.push("/signup")}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              ログイン / 登録
            </button>
            <button
              onClick={() => router.push("/check")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              体質チェックへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const radar = data?.radar || {};
  const external = data?.external || {};

  // 3段階(0/1/2) の想定。もしAPIが 0..3 ならここで丸めてもいい
  const level3 = Number.isFinite(radar?.level3) ? radar.level3 : Math.min(2, radar?.level ?? 0);
  const lvStyle = levelStyle3(level3);

  // ✅ “風だけ見たい”をUI側で強制
  // - time_windows がある前提
  // - top_sixin に wind が入ってる窓だけ候補
  const windows = Array.isArray(data?.time_windows) ? data.time_windows : [];
  const windWindows = windows
    .filter((w) => {
      const ts = Array.isArray(w?.top_sixin) ? w.top_sixin : [];
      // wind / pressure_shift / temp_swing あたりを「変化系」として通す
      return ts.includes("wind") || ts.includes("pressure_shift") || ts.includes("temp_swing");
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  // 横スクロールで見せるのは「注意以上」だけ（安定窓は情報量ノイズ）
  const alertWindows = windWindows.filter((w) => (w.level3 ?? w.level ?? 0) >= 1).slice(0, 24);

  // 体質ヒント（簡単でOK）
  const profileHint = (() => {
    const p = data?.profile || null; // APIが将来 profile を返すなら拾う
    // いま無ければ空でOK（UIの要件優先）
    if (!p) return "";
    // 例：引きずりやすい/立て直しやすい の抽象だけ
    if (p?.core_code?.includes("low")) return "引きずりやすい";
    if (p?.core_code?.includes("high")) return "立て直しやすい";
    return "";
  })();

  const hero = heroSummary({ radar: { ...radar, level3 }, external, profileHint });

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* header */}
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-slate-50/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-[440px] items-center justify-between">
          <div>
            <div className="text-base font-extrabold text-slate-900">未病レーダー</div>
            <div className="text-[11px] font-medium text-slate-500">
              {new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} の予報
            </div>
          </div>

          <button
            onClick={() => loadAll({ soft: true })}
            disabled={refreshing}
            className="rounded-full border border-slate-200 bg-white p-2 shadow-sm active:scale-95 disabled:opacity-60"
            title="更新"
          >
            <svg viewBox="0 0 24 24" className={`h-4 w-4 text-slate-700 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[440px] space-y-6 px-4 py-6">
        {/* hero */}
        <div className={`relative overflow-hidden rounded-[28px] border bg-white p-6 shadow-sm`}>
          <div className={`absolute right-0 top-0 h-28 w-28 rounded-bl-[56px] opacity-15 ${level3 === 2 ? "bg-red-500" : level3 === 1 ? "bg-amber-400" : "bg-emerald-500"}`} />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-600">今日の注意度</div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${lvStyle.pill}`}>
                {levelLabel3(level3)}
              </span>
            </div>

            <div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">
                {hero.head}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                {hero.sub}
              </div>
            </div>

            {/* meters: 現在値は “計器” で見せる（文章には出さない） */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500">気温</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {Number.isFinite(external?.temp) ? fmt1(external.temp) : "—"}
                  <span className="ml-0.5 text-xs font-semibold text-slate-500">℃</span>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500">湿度</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {Number.isFinite(external?.humidity) ? fmt0(external.humidity) : "—"}
                  <span className="ml-0.5 text-xs font-semibold text-slate-500">%</span>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-[10px] font-bold text-slate-500">気圧</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {Number.isFinite(external?.pressure) ? fmt1(external.pressure) : "—"}
                  <span className="ml-0.5 text-xs font-semibold text-slate-500">hPa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* time windows: 横スクロール */}
        <div className="space-y-2">
          <div className="flex items-end justify-between px-1">
            <div className="text-sm font-extrabold text-slate-900">気をつける時間帯</div>
            <div className="text-[11px] font-medium text-slate-500">今後24時間</div>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
            {alertWindows.length ? (
              <div className="-mx-4 overflow-x-auto px-4">
                <div className="flex gap-3">
                  {alertWindows.map((w, idx) => {
                    const lv = Math.min(2, w.level3 ?? w.level ?? 0);
                    const st = levelStyle3(lv);
                    const ts = Array.isArray(w.top_sixin) ? w.top_sixin : [];
                    const tags = ts
                      .filter((x) => x === "wind" || x === "pressure_shift" || x === "temp_swing")
                      .map(jpSixin)
                      .join("・");

                    return (
                      <div
                        key={`${w.time || idx}`}
                        className={`min-w-[140px] max-w-[160px] rounded-2xl border p-3 ${st.card}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-extrabold text-slate-900">{hourLabelJST(w.time)}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${st.pill}`}>
                            {levelLabel3(lv)}
                          </span>
                        </div>
                        <div className="mt-2 text-[12px] font-semibold text-slate-700">
                          {tags || "変化あり"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {w?.hint_ja || "" /* APIが将来 hint_ja を返したらここに出せる */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                <div className="text-sm font-extrabold text-slate-900">特に警戒時間はありません</div>
                <div className="mt-1 text-xs text-slate-600">大きな変化が少ない日です。</div>
              </div>
            )}
          </div>
        </div>

        {/* AI advice: 吹き出し */}
        <div className="space-y-2">
          <div className="px-1 text-sm font-extrabold text-slate-900">AIアドバイス</div>

          <div className="flex gap-3">
            <AiIcon />
            <div className="relative flex-1 rounded-2xl rounded-tl-none border border-slate-100 bg-white p-5 shadow-sm">
              <div className="absolute left-[-8px] top-4 h-4 w-4 rotate-45 border-b border-l border-slate-100 bg-white" />
              {explain?.text ? (
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{explain.text}</div>
              ) : (
                <div className="text-sm text-slate-500">（まだ生成データがありません）</div>
              )}
            </div>
          </div>
        </div>

        {/* footer nav */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => router.push("/history")}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 text-left shadow-sm hover:bg-slate-50"
          >
            <div>
              <div className="text-sm font-extrabold text-slate-900">体質チェック履歴</div>
              <div className="mt-0.5 text-xs text-slate-500">過去の結果を確認</div>
            </div>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={() => router.push("/check")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            体質チェックをやり直す
          </button>
        </div>
      </div>
    </div>
  );
}
