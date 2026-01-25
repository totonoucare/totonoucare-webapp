"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResultPage({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [ent, setEnt] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

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
        const entJson = await authedFetch("/api/entitlements/me");
        setEnt(entJson.data || []);
      } catch (e) {
        // entitlements APIは新設なので、ここは黙ってOK
      }
    })();
  }, [session]);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!data) {
    return (
      <main style={{ padding: 16 }}>
        <h1>結果を読み込み中…</h1>
      </main>
    );
  }

  if (data.notFound) {
    return (
      <main style={{ padding: 16 }}>
        <h1>結果が見つかりません</h1>
        <p>期限切れ/削除、または保存に失敗した可能性があります。</p>
        <p><a href="/check">体質チェックをやり直す</a></p>
      </main>
    );
  }

  const createdAt = data.created_at;
  const payload = data.payload || {};
  const type = payload.type || data.result_type || "（不明）";
  const explanation = payload.explanation || "（説明なし）";
  const answers = payload.answers || {};
  const symptomFocus = answers?.symptom_focus || data.symptom || "—";

  const isLoggedIn = !!session;
  const hasGuide = ent.some((x) => x.product === "guide_all_access");
  const hasSub = ent.some((x) => x.product === "radar_subscription");

  return (
    <main style={{ padding: 16, maxWidth: 720 }}>
      <h1>体質チェック結果（仮）</h1>

      <p>
        作成日時：{createdAt ? new Date(createdAt).toLocaleString("ja-JP") : "—"}
      </p>

      {loadingAuth ? null : isLoggedIn ? (
        <p>ログイン中：{session.user?.email}</p>
      ) : (
        <p>未ログイン（登録すると保存・レーダー・ガイドが使えます）</p>
      )}

      <hr />

      <h2>あなたは：{type}</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{explanation}</p>

      <hr />

      <h3>主訴</h3>
      <p>{symptomFocus}</p>

      <hr />

      <h3>次のステップ</h3>
      {isLoggedIn ? (
        <>
          <p>
            <a href="/radar">未病レーダー</a>（{hasSub ? "利用可能" : "サブスク未加入"}）
            <br />
            <a href="/guide">ケアガイド</a>（{hasGuide ? "全解放" : "サンプルのみ"}）
          </p>
          <button onClick={logout}>ログアウト</button>
          <p><a href="/check">別の条件でやり直す</a></p>
        </>
      ) : (
        <>
          <p>
            <a href={`/signup?result=${encodeURIComponent(id)}`}>この結果を保存して登録する</a>
            <br />
            <a href="/signup">ログイン / 登録</a>
            <br />
            <a href="/check">別の条件でやり直す</a>
          </p>
        </>
      )}
    </main>
  );
}
