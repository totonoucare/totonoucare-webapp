// app/auth/callback/page.js
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

        // --- ✅ セッション確立 ---
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

        // セッション取得（attach に token が必要）
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const resultId = url.searchParams.get("result");

        // --- ✅ 診断結果 attach（guest → account）---
        if (resultId && session?.access_token) {
          setMsg("ログイン成功。結果を保存しています…");

          const res = await fetch(
            `/api/diagnosis/v2/events/${encodeURIComponent(resultId)}/attach`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.error("attach failed:", json);
            // ここで止めず result に戻して手動保存もできるようにする
            setMsg("ログインは成功しましたが、結果の保存に失敗しました。結果画面に戻ります…");
          } else {
            setMsg("ログイン成功。結果を保存しました。結果画面に戻ります…");
          }

          window.location.href = `/result/${encodeURIComponent(resultId)}?attach=1`;
          return;
        }

        // resultId が無い通常ログインの場合
        setMsg("ログイン成功。移動します…");
        window.location.href = "/guide";
      } catch (e) {
        console.error(e);
        setMsg("ログインに失敗しました。もう一度やり直してください。");
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold">認証中</h1>
      <p className="mt-2 text-sm text-slate-700">{msg}</p>
      <div className="mt-4">
        <a className="underline" href="/signup">
          登録画面へ戻る
        </a>
      </div>
    </div>
  );
}
