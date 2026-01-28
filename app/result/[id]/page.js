// app/result/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { supabase } from "@/lib/supabaseClient";
import {
  SYMPTOM_LABELS,
  getCoreLabel,
  getSubLabels,
  getMeridianLine,
} from "@/lib/diagnosis/v2/labels";

export default function ResultByIdPage({ params }) {
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [event, setEvent] = useState(null);
  const [session, setSession] = useState(null);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setError("");

        // 1) event fetch (anonymous)
        const res = await fetch(`/api/diagnosis/v2/events/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "結果の取得に失敗しました");
        if (!alive) return;
        setEvent(json?.data || null);

        // 2) session (optional)
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSession(data?.session || null);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) run();
    return () => {
      alive = false;
    };
  }, [id]);

  const symptomLabel = event?.symptom_focus
    ? SYMPTOM_LABELS[event.symptom_focus] || event.symptom_focus
    : "未設定";

  const coreCode = event?.computed?.core_code || null;
  const core = coreCode ? getCoreLabel(coreCode) : null;

  const subCodes = event?.computed?.sub_labels || [];
  const subs = getSubLabels(subCodes);

  const meridian = getMeridianLine(event?.computed?.primary_meridian);

  async function onAttach() {
    try {
      setAttaching(true);
      const token = session?.access_token;
      if (!token) {
        // 未ログインなら signup へ（戻り先はこの結果）
        window.location.href = `/signup?next=/result/${id}`;
        return;
      }

      const res = await fetch(`/api/diagnosis/v2/events/${id}/attach`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "保存に失敗しました");

      setToast("この結果を保存しました。レーダーへ移動します。");
      setTimeout(() => {
        window.location.href = "/radar";
      }, 700);
    } catch (e) {
      setToast(e?.message || String(e));
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className="space-y-4">
      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}

      <Card className="p-4">
        <div className="text-lg font-semibold">診断結果（無料）</div>
        <div className="mt-1 text-sm text-slate-600">
          まずは登録なしで結果を確認できます。続けたい場合だけ保存（メール）してください。
        </div>

        {loading ? <div className="mt-4 text-slate-600">読み込み中…</div> : null}

        {!loading && error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && event ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-slate-500">主訴</div>
              <div className="mt-1 font-medium">{symptomLabel}</div>
            </div>

            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-slate-500">メインタイプ</div>
              <div className="mt-1 text-base font-semibold">{core?.title || "（判定中）"}</div>
              {core?.short ? <div className="mt-1 text-sm text-slate-600">{core.short}</div> : null}
              {core?.tcm_hint ? <div className="mt-2 text-sm text-slate-600">{core.tcm_hint}</div> : null}
            </div>

            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-slate-500">今の偏り（サブ）</div>
              {subs.length ? (
                <div className="mt-2 space-y-2">
                  {subs.map((s) => (
                    <div key={s.title} className="rounded-lg bg-slate-50 p-2">
                      <div className="font-medium">{s.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{s.action_hint}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">（サブ判定は未設定）</div>
              )}
            </div>

            <div className="rounded-xl border bg-white p-3">
              <div className="text-xs text-slate-500">負荷が出やすいライン</div>
              {meridian ? (
                <>
                  <div className="mt-1 font-medium">{meridian.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{meridian.body_area}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {meridian.meridians?.join(" / ")}
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm text-slate-600">（未設定）</div>
              )}
            </div>

            {/* CTA */}
            <div className="grid gap-3">
              <Card className="p-4">
                <div className="font-semibold">続けるなら：結果を保存（無料）</div>
                <div className="mt-1 text-sm text-slate-600">
                  保存すると、レーダーや記録（履歴）が使えるようになります。
                </div>
                <div className="mt-3">
                  <Button onClick={onAttach} disabled={attaching}>
                    {session?.user ? (attaching ? "保存中…" : "この結果を保存してレーダーへ") : "メールで保存して続ける"}
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <div className="font-semibold">ケアガイド（買い切り）</div>
                <div className="mt-1 text-sm text-slate-600">
                  体質に合わせたケア辞書をまとめて見返す「教科書」。
                </div>
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => (window.location.href = "/guide")}>
                    ガイドを見る（後で購入導線を接続）
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
