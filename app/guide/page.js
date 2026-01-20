"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GuidePage() {
  const [session, setSession] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const resultId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("result") || "";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映）。");
          setLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const s = data.session || null;
        setSession(s);

        if (!s) {
          setLoading(false);
          return;
        }

        // ① resultId があるならその結果を取る
        if (resultId) {
          const res = await fetch(`/api/assessments/${encodeURIComponent(resultId)}`);
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json?.data) {
            setMsg("結果の取得に失敗しました。");
            setLoading(false);
            return;
          }
          setAssessment(json.data);
          setLoading(false);
          return;
        }

        // ② resultId がないなら「自分の最新結果」を取る
        const userId = s.user?.id;
        const res = await fetch(`/api/assessments/latest?user_id=${encodeURIComponent(userId)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.data) {
          setMsg("保存された結果が見つかりません。");
          setLoading(false);
          return;
        }

        setAssessment(json.data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setMsg("読み込み中にエラーが発生しました。");
        setLoading(false);
      }
    })();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub?.subscription?.unsubscribe?.();
    }
  }, [resultId]);

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="card">
        <h1>ととのうケアガイド</h1>
        <p className="small">読み込み中…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card">
        <h1>ととのうケアガイド</h1>
        <p className="small">このページはログイン後に利用できます。</p>
        <div style={{ marginTop: 16 }}>
          <a className="btn primary" href="/signup">メールでログイン</a>
          <a className="btn" href="/check" style={{ marginLeft: 10 }}>体質チェックへ</a>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="card">
        <h1>ととのうケアガイド</h1>
        <p className="small">{msg || "結果がありません。"}</p>
        <div style={{ marginTop: 16 }}>
          <a className="btn primary" href="/check">体質チェックへ</a>
          <button className="btn" onClick={logout} style={{ marginLeft: 10 }}>ログアウト</button>
        </div>
      </div>
    );
  }

  const payload = assessment.payload || {};
  const type = payload.type || assessment.result_type || "（不明）";
  const symptom = payload?.answers?.symptom || assessment.symptom || "（未選択）";

  const guide = buildGuide(type, symptom);

  return (
    <div className="card">
      <h1>ととのうケアガイド（仮）</h1>
      <p className="small">ログイン中：{session.user?.email}</p>
      <p className="small">結果ID：{assessment.id}</p>

      <hr />

      <h2>あなたの状態</h2>
      <ul>
        <li>体質タイプ：{type}</li>
        <li>困っている不調：{symptom}</li>
      </ul>

      <hr />

      <h2>優先ケア（仮）</h2>
      <div className="card" style={{ marginTop: 10 }}>
        <h3 style={{ marginTop: 0 }}>1) 今日やる（5〜8分）</h3>
        <ul>{guide.today.map((x) => <li key={x}>{x}</li>)}</ul>

        <h3>2) できる日だけ（10分）</h3>
        <ul>{guide.optional.map((x) => <li key={x}>{x}</li>)}</ul>

        <h3>3) 食養生（ゆるく）</h3>
        <ul>{guide.food.map((x) => <li key={x}>{x}</li>)}</ul>

        <h3>4) 市販漢方 “例”（※仮）</h3>
        <p className="small">
          ※ ここはダミー。実装時は禁忌・受診推奨・服薬中/妊娠/持病の注意を必ず含めます。
        </p>
        <ul>{guide.otc.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>

      <hr />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="btn" href={`/result/${encodeURIComponent(assessment.id)}`}>結果を見る</a>
        <a className="btn primary" href="/check">もう一度チェック</a>
        <button className="btn" onClick={logout}>ログアウト</button>
      </div>
    </div>
  );
}

function buildGuide(type, symptom) {
  if (type.includes("巡り停滞")) {
    return {
      today: [
        "首〜胸の前をゆるめる（鎖骨まわりを軽く）",
        "呼吸：4秒吸って→6秒吐く×8回",
        "温め：首・みぞおちを3〜5分",
      ],
      optional: [
        "背中を丸めて伸ばす（猫のポーズ）30秒×3",
        "軽い散歩 10分（息が上がらない強度）",
      ],
      food: [
        "温かい汁物を足す（冷たい飲み物は減らす）",
        "夜遅い食事を避ける（消化の負担を減らす）",
      ],
      otc: ["例：気の巡り系（※後で具体名と表現設計）", "例：ストレス＋胃腸ケア系"],
    };
  }

  if (type.includes("気血バランス")) {
    return {
      today: [
        "起床後に日光を浴びる（3〜5分）",
        "肩甲骨まわりを動かす（ぐるぐる10回×2）",
        "入浴 or 足湯 5〜10分",
      ],
      optional: ["スクワット浅め10回×2（無理しない）", "就寝前ストレッチ（前もも・ふくらはぎ）"],
      food: ["朝か昼にタンパク質を足す（卵/魚/豆）", "カフェインを午後に寄せない"],
      otc: ["例：疲労感＋胃腸ケア系", "例：睡眠リズムサポート系"],
    };
  }

  return {
    today: ["軽いストレッチ（首・肩）2分", "深呼吸（長く吐く）1分", "水分（温かいもの）を1杯"],
    optional: ["散歩10分", "入浴で温め"],
    food: ["冷たいものを控えめに", "夜食を減らす"],
    otc: ["例：症状に応じたサポート（後で設計）"],
  };
}
