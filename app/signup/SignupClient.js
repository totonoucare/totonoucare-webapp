// app/signup/SignupClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 7l9 6 9-6" strokeWidth="2.5" />
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

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingSession(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
        setSession(s || null);
      });

      return () => sub?.subscription?.unsubscribe?.();
    })();
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "ログインリンクを送信しています…" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "システムエラー（環境変数が反映されてない可能性があります）。",
      });
      return;
    }

    try {
      const origin = window.location.origin;
      const cb = new URL(`${origin}/auth/callback`);
      cb.searchParams.set("next", params.nextPath);
      if (params.resultId) cb.searchParams.set("result", params.resultId);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: cb.toString() },
      });
      if (error) throw error;

      setStatus({
        state: "sent",
        message: "メールを送信しました！\n受信箱（迷惑メールフォルダ含む）のリンクを開いてログインしてください。",
      });
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "送信に失敗しました: " + (err?.message || "時間を置いて再度お試しください。"),
      });
    }
  }

  async function attachNowIfNeeded() {
    if (!params.resultId) return true;

    try {
      setStatus({ state: "loading", message: "結果をアカウントに保存しています…" });

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("ログイン情報が取得できませんでした");

      const res = await fetch(
        `/api/diagnosis/v2/events/${encodeURIComponent(params.resultId)}/attach`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "保存に失敗しました");

      setStatus({ state: "idle", message: "" });
      return true;
    } catch (e) {
      console.error(e);
      setStatus({
        state: "error",
        message: "保存に失敗しました: " + (e?.message || String(e)),
      });
      return false;
    }
  }

  async function goNext() {
    const ok = await attachNowIfNeeded();
    if (!ok) return;
    router.push(params.nextPath || "/radar");
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loadingSession) return null;

  return (
    <AppShell
      title="ログイン / 登録"
      noTabs={true}
      headerLeft={
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
    >
      <Module className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_40%)] text-[var(--accent-ink)] ring-1 ring-[var(--ring)] shadow-sm">
            <IconMail />
          </div>
          <div>
            <div className="text-[18px] font-black tracking-tight text-slate-900">
              ログイン / 登録
            </div>
            <div className="mt-1 text-[11px] font-extrabold text-slate-500">
              パスワード不要のマジックリンク
            </div>
          </div>
        </div>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-inset ring-[var(--ring)] text-center">
              <div className="text-[13px] font-bold text-slate-600">現在ログイン中のアカウント</div>
              <div className="mt-1.5 text-[16px] font-black text-slate-900">{session.user?.email}</div>
            </div>

            {params.resultId ? (
              <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-4 ring-1 ring-inset ring-[var(--ring)]">
                <div className="text-[11px] font-extrabold text-slate-600">引き継ぎ予定のデータ</div>
                <div className="mt-1 font-mono text-[10px] break-all text-slate-500">{params.resultId}</div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <Button onClick={goNext} disabled={status.state === "loading"} className="w-full shadow-md py-3.5">
                {status.state === "loading" ? "処理中…" : "このままアプリへ進む"}
              </Button>
              <Button variant="secondary" onClick={logout} className="w-full bg-white shadow-sm py-3.5">
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
            <div className="text-[13px] font-bold leading-6 text-slate-600 mb-6">
              メールアドレスを入力すると、専用のログインリンクが送られます。登録もログインも同じ手順です。
            </div>

            {params.resultId ? (
              <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_70%)] p-4 ring-1 ring-inset ring-[var(--ring)] mb-6">
                <div className="flex items-center gap-2 text-[12px] font-extrabold text-[var(--accent-ink)]">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  ログイン後、体質チェックの結果が保存されます
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSendLink} className="space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 mb-2">
                  メールアドレス
                </label>
                <input
                  className="w-full rounded-[16px] bg-slate-50 px-4 py-3.5 text-[15px] font-bold text-slate-900 outline-none ring-1 ring-inset ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-[var(--accent)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="例）mail@example.com"
                  disabled={status.state === "loading" || status.state === "sent"}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              <Button 
                type="submit" 
                disabled={status.state === "loading" || status.state === "sent"}
                className="w-full shadow-md py-3.5"
              >
                {status.state === "loading" ? "送信中…" : "ログインリンクを送る"}
              </Button>
            </form>

            {status.message ? (
              <div className={`mt-5 rounded-[16px] px-4 py-3 text-[13px] font-bold leading-6 ring-1 ring-inset ${
                status.state === "sent" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
              }`}>
                {status.state === "sent" ? "📩 " : "⚠️ "}{status.message}
              </div>
            ) : null}
          </div>
        )}
      </Module>
    </AppShell>
  );
}
