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

        // PKCE: ?code=...
        const code = url.searchParams.get("code");

        // Hash: #access_token=...&refresh_token=...
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        let session = null;

        // 1) まず既存セッションがあるか確認
        const { data: s0 } = await supabase.auth.getSession();
        session = s0?.session || null;

        // 2) 無ければ URL からセッション確立（detectSessionInUrl=false 前提）
        if (!session) {
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw new Error(`exchangeCodeForSession: ${error.message}`);
            session = data?.session || null;
          } else if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw new Error(`setSession: ${error.message}`);
            session = data?.session || null;
          }
        }

        // 3) まだ無ければ最後にもう一回 getSession（反映待ち対策）
        if (!session) {
          const { data: s1 } = await supabase.auth.getSession();
          session = s1?.session || null;
        }

        if (!session) {
          setMsg("ログインに失敗しました（リンク期限切れ/認証情報なし）。もう一度お試しください。");
          return;
        }

        // 4) 結果があるなら attach（guest診断 → ログイン後に紐付け）
        if (resultId) {
          setMsg("ログイン成功。結果を保存中…");
          const res = await fetch(
            `/api/diagnosis/v2/events/${encodeURIComponent(resultId)}/attach`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          // attach失敗でもログイン自体は成功してるので、画面へ戻す
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            console.warn("attach failed:", j);
          }
        }

        setMsg("完了。移動します…");

        if (nextPath) {
          window.location.href = nextPath;
        } else if (resultId) {
          window.location.href = `/result/${encodeURIComponent(resultId)}?attach=1`;
        } else {
          window.location.href = "/radar";
        }
      } catch (e) {
        console.error(e);
        setMsg(`ログインに失敗しました：${e?.message || String(e)}`);
      }
    })();
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">認証中</h1>
      <p className="text-sm text-slate-700">{msg}</p>
      <a className="text-sm underline" href="/signup">
        登録画面へ戻る
      </a>
    </div>
  );
}
