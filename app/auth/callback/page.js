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
        const resultId = url.searchParams.get("result");
        const nextPath = url.searchParams.get("next") || "";

        // ✅ 1) まずは「すでにセッションがあるか」を確認（ここが重要）
        let { data: s1 } = await supabase.auth.getSession();
        let session = s1?.session || null;

        // ✅ 2) まだ無ければ code 交換を試す（“必要な時だけ”）
        if (!session) {
          const code = url.searchParams.get("code");
          if (code) {
            // 交換が失敗しても「すでに確立済み」のケースがあるので例外にしない
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              // ここで即失敗にせず、再度 getSession() を見る
              console.warn("exchangeCodeForSession error:", error.message);
            }
            const { data: s2 } = await supabase.auth.getSession();
            session = s2?.session || null;
          }
        }

        // ✅ 3) 最終的に session がなければ失敗
        if (!session) {
          setMsg("ログインに失敗しました（リンク期限切れの可能性）。もう一度お試しください。");
          return;
        }

        // ✅ 4) 結果があるなら attach（Bearer token）
        if (resultId) {
          setMsg("ログイン成功。結果を保存中…");
          await fetch(`/api/diagnosis/v2/events/${encodeURIComponent(resultId)}/attach`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch((e) => console.warn("attach failed:", e));
        }

        setMsg("完了。移動します…");

        // ✅ 5) 遷移
        if (nextPath) {
          window.location.href = nextPath;
        } else if (resultId) {
          window.location.href = `/result/${encodeURIComponent(resultId)}?attach=1`;
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
