// app/check/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { IconCheck, IconHistory, IconInfo } from "@/components/illust/icons/check";
import { getCoreLabel, getSubLabels } from "@/lib/diagnosis/v2/labels";

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
  const [latestResult, setLatestResult] = useState(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session?.access_token) {
        setLatestResult(null);
        setLoadingLatest(false);
        return;
      }
      try {
        setLoadingLatest(true);
        const res = await fetch("/api/diagnosis/v2/events/list?limit=1", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setLatestResult(json?.data?.[0] || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLatestResult(null);
      } finally {
        if (!cancelled) setLoadingLatest(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const isLoggedIn = !!session;
  const latestResultId = latestResult?.source_event_id || latestResult?.notes?.source_event_id || null;
  const latestResultHref = latestResultId ? `/result/${encodeURIComponent(latestResultId)}?from=check` : null;
  const latestCore = latestResult?.core_code ? getCoreLabel(latestResult.core_code) : null;
  const latestSubs = getSubLabels(latestResult?.sub_labels || []);

  return (
    <AppShell title="体質トリセツ">
      <Module className="mb-8">
        <ModuleHeader
          icon={<IconCheck />}
          title="体質トリセツ"
          sub="体質のクセと天気との相性を見える化"
        />

        <div className="space-y-5 px-5 pb-8 pt-4">
          {isLoggedIn && (loadingLatest || latestResult) ? (
            <section className="relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_18px_38px_-26px_rgba(40,55,48,0.22)] ring-1 ring-[color:var(--ring)]">
              {loadingLatest ? (
                <div className="h-24 animate-pulse rounded-[22px] bg-slate-100" />
              ) : (
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">LATEST</div>
                      <div className="mt-2 text-[22px] font-black leading-tight tracking-tight text-slate-950">
                        最新のトリセツ
                      </div>
                      <div className="mt-2 text-[13px] font-bold leading-6 text-[#536072]">
                        {latestCore ? `${latestCore.title}：${latestCore.short}` : "保存済みのトリセツを確認できます。"}
                      </div>
                      {latestSubs.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {latestSubs.slice(0, 3).map((sub) => (
                            <span key={sub.code} className="rounded-lg bg-[#F4F9F6] px-2.5 py-1 text-[11px] font-extrabold text-[#24564C] ring-1 ring-[#D3E1D5]">
                              {sub.short}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => router.push(latestResultHref || "/history")} className="shrink-0 bg-white px-5 shadow-sm">
                      開く
                    </Button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          <section className="relative overflow-hidden rounded-[28px] bg-[#fbfcf8] p-5 shadow-[0_18px_38px_-26px_rgba(40,55,48,0.24)] ring-1 ring-[color:var(--ring)]">
            <CheckOrbitMark />

            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-white text-[var(--accent-ink)] shadow-[0_12px_24px_-18px_rgba(40,55,48,0.22)] ring-1 ring-[color:var(--ring)]">
                  <IconInfo className="h-7 w-7" />
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gold)]">
                    TYPE GUIDE
                  </div>
                  <h1 className="mt-1 text-[25px] font-black leading-[1.18] tracking-tight text-slate-950">
                    体質トリセツを
                    <br />
                    {latestResult ? "更新する" : "作る"}
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-[13px] font-bold leading-7 text-[#536072]">
                {latestResult
                  ? "体調や気になる不調が変わったら、再チェックしてトリセツを更新できます。"
                  : "約1〜2分の質問から、あなたの体質・崩れやすいサイン・天気との相性をまとめた体質トリセツを作ります。"}
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
                  {latestResult ? "体質チェックを更新する" : "無料で体質チェックを始める"}
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
                      過去のトリセツ
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                      体質トリセツを見返す
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
                保存した過去の体質トリセツを見返して、体質の変化や崩れやすいパターンを確認できます。
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

