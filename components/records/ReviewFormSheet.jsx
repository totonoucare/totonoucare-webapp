// components/records/ReviewFormSheet.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import {
  ACTION_TAG_OPTIONS,
  CONDITION_OPTIONS,
  PREVENT_OPTIONS,
  formatDateLabel,
  signalBadgeClass,
  signalLabel,
  triggerLabel,
} from "@/components/records/reviewConfig";

function TogglePill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2.5 text-[13px] font-extrabold transition-all duration-200 active:scale-95",
        active
          ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
          : "bg-white text-slate-600 ring-1 ring-inset ring-[var(--ring)] hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function ReviewFormSheet({
  open,
  date,
  review,
  forecast,
  saving = false,
  title = "記録する",
  onClose,
  onSave,
}) {
  const [conditionLevel, setConditionLevel] = useState(null);
  const [preventLevel, setPreventLevel] = useState(null);
  const [actionTags, setActionTags] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setConditionLevel(
      review?.condition_level == null ? null : Number(review.condition_level)
    );
    setPreventLevel(review?.prevent_level == null ? null : Number(review.prevent_level));
    setActionTags(Array.isArray(review?.action_tags) ? review.action_tags : []);
    setNote(review?.note || "");
  }, [open, review, date]);

  const actionSet = useMemo(() => new Set(actionTags), [actionTags]);

  if (!open) return null;

  function toggleTag(tag) {
    setActionTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        if (tag === "nothing") return ["nothing"];
        next.delete("nothing");
        next.add(tag);
      }
      return Array.from(next);
    });
  }

  return (
    <div
      // ★ z-[100] に変更し、ボトムタブの上に被さるように設定
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-[var(--accent-ink)]/70">
              {formatDateLabel(date)} の記録
            </div>
            <div className="mt-1 text-[22px] font-black tracking-tight text-slate-900">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {forecast ? (
          <div className="mt-6 rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              その日の予報
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm ring-1 ring-inset",
                  signalBadgeClass(forecast.signal),
                ].join(" ")}
              >
                {signalLabel(forecast.signal)}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                {forecast.score_0_10} / 10
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-black/5 shadow-sm">
                {triggerLabel(forecast.main_trigger, forecast.trigger_dir)}
              </span>
            </div>
            <div className="mt-3 text-[12px] font-bold leading-5 text-slate-600">
              {forecast.why_short || "その日の気象と体質の重なりから出した予報です。"}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">実際どうだった？</div>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((opt) => (
                <TogglePill
                  key={opt.value}
                  active={conditionLevel === opt.value}
                  onClick={() => setConditionLevel(opt.value)}
                >
                  {opt.label}
                </TogglePill>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">先回りできた？</div>
            <div className="flex flex-wrap gap-2">
              {PREVENT_OPTIONS.map((opt) => (
                <TogglePill
                  key={opt.value}
                  active={preventLevel === opt.value}
                  onClick={() => setPreventLevel(opt.value)}
                >
                  {opt.label}
                </TogglePill>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">やったこと</div>
            <div className="flex flex-wrap gap-2">
              {ACTION_TAG_OPTIONS.map((opt) => (
                <TogglePill
                  key={opt.value}
                  active={actionSet.has(opt.value)}
                  onClick={() => toggleTag(opt.value)}
                >
                  {opt.label}
                </TogglePill>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-slate-50 px-5 py-4 ring-1 ring-inset ring-[var(--ring)]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">ひとことメモ（任意）</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="例）夕方から頭が重かった、雨前はだるさが出やすかった など"
              className="w-full rounded-[16px] bg-white px-4 py-3 text-[14px] font-bold text-slate-800 outline-none ring-1 ring-inset ring-[var(--ring)] focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <Button
          disabled={saving || conditionLevel == null || preventLevel == null}
          onClick={() =>
            onSave?.({
              date,
              condition_level: conditionLevel,
              prevent_level: preventLevel,
              action_tags: actionTags,
              note,
            })
          }
          className="mt-6 w-full shadow-md py-4"
        >
          {saving ? "保存中…" : "この内容で保存する"}
        </Button>
        
        {/* ★ 下部の見切れ防止用スペーサー */}
        <div className="h-8 w-full sm:h-2" />
      </div>
    </div>
  );
}
