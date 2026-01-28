"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <div>
        Q{current} / {total}
      </div>
      <div>{pct}%</div>
    </div>
  );
}

const PENDING_KEY = "pending_diagnosis_v2_answers";

export default function CheckPage() {
  const router = useRouter();
  const questions = useMemo(() => getQuestions(), []);
  const total = useMemo(() => getTotalQuestions(), []);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const q = questions[step];
  const selected = answers[q?.id];
  const canGoNext = Boolean(selected);
  const isLast = step === total - 1;

  // ログイン誘導から戻ってきたとき用：途中回答を復元
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        setAnswers(saved);
        const idx = questions.findIndex((qq) => !saved?.[qq.id]);
        setStep(idx === -1 ? total - 1 : Math.max(0, idx));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(value) {
    setAnswers((prev) => {
      const next = { ...prev, [q.id]: value };
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setError("");
  }

  function next() {
    if (!canGoNext) return;
    setStep((s) => Math.min(s + 1, total - 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setSubmitting(true);
    setError("");

    try {
      // ✅ Supabaseセッションから access_token を取る（ここが肝）
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        // 未ログインなら回答を保持して signup へ（戻り先は /check）
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify(answers));
        } catch {}
        router.push("/signup?redirect=/check");
        return;
      }

      const res = await fetch("/api/diagnosis/v2/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "診断の保存に失敗しました");

      // 保存できたら pending を消す
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}

      // ✅ Aのゴール：診断完了後に /result へ
      router.push("/result");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!q) {
    return <div className="text-slate-700">質問が見つかりません。</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <ProgressBar current={step + 1} total={total} />

        <div className="mt-3 text-lg font-semibold text-slate-900">{q.title}</div>

        {q.description ? (
          <div className="mt-2 text-sm text-slate-600 whitespace-pre-line">
            {q.description}
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {q.options.map((opt) => {
            const isSel = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => pick(opt.value)}
                className={[
                  "w-full rounded-xl border px-4 py-3 text-left transition",
                  isSel
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white hover:border-slate-400",
                ].join(" ")}
              >
                <div className="font-medium">{opt.label}</div>
                {opt.hint ? (
                  <div className={["mt-1 text-xs", isSel ? "text-white/80" : "text-slate-500"].join(" ")}>
                    {opt.hint}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" onClick={back} disabled={step === 0 || submitting}>
            戻る
          </Button>

          {!isLast ? (
            <Button onClick={next} disabled={!canGoNext || submitting}>
              次へ
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canGoNext || submitting}>
              {submitting ? "保存中…" : "診断を確定"}
            </Button>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500">
          ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
        </div>
      </Card>
    </div>
  );
}
