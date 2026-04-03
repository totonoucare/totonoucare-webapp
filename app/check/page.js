// app/check/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { IconCheck, IconHistory, IconInfo } from "@/components/illust/icons/check";

export default function CheckLandingPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let unsub = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
      setLoadingAuth(false);
    });

    unsub = sub?.subscription;

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, []);

  const isLoggedIn = !!session;

  return (
    <AppShell title="体質チェック">
      <Module className="mb-8">
        <ModuleHeader icon={<IconCheck />} title="体質チェック" sub="未病のクセをサクッと見える化" />
        
        <div className="px-5 pb-8 pt-4 space-y-5">
          
          {/* 1. プレミアム・メインカード（チェック開始） */}
          <div className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-[var(--ring)] shadow-[0_16px_32px_-12px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)]">
            {/* 上部の美しいグラデーション帯 */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[color-mix(in_srgb,var(--mint),white_40%)] to-white opacity-90" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white shadow-sm ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
                  <IconInfo className="h-7 w-7" />
                </div>
                <div className="min-w-0 pt-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/60">
                    New Check
                  </div>
                  <div className="mt-1 text-[22px] font-black tracking-tight text-slate-900 leading-tight">
                    今の状態を<br />チェックする
                  </div>
                </div>
              </div>

              <div className="mt-5 text-[13px] font-bold leading-6 text-slate-600">
                約1〜2分で終わる簡単な質問です。<br />回答は途中保存されるので、気軽に進めてOKです。
              </div>

              <div className="mt-6">
                <Button 
                  onClick={() => router.push("/check/run")}
                  className="w-full shadow-md py-3.5 text-[15px]"
                >
                  チェックを始める
                </Button>
              </div>
            </div>
          </div>

          {/* 2. 履歴カード (SoftPanel風デザイン) */}
          <div className="relative overflow-hidden rounded-[24px] bg-[color-mix(in_srgb,#eef2ff,white_50%)] ring-1 ring-[var(--ring)] shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#6366f1]" />
            <div className="p-5 pl-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white shadow-sm ring-1 ring-indigo-100 text-indigo-600">
                    <IconHistory className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold text-indigo-900">
                      過去の履歴
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/history")}
                  disabled={loadingAuth || !isLoggedIn}
                  className="shrink-0 bg-white"
                >
                  見る
                </Button>
              </div>

              <div className="mt-3 text-[13px] font-bold leading-6 text-indigo-800/70">
                保存した過去の診断結果を見返して、体質の変化を確認できます。
              </div>

              {!loadingAuth && !isLoggedIn ? (
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1.5 text-[11px] font-extrabold text-indigo-500 ring-1 ring-inset ring-indigo-100/50">
                    ※ ログイン後に表示されます
                  </span>
                </div>
              ) : null}
            </div>
          </div>

        </div>
      </Module>
    </AppShell>
  );
}
