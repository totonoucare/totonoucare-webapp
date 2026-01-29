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

        // 1) PKCE: ?code=
        const code = url.searchParams.get("code");

        // 2) Implicit: #access_token=...&refresh_token=...
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        // --- セッション確立 ---
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else {
          throw new Error("認証情報がURLに見つかりませんでした（リンク期限切れ等）。");
        }

        const resultId = url.searchParams.get("result");
        const nextPath = url.searchParams.get("next") || "";

        // session取得
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        // ✅ 結果があるなら v2 attach
        if (resultId && token) {
          await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(resultId)}/attach`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        setMsg("ログイン成功。移動します…");

        if (nextPath) {
          window.location.href = nextPath;
        } else if (resultId) {
          window.location.href = `/result/${encodeURIComponent(resultId)}`;
        } else {
          window.location.href = "/radar";
        }
      } catch (e) {
        console.error(e);
        setMsg("ログインに失敗しました。もう一度やり直してください。");
      }
    })();
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">認証中</h1>
      <p className="text-sm text-slate-600">{msg}</p>
      <a className="text-sm underline" href="/signup">
        登録画面へ戻る
      </a>
    </div>
  );
}
