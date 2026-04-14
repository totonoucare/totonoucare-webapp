// app/signup/SignupClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

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

  const params = useMemo(() => {
    const resultId = sp?.get("result") || "";
    const nextRaw = sp?.get("next") || "";

    const fallbackNext = resultId ? `/result/${resultId}?attach=1` : "/radar";
    const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : fallbackNext;

    return { resultId, nextPath };
  }, [sp]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const autoAttachKeyRef = useRef("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (mounted) setLoadingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session || null);
      setLoadingSession(false);
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

  async function handleGoogleLogin() {
    setStatus({ state: "loading_oauth", message: "Googleã­ã°ã¤ã³ã¸ç§»åãã¦ãã¾ãâ¦" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "ã·ã¹ãã ã¨ã©ã¼ï¼ç°å¢å¤æ°ãåæ ããã¦ãªãå¯è½æ§ãããã¾ãï¼ã",
      });
      return;
    }

    try {
      const redirectTo = buildCallbackUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "Googleã­ã°ã¤ã³ã®éå§ã«å¤±æãã¾ãã: " + (err?.message || "æéãç½®ãã¦ååº¦ãè©¦ããã ããã"),
      });
    }
  }

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "ã­ã°ã¤ã³ãªã³ã¯ãéä¿¡ãã¦ãã¾ãâ¦" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "ã·ã¹ãã ã¨ã©ã¼ï¼ç°å¢å¤æ°ãåæ ããã¦ãªãå¯è½æ§ãããã¾ãï¼ã",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: buildCallbackUrl() },
      });
      if (error) throw error;

      setStatus({
        state: "sent",
        message:
          "ã¡ã¼ã«ãéä¿¡ãã¾ããï¼\nåä¿¡ç®±ï¼è¿·æã¡ã¼ã«ãã©ã«ãå«ãï¼ã®ãªã³ã¯ãéãã¦ã­ã°ã¤ã³ãã¦ãã ããã",
      });
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "éä¿¡ã«å¤±æãã¾ãã: " + (err?.message || "æéãç½®ãã¦ååº¦ãè©¦ããã ããã"),
      });
    }
  }

  async function attachNowIfNeeded() {
    if (!params.resultId) return true;

    try {
      setStatus({ state: "loading", message: "çµæãã¢ã«ã¦ã³ãã«ä¿å­ãã¦ãã¾ãâ¦" });

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("ã­ã°ã¤ã³æå ±ãåå¾ã§ãã¾ããã§ãã");

      const res = await fetch(
        `/api/diagnosis/v2/events/${encodeURIComponent(params.resultId)}/attach`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "ä¿å­ã«å¤±æãã¾ãã");

      setStatus({ state: "idle", message: "" });
      return true;
    } catch (e) {
      console.error(e);
      setStatus({
        state: "error",
        message: "ä¿å­ã«å¤±æãã¾ãã: " + (e?.message || String(e)),
      });
      return false;
    }
  }

  async function goNext() {
    const ok = await attachNowIfNeeded();
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
    goNext();
  }, [loadingSession, session?.user?.id, params.resultId]);

  if (loadingSession) return null;

  return (
    <AppShell
      title="ã­ã°ã¤ã³ / ç»é²"
      noTabs={true}
      headerLeft={
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          â æ»ã
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
              ã­ã°ã¤ã³ / ç»é²
            </div>
            <div className="mt-1 text-[11px] font-extrabold text-slate-500">
              Google ã¾ãã¯ã¡ã¼ã«ã§ã­ã°ã¤ã³
            </div>
          </div>
        </div>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-inset ring-[var(--ring)] text-center">
              <div className="text-[13px] font-bold text-slate-600">ç¾å¨ã­ã°ã¤ã³ä¸­ã®ã¢ã«ã¦ã³ã</div>
              <div className="mt-1.5 text-[16px] font-black text-slate-900">
                {session.user?.email}
              </div>
            </div>

            {params.resultId ? (
              <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-4 ring-1 ring-inset ring-[var(--ring)]">
                <div className="text-[11px] font-extrabold text-slate-600">å¼ãç¶ãäºå®ã®ãã¼ã¿</div>
                <div className="mt-1 font-mono break-all text-[10px] text-slate-500">
                  {params.resultId}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={goNext}
                disabled={status.state === "loading"}
                className="w-full py-3.5 shadow-md"
              >
                {status.state === "loading" ? "å¦çä¸­â¦" : "ãã®ã¾ã¾ã¢ããªã¸é²ã"}
              </Button>
              <Button
                variant="secondary"
                onClick={logout}
                className="w-full bg-white py-3.5 shadow-sm"
              >
                å¥ã®ã¢ã«ã¦ã³ãã«ããï¼ã­ã°ã¢ã¦ãï¼
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
            <div className="mb-6 text-[13px] font-bold leading-6 text-slate-600">
              Google ã¢ã«ã¦ã³ãã§ããå§ããããã¡ã¼ã«ã¢ãã¬ã¹ã«å±ãã­ã°ã¤ã³ãªã³ã¯ã§ãç»é²ã§ãã¾ãã
            </div>

            {params.resultId ? (
              <div className="mb-6 rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-4 ring-1 ring-inset ring-[var(--ring)]">
                <div className="flex items-center gap-2 text-[12px] font-extrabold text-[var(--accent-ink)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  ã­ã°ã¤ã³å¾ãä½è³ªãã§ãã¯ã®çµæãä¿å­ããã¾ã
                </div>
              </div>
            ) : null}

            <button
  type="button"
  onClick={handleGoogleLogin}
  disabled={
    status.state === "loading" ||
    status.state === "loading_oauth" ||
    status.state === "sent"
  }
  className="w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-md transition hover:bg-slate-50 disabled:opacity-60"
>
  <span className="inline-flex items-center justify-center gap-3 text-[16px] font-black text-slate-900">
    <IconGoogle />
    {status.state === "loading_oauth" ? "Googleã¸ç§»åä¸­â¦" : "Googleã§ã­ã°ã¤ã³"}
  </span>
</button>

            <div className="relative py-1">
              <div className="h-px w-full bg-slate-200" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                or
              </div>
            </div>

            <form onSubmit={handleSendLink} className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-extrabold text-slate-500">
                  ã¡ã¼ã«ã¢ãã¬ã¹
                </label>
                <input
                  className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-[var(--accent)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ä¾ï¼mail@example.com"
                  disabled={
                    status.state === "loading" ||
                    status.state === "loading_oauth" ||
                    status.state === "sent"
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
                  status.state === "sent"
                }
                className="w-full py-3.5 shadow-md"
              >
                {status.state === "loading" ? "éä¿¡ä¸­â¦" : "ã­ã°ã¤ã³ãªã³ã¯ãéã"}
              </Button>
            </form>

            {status.message ? (
              <div
                className={`mt-5 rounded-[16px] px-4 py-3 text-[13px] font-bold leading-6 ring-1 ring-inset ${
                  status.state === "sent"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : status.state === "loading_oauth"
                      ? "bg-sky-50 text-sky-800 ring-sky-200"
                      : "bg-rose-50 text-rose-800 ring-rose-200"
                }`}
              >
                {status.state === "sent"
                  ? "ð© "
                  : status.state === "loading_oauth"
                    ? "ð "
                    : "â ï¸ "}
                {status.message}
              </div>
            ) : null}
          </div>
        )}
      </Module>
    </AppShell>
  );
}
