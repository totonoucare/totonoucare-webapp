"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function levelLabel(level) {
  return ["安定", "注意", "警戒", "要対策"][level] ?? "—";
}

export default function RadarPage() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [ent, setEnt] = useState([]);
  const [data, setData] = useState(null);

  const [explain, setExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const [msg, setMsg] = useState("");

  const isSubscribed = useMemo(() => {
    return ent.some((x) => x.product === "radar_subscription");
  }, [ent]);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setMsg("Supabaseが初期化できていません（環境変数未反映）。");
        setLoadingAuth(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const s = data.session || null;
      setSession(s);
      setLoadingAuth(false);

      supabase.auth.onAuthStateChange((_e, newSession) => setSession(newSession));
    })();
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

        // 2) サブスク必須（いまはStripe導線まだなので、ここは表示ブロック）
        const hasSub = ents.some((x) => x.product === "radar_subscription");
        if (!hasSub) {
          setMsg("未病レーダーはサブスク加入後に利用できます（今は導線だけ後で実装）。");
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
              // 今は仮でもOK。後で本診断(type/flow/organ)に差し替える
              flowType: radarJson?.flowType || null,
              organType: radarJson?.organType || null,
              assessment: radarJson?.assessment || null,
            },
            weather_summary: {
              // externalに天気スコアが入ってるのでそれを渡す
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
        setMsg(e?.message || "読み込みに失敗しました。");
      }
    })();
  }, [session]);

  async function saveMorning(cond) {
    try {
      const json = await authedFetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_am: cond }),
      });
      setMsg("朝の体調を記録しました。");
      setData((prev) => ({ ...prev, checkin: json.data }));
    } catch (e) {
      setMsg(e?.message || "記録に失敗しました。");
    }
  }

  async function saveNight(condPm) {
    try {
      const json = await authedFetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition_pm: condPm }),
      });
      setMsg("夜の体調を記録しました。");
      setData((prev) => ({ ...prev, checkin: json.data }));
    } catch (e) {
      setMsg(e?.message || "記録に失敗しました。");
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

      setMsg(done ? "今日の一手を記録しました。" : "未実施として記録しました。");
    } catch (e) {
      setMsg(e?.message || "記録に失敗しました。");
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
          done_level: level, // 2/1/0
        }),
      });

      setMsg("食養生の記録を保存しました。");
    } catch (e) {
      setMsg(e?.message || "記録に失敗しました。");
    }
  }

  // ---- Render ----

  if (loadingAuth) {
    return (
      <main style={{ padding: 16 }}>
        <h1>未病レーダー</h1>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={{ padding: 16 }}>
        <h1>未病レーダー</h1>
        <p>ログイン後に利用できます。</p>
        <p>
          <a href="/signup">メールでログイン</a> ／ <a href="/check">体質チェックへ</a>
        </p>
      </main>
    );
  }

  if (!isSubscribed) {
    return (
      <main style={{ padding: 16 }}>
        <h1>未病レーダー</h1>
        <p>{msg || "サブスク加入が必要です（後でStripe導線を実装）。"}</p>
        <p>
          <a href="/result">結果へ</a> ／ <a href="/guide">ガイドを見る</a>
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 16 }}>
        <h1>未病レーダー</h1>
        <p>{msg || "読み込み中…"}</p>
      </main>
    );
  }

  const radar = data?.radar || {};
  const main = data?.cards?.main;
  const food = data?.cards?.food;

  return (
    <main style={{ padding: 16, maxWidth: 760 }}>
      <h1>未病レーダー</h1>
      <p style={{ opacity: 0.8 }}>ログイン中：{session.user?.email}</p>

      <hr />

      <h2>今日の状態：{levelLabel(radar.level)}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{radar.reason_text}</p>

      <hr />

      <h2>今日の見立て（AI）</h2>
      {loadingExplain ? (
        <p>生成中…</p>
      ) : explain ? (
        <>
          <h3 style={{ marginTop: 0 }}>{explain.headline}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{explain.assessment}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{explain.why_alert}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{explain.why_this_care}</p>
          <p>
            <b>今日のゴール：</b>
            {explain.goal}
          </p>
          <p>
            <b>記録のコツ：</b>
            {explain.logging_tip}
          </p>
          <p style={{ opacity: 0.8 }}>
            <b>注意：</b>
            {explain.safety_note}
          </p>
        </>
      ) : (
        <p>（まだ生成情報がありません）</p>
      )}

      <hr />

      <h2>今日の一手（メイン）</h2>
      {main ? (
        <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>{main.title}</h3>

          {main.illustration_url ? (
            <img src={main.illustration_url} alt="" style={{ maxWidth: "100%", borderRadius: 8 }} />
          ) : null}

          <ul>
            {(main.body_steps || []).map((s, i) => (
              <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
            ))}
          </ul>

          {(main.cautions || []).length ? (
            <>
              <p>
                <b>注意</b>
              </p>
              <ul>
                {(main.cautions || []).map((s, i) => (
                  <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                ))}
              </ul>
            </>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => logMainDone(true)}>やった</button>
            <button onClick={() => logMainDone(false)}>やってない</button>
          </div>
        </section>
      ) : (
        <p>カードがまだ登録されていません（care_cardsにseedを入れる必要があります）。</p>
      )}

      <hr />

      <h2>今日の食養生（おまけ）</h2>
      {food ? (
        <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>{food.title}</h3>

          <ul>
            {(food.body_steps || []).map((s, i) => (
              <li key={i}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => logFoodDone(2)}>できた（◎）</button>
            <button onClick={() => logFoodDone(1)}>少し（△）</button>
            <button onClick={() => logFoodDone(0)}>できなかった（×）</button>
          </div>
        </section>
      ) : (
        <p>食養生カードがまだ登録されていません。</p>
      )}

      <hr />

      <h2>体調記録</h2>
      <p>朝（いま）</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => saveMorning(0)}>良い</button>
        <button onClick={() => saveMorning(1)}>普通</button>
        <button onClick={() => saveMorning(2)}>不調</button>
      </div>

      <p style={{ marginTop: 16 }}>夜（1日を振り返って）</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => saveNight(0)}>良い</button>
        <button onClick={() => saveNight(1)}>普通</button>
        <button onClick={() => saveNight(2)}>不調</button>
      </div>

      {msg ? <p style={{ marginTop: 16 }}>{msg}</p> : null}

      <hr />

      <p>
        <a href="/guide">ガイド</a> ／ <a href="/check">体質チェック</a>
      </p>
    </main>
  );
}
