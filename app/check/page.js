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
    <AppShell title="体質チェック" noTabs={true}>
      <Module>
        <ModuleHeader icon={<IconCheck />} title="体質チェック" sub="未病のクセをサクッと見える化" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_55%)] ring-1 ring-[var(--ring)] text-[var(--accent-ink)]">
                <IconInfo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900">まずは今の状態をチェック</div>
                <div className="mt-1 text-sm leading-7 text-slate-700">
                  回答は途中保存されます。気軽に進めてOKです。
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={() => router.push("/check/run")}>チェックを始める</Button>
            </div>
          </div>

          <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[color-mix(in_srgb,#eef2ff,white_55%)] ring-1 ring-[var(--ring)] text-slate-700">
                  <IconHistory className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">履歴</div>
                  <div className="mt-1 text-sm leading-7 text-slate-700">
                    保存した結果をあとから見返せます。
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={() => router.push("/history")}
                disabled={loadingAuth || !isLoggedIn}
              >
                見る
              </Button>
            </div>

            {!loadingAuth && !isLoggedIn ? (
              <div className="mt-3 text-[11px] font-bold text-slate-500">
                ※ 履歴はログイン後に表示されます（結果画面から保存できます）
              </div>
            ) : null}
          </div>
        </div>
      </Module>
    </AppShell>
  );
}
