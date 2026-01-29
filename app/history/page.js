"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

export default function HistoryPage() {
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // auth state
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingAuth(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s || null);
      setLoadingAuth(false);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // fetch history
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
        <Card>
          <div className="text-sm text-slate-600">読み込み中…</div>
        </Card>
      );
    }

    if (!isLoggedIn) {
      return (
        <Card>
          <div className="space-y-3">
            <div className="text-lg font-semibold">履歴を見るにはログインが必要です</div>
            <div className="text-sm text-slate-600">
              未ログインの結果は、結果画面から「保存して登録する」を押すと履歴に残せます。
            </div>
            <Button onClick={() => router.push("/signup")}>ログイン / 登録へ</Button>
          </div>
        </Card>
      );
    }

    if (err) {
      return (
        <Card>
          <div className="space-y-3">
            <div className="text-lg font-semibold">履歴の取得に失敗しました</div>
            <div className="text-sm text-slate-600">{err}</div>
            <Button onClick={() => router.refresh()}>再読み込み</Button>
          </div>
        </Card>
      );
    }

    if (!rows.length) {
      return (
        <Card>
          <div className="space-y-3">
            <div className="text-lg font-semibold">まだ履歴がありません</div>
            <div className="text-sm text-slate-600">
              体質チェックを行い、結果画面で「保存」を押すとここに残ります。
            </div>
            <Button onClick={() => router.push("/check")}>体質チェックへ</Button>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {rows.map((r) => {
          const symptom = SYMPTOM_LABELS[r.symptom_focus] || "だるさ・疲労";
          const core = getCoreLabel(r.core_code);
          const subs = getSubLabels(r.sub_labels);
          const mer = getMeridianLine(r.primary_meridian);
          const when = r.created_at
            ? new Date(r.created_at).toLocaleString("ja-JP")
            : "—";

          // ✅ ここが超重要：resultに戻すリンク
          // - constitution_events.notes.source_event_id (= diagnosis_events.id) があればそれで /result/[id]
          // - 無ければフォールバックで constitution_events.id を使う（将来互換）
          const resultId = r.source_event_id || (r.notes?.source_event_id ?? null);
          const href = resultId ? `/result/${encodeURIComponent(resultId)}` : null;

          return (
            <Card key={r.id}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">{when}</div>
                    <div className="mt-1 text-sm font-semibold">{symptom}</div>
                  </div>
                  {href ? (
                    <Button variant="ghost" onClick={() => router.push(href)}>
                      詳細
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">詳細なし</span>
                  )}
                </div>

                <div className="rounded-xl border bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">メイン</div>
                  <div className="text-sm font-semibold">{core.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{core.short}</div>
                </div>

                {subs?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {subs.map((s) => (
                      <span
                        key={s.title}
                        className="rounded-full border bg-white px-3 py-1 text-xs"
                        title={s.action_hint}
                      >
                        {s.title}
                      </span>
                    ))}
                  </div>
                ) : null}

                {mer ? (
                  <div className="text-xs text-slate-600">
                    経絡ライン：{mer.title}
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }, [loadingAuth, loading, isLoggedIn, err, rows, router]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">チェック履歴</h1>
        <Button variant="ghost" onClick={() => router.push("/check")}>
          新しくチェック
        </Button>
      </div>

      {content}
    </div>
  );
}
