"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("認証中…");

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映の可能性）。");
          return;
        }

        const url = new URL(window.location.href);

        // 1) PKCEフロー： ?code=XXXX
        const code = url.searchParams.get("code");

        // 2) Implicitフロー： #access_token=...&refresh_token=...
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        // --- ✅ ここでセッション確立 ---
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else {
          throw new Error(
            "認証情報がURLに見つかりませんでした。リンク期限切れか設定ミスの可能性があります。"
          );
        }

        // ✅ ここからが「診断結果とユーザーを紐付ける処理」
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        const resultId = url.searchParams.get("result");

        if (resultId && userId) {
          await fetch(`/api/assessments/${resultId}/attach`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          });
        }

        // ✅ 最後にガイドへ移動
        setMsg("ログイン成功。移動します…");
        window.location.href = resultId
          ? `/guide?result=${encodeURIComponent(resultId)}`
          : "/guide";
      } catch (e) {
        console.error(e);
        setMsg(`ログインに失敗しました。もう一度やり直してください。`);
      }
    })();
  }, []);

  return (
    <div className="card">
      <h1>認証中</h1>
      <p className="small">{msg}</p>

      <div style={{ marginTop: 12 }}>
        <a className="btn" href="/signup">
          登録画面へ戻る
        </a>
      </div>
    </div>
  );
}
