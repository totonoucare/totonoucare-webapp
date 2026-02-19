"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
        <div>Q{current} / {total}</div>
        <div>{pct}%</div>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-black/10">
        <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PENDING_KEY = "pending_diagnosis_v2_answers";

export default function CheckRunPage() {
  const router = useRouter();
  const questions = useMemo(() => getQuestions(), []);
  const total = useMemo(() => getTotalQuestions(), []);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const q = questions[step];
  const ansKey = q?.key;

  const rawSelected = ansKey ? answers?.[ansKey] : undefined;
  const isMulti = q?.type === "multi";
  const selected = isMulti ? (Array.isArray(rawSelected) ? rawSelected : []) : rawSelected;

  const envSensitivity = answers?.env_sensitivity;
  const isEnv2 = q?.key === "env_vectors";
  const shouldSkipEnv2 = isEnv2 && (envSensitivity === "0" || envSensitivity === 0);

  function persist(next) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    } catch {}
  }

  useEffect(() => {
    if (!shouldSkipEnv2) return;

    setAnswers((prev) => {
      const next = { ...prev, env_vectors: ["none"] };
      persist(next);
      return next;
    });

    setError("");
    setStep((s) => Math.min(s + 1, total - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSkipEnv2]);

  const canGoNext = shouldSkipEnv2 ? true : isMulti ? selected.length > 0 : Boolean(selected);
  const isLast = step === total - 1;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        setAnswers(saved);
        const idx = questions.findIndex((qq) => {
          const k = qq.key;
          const v = saved?.[k];
          if (qq.type === "multi") return !Array.isArray(v) || v.length === 0;
          return !v;
        });
        setStep(idx === -1 ? total - 1 : Math.max(0, idx));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(value) {
    if (!ansKey) return;

    setAnswers((prev) => {
      if (q.type === "multi") {
        const max = Number(q.max || 2);
        const cur = Array.isArray(prev?.[ansKey]) ? prev[ansKey] : [];

        if (value === "none") {
          const next = { ...prev, [ansKey]: ["none"] };
          persist(next);
          return next;
        }

        const base = cur.filter((v) => v !== "none");
        let updated;
        if (base.includes(value)) updated = base.filter((v) => v !== value);
        else updated = base.length >= max ? [...base.slice(1), value] : [...base, value];

        const next = { ...prev, [ansKey]: updated };
        persist(next);
        return next;
      }

      const next = { ...prev, [ansKey]: value };
      if (ansKey === "env_sensitivity" && (value === "0" || value === 0)) {
        next.env_vectors = ["none"];
      }
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

      const eventId = json?.data?.eventId || json?.data?.id;
      if (!eventId) throw new Error("eventId が返りませんでした");

      try { sessionStorage.removeItem(PENDING_KEY); } catch {}
      router.push(`/result/${encodeURIComponent(eventId)}`);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!q) {
    return (
      <AppShell title="体質チェック">
        <Module>
          <ModuleHeader icon={<IconCheck />} title="エラー" sub="質問が見つかりませんでした" />
          <div className="px-5 pb-6 pt-4 space-y-3">
            <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
              <div className="text-sm font-bold text-slate-700">質問が見つかりません。</div>
            </div>
            <Button onClick={() => router.push("/")}>ホームへ</Button>
          </div>
        </Module>
      </AppShell>
    );
  }

  if (shouldSkipEnv2) {
    return (
      <AppShell title="体質チェック">
        <div className="rounded-[20px] bg-white p-5 ring-1 ring-[var(--ring)]">
          <div className="text-sm font-bold text-slate-700">環境の追加質問をスキップ中…</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="体質チェック"
      headerLeft={
        <button
          type="button"
          onClick={() => router.back()}
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
          中断
        </button>
      }
    >
      <Module>
        <ModuleHeader icon={<IconCheck />} title="チェック中" sub="回答は途中保存されます" />
        <div className="px-5 pb-6 pt-4 space-y-4">
          <ProgressBar current={step + 1} total={total} />

          <div className="rounded-[22px] bg-white ring-1 ring-[var(--ring)] p-5">
            <div className="text-[15px] font-extrabold tracking-tight text-slate-900 whitespace-pre-wrap">
              {q.title}
            </div>

            <div className="mt-4 space-y-2">
              {q.options.map((opt) => {
                const isSel = isMulti ? selected.includes(opt.value) : selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => pick(opt.value)}
                    className={[
                      "w-full rounded-[16px] px-4 py-4 text-left transition ring-1",
                      isSel
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-900 ring-[var(--ring)] hover:ring-slate-300",
                    ].join(" ")}
                  >
                    <div className="font-bold">{opt.label}</div>
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
              <div className="mt-3 text-[11px] font-bold text-slate-500">
                ※ 最大{q.max || 2}つまで（「特にない・わからない」は単独）
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
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

            <div className="mt-4 text-[11px] font-bold text-slate-500">
              ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
            </div>
          </div>
        </div>
      </Module>
    </AppShell>
  );
}
