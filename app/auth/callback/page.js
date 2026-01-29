"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp?.get("next") || "/";
  const result = sp?.get("result") || ""; // diagnosis_events.id（未ログイン作成のやつ）

  const [status, setStatus] = useState("ログイン処理中…");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");

        // 1) code → session 交換（これが成功しないと「ログイン失敗」に見える）
        const { data, error: e1 } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (e1) throw e1;

        const session = data?.session;
        if (!session?.access_token) {
          throw new Error("セッションを取得できませんでした");
        }

        // 2) ✅ 結果IDがあれば attach を確実に実行（ここが今回の肝）
        if (result) {
          setStatus("結果を保存しています…");

          const res = await fetch(
            `/api/diagnosis/v2/events/${encodeURIComponent(result)}/attach`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            // ここで止めるかどうかは好みだが、まずは失敗を見える化
            throw new Error(json?.error || "結果の保存に失敗しました");
          }
        }

        // 3) next に戻す（基本は /result/[id]?attach=1 を渡してる想定）
        setStatus("完了。画面を戻します…");
        router.replace(next);
      } catch (e) {
        console.error(e);
        setError(e?.message || String(e));
        setStatus("処理に失敗しました");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-2">
          <div className="text-xl font-semibold">ログイン処理</div>
          <div className="text-sm text-slate-600">{status}</div>
          {error ? (
            <div className="rounded-xl border bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Card>

      {error ? (
        <div className="flex gap-2">
          <Button onClick={() => router.replace("/signup")}>もう一度</Button>
          <Button variant="ghost" onClick={() => router.replace("/")}>
            トップへ
          </Button>
        </div>
      ) : null}
    </div>
  );
}
