// app/history/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { SYMPTOM_LABELS, getCoreLabel, getSubLabels, getMeridianLine } from "@/lib/diagnosis/v2/labels";

function IconHistory() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
          <div className="text-sm font-bold text-slate-700">読み込み中…</div>
        </div>
      );
    }

    if (!isLoggedIn) {
      return (
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
          <div className="text-base font-extrabold tracking-tight text-slate-900">
            履歴を見るにはログインが必要です
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            未ログインの結果は、結果画面から「保存して登録する」で履歴に残せます。
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push("/signup")}>ログイン / 登録へ</Button>
            <Button variant="secondary" onClick={() => router.push("/check")}>
              体質チェックへ
            </Button>
          </div>
        </div>
      );
    }

    if (err) {
      return (
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
          <div className="text-base font-extrabold tracking-tight text-slate-900">
            履歴の取得に失敗しました
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600 whitespace-pre-wrap">{err}</div>
          <div className="mt-4">
            <Button onClick={() => router.refresh()}>再読み込み</Button>
          </div>
        </div>
      );
    }

    if (!rows.length) {
      return (
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
          <div className="text-base font-extrabold tracking-tight text-slate-900">
            まだ履歴がありません
          </div>
          <div className="mt-2 text-sm leading-7 text-slate-600">
            体質チェックを行い、結果画面で「保存」を押すとここに残ります。
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push("/check")}>体質チェックへ</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {rows.map((r) => {
          const symptom = SYMPTOM_LABELS[r.symptom_focus] || "だるさ・疲労";
          const core = getCoreLabel(r.core_code);
          const subs = getSubLabels(r.sub_labels);
          const mer = getMeridianLine(r.primary_meridian);
          const when = r.created_at ? new Date(r.created_at).toLocaleString("ja-JP") : "—";

          const resultId = r.source_event_id || (r.notes?.source_event_id ?? null);

          // ✅ 履歴→結果：from=history を付ける
          const href = resultId ? `/result/${encodeURIComponent(resultId)}?from=history` : null;

          return (
            <div key={r.id} className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500">{when}</div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">{symptom}</div>
                </div>
                {href ? (
                  <Button variant="ghost" onClick={() => router.push(href)}>
                    詳細
                  </Button>
                ) : (
                  <span className="text-xs text-slate-400">詳細なし</span>
                )}
              </div>

              <div className="mt-4 rounded-[18px] bg-[color-mix(in_srgb,var(--mint),white_55%)] ring-1 ring-[var(--ring)] p-4">
                <div className="text-xs font-bold text-[var(--accent-ink)]/80">メイン</div>
                <div className="mt-1 text-base font-extrabold tracking-tight text-slate-900">{core.title}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">{core.short}</div>
              </div>

              {subs?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {subs.slice(0, 2).map((s) => (
                    <span
                      key={s.title}
                      className="rounded-full bg-white ring-1 ring-[var(--ring)] px-3 py-1 text-[11px] font-extrabold text-slate-700"
                      title={s.action_hint}
                    >
                      {s.short ? `${s.short}` : s.title}
                    </span>
                  ))}
                </div>
              ) : null}

              {mer ? (
                <div className="mt-3 text-[11px] font-bold text-slate-500">
                  張りやすい場所：{mer.title}
                </div>
              ) : null}
            </div>
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
          onClick={() => router.push("/check")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
      headerRight={
        <button
          type="button"
          onClick={() => router.push("/check")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          <IconPlus />
          新規
        </button>
      }
    >
      <Module>
        <ModuleHeader icon={<IconHistory />} title="チェック履歴" sub="保存した結果だけ表示されます" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold text-slate-900">一覧</div>
            <Button variant="secondary" onClick={() => router.push("/check")}>
              <span className="inline-flex items-center gap-2">
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
