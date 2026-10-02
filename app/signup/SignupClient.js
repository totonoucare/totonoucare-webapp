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
import { trackFunnel, trackSignupEntry } from "@/lib/funnelClient";
import { safeLocalPath } from "@/lib/safeReturnPath";

function IconSavedResult() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z" />
      <path d="m9 9 2 2 4-4" />
    </svg>
  );
}

function AssuranceBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#DCEBE3] bg-white px-2.5 py-1.5 text-[11px] font-bold leading-4 text-[#365F50] shadow-[0_2px_5px_rgba(36,86,76,0.03)]">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[#349B83]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3.5 8 3 3 6-6" />
      </svg>
      {children}
    </span>
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
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const verifyingRef = useRef(false);
  const signupEntryTracked = useRef(false);
  useEffect(() => {
    if (!signupEntryTracked.current) {
      signupEntryTracked.current = true;
      trackSignupEntry();
    }
    const onPageShow = (event) => { if (event.persisted) trackSignupEntry(); };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  useEffect(() => { const t = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(t); }, []);
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
        setEmailFormOpen(true);
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
          onClick={() => { trackFunnel("signup_header_back_click"); router.back(); }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
    >
      <Module className="p-6">
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
            <div className="relative -mx-6 -mt-6 overflow-hidden border-b border-[#E5EEE8] bg-gradient-to-br from-[#EFF8F2] via-[#F8FBF8] to-[#FFF9EF] px-6 pb-5 pt-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full border-[18px] border-white/50" />
              <div className="relative space-y-3 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-[17px] border border-white bg-white/90 text-[var(--accent-ink)] shadow-[0_5px_15px_rgba(36,86,76,0.09)]">
                  <IconSavedResult />
                </div>
                <h1 className="text-[22px] font-black leading-snug tracking-tight text-slate-900 sm:text-2xl">
                  {params.resultId ? (
                    <>
                      無料登録で体質を保存
                      <br />
                      あなたの予報へ
                    </>
                  ) : (
                    <>
                      無料登録で
                      <br />
                      あなたの体調予報へ
                    </>
                  )}
                </h1>
                <p className="mx-auto max-w-[31rem] text-center text-[14px] font-medium leading-7 text-slate-600">
                  {params.resultId
                    ? "無料登録すると今回の体質結果が保存され、今日・明日の体調予報とセルフケアを見られます。"
                    : "無料登録すると、あなた向けの今日・明日の体調予報とセルフケアを見られます。"}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1" aria-label="登録について">
                  <AssuranceBadge>支払い情報不要</AssuranceBadge>
                  <AssuranceBadge>自動課金なし</AssuranceBadge>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              aria-label={status.state === "loading_oauth" ? "Googleへ移動中" : "Googleアカウントで続ける"}
              disabled={status.state === "loading" || status.state === "loading_oauth"}
              className="w-full rounded-[18px] border border-[#CBDDD4] bg-white px-5 py-4 shadow-[0_4px_12px_rgba(36,86,76,0.07)] transition hover:border-[var(--accent)] hover:bg-[#F8FBF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
            >
              <span className="inline-flex items-center justify-center gap-3 text-[16px] font-black text-slate-900">
                <IconGoogle />
                {status.state === "loading_oauth" ? "Googleへ移動中…" : "Googleで無料登録"}
              </span>
            </button>

            <div className="flex items-center gap-3 py-1 text-[11px] font-medium text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>または</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => setEmailFormOpen((open) => !open)}
              aria-expanded={emailFormOpen || Boolean(sentEmail)}
              aria-controls="signup-email-form"
              className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50/70 px-3 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              メールアドレスで無料登録
            </button>
            <p className="text-center text-[12px] font-medium leading-6 text-slate-500">
              14日間は全機能を無料で利用できます。体験終了後も自動で料金は発生しません。
            </p>

            {emailFormOpen || sentEmail ? (
              <div id="signup-email-form" className="space-y-4">
                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label htmlFor="signup-email" className="mb-2 block text-sm font-bold text-slate-700">
                      メールアドレス
                    </label>
                    <input
                      className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-[var(--accent)] placeholder:font-medium placeholder:text-slate-500"
                      id="signup-email"
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
              </div>
            ) : null}
            {params.resultId ? <a href={`/result/${encodeURIComponent(params.resultId)}`} onClick={() => trackFunnel("signup_result_return_click")} className="block text-center text-sm underline">結果に戻る</a> : null}

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
