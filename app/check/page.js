"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Q{current} / {total}
        </div>
        <div>{pct}%</div>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-slate-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
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

  // ★ answers は q.key で保持する（スコア側と一致させる）
  const ansKey = q?.key;

  // single/multi 対応
  const rawSelected = ansKey ? answers?.[ansKey] : undefined;
  const isMulti = q?.type === "multi";
  const selected = isMulti ? (Array.isArray(rawSelected) ? rawSelected : []) : rawSelected;

  const canGoNext = isMulti ? selected.length > 0 : Boolean(selected);
  const isLast = step === total - 1;

  function persist(next) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    } catch {}
  }

  // 途中保存があれば復元（主に「戻ってきた時」用）
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        setAnswers(saved);

        // ★ 未回答判定も q.key で
        const idx = questions.findIndex((qq) => {
          const k = qq.key;
          const v = saved?.[k];
          if (qq.type === "multi") return !Array.isArray(v) || v.length === 0;
          return !v;
        });

        setStep(idx === -1 ? total - 1 : Math.max(0, idx));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(value) {
    if (!ansKey) return;

    setAnswers((prev) => {
      // MULTI
      if (q.type === "multi") {
        const max = Number(q.max || 2);
        const cur = Array.isArray(prev?.[ansKey]) ? prev[ansKey] : [];

        // "none" は単独扱い
        if (value === "none") {
          const next = { ...prev, [ansKey]: ["none"] };
          persist(next);
          return next;
        }

        // 既に "none" が入ってたら除去
        const base = cur.filter((v) => v !== "none");

        let updated;
        if (base.includes(value)) {
          // toggle off
          updated = base.filter((v) => v !== value);
        } else {
          // add (max超過なら古い方を落とす)
          updated = base.length >= max ? [...base.slice(1), value] : [...base, value];
        }

        const next = { ...prev, [ansKey]: updated };
        persist(next);
        return next;
      }

      // SINGLE / FREQ
      const next = { ...prev, [ansKey]: value };
      persist(next);
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
      const res = await fetch("/api/diagnosis/v2/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "診断の保存に失敗しました");

      // eventId / id 両対応
      const eventId = json?.data?.eventId || json?.data?.id;
      if (!eventId) throw new Error("eventId が返りませんでした");

      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}

      router.push(`/result/${encodeURIComponent(eventId)}`);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!q) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">質問が見つかりません。</h1>
        <Button onClick={() => router.push("/")}>トップへ</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProgressBar current={step + 1} total={total} />

      <Card>
        <div className="space-y-3">
          <div className="text-lg font-semibold whitespace-pre-wrap">{q.title}</div>

          <div className="space-y-2 pt-2">
            {q.options.map((opt) => {
              const isSel = isMulti ? selected.includes(opt.value) : selected === opt.value;

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

          {isMulti ? (
            <div className="pt-1 text-xs text-slate-500">
              ※ 最大{q.max || 2}つまで選べます（「特にない」は単独になります）
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                {submitting ? "作成中…" : "診断を確定"}
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
