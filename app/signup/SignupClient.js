// app/signup/SignupClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  clearPendingDiagnosisAttach,
  getPendingDiagnosisAttach,
  setPendingDiagnosisAttach,
} from "@/lib/pendingDiagnosisAttach";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { trackFunnel } from "@/lib/funnelClient";
import { safeLocalPath } from "@/lib/safeReturnPath";

function IconMail() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="none"
      />
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 7l9 6 9-6" strokeWidth="2.5" />
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-.8 2.4-1.8 3.2l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.5 0 4.7-.8 6.3-2.3l-3-2.3c-.8.5-1.9.9-3.3.9-2.5 0-4.7-1.7-5.5-4H3.4v2.4C5 18.9 8.2 21 12 21z"
      />
      <path
        fill="#4A90E2"
        d="M6.5 13.3c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.5H3.4C2.8 8.8 2.5 10.1 2.5 11.6s.3 2.8.9 4.1l3.1-2.4z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.7 2.9 14.5 2 12 2 8.2 2 5 4.1 3.4 7.5l3.1 2.4c.8-2.3 3-4 5.5-4z"
      />
    </svg>
  );
}

export default function SignupClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [fallbackPending, setFallbackPending] = useState(null);

  const params = useMemo(() => {
    const urlResultId = sp?.get("result") || "";
    const urlNextRaw = sp?.get("next") || "";

    const resultId = urlResultId || fallbackPending?.resultId || "";
    const fallbackNext = resultId ? `/result/${resultId}?attach=1` : "/radar";
    const nextPathSource = urlNextRaw || fallbackPending?.nextPath || "";
    const nextPath = safeLocalPath(nextPathSource, fallbackNext);

    return { resultId, nextPath };
  }, [sp, fallbackPending]);

  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const verifyingRef = useRef(false);
  useEffect(() => { trackFunnel("signup_view"); const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const autoAttachKeyRef = useRef("");

  async function getStableAccessToken(currentSession) {
    if (currentSession?.access_token) return currentSession.access_token;

    for (let i = 0; i < 6; i += 1) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) return data.session.access_token;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return "";
  }

  useEffect(() => {
    setFallbackPending(getPendingDiagnosisAttach());
    try {
      const saved = JSON.parse(sessionStorage.getItem("mibyo_email_pending") || "null");
      if (saved?.email && Date.now() - saved.at < 3600000) {
        setEmail(saved.email); setSentEmail(saved.email); setResendAt(saved.at + 60000);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!params.resultId) return;
    setPendingDiagnosisAttach({
      resultId: params.resultId,
      nextPath: params.nextPath,
    });
  }, [params.resultId, params.nextPath]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (mounted) setLoadingSession(false);
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setStatus({ state: "loading", message: "ログインを確定しています…" });
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!mounted) return;
          setSession(data?.session || null);
          cleanupOAuthParams();
          setLoadingSession(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(data.session || null);
        setLoadingSession(false);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setStatus({
          state: "error",
          message: "ログインの確定に失敗しました: " + (err?.message || "時間を置いて再度お試しください。"),
        });
        setLoadingSession(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  function buildCallbackUrl() {
    const origin = window.location.origin;
    const cb = new URL(`${origin}/auth/callback`);
    cb.searchParams.set("next", params.nextPath);
    if (params.resultId) cb.searchParams.set("result", params.resultId);
    return cb.toString();
  }


  function cleanupOAuthParams() {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    [
      "code",
      "error",
      "error_code",
      "error_description",
      "access_token",
      "refresh_token",
      "token_type",
      "expires_at",
      "expires_in",
      "provider_token",
      "provider_refresh_token",
    ].forEach((key) => {
      url.searchParams.delete(key);
    });

    if (url.hash) {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      [
        "error",
        "error_code",
        "error_description",
        "access_token",
        "refresh_token",
        "token_type",
        "expires_at",
        "expires_in",
        "provider_token",
        "provider_refresh_token",
      ].forEach((key) => hash.delete(key));
      const nextHash = hash.toString();
      url.hash = nextHash ? `#${nextHash}` : "";
    }

    window.history.replaceState({}, "", url.toString());
  }

  async function handleGoogleLogin() {
    trackFunnel("signup_google_start");
    setStatus({ state: "loading_oauth", message: "Googleログインへ移動しています…" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "システムエラー（環境変数が反映されてない可能性があります）。",
      });
      return;
    }

    try {
      setPendingDiagnosisAttach({
        resultId: params.resultId,
        nextPath: params.nextPath,
      });

      const redirectTo = buildCallbackUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (err) {
      trackFunnel("auth_error", "google");
      console.error(err);
      setStatus({
        state: "error",
        message: "Googleログインの開始に失敗しました: " + (err?.message || "時間を置いて再度お試しください。"),
      });
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();
    if (Date.now() < resendAt) return;
    trackFunnel("signup_email_start");
    setStatus({ state: "loading", message: "確認コードを送信しています…" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "システムエラー（環境変数が反映されてない可能性があります）。",
      });
      return;
    }

    try {
      setPendingDiagnosisAttach({
        resultId: params.resultId,
        nextPath: params.nextPath,
      });

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });
      if (error) throw error;

      try { sessionStorage.setItem("mibyo_email_pending", JSON.stringify({ email: email.trim(), at: Date.now() })); } catch {}
      setSentEmail(email.trim());
      setOtp("");
      setResendAt(Date.now() + 60000);
      trackFunnel("email_code_sent");
      setStatus({
        state: "sent",
        message:
          "メールの確認コードを、この画面に戻って入力してください。",
      });
    } catch (err) {
      trackFunnel("auth_error", "email");
      setStatus({
        state: "error",
        message: "確認コードを送信できませんでした。メールアドレスを確認し、少し待ってから再試行してください。",
      });
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (verifyingRef.current || !/^\d{6}$/.test(otp)) return;
    verifyingRef.current = true;
    setStatus({ state: "loading", message: "確認しています…" });
    trackFunnel("email_verify_start");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: sentEmail, token: otp, type: "email" });
      if (error || !data?.session) throw error || new Error("session missing");
      try { sessionStorage.removeItem("mibyo_email_pending"); } catch {}
      trackFunnel("auth_success", "email");
      // The session effect owns attachment; avoid a second concurrent save.
      setSession(data.session);
      setStatus({ state: "idle", message: "ログインできました。" });
      if (!params.resultId) window.location.replace(params.nextPath || "/radar");
    } catch {
      trackFunnel("auth_error", "email");
      setStatus({ state: "error", message: "確認コードが正しくないか、有効期限が切れています。コードを確認するか、再送してください。" });
    } finally { verifyingRef.current = false; }
  }

  async function attachNowIfNeeded(currentSession = session) {
    if (!params.resultId) return true;

    try {
      setStatus({ state: "loading", message: "結果をアカウントに保存しています…" });

      const token = await getStableAccessToken(currentSession);
      if (!token) throw new Error("ログイン情報が取得できませんでした");

      const res = await fetch(
        `/api/diagnosis/v2/events/${encodeURIComponent(params.resultId)}/attach`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          cache: "no-store",
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "保存に失敗しました");

      trackFunnel("result_save_success");
      clearPendingDiagnosisAttach();
      setStatus({ state: "idle", message: "" });
      return true;
    } catch (e) {
      trackFunnel("result_save_error");
      console.error(e);
      setStatus({
        state: "error",
        message: "ログインは完了しましたが、体質結果を保存できませんでした。もう一度「このままアプリへ進む」を押してください。",
      });
      return false;
    }
  }

  async function goNext(currentSession = session) {
    const ok = await attachNowIfNeeded(currentSession);
    if (!ok) return;
    window.location.replace(params.nextPath || "/radar");
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  useEffect(() => {
    if (loadingSession) return;
    if (!session?.user?.id) return;
    if (!params.resultId) return;

    const key = `${session.user.id}:${params.resultId}`;
    if (autoAttachKeyRef.current === key) return;

    autoAttachKeyRef.current = key;
    goNext(session);
  }, [loadingSession, session?.user?.id, params.resultId]);

  if (loadingSession) return null;

  return (
    <AppShell
      title="ログイン / 登録"
      noTabs={true}
      headerLeft={
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
    >
      <Module className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
            <IconMail />
          </div>
          <div>
            <div className="text-[18px] font-black tracking-tight text-slate-900">
              ログイン / 登録
            </div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-500">
              Google またはメールでログイン
            </div>
          </div>
        </div>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-inset ring-[var(--ring)] text-center">
              <div className="text-[13px] font-bold text-slate-600">現在ログイン中のアカウント</div>
              <div className="mt-1.5 text-[16px] font-black text-slate-900">
                {session.user?.email}
              </div>
            </div>

            {params.resultId ? (
              <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-4 ring-1 ring-inset ring-[var(--ring)]">
                <div className="text-[12px] font-extrabold text-slate-600">引き継ぎ予定のデータ</div>
                <div className="mt-1 font-mono break-all text-[12px] text-slate-500">
                  {params.resultId}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => goNext()}
                disabled={status.state === "loading"}
                className="w-full py-3.5 shadow-md"
              >
                {status.state === "loading" ? "処理中…" : "このままアプリへ進む"}
              </Button>
              <Button
                variant="secondary"
                onClick={logout}
                className="w-full bg-white py-3.5 shadow-sm"
              >
                別のアカウントにする（ログアウト）
              </Button>
            </div>

            {status.message ? (
              <div className="mt-4 rounded-[16px] bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                {status.message}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-black leading-relaxed text-slate-900">{params.resultId ? "体質結果を保存して、今日・明日の体調予報とセルフケアを見る" : "ログイン / 新規登録"}</h1>
            <p className="text-sm leading-6 text-slate-600">あなたの体質と天気に合わせて、体調警戒度や気をつけたい時間帯、セルフケア方法を確認できます。</p>
            <p className="text-xs leading-5 text-slate-500">新規登録から14日間無料体験。カード登録は不要です。続けるかは体験後に選べます。</p>

            <button
  type="button"
  onClick={handleGoogleLogin}
  disabled={
    status.state === "loading" ||
    status.state === "loading_oauth"
  }
  className="w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-md transition hover:bg-slate-50 disabled:opacity-60"
>
  <span className="inline-flex items-center justify-center gap-3 text-[16px] font-black text-slate-900">
    <IconGoogle />
    {status.state === "loading_oauth" ? "Googleへ移動中…" : "Googleでログイン"}
  </span>
</button>

            <div className="relative py-1">
              <div className="h-px w-full bg-slate-200" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 text-[12px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                or
              </div>
            </div>

            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label className="mb-2 block text-[12px] font-extrabold text-slate-500">
                  メールアドレス
                </label>
                <input
                  className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-[var(--accent)]"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSentEmail(""); setOtp(""); }}
                  required
                  placeholder="例）mail@example.com"
                  disabled={
                    status.state === "loading" ||
                    status.state === "loading_oauth"
                  }
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  status.state === "loading" ||
                  status.state === "loading_oauth" ||
                  clock < resendAt
                }
                className="w-full py-3.5 shadow-md"
              >
                {status.state === "loading" ? "送信中…" : (clock < resendAt ? `${Math.ceil((resendAt-clock)/1000)}秒後に再送できます` : sentEmail ? "確認コードを再送する" : "確認コードを送る")}
              </Button>
            </form>
            {sentEmail ? <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-sm leading-6">メールを確認し、この画面に戻って6桁のコードを入力してください。</p>
              <label htmlFor="email-otp" className="block text-sm font-bold">確認コード</label>
              <input id="email-otp" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="w-full rounded-xl border p-4 text-xl tracking-widest" />
              <Button type="submit" disabled={status.state === "loading" || status.state === "loading_oauth" || otp.length !== 6} className="w-full">確認して進む</Button>
            </form> : null}
            {params.resultId ? <a href={`/result/${encodeURIComponent(params.resultId)}`} className="block text-center text-sm underline">結果に戻る</a> : null}

            {status.message ? (
              <div
                className={`mt-5 rounded-[16px] px-4 py-3 text-[14px] font-bold leading-6 ring-1 ring-inset ${
                  status.state === "sent"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : status.state === "loading_oauth"
                      ? "bg-sky-50 text-sky-800 ring-sky-200"
                      : "bg-rose-50 text-rose-800 ring-rose-200"
                }`}
              >
                {status.state === "sent"
                  ? "📩 "
                  : status.state === "loading_oauth"
                    ? "🔐 "
                    : "⚠️ "}
                {status.message}
              </div>
            ) : null}
          </div>
        )}
      </Module>
    </AppShell>
  );
}
