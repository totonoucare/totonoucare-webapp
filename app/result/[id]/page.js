"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResultPage({ params }) {
  const { id } = params;

  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // ① ログイン状態取得
  useEffect(() => {
    (async () => {
      if (!supabase) {
        setLoadingAuth(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub?.subscription?.unsubscribe?.();
    }
  }, []);

  // ② 結果データ取得（DB）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.data) {
          setData({ notFound: true });
          return;
        }

        setData(json.data);
      } catch (e) {
        console.error(e);
        setData({ notFound: true });
      }
    })();
  }, [id]);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!data) {
    return (
      <div className="card">
        <h1>結果を読み込み中…</h1>
        <p className="small">少し待ってください。</p>
      </div>
    );
  }

  if (data.notFound) {
    return (
      <div className="card">
        <h1>結果が見つかりません</h1>
        <p className="small">期限切れ/削除、または保存に失敗した可能性があります。</p>
        <div style={{ marginTop: 16 }}>
          <a className="btn primary" href="/check">体質チェックをやり直す</a>
        </div>
      </div>
    );
  }

  const createdAt = data.created_at;
  const payload = data.payload || {};
  const type = payload.type || data.result_type || "（不明）";
  const explanation = payload.explanation || "（説明なし）";
  const answers = payload.answers || {};

  const isLoggedIn = !!session;

  return (
    <div className="card">
      <h1>体質チェック結果（仮）</h1>
      <p className="small">
        作成日時：{createdAt ? new Date(createdAt).toLocaleString("ja-JP") : "—"}
      </p>

      {loadingAuth ? null : isLoggedIn ? (
        <p className="small">ログイン中：{session.user?.email}</p>
      ) : (
        <p className="small">未ログイン（登録するとガイドが使えます）</p>
      )}

      <hr />

      <h2 style={{ margin: "8px 0" }}>あなたは：{type}</h2>
      <p>{explanation}</p>

      <hr />

      <h3>回答内容</h3>
      <ul>
        <li>困っている不調：{answers?.symptom || data.symptom || "—"}</li>
        <li>睡眠時間：{answers?.sleep || "—"}</li>
        <li>ストレス感：{answers?.stress || "—"}</li>
        <li>冷え：{answers?.cold || "—"}</li>
        <li>体力・気力の波：{answers?.energy || "—"}</li>
      </ul>

      <hr />

      <h3>次のステップ</h3>
      <p className="small">
        ここから先（ケアガイド・記録・AI伴走）は登録/ログイン後に解放する想定です。
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {isLoggedIn ? (
          <>
            <a className="btn primary" href={`/guide?result=${encodeURIComponent(id)}`}>
              この結果でガイドを見る
            </a>
            <a className="btn" href="/check">別の条件でやり直す</a>
            <button className="btn" onClick={logout}>ログアウト</button>
          </>
        ) : (
          <>
            <a className="btn primary" href={`/signup?result=${encodeURIComponent(id)}`}>
              この結果を保存して登録する
            </a>
            <a className="btn" href="/check">別の条件でやり直す</a>
            <a className="btn" href="/signup">ログイン / 登録</a>
          </>
        )}
      </div>
    </div>
  );
}
