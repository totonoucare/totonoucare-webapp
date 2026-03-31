"use client";

import { useEffect, useMemo, useState } from "react";
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
        "rounded-full border px-3 py-2 text-[12px] font-extrabold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700",
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
      if (next.has(tag)) next.delete(tag);
      else {
        if (tag === "nothing") {
          return ["nothing"];
        }
        next.delete("nothing");
        next.add(tag);
      }
      return Array.from(next);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-500">
              {formatDateLabel(date)} の記録
            </div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600"
          >
            閉じる
          </button>
        </div>

        {forecast ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                  signalBadgeClass(forecast.signal),
                ].join(" ")}
              >
                {signalLabel(forecast.signal)}
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                {forecast.score_0_10}/10
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-600">
                {triggerLabel(forecast.main_trigger, forecast.trigger_dir)}
              </span>
            </div>
            <div className="mt-2 text-[12px] font-bold leading-5 text-slate-700">
              {forecast.why_short || "その日の気象と体質の重なりから出した予報です。"}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="text-[11px] font-extrabold text-slate-500">実際どうだった？</div>
            <div className="mt-3 flex flex-wrap gap-2">
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="text-[11px] font-extrabold text-slate-500">先回りできた？</div>
            <div className="mt-3 flex flex-wrap gap-2">
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="text-[11px] font-extrabold text-slate-500">やったこと</div>
            <div className="mt-3 flex flex-wrap gap-2">
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="text-[11px] font-extrabold text-slate-500">ひとことメモ（任意）</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="例）夕方から頭が重かった、雨前はだるさが出やすかった など"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none"
            />
          </div>
        </div>

        <button
          type="button"
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
          className="mt-5 w-full rounded-2xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {saving ? "保存中…" : "この内容で保存する"}
        </button>
      </div>
    </div>
  );
}
