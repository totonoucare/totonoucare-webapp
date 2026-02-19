"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16v-4" />
      <path d="M12 8h0" />
      <path d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10z" />
    </svg>
  );
}

export default function CheckLandingPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const isLoggedIn = !!session;

  return (
    <AppShell
      title="体質チェック"
      headerRight={
        <button
          type="button"
          onClick={() => router.push(isLoggedIn ? "/history" : "/signup")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          履歴
        </button>
      }
    >
      <Module>
        <ModuleHeader icon={<IconCheck />} title="体質チェック" sub="2週間の傾向＋簡単な動作テスト" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <div className="rounded-[22px] bg-[color-mix(in_srgb,var(--mint),white_50%)] ring-1 ring-[var(--ring)] p-5">
            <div className="text-sm font-extrabold text-slate-900">このチェックで分かること</div>
            <div className="mt-2 text-sm leading-7 text-slate-700">
              「崩れ方のクセ（体質の軸）」と「整えポイント（最大2つ）」、さらに「張りやすい場所」を整理します。
              その結果を、体調予報（未病レーダー）に接続します。
            </div>
            <div className="mt-4">
              <Button onClick={() => router.push("/check/run")}>チェックを始める</Button>
            </div>
          </div>

          <div className="rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[color-mix(in_srgb,#ede9fe,white_40%)] ring-1 ring-[var(--ring)] text-[#3b2f86]">
                <IconInfo />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900">所要時間</div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  だいたい 2〜3分。痛みが出る動作は無理しなくてOKです。
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] bg-white ring-1 ring-[var(--ring)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="grid h-10 w-10 place-items-center rounded-[16px] bg-[color-mix(in_srgb,#d1fae5,white_40%)] ring-1 ring-[var(--ring)] text-[#115e59]">
                  <IconHistory />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">履歴</div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    保存した結果だけ履歴に残ります（ログイン時に利用可）。
                  </div>
                </div>
              </div>

              {loadingAuth ? null : (
                <div className="shrink-0">
                  <Button variant="ghost" onClick={() => router.push(isLoggedIn ? "/history" : "/signup")}>
                    {isLoggedIn ? "履歴を見る" : "ログインして履歴を使う"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Module>
    </AppShell>
  );
}
