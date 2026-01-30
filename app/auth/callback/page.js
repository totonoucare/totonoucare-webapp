"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("認証中…");

  const params = useMemo(() => {
    const resultId = sp?.get("result") || "";
    const nextRaw = sp?.get("next") || "";

    // open redirect 対策：サイト内パスのみ許可
    const nextPath =
      nextRaw && nextRaw.startsWith("/") ? nextRaw : "";

    return { resultId, nextPath };
  }, [sp]);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映の可能性）。");
          return;
        }

        const url = new URL(window.location.href);

        // PKCE: ?code=...
        const code = url.searchParams.get("code");

        // Hash: #access_token=...&refresh_token=...
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        let session = null;

        // 1) 既存セッション
        const { data: s0 } = await supabase.auth.getSession();
        session = s0?.session || null;

        // 2) 無ければ URL からセッション確立
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

        // 3) まだ無ければ再取得（反映待ち対策）
        if (!session) {
          const { data: s1 } = await supabase.auth.getSession();
          session = s1?.session || null;
        }

        if (!session) {
          setMsg("ログインに失敗しました（リンク期限切れ/認証情報なし）。もう一度お試しください。");
          return;
        }

        // 4) result があるなら attach を必ず試行
        if (params.resultId) {
          setMsg("ログイン成功。結果を保存中…");
          const res = await fetch(
            `/api/diagnosis/v2/events/${encodeURIComponent(params.resultId)}/attach`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          // attach失敗でもログイン自体は成功なので、警告して続行
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            console.warn("attach failed:", j);
          }
        }

        setMsg("完了。移動します…");

        // 5) 戻り先決定（next 優先 → result → radar）
        if (params.nextPath) {
          router.replace(params.nextPath);
        } else if (params.resultId) {
          router.replace(`/result/${encodeURIComponent(params.resultId)}?attach=1`);
        } else {
          router.replace("/radar");
        }
      } catch (e) {
        console.error(e);
        setMsg(`ログインに失敗しました：${e?.message || String(e)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.resultId, params.nextPath]);

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
