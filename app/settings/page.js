"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

function Row({ label, value, action }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div>
        <div className="text-[13px] font-black text-slate-900">{label}</div>
        <div className="mt-1 text-[12px] font-bold leading-5 text-slate-500">{value || "—"}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [premium, setPremium] = useState(null);
  const [karteCount, setKarteCount] = useState(null);
  const [error, setError] = useState("");

  async function authedFetch(path) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("ログインが必要です。");

    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(data?.user || null);

        if (!data?.user) return;

        const [premiumRes, unlocksRes] = await Promise.allSettled([
          authedFetch("/api/premium/status"),
          supabase
            .from("personal_karte_unlocks")
            .select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id)
            .in("status", ["active", "paid"]),
        ]);

        if (cancelled) return;
        if (premiumRes.status === "fulfilled") setPremium(premiumRes.value);
        if (unlocksRes.status === "fulfilled") setKarteCount(unlocksRes.value?.count ?? 0);
      } catch (e) {
        if (!cancelled) setError(e?.message || "設定情報を読み込めませんでした。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const premiumActive = premium?.isPremium || premium?.active || premium?.isActive || premium?.status === "active";

  return (
    <AppShell title="設定" subtitle="アカウントと購入状態">
      <Module className="p-6 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <div className="text-[22px] font-black tracking-tight text-slate-900">設定</div>
        <div className="mt-2 text-[13px] font-bold leading-6 text-slate-600">
          アカウント状態、地域設定、購入済みコンテンツを確認できます。
        </div>
      </Module>

      {error ? (
        <Module className="p-5 bg-[#fff7ed] ring-1 ring-orange-100">
          <div className="text-[13px] font-black leading-6 text-orange-800">{error}</div>
        </Module>
      ) : null}

      <Module className="overflow-hidden bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        <Row label="ログイン状態" value={loading ? "確認中…" : user ? "ログイン中" : "未ログイン"} />
        <Row label="メールアドレス" value={user?.email || "未ログイン"} />
        <Row
          label="未病レーダー Premium"
          value={loading ? "確認中…" : premiumActive ? "有効" : "未加入または無効"}
          action={<Button size="sm" variant="secondary" onClick={() => router.push("/records?tab=report")}>確認</Button>}
        />
        <Row
          label="購入済みカルテ"
          value={loading ? "確認中…" : `${karteCount ?? 0}件`}
          action={<Button size="sm" variant="secondary" onClick={() => router.push("/history")}>履歴へ</Button>}
        />
        <Row
          label="体調予報の地域"
          value="地域は体調予報ページで変更できます"
          action={<Button size="sm" variant="secondary" onClick={() => router.push("/radar")}>変更</Button>}
        />
      </Module>

      <Module className="p-5 bg-white ring-1 ring-[#D3E1D5] shadow-sm">
        {user ? (
          <Button variant="secondary" className="w-full bg-white" onClick={handleLogout}>ログアウト</Button>
        ) : (
          <Button className="w-full" onClick={() => router.push("/signup")}>ログインする</Button>
        )}
      </Module>
    </AppShell>
  );
}
