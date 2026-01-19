"use client";

import { useEffect, useMemo, useState } from "react";

export default function SignupPage() {
  const resultId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("result") || "";
  }, []);

  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [resultPreview, setResultPreview] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!resultId) {
      setLoaded(true);
      return;
    }
    const raw = localStorage.getItem(`assessment:${resultId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setResultPreview(parsed);
      } catch {}
    }
    setLoaded(true);
  }, [resultId]);

  function handleFakeSignup(e) {
    e.preventDefault();

    // いまは「登録の雰囲気」を作るだけ（後でSupabase Authに差し替える）
    const user = {
      id: crypto.randomUUID(),
      email,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem("mockUser", JSON.stringify(user));

    // 結果IDをユーザーに紐づけた体にする（後でDBでやる処理）
    if (resultId) {
      localStorage.setItem("latestAssessmentId", resultId);
    }

    setDone(true);

    // 次の画面（ケアガイド）を作ったらそこへ飛ばす。今はホームへ。
setTimeout(() => {
  window.location.href = "/guide";
}, 900);

  return (
    <div className="card">
      <h1>無料登録（仮）</h1>
      <p className="small">
        ※ ここは次のステップで Supabase の本物のメール認証に置き換えます。
        まずは「結果を引き継いで登録できる」体験を作っています。
      </p>

      <hr />

      {!loaded ? (
        <p>読み込み中…</p>
      ) : (
        <>
          {resultId ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="small">引き継ぐ結果ID</div>
              <div style={{ fontWeight: 700 }}>{resultId}</div>

              {resultPreview?.type ? (
                <div style={{ marginTop: 8 }}>
                  <div className="small">プレビュー</div>
                  <div style={{ fontWeight: 700 }}>{resultPreview.type}</div>
                  <div className="small" style={{ marginTop: 6 }}>
                    困っている不調：{resultPreview.answers?.symptom}
                  </div>
                </div>
              ) : (
                <div className="small" style={{ marginTop: 8 }}>
                  ※ この端末に結果データが見つからない場合は、登録後に再診断してもらう設計にします
                </div>
              )}
            </div>
          ) : (
            <div className="small" style={{ marginBottom: 12 }}>
              ※ 結果IDがない登録です（後で通常の登録導線として使えます）
            </div>
          )}

          {done ? (
            <div>
              <h2>登録完了（仮）</h2>
              <p className="small">ホームへ戻ります…</p>
            </div>
          ) : (
            <form onSubmit={handleFakeSignup}>
              <div className="label">メールアドレス</div>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div style={{ marginTop: 16 }}>
                <button className="btn primary" type="submit">
                  この結果を引き継いで登録する
                </button>
              </div>

              <div className="small" style={{ marginTop: 10 }}>
                自動課金はしません。トライアル期間の長さや導線は後で調整します。
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
