// app/check/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { IconCheck, IconHistory, IconInfo } from "@/components/illust/icons/check";

function MiniBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-black tracking-tight text-[#526070] shadow-[0_8px_16px_-14px_rgba(40,55,48,0.18)] ring-1 ring-inset ring-[var(--ring)]">
      {children}
    </span>
  );
}

function CheckOrbitMark() {
  return (
    <svg viewBox="0 0 160 160" className="absolute -right-5 -top-6 h-40 w-40 opacity-90" aria-hidden="true">
      <circle cx="82" cy="78" r="46" fill="none" stroke="#d7e8dd" strokeWidth="1.8" />
      <circle cx="82" cy="78" r="68" fill="none" stroke="#edf2ee" strokeWidth="1.5" />
      <path d="M38 110 A68 68 0 0 1 72 12" fill="none" stroke="#6bb69a" strokeWidth="3" strokeLinecap="round" opacity="0.62" />
      <path d="M94 13 A68 68 0 0 1 145 80" fill="none" stroke="#dfa42d" strokeWidth="3" strokeLinecap="round" opacity="0.58" />
      <circle cx="122" cy="32" r="5" fill="#dfa42d" opacity="0.48" />
      <circle cx="45" cy="109" r="4" fill="#4ea789" opacity="0.58" />
    </svg>
  );
}

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
        <ModuleHeader
          icon={<IconCheck />}
          title="体質チェック"
          sub="未病のクセをサクッと見える化"
        />

        <div className="space-y-5 px-5 pb-8 pt-4">
          <section className="relative overflow-hidden rounded-[28px] bg-[#fbfcf8] p-5 shadow-[0_18px_38px_-26px_rgba(40,55,48,0.24)] ring-1 ring-[color:var(--ring)]">
            <CheckOrbitMark />

            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white text-[var(--accent-ink)] shadow-[0_12px_24px_-18px_rgba(40,55,48,0.22)] ring-1 ring-[color:var(--ring)]">
                  <IconInfo className="h-7 w-7" />
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">
                    NEW CHECK
                  </div>
                  <h1 className="mt-1 text-[25px] font-black leading-[1.18] tracking-tight text-slate-950">
                    今の状態を
                    <br />
                    チェックする
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-[13px] font-bold leading-7 text-[#536072]">
                約1〜2分で終わる簡単な質問です。回答は途中保存されるので、気軽に進めてOKです。
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <MiniBadge>約1〜2分</MiniBadge>
                <MiniBadge>途中保存</MiniBadge>
                <MiniBadge>無料</MiniBadge>
              </div>

              <div className="mt-6">
                <Button
                  onClick={() => router.push("/check/run")}
                  className="h-14 w-full rounded-[20px] text-[16px] shadow-[0_16px_28px_-16px_rgba(42,99,80,0.52)]"
                >
                  チェックを始める
                </Button>
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[24px] bg-[#f7f8f5] p-5 shadow-[0_14px_30px_-26px_rgba(40,55,48,0.18)] ring-1 ring-[color:var(--ring)]">
            <div className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-[#cad8cf]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-white text-[#5d6b7c] shadow-[0_8px_18px_-16px_rgba(40,55,48,0.18)] ring-1 ring-inset ring-slate-200/80">
                    <IconHistory className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-black tracking-tight text-slate-900">
                      過去の履歴
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                      体質の変化を見返す
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/history")}
                  disabled={loadingAuth || !isLoggedIn}
                  className="shrink-0 bg-white px-5 shadow-[0_8px_18px_-16px_rgba(40,55,48,0.18)]"
                >
                  見る
                </Button>
              </div>

              <p className="mt-4 text-[13px] font-bold leading-7 text-[#536072]">
                保存した過去の診断結果を見返して、体質の変化を確認できます。
              </p>

              {!loadingAuth && !isLoggedIn ? (
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-500 ring-1 ring-inset ring-slate-200">
                    ※ ログイン後に表示されます
                  </span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </Module>
    </AppShell>
  );
}

