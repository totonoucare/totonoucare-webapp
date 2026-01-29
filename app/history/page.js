"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { SYMPTOM_LABELS, getCoreLabel } from "@/lib/diagnosis/v2/labels";

export default function HistoryPage() {
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setMsg("Supabaseが初期化できていません（環境変数未反映）。");
          setLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const s = data.session || null;
        setSession(s);

        if (!s) {
          setLoading(false);
          return;
        }

        const token = s.access_token;
        const res = await fetch(`/api/diagnosis/v2/events/list?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg(json?.error || "履歴の取得に失敗しました。");
          setLoading(false);
          return;
        }

        setRows(Array.isArray(json?.data) ? json.data : []);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setMsg("読み込み中にエラーが発生しました。");
        setLoading(false);
      }
    })();

    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
      });
      return () => sub?.subscription?.unsubscribe?.();
    }
  }, []);

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">履歴</h1>
        <p className="text-sm text-slate-600 mt-1">読み込み中…</p>
      </Card>
    );
  }

  if (!session) {
    return (
      <div className="space-y-3">
        <Card>
          <h1 className="text-lg font-semibold">履歴</h1>
          <p className="text-sm text-slate-600 mt-1">
            履歴はログイン後に利用できます。
          </p>
        </Card>
        <div className="flex gap-2">
          <Button onClick={() => (window.location.href = "/signup")}>ログイン / 登録</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/check")}>
            体質チェックへ
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            トップへ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <h1 className="text-lg font-semibold">履歴</h1>
        <div className="mt-1 text-sm text-slate-600">
          ログイン中：{session.user?.email}
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <Button onClick={() => (window.location.href = "/check")}>新しくチェックする</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/radar")}>
            レーダー
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/guide")}>
            ケアガイド
          </Button>
          <Button variant="secondary" onClick={logout}>
            ログアウト
          </Button>
        </div>
      </Card>

      {msg ? <Card>{msg}</Card> : null}

      {rows.length === 0 ? (
        <Card>
          <h2 className="font-semibold">まだ履歴がありません</h2>
          <p className="text-sm text-slate-600 mt-1">
            体質チェックを行うと、ここに記録が残ります。
          </p>
          <div className="mt-3">
            <Button onClick={() => (window.location.href = "/check")}>体質チェックへ</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const created = r.created_at
              ? new Date(r.created_at).toLocaleString("ja-JP")
              : "—";
            const symptom = r.symptom_focus
              ? SYMPTOM_LABELS[r.symptom_focus] || r.symptom_focus
              : "未設定";
            const coreCode = r?.computed?.core_code;
            const coreTitle = coreCode ? getCoreLabel(coreCode)?.title : "（判定中）";

            return (
              <Card key={r.id}>
                <div className="text-xs text-slate-500">{created}</div>
                <div className="mt-1 font-medium">
                  {symptom} / {coreTitle}
                </div>
                <div className="mt-3">
                  <Button onClick={() => (window.location.href = `/result/${r.id}`)}>
                    結果を見る
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
