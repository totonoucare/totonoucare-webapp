"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex items-center justify-between text-xs text-slate-600">
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

  const selectedRaw = answers?.[q?.id];

  const isMulti = q?.type === "multi";
  const selected = isMulti
    ? Array.isArray(selectedRaw)
      ? selectedRaw
      : []
    : selectedRaw;

  const canGoNext = isMulti ? selected.length > 0 : Boolean(selected);
  const isLast = step === total - 1;

  // 途中保存があれば復元
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

  function persist(next) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    } catch {}
  }

  function pick(value) {
    setAnswers((prev) => {
      let next;

      // --- MULTI ---
      if (q.type === "multi") {
        const max = Number(q.max || 2);
        const cur = Array.isArray(prev?.[q.id]) ? prev[q.id] : [];

        // "none" は単独扱い
        if (value === "none") {
          next = { ...prev, [q.id]: ["none"] };
          persist(next);
          return next;
        }

        // none が入ってたら除去してから
        const base = cur.filter((v) => v !== "none");

        if (base.includes(value)) {
          // toggle off
          const updated = base.filter((v) => v !== value);
          next = { ...prev, [q.id]: updated };
        } else {
          // add (maxを超えるなら「古い方を落として」2つを維持)
          const updated = base.length >= max ? [...base.slice(1), value] : [...base, value];
          next = { ...prev, [q.id]: updated };
        }

        persist(next);
        return next;
      }

      // --- SINGLE / FREQ ---
      next = { ...prev, [q.id]: value };
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

      // ✅ eventId / id 両対応
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
        <Card>
          <h1 className="text-lg font-semibold">質問が見つかりません。</h1>
        </Card>
        <Button onClick={() => router.push("/")}>トップへ</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <ProgressBar current={step + 1} total={total} />
      </Card>

      <Card>
        <div className="text-sm font-semibold whitespace-pre-wrap">{q.title}</div>

        {q.description ? (
          <div className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{q.description}</div>
        ) : null}

        <div className="mt-4 space-y-2">
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
                <div className="text-sm">{opt.label}</div>
                {opt.hint ? <div className="mt-1 text-xs opacity-80">{opt.hint}</div> : null}
              </button>
            );
          })}
        </div>

        {isMulti ? (
          <div className="mt-3 text-xs text-slate-500">
            ※ 最大{q.max || 2}つまで選べます
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
              {submitting ? "作成中…" : "診断を確定"}
            </Button>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
        </div>
      </Card>
    </div>
  );
}
