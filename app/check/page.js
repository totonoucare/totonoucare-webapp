// app/check/page.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
        <div>
          Q{current} / {total}
        </div>
        <div>{pct}%</div>
      </div>
      <div className="h-2 w-full rounded bg-slate-200">
        <div className="h-2 rounded bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CheckPage() {
  const router = useRouter();
  const questions = useMemo(() => getQuestions(), []);
  const total = useMemo(() => getTotalQuestions(), []);

  const [step, setStep] = useState(0); // 0..total-1
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const q = questions[step];

  const selected = answers[q?.id];

  const canGoNext = Boolean(selected);
  const isLast = step === total - 1;

  function pick(value) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
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
      const res = await fetch("/api/diagnosis/v2/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Supabase cookie/session を送る
        credentials: "include",
        body: JSON.stringify({ answers }),
      });

      if (res.status === 401) {
        router.push("/signup");
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "診断の保存に失敗しました");

      // 診断完了 → レーダーへ
      router.push("/radar");
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!q) {
    return (
      <Card>
        <div className="text-sm text-slate-700">質問が見つかりません。</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ProgressBar current={step + 1} total={total} />

      <Card>
        <div className="space-y-3">
          <div>
            <div className="text-lg font-semibold">{q.title}</div>
            {q.description ? (
              <div className="mt-1 text-sm text-slate-600 whitespace-pre-line">
                {q.description}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {q.options.map((opt) => {
              const isSel = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
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
                    <div
                      className={[
                        "mt-1 text-sm",
                        isSel ? "text-slate-200" : "text-slate-600",
                      ].join(" ")}
                    >
                      {opt.hint}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0 || submitting}
            >
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
        </div>
      </Card>

      <div className="text-xs text-slate-500">
        ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
      </div>
    </div>
  );
}
