"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CoreIllust } from "@/components/illust/core";
import { getCoreLabel } from "@/lib/diagnosis/v2/labels";

function TypePreview({ label, code }) {
  const type = code ? getCoreLabel(code) : null;
  return <div className="min-w-0 rounded-[20px] border border-[#DEE9DF] bg-white/85 px-3 py-3 text-center">
    <p className="text-[12px] font-bold text-[#688074]">{label}</p>
    {type ? <div aria-hidden="true" className="mx-auto my-1 h-14 w-16"><CoreIllust code={code} title={type.title} className="h-full w-full" /></div> : null}
    <p className="mt-1 text-[14px] font-black leading-6 text-[#24564C]">{type?.title || "体質トリセツ"}</p>
  </div>;
}

export default function ConstitutionUpdateDialog({ currentCode, nextCode, busy, error, onUpdate, onKeep, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    function handleKey(event) {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll("button:not([disabled]),a[href],[tabindex='0']");
      if (!buttons?.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey, true);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => { if (busy) dialogRef.current?.focus({ preventScroll: true }); }, [busy]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#172E27]/35 px-4 py-5 backdrop-blur-[3px]" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby={titleId} aria-describedby={descriptionId} className="relative w-full max-w-[380px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_80px_rgba(17,45,35,0.25)] ring-1 ring-white/90 focus:outline-none">
        <button ref={closeRef} type="button" onClick={onClose} disabled={busy} aria-label="体質更新の確認を閉じる" className="absolute right-3 top-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-[#D8E5DC] bg-white/95 text-[#36574B] shadow-sm transition hover:bg-[#EAF5EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F816E] disabled:opacity-50">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div className="max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain">
          <div className="bg-[linear-gradient(135deg,#EEF7F1_0%,#F9FBF7_65%,#FFF9ED_100%)] px-5 pb-5 pt-7">
            <p className="pr-12 text-[12px] font-bold tracking-[0.12em] text-[#63826E]">予報とケアに使うトリセツ</p>
            <h2 id={titleId} className="mt-3 pr-7 text-[22px] font-black leading-[1.55] tracking-tight text-[#24564C]">この結果を<br />反映しますか？</h2>
            <p id={descriptionId} className="mt-3 text-[14px] font-medium leading-7 text-[#536B5E]">今後の予報・ケアに、この結果を使います。履歴はそのまま残ります。</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <TypePreview label="反映中" code={currentCode} />
              <TypePreview label="この結果" code={nextCode} />
            </div>
          </div>
          <div className="px-5 pb-5 pt-4">
            {error ? <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-bold leading-6 text-rose-700">{error}</p> : null}
            <button type="button" onClick={onUpdate} disabled={busy} className="min-h-[48px] w-full rounded-[17px] bg-[#2F7668] px-3 py-3 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(47,118,104,0.15)] hover:bg-[#245E53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7668] disabled:opacity-60">{busy ? "反映しています…" : "この結果を反映する"}</button>
            <button type="button" onClick={onKeep} disabled={busy} className="mt-3 min-h-[48px] w-full rounded-[17px] border border-[#D8E5DC] bg-white px-3 py-3 text-[14px] font-bold text-[#426758] hover:bg-[#F5F9F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7668] disabled:opacity-60">変更せずに戻る</button>
            <p className="mt-3 text-center text-[12px] font-medium leading-6 text-slate-500">×で閉じると、結果ページに戻ります。</p>
          </div>
        </div>
      </section>
    </div>, document.body
  );
}
