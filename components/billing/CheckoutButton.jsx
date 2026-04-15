"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  async function getAccessToken() {
    if (!supabase) {
      throw new Error("Supabase client が初期化されていません。環境変数を確認してください。");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return session.access_token;
    }

    return "";
  }

  async function createCheckoutSession(accessToken) {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ returnPath }),
    });

    const json = await res.json().catch(() => ({}));

    return { res, json };
  }

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      onStart?.();

      if (!supabase) {
        throw new Error("システム設定が未完了です。時間をおいて再度お試しください。");
      }

      let token = await getAccessToken();

      if (!token) {
        throw new Error("ログイン状態を確認できませんでした。もう一度ログインしてください。");
      }

      let { res, json } = await createCheckoutSession(token);

      // 401 の場合は、期限切れトークンの可能性が高いので1回だけ refresh を試す
      if (res.status === 401) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (!refreshError) {
          const refreshedToken = refreshData?.session?.access_token;

          if (refreshedToken) {
            token = refreshedToken;
            ({ res, json } = await createCheckoutSession(token));
          }
        }
      }

      if (res.status === 401) {
        throw new Error("ログイン期限が切れています。再ログイン後にもう一度お試しください。");
      }

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
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        aria-busy={loading}
      >
        {loading ? "遷移中…" : children}
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
