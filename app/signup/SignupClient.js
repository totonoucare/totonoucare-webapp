"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);

      const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
        setSession(s || null);
      });

      return () => sub?.subscription?.unsubscribe?.();
    })();
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "送信中…" });

    if (!supabase) {
      setStatus({
        state: "error",
        message: "Supabaseが初期化できていません（環境変数が反映されてない可能性）。",
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
        message:
          "マジックリンクを送信しました。受信メールのリンクを開いてログインしてください（迷惑メールも確認）。",
      });
    } catch (err) {
      console.error(err);
      setStatus({
        state: "error",
        message: "送信に失敗しました: " + (err?.message || JSON.stringify(err)),
      });
    }
  }

  async function attachNowIfNeeded() {
    if (!params.resultId) return true;

    try {
      setStatus({ state: "loading", message: "結果を保存中…" });

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

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-lg font-semibold">ログイン / 登録（マジックリンク）</h1>
        <p className="mt-1 text-sm text-slate-600">
          パスワード不要。メールに届くリンクを開くだけでログインできます。
        </p>
      </Card>

      {session ? (
        <Card>
          <div className="text-sm text-slate-600">すでにログイン中</div>
          <div className="mt-1 font-medium">{session.user?.email}</div>

          {params.resultId ? (
            <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-xs text-slate-600">
              引き継ぐ結果ID：<span className="font-mono break-all">{params.resultId}</span>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button onClick={goNext} disabled={status.state === "loading"}>
              {status.state === "loading" ? "処理中…" : "続きへ"}
            </Button>
            <Button variant="secondary" onClick={logout}>
              ログアウト
            </Button>
          </div>

          {status.message ? (
            <div className="mt-3 text-sm text-slate-600">{status.message}</div>
          ) : null}
        </Card>
      ) : (
        <Card>
          {params.resultId ? (
            <div className="text-sm">
              <div className="text-slate-600">引き継ぐ結果ID</div>
              <div className="mt-1 font-mono text-xs break-all">{params.resultId}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">※ 結果IDなしの通常ログインも可能です</div>
          )}

          <form onSubmit={handleSendLink} className="mt-4 space-y-3">
            <div>
              <div className="text-sm text-slate-600">メールアドレス</div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status.state === "loading" || status.state === "sent"}
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <Button type="submit" disabled={status.state === "loading" || status.state === "sent"}>
              マジックリンクを送る
            </Button>

            {status.message ? (
              <div className="text-sm text-slate-600">{status.message}</div>
            ) : null}
          </form>

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => (window.location.href = "/")}>
              トップへ
            </Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/check")}>
              体質チェックへ
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
