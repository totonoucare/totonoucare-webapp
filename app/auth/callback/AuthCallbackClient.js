"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  clearPendingDiagnosisAttach,
  getPendingDiagnosisAttach,
} from "@/lib/pendingDiagnosisAttach";

function normalizeNextPath(v) {
  if (!v || typeof v !== "string") return "/radar";
  return v.startsWith("/") ? v : "/radar";
}

function decodeMaybe(v) {
  if (!v) return "";
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AuthCallbackClient() {
  const router = useRouter();
  const [msg, setMsg] = useState("ログイン情報を確認しています…");
  const [fatalError, setFatalError] = useState("");
  const finishedRef = useRef(false);

  const fallbackSignupHref = useMemo(() => {
    if (typeof window === "undefined") return "/signup";

    const url = new URL(window.location.href);
    const sp = url.searchParams;
    const pending = getPendingDiagnosisAttach();
    const resultId = sp.get("result") || pending?.resultId || "";
    const nextPath = normalizeNextPath(sp.get("next") || pending?.nextPath || "/radar");

    const signupUrl = new URL(`${window.location.origin}/signup`);
    if (resultId) signupUrl.searchParams.set("result", resultId);
    if (nextPath) signupUrl.searchParams.set("next", nextPath);
    return `${signupUrl.pathname}${signupUrl.search}`;
  }, []);

  useEffect(() => {
    let active = true;

    async function attachResultIfNeeded(resultId, accessToken) {
      if (!resultId) return;

      const res = await fetch(
        `/api/diagnosis/v2/events/${encodeURIComponent(resultId)}/attach`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "診断結果の保存に失敗しました");
      }
    }

    async function getStableSession({ attempts = 20, delayMs = 300 } = {}) {
      if (!supabase) return null;

      for (let i = 0; i < attempts; i += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          return session;
        }

        await sleep(delayMs);
      }

      return null;
    }

    async function run() {
      try {
        if (!supabase) {
          throw new Error("Supabase client が初期化されていません");
        }

        const url = new URL(window.location.href);
        const sp = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

        const pending = getPendingDiagnosisAttach();
        const nextPath = normalizeNextPath(
          sp.get("next") || pending?.nextPath || "/radar"
        );
        const resultId = sp.get("result") || pending?.resultId || "";

        const oauthError =
          sp.get("error_description") ||
          sp.get("error") ||
          hash.get("error_description") ||
          hash.get("error");

        if (oauthError) {
          throw new Error(decodeMaybe(oauthError));
        }

        let session = null;
        const code = sp.get("code");
        let exchangeError = null;

        if (code) {
          setMsg("ログインを確定しています…");

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            exchangeError = error;
            console.warn("exchangeCodeForSession failed, fallback to session polling:", error);
          } else {
            session = data?.session || null;
          }
        }

        if (!session) {
          setMsg("セッションを確認しています…");
          session = await getStableSession({ attempts: 20, delayMs: 300 });
        }

        if (!session) {
          if (exchangeError) {
            throw new Error(exchangeError.message || "セッションを確立できませんでした");
          }
          throw new Error("セッションを確立できませんでした");
        }

        if (resultId) {
          setMsg("体質チェック結果を保存しています…");
          await attachResultIfNeeded(resultId, session.access_token);
          clearPendingDiagnosisAttach();
        }

        if (!active || finishedRef.current) return;
        finishedRef.current = true;
        window.location.replace(nextPath || "/radar");
      } catch (e) {
        console.error("Auth callback failed:", e);
        if (!active || finishedRef.current) return;

        setFatalError(
          e?.message
            ? `ログインに失敗しました: ${e.message}`
            : "ログインの期限が切れているか、失敗しました。"
        );
        setMsg("ログイン画面へ戻って、もう一度お試しください。");
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] items-center justify-center px-6">
        <div className="w-full rounded-[32px] bg-white p-8 text-center shadow-sm ring-1 ring-[var(--ring)]">
          <div className="mx-auto h-20 w-20 animate-spin rounded-full border-[6px] border-slate-200 border-t-[var(--accent)]" />
          <div className="mt-6 text-[28px] font-black tracking-tight text-slate-900">
            認証中
          </div>
          <div className="mt-3 whitespace-pre-line text-[15px] font-bold leading-7 text-slate-500">
            {fatalError || msg}
          </div>

          <button
            type="button"
            onClick={() => router.replace(fallbackSignupHref)}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-[14px] font-extrabold text-slate-700"
          >
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    </div>
  );
}
