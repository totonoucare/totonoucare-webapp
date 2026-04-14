"use client";

import { useEffect, useState } from "react";
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

export default function AuthCallbackClient() {
  const router = useRouter();
  const [msg, setMsg] = useState("ログイン情報を確認しています…");

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

    async function getStableSession({ attempts = 5, delayMs = 200 } = {}) {
      if (!supabase) return null;

      for (let i = 0; i < attempts; i += 1) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) return data.session;
        await new Promise((r) => setTimeout(r, delayMs));
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

        // PKCE callback なら先に code を即交換する
        if (code) {
          setMsg("ログインを確定しています…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data?.session || null;
        }

        // code が無いケースや、反映が少し遅いケースだけ短めに再確認
        if (!session) {
          setMsg("セッションを確認しています…");
          session = await getStableSession({ attempts: 5, delayMs: 200 });
        }

        if (!session) {
          throw new Error("セッションを確立できませんでした");
        }

        // result 引き継ぎがある場合は attach
        if (resultId) {
          setMsg("体質チェック結果を保存しています…");
          await attachResultIfNeeded(resultId, session.access_token);
          clearPendingDiagnosisAttach();
        }

        if (!active) return;
        window.location.replace(nextPath || "/radar");
      } catch (e) {
        console.error("Auth callback failed:", e);
        if (!active) return;

        setMsg(
          e?.message
            ? `ログインに失敗しました: ${e.message}`
            : "ログインの期限が切れているか、失敗しました。"
        );
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] items-center justify-center px-6">
        <div className="w-full rounded-[32px] bg-white p-8 text-center shadow-sm ring-1 ring-[var(--ring)]">
          <div className="mx-auto h-20 w-20 animate-spin rounded-full border-[6px] border-slate-200 border-t-[var(--accent)]" />
          <div className="mt-6 text-[28px] font-black tracking-tight text-slate-900">
            認証中
          </div>
          <div className="mt-3 whitespace-pre-line text-[15px] font-bold leading-7 text-slate-500">
            {msg}
          </div>

          <button
            type="button"
            onClick={() => router.replace("/signup")}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-[14px] font-extrabold text-slate-700"
          >
            ログイン画面へ戻る
          </button>
        </div>
      </div>
    </div>
  );
}
