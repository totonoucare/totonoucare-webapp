// app/auth/callback/AuthCallbackClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("安全にログインしています…");

  const params = useMemo(() => {
    const resultId = sp?.get("result") || "";
    const nextRaw = sp?.get("next") || "";
    const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : "";
    return { resultId, nextPath };
  }, [sp]);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("システムエラー（環境変数未反映の可能性）。");
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        let session = null;

        const { data: s0 } = await supabase.auth.getSession();
        session = s0?.session || null;

        if (!session) {
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw new Error(`exchangeCodeForSession: ${error.message}`);
            session = data?.session || null;
          } else if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw new Error(`setSession: ${error.message}`);
            session = data?.session || null;
          }
        }

        if (!session) {
          const { data: s1 } = await supabase.auth.getSession();
          session = s1?.session || null;
        }

        if (!session) {
          setMsg("ログインの期限が切れているか、失敗しました。");
          setTimeout(() => router.replace("/signup"), 3000);
          return;
        }

        if (params.resultId) {
          setMsg("ログイン完了。データを保存しています…");
          const res = await fetch(
            `/api/diagnosis/v2/events/${encodeURIComponent(params.resultId)}/attach`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
            }
          );
          if (!res.ok) {
            console.warn("attach failed");
          }
        }

        setMsg("完了しました。画面を移動します…");

        if (params.nextPath) {
          router.replace(params.nextPath);
        } else if (params.resultId) {
          router.replace(`/result/${encodeURIComponent(params.resultId)}?attach=1`);
        } else {
          router.replace("/radar");
        }
      } catch (e) {
        console.error(e);
        setMsg(`エラーが発生しました：${e?.message || String(e)}`);
      }
    })();
  }, [params.resultId, params.nextPath, router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-6">
      <div className="flex flex-col items-center text-center animate-in fade-in duration-500">
        {/* リッチなローディングアニメーション */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[4px] border-slate-100" />
          <div className="absolute inset-0 rounded-full border-[4px] border-[var(--accent)] border-t-transparent animate-spin" />
        </div>
        
        <h1 className="mt-8 text-[20px] font-black tracking-tight text-slate-900">
          認証中
        </h1>
        <p className="mt-2 text-[13px] font-bold text-slate-500 max-w-[240px]">
          {msg}
        </p>

        {msg.includes("失敗") || msg.includes("エラー") ? (
          <button
            onClick={() => router.replace("/signup")}
            className="mt-8 rounded-full bg-slate-100 px-6 py-2.5 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-200"
          >
            ログイン画面へ戻る
          </button>
        ) : null}
      </div>
    </div>
  );
}
