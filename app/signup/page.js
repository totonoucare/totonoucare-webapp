"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const sp = useSearchParams();
  const result = sp?.get("result") || ""; // 診断イベントID（任意）
  const next = sp?.get("next") || "/"; // ログイン後の戻り先（任意）

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const hasResult = useMemo(() => !!result, [result]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      // ✅ ここが重要：result と next を callback に運ぶ
      const redirectTo =
        `${origin}/auth/callback` +
        `?next=${encodeURIComponent(next)}` +
        `&result=${encodeURIComponent(result)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      setSent(true);
      setMsg("メールを送りました。届いたリンクを開いてください ✉️");
    } catch (err) {
      setMsg(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-2">
          <div className="text-xl font-semibold">ログイン / 登録（マジックリンク）</div>
          <div className="text-sm text-slate-600">
            パスワード不要。メールに届くリンクを開くだけでログインできます。
          </div>

          {/* ✅ ここは “結果IDなし” 判定を正しく */}
          {hasResult ? (
            <div className="rounded-xl border bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              この診断結果を保存するためのログインです ✅
            </div>
          ) : (
            <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
              ※ 結果IDなしの通常ログインも可能です
            </div>
          )}
        </div>
      </Card>

      <Card>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm font-semibold">メールアドレス</label>
          <input
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Button type="submit" disabled={busy}>
            {busy ? "送信中…" : sent ? "もう一度送る" : "マジックリンクを送る"}
          </Button>

          {msg ? <div className="text-sm text-slate-700">{msg}</div> : null}

          {sent ? (
            <div className="text-xs text-slate-500">
              ※ メールが見当たらない場合は迷惑メールも確認してください。
            </div>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
