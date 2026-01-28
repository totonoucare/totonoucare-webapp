"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";
import { scoreDiagnosis } from "@/lib/diagnosis/v2/scoring";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        Q{current} / {total}
      </div>
      <div className="tabular-nums">{pct}%</div>
    </div>
  );
}

const STORAGE_KEY = "mibyo_v2_preview";

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
    if (!q?.id) return;
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

  function savePreviewToSession({ answers, computed }) {
    try {
      const payload = {
        answers,
        computed,
        savedAt: new Date().toISOString(),
        version: "v2",
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorageが使えない環境はレアだが、落とさず続行
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");

    // 1) まず「保存あり」を試す（ログイン済みならここで成功する）
    try {
      const res = await fetch("/api/diagnosis/v2/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });

      // 未ログイン/セッション無し → 保存はせず preview に切り替え
      if (res.status === 401) {
        const computed = scoreDiagnosis(answers);
        savePreviewToSession({ answers, computed });
        router.push("/result?preview=1");
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "診断の保存に失敗しました");

      // 保存できた場合も、result側が取りやすいように一応previewも置いておく（安全策）
      const computed = json?.data?.computed || scoreDiagnosis(answers);
      savePreviewToSession({ answers, computed });

      // ここは /result で「保存済みデータ優先で表示」する想定
      router.push("/result");
    } catch (e) {
      // 2) 失敗したら preview にフォールバック（ネットワーク障害や一時的なAPI不調も拾う）
      try {
        const computed = scoreDiagnosis(answers);
        savePreviewToSession({ answers, computed });
        router.push("/result?preview=1");
        return;
      } catch {
        setError(e?.message || String(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!q) {
    return (
      <Card>
        <div className="space-y-2">
          <div className="text-lg font-semibold">質問が見つかりません</div>
          <div className="text-sm text-slate-600">
            questions 定義を確認してください。
          </div>
          <div>
            <Button onClick={() => router.push("/")}>ホームへ</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
          <ProgressBar current={step + 1} total={total} />

          <div className="text-xl font-semibold">{q.title}</div>

          {q.description ? (
            <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {q.description}
            </div>
          ) : null}

          <div className="space-y-2">
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
              戻る
            </Button>

            {!isLast ? (
              <Button onClick={next} disabled={!canGoNext || submitting}>
                次へ
              </Button>
            ) : (
              <Button onClick={submit} disabled={!canGoNext || submitting}>
                {submitting ? "生成中…" : "結果を見る"}
              </Button>
            )}
          </div>

          <div className="pt-2 text-xs text-slate-500">
            ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
          </div>
        </div>
      </Card>
    </div>
  );
}
