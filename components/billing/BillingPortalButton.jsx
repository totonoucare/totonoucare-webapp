"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";

export default function BillingPortalButton({
  returnPath = "/settings",
  className = "",
  children = "契約・支払いを管理する",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("ログイン状態を確認できませんでした。");

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ returnPath }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "契約管理画面を開けませんでした");
      if (!json?.url) throw new Error("契約管理画面のURLが返ってきませんでした");
      window.location.href = json.url;
    } catch (portalError) {
      setError(portalError?.message || "契約管理画面を開けませんでした");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "確認中…" : children}
      </Button>
      {error ? <p className="mt-2 text-[12px] font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
