"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { formatTrialEnd } from "@/lib/trialWelcome";

export default function TrialWelcomeDialog({ access, onClose }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    function handleKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll("button:not([disabled]),a[href],[tabindex='0']");
      if (!buttons?.length) return;
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
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div data-experience data-trial-welcome-overlay className="fixed inset-0 z-[110] flex items-center justify-center bg-[#172E27]/35 px-5 py-6 backdrop-blur-[3px]" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="relative w-full max-w-[380px] overflow-hidden rounded-[30px] bg-white shadow-[0_24px_80px_rgba(17,45,35,0.25)] ring-1 ring-white/90">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="無料体験の案内を閉じる" className="absolute right-3 top-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-[#D8E5DC] bg-white/95 text-[#36574B] shadow-sm transition hover:bg-[#EAF5EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F816E]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>

        <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain">
        <div className="bg-[linear-gradient(135deg,#EEF7F1_0%,#F9FBF7_60%,#FFF9ED_100%)] px-6 pb-6 pt-7 [@media(max-height:650px)]:pb-4 [@media(max-height:650px)]:pt-5">
          <div aria-hidden="true" className="mb-4 grid h-12 w-12 place-items-center rounded-[17px] bg-white text-[#2F816E] ring-1 ring-[#DAE8DD] [@media(max-height:650px)]:hidden">
            <svg viewBox="0 0 28 28" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="14" cy="14" r="9" /><circle cx="14" cy="14" r="5" /><path d="m14 14 6-7" /><circle cx="14" cy="14" r="1.5" fill="currentColor" stroke="none" /></svg>
          </div>
          <p className="text-[12px] font-bold tracking-[0.12em] text-[#527266]">ご利用について</p>
          <h2 id={titleId} className="mt-2 pr-1 text-[23px] font-black leading-[1.5] tracking-tight text-[#183E33]">14日間の<br />無料体験について</h2>
          <p id={descriptionId} className="mt-3 text-[14px] font-medium leading-7 text-[#53675E]">体調予報・対策ケア・記録・AIミモルを、すべてお試しいただけます。</p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="rounded-[18px] border border-[#DBE8DE] bg-[#F5F9F6] px-4 py-3.5">
            <p className="text-[12px] font-bold text-[#5B7266]">無料体験の終了日時</p>
            <p className="mt-1 text-[16px] font-black leading-7 tracking-tight text-[#24564C]"><time dateTime={access?.trial_ends_at}>{formatTrialEnd(access?.trial_ends_at)}</time>まで</p>
          </div>
          <p className="mt-4 text-[14px] font-medium leading-7 text-slate-600">体験終了後の継続利用は<span className="font-bold text-slate-800">月額580円</span>です。自動で料金が発生することはありません。</p>
          <p className="mt-2 text-[12px] font-medium leading-6 text-slate-500">期限と料金は「設定」の利用プランから確認できます。</p>
          <button type="button" onClick={onClose} className="mt-5 min-h-[48px] w-full rounded-[17px] bg-[#2F7668] px-5 py-3 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(47,118,104,0.15)] transition hover:bg-[#245E53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F7668]">予報を見る</button>
        </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
