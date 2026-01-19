"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("ログイン処理中…");

  const resultId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("result") || "";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Supabaseのマジックリンク(=OAuth code)をセッションに交換
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (error) throw error;

        // 結果引き継ぎ（いまはlocalStorage。次にDB化する）
        if (resultId) {
          localStorage.setItem("latestAssessmentId", resultId);
        }

        setMsg("ログイン完了。ケアガイドへ移動します…");
        window.location.href = "/guide";
      } catch (err) {
        console.error(err);
        setMsg(
          "ログインに失敗しました。もう一度やり直してください。"
        );
      }
    })();
  }, [resultId]);

  return (
    <div className="card">
      <h1>認証中</h1>
      <p className="small">{msg}</p>
      <div style={{ marginTop: 16 }}>
        <a className="btn" href="/signup">登録画面へ戻る</a>
      </div>
    </div>
  );
}
