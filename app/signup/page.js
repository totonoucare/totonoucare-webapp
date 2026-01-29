"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const params = useMemo(() => {
    if (typeof window === "undefined") return { resultId: "", nextPath: "" };
    const url = new URL(window.location.href);
    return {
      resultId: url.searchParams.get("result") || "",
      nextPath: url.searchParams.get("next") || "",
    };
  }, []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
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

      // callback へ result/next を引き継ぐ
      const cb = new URL(`${origin}/auth/callback`);
      if (params.resultId) cb.searchParams.set("result", params.resultId);
      if (params.nextPath) cb.searchParams.set("next", params.nextPath);

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

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => (window.location.href = params.nextPath || "/radar")}
            >
              続きを開く
            </Button>
            <Button variant="secondary" onClick={logout}>
              ログアウト
            </Button>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            ※ ログイン済みならこの画面は閉じてOKです。
          </div>
        </Card>
      ) : (
        <Card>
          {params.resultId ? (
            <div className="text-sm">
              <div className="text-slate-600">引き継ぐ結果ID</div>
              <div className="mt-1 font-mono text-xs break-all">{params.resultId}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              ※ 結果IDなしの通常ログインも可能です
            </div>
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
