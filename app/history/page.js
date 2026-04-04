// app/history/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

// ★ 専用のデュオトーンアイコン
function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeWidth="2.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function HistoryPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
    (async () => {
      setErr("");
      setRows([]);

      if (!session) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = session.access_token;

        const res = await fetch("/api/diagnosis/v2/events/list?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "履歴の取得に失敗しました");
        setRows(json?.data || []);
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

  const isLoggedIn = !!session;

  const content = useMemo(() => {
    if (loadingAuth || loading) {
      return (
        <div className="rounded-[24px] bg-slate-50 p-6 text-center ring-1 ring-inset ring-[var(--ring)]">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          <div className="mt-3 text-sm font-bold text-slate-500">読み込み中…</div>
        </div>
      );
    }

    if (!isLoggedIn) {
      return (
        <div className="rounded-[24px] bg-slate-50 p-6 text-center ring-1 ring-inset ring-[var(--ring)]">
          <div className="text-[16px] font-black tracking-tight text-slate-900">
            ログインが必要です
          </div>
          <div className="mt-2 text-[13px] leading-6 font-bold text-slate-600">
            履歴を見るにはログインしてください。<br/>
            未ログイン時の結果も、結果画面から「保存」を押せば履歴に残せます。
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push("/signup")} className="w-full shadow-md">ログイン / 無料登録へ</Button>
            <Button variant="secondary" onClick={() => router.push("/check")} className="w-full bg-white">
              体質チェックへ
            </Button>
          </div>
        </div>
      );
    }

    if (err) {
      return (
        <div className="rounded-[24px] bg-rose-50 p-6 text-center ring-1 ring-inset ring-rose-200">
          <div className="text-[15px] font-black tracking-tight text-rose-900">
            履歴の取得に失敗しました
          </div>
          <div className="mt-2 text-[13px] leading-6 font-bold text-rose-700 whitespace-pre-wrap">{err}</div>
          <div className="mt-5">
            <Button variant="secondary" onClick={() => window.location.reload()} className="bg-white shadow-sm">再読み込み</Button>
          </div>
        </div>
      );
    }

    if (!rows.length) {
      return (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="text-[15px] font-black tracking-tight text-slate-700">
            まだ履歴がありません
          </div>
          <div className="mt-2 text-[13px] leading-6 font-bold text-slate-500">
            体質チェックを行い、結果画面で「保存」を押すとここに残ります。
          </div>
          <div className="mt-6">
            <Button onClick={() => router.push("/check")} className="shadow-md">体質チェックをはじめる</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {rows.map((r) => {
          const symptom = SYMPTOM_LABELS[r.symptom_focus] || "だるさ・疲労";
          const core = getCoreLabel(r.core_code);
          const subs = getSubLabels(r.sub_labels);
          const mer = getMeridianLine(r.primary_meridian);
          const when = r.created_at ? new Date(r.created_at).toLocaleString("ja-JP") : "—";

          const resultId = r.source_event_id || (r.notes?.source_event_id ?? null);
          const href = resultId ? `/result/${encodeURIComponent(resultId)}?from=history` : null;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => href && router.push(href)}
              disabled={!href}
              className="w-full rounded-[24px] bg-white ring-1 ring-[var(--ring)] p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{when}</div>
                  <div className="mt-1 text-[16px] font-black tracking-tight text-slate-900">{symptom}</div>
                </div>
                <div className="shrink-0 text-slate-300">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] bg-[color-mix(in_srgb,var(--mint),white_60%)] ring-1 ring-[var(--ring)] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">メイン体質</div>
                <div className="mt-1 text-[16px] font-black tracking-tight text-slate-900">{core.title}</div>
                <div className="mt-1 text-[12px] font-bold text-slate-700">{core.short}</div>
              </div>

              {subs?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subs.slice(0, 2).map((s) => (
                    <span
                      key={s.title}
                      className="rounded-full bg-slate-50 ring-1 ring-slate-200/60 px-3 py-1.5 text-[11px] font-extrabold text-slate-600"
                    >
                      {s.short ? `${s.short}` : s.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {mer ? (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  負担が出やすい：{mer.title}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }, [loadingAuth, loading, isLoggedIn, err, rows, router]);

  return (
    <AppShell
      title="履歴"
      noTabs={true}
      headerLeft={
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← ホーム
        </button>
      }
    >
      <Module>
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[color-mix(in_srgb,#eef2ff,white_40%)] text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                <IconHistory />
              </div>
              <div>
                <div className="text-[18px] font-black tracking-tight text-slate-900">チェック履歴</div>
                <div className="mt-1 text-[11px] font-extrabold text-slate-500">保存した結果のみ表示されます</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-2 space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="text-[14px] font-black text-slate-900">一覧</div>
            <Button variant="secondary" size="sm" onClick={() => router.push("/check")} className="bg-white shadow-sm text-[12px]">
              <span className="inline-flex items-center gap-1.5">
                <IconPlus />
                新しくチェック
              </span>
            </Button>
          </div>
          {content}
        </div>
      </Module>
    </AppShell>
  );
}
