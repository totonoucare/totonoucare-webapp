// app/check/run/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell, { Module, ModuleHeader } from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import { getQuestions, getTotalQuestions } from "@/lib/diagnosis/v2/questions";
import { IconCheck } from "@/components/illust/icons/check";

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="px-2">
      <div className="flex items-end justify-between mb-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Question <span className="text-[14px] text-slate-900">{current}</span> / {total}
        </div>
        <div className="text-[11px] font-black text-slate-400">{pct}%</div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-black/5">
        <div 
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out" 
          style={{ width: `${pct}%` }} 
        />
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
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          ← 戻る
        </button>
      }
      headerRight={
        <button
          type="button"
          onClick={() => router.push("/check")}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[11px] font-extrabold text-slate-700 shadow-sm ring-1 ring-[var(--ring)] active:scale-[0.99]"
        >
          中断
        </button>
      }
    >
      <Module className="mb-8">
        <div className="px-5 pb-6 pt-6 space-y-6">
          <ProgressBar current={step + 1} total={total} />

          <div className="rounded-[32px] bg-white ring-1 ring-[var(--ring)] p-6 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.05)]">
            <div className="text-[17px] font-black tracking-tight text-slate-900 leading-[1.6] whitespace-pre-wrap">
              {q.title}
            </div>

            <div className="mt-6 space-y-2.5">
              {q.options.map((opt) => {
                const isSel = isMulti ? selected.includes(opt.value) : selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => pick(opt.value)}
                    className={[
                      "w-full rounded-[20px] px-5 py-4 text-left transition-all duration-200",
                      isSel
                        ? "bg-[color-mix(in_srgb,var(--mint),white_70%)] ring-2 ring-[var(--accent)] shadow-sm"
                        : "bg-white ring-1 ring-[var(--ring)] hover:bg-slate-50 hover:ring-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={["text-[15px] font-extrabold", isSel ? "text-[var(--accent-ink)]" : "text-slate-800"].join(" ")}>
                          {opt.label}
                        </div>
                        {opt.hint ? (
                          <div className={["mt-1.5 text-[12px] font-bold", isSel ? "text-[var(--accent-ink)]/70" : "text-slate-500"].join(" ")}>
                            {opt.hint}
                          </div>
                        ) : null}
                      </div>
                      
                      {/* カスタムラジオ/チェックボックスアイコン */}
                      <div className={[
                        "shrink-0 grid h-6 w-6 place-items-center rounded-full ring-1 transition-all duration-200",
                        isSel ? "bg-[var(--accent)] ring-[var(--accent)] text-white" : "bg-slate-50 ring-slate-200 text-transparent"
                      ].join(" ")}>
                        <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7.5L6 10.5L11 3.5" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {isMulti ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-500 ring-1 ring-inset ring-slate-200/50">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" /></svg>
                最大{q.max || 2}つまで（「特にない・わからない」は単独）
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 flex items-center gap-3">
              <Button variant="ghost" onClick={back} disabled={step === 0 || submitting} className="flex-1 bg-slate-50 ring-1 ring-slate-200/50">
                戻る
              </Button>

              {!isLast ? (
                <Button onClick={next} disabled={!canGoNext || submitting} className="flex-[2] shadow-md">
                  次へ
                </Button>
              ) : (
                <Button onClick={submit} disabled={!canGoNext || submitting} className="flex-[2] shadow-md">
                  {submitting ? "作成中…" : "診断を確定"}
                </Button>
              )}
            </div>

            <div className="mt-5 text-center text-[10px] font-extrabold text-slate-400">
              ※ 無理のある動作は避けてOK。違和感が強い場合は中止してください。
            </div>
          </div>
        </div>
      </Module>
    </AppShell>
  );
}
