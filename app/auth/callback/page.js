"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("認証中…");

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映）。");
          return;
        }

        const url = new URL(window.location.href);

        // 1) PKCEフロー： ?code=XXXX が来る場合
        const code = url.searchParams.get("code");

        // 2) Implicitフロー： #access_token=...&refresh_token=... が来る場合
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

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
          // 何も来てない＝リンクが壊れてる / 期限切れ / redirect設定ミス等
          throw new Error(
            "認証情報がURLに見つかりませんでした。リンクが期限切れか、設定が未完了の可能性があります。"
          );
        }

        // result 引き継ぎ（任意）
        const resultId = url.searchParams.get("result");

        setMsg("ログイン成功。移動します…");
        window.location.href = resultId ? `/guide?result=${encodeURIComponent(resultId)}` : "/guide";
      } catch (e) {
        console.error(e);
        setMsg(`ログインに失敗しました。もう一度やり直してください。 (${e?.message || e})`);
      }
    })();
  }, []);

  return (
    <div className="card">
      <h1>認証中</h1>
      <p className="small">{msg}</p>
      <div style={{ marginTop: 12 }}>
        <a className="btn" href="/signup">登録画面へ戻る</a>
      </div>
    </div>
  );
}
