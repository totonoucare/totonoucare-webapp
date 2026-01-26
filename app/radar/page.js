"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

function levelLabel(level) {
  return ["安定", "注意", "警戒", "要対策"][level] ?? "—";
}

function levelBadgeClass(level) {
  if (level === 0) return "bg-slate-100 text-slate-800 border-slate-200";
  if (level === 1) return "bg-slate-200 text-slate-900 border-slate-300";
  if (level === 2) return "bg-slate-800 text-white border-slate-800";
  if (level === 3) return "bg-black text-white border-black";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

export default function RadarPage() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [ent, setEnt] = useState([]);
  const [data, setData] = useState(null);

  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  // トースト
  const [toast, setToast] = useState({ open: false, message: "", variant: "info" });
  const [toastTimer, setToastTimer] = useState(null);

  const notify = (message, variant = "success") => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ open: true, message, variant });
    const t = setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
    setToastTimer(t);
  };

  const isSubscribed = useMemo(() => {
    return ent.some((x) => x.product === "radar_subscription");
  }, [ent]);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        notify("Supabaseが初期化できていません（環境変数未反映）。", "error");
        setLoadingAuth(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const s = data.session || null;
      setSession(s);
      setLoadingAuth(false);

      supabase.auth.onAuthStateChange((_e, newSession) => setSession(newSession));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    (async () => {
      if (!session) return;

      try {
        // 1) entitlements取得
        const entJson = await authedFetch("/api/entitlements/me");
        const ents = entJson.data || [];
        setEnt(ents);

        // 2) サブスク必須（今は導線だけ後で実装）
        const hasSub = ents.some((x) => x.product === "radar_subscription");
        if (!hasSub) {
          setData(null);
          setExplain(null);
          return;
        }

        // 3) レーダー本体取得
        const radarJson = await authedFetch("/api/radar/today");
        setData(radarJson);

        // 4) AI「つなぎ文」生成
        setLoadingExplain(true);
        try {
          const payload = {
            symptom_focus: radarJson?.symptom_focus || radarJson?.symptom || "fatigue",
            tcm_profile: {
              flowType: radarJson?.flowType || null,
              organType: radarJson?.organType || null,
              assessment: radarJson?.assessment || null,
            },
            weather_summary: {
              level: radarJson?.radar?.level ?? null,
              top_sixin: radarJson?.external?.top_sixin ?? radarJson?.radar?.top_sixin ?? [],
              d_pressure_24h: radarJson?.external?.d_pressure_24h ?? null,
              temp: radarJson?.external?.temp ?? null,
              humidity: radarJson?.external?.humidity ?? null,
              pressure: radarJson?.external?.pressure ?? null,
              wind: radarJson?.external?.wind ?? null,
            },
            main_card: radarJson?.cards?.main || null,
            food_card: radarJson?.cards?.food || null,
            locale: "ja-JP",
          };

          if (payload.main_card) {
            const ex = await authedFetch("/api/ai/explain-today", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            setExplain(ex);
          } else {
            setExplain(null);
          }
        } finally {
          setLoadingExplain(false);
        }
      } catch (e) {
        console.error(e);
        notify(e?.message || "読み込みに失敗しました。", "error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function saveMorning(cond) {
    try {
      const json = await authedFetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_am: cond }),
      });
      setData((prev) => ({ ...prev, checkin: json.data }));
      notify("朝の体調を記録しました");
    } catch (e) {
      notify(e?.message || "記録に失敗しました", "error");
    }
  }

  async function saveNight(condPm) {
    try {
      const json = await authedFetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_pm: condPm }),
      });
      setData((prev) => ({ ...prev, checkin: json.data }));
      notify("夜の体調を記録しました");
    } catch (e) {
      notify(e?.message || "記録に失敗しました", "error");
    }
  }

  async function logMainDone(done) {
    try {
      const card = data?.cards?.main;
      if (!card) throw new Error("今日の一手カードがありません");

      const level = done ? 2 : 0;

      await authedFetch("/api/carelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          kind: card.kind,
          done_level: level,
        }),
      });

      notify(done ? "今日の一手を記録しました" : "未実施として記録しました");
    } catch (e) {
      notify(e?.message || "記録に失敗しました", "error");
    }
  }

  async function logFoodDone(level) {
    try {
      const card = data?.cards?.food;
      if (!card) throw new Error("食養生カードがありません");

      await authedFetch("/api/carelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          kind: "food",
          done_level: level,
        }),
      });

      notify("食養生の記録を保存しました");
    } catch (e) {
      notify(e?.message || "記録に失敗しました", "error");
    }
  }

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
            <p className="text-slate-700">メールログイン後に利用できます。</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/signup">
                <Button>メールでログイン</Button>
              </a>
              <a href="/check">
                <Button variant="secondary">体質チェックへ</Button>
              </a>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (!isSubscribed) {
    return (
      <>
        <Toast open={toast.open} message={toast.message} variant={toast.variant} />
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">未病レーダー</h1>

          <Card title="サブスクが必要です">
            <p className="text-slate-700">
              未病レーダーはサブスク加入後に利用できます（Stripe導線は後で実装）。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/guide">
                <Button>ガイドを見る</Button>
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

  if (!data) {
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

  const radar = data?.radar || {};
  const main = data?.cards?.main;
  const food = data?.cards?.food;

  return (
    <>
      <Toast open={toast.open} message={toast.message} variant={toast.variant} />

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">未病レーダー</h1>
            <p className="text-xs text-slate-500">ログイン中：{session.user?.email}</p>
          </div>

          <div className="flex gap-2">
            <a href="/calendar" className="shrink-0">
              <Button variant="secondary">カレンダー</Button>
            </a>
            <a href="/guide" className="shrink-0">
              <Button variant="secondary">ガイド</Button>
            </a>
          </div>
        </div>

        <Card
          title={
            <div className="flex items-center justify-between gap-3">
              <span>今日の状態</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${levelBadgeClass(
                  radar.level
                )}`}
              >
                {levelLabel(radar.level)}
              </span>
            </div>
          }
        >
          <p className="whitespace-pre-wrap text-slate-700">
            {radar.reason_text || "（まだ理由がありません）"}
          </p>
        </Card>

        <Card title="今日の見立て（AI）">
          {loadingExplain ? (
            <p className="text-sm text-slate-600">生成中…</p>
          ) : explain?.error ? (
            <p className="text-sm text-red-600">AIエラー: {explain.error}</p>
          ) : explain ? (
            <div className="space-y-2">
              <div className="text-base font-semibold">{explain.headline}</div>
              <p className="whitespace-pre-wrap text-slate-700">{explain.assessment}</p>
              <p className="whitespace-pre-wrap text-slate-700">{explain.why_alert}</p>
              <p className="whitespace-pre-wrap text-slate-700">{explain.why_this_care}</p>

              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                <div>
                  <span className="font-semibold">今日のゴール：</span>
                  {explain.goal}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">記録のコツ：</span>
                  {explain.logging_tip}
                </div>
                <div className="mt-1 text-slate-600">
                  <span className="font-semibold">注意：</span>
                  {explain.safety_note}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">（まだ生成情報がありません）</p>
          )}
        </Card>

        <Card title="今日の一手（メイン）">
          {main ? (
            <div className="space-y-3">
              <div className="text-base font-semibold">{main.title}</div>

              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {(main.body_steps || []).map((s, i) => (
                  <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                ))}
              </ul>

              {(main.cautions || []).length ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-semibold">注意</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {(main.cautions || []).map((s, i) => (
                      <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => logMainDone(true)}>やった</Button>
                <Button variant="secondary" onClick={() => logMainDone(false)}>
                  やってない
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">カードがまだ登録されていません。</p>
          )}
        </Card>

        <Card title="今日の食養生（おまけ）">
          {food ? (
            <div className="space-y-3">
              <div className="text-base font-semibold">{food.title}</div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {(food.body_steps || []).map((s, i) => (
                  <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => logFoodDone(2)}>できた（◎）</Button>
                <Button variant="secondary" onClick={() => logFoodDone(1)}>
                  少し（△）
                </Button>
                <Button variant="ghost" onClick={() => logFoodDone(0)}>
                  できなかった（×）
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">食養生カードがまだ登録されていません。</p>
          )}
        </Card>

        <Card title="体調記録（朝・夜）">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">朝（いま）</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => saveMorning(0)}>良い</Button>
                <Button variant="secondary" onClick={() => saveMorning(1)}>
                  普通
                </Button>
                <Button variant="ghost" onClick={() => saveMorning(2)}>
                  不調
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-800">夜（1日を振り返って）</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => saveNight(0)}>良い</Button>
                <Button variant="secondary" onClick={() => saveNight(1)}>
                  普通
                </Button>
                <Button variant="ghost" onClick={() => saveNight(2)}>
                  不調
                </Button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              ※ 記録はカレンダーで確認できます。
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
