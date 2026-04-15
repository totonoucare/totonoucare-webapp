"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

export default function CheckoutButton({
  returnPath = "/records",
  className = "",
  children = "プレミアムに登録する",
  onStart,
  onComplete,
  onError,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      onStart?.();

      if (!supabase) {
        throw new Error("Supabase client が初期化されていません。");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        throw new Error("ログイン状態を確認できませんでした。もう一度ログインしてください。");
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ returnPath }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Checkout の作成に失敗しました");
      }

      if (!json?.url) {
        throw new Error("Stripe Checkout URL が返ってきませんでした");
      }

      onComplete?.(json);
      window.location.href = json.url;
    } catch (e) {
      const message = e?.message || "プレミアム登録を開始できませんでした";
      setError(message);
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "遷移中…" : children}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
