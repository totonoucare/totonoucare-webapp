"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { temporarySignupHref } from "@/lib/guestExperienceClient";
import { trackV126 } from "@/lib/experienceFunnelV126";
import { useMimoruLauncherClearance } from "@/components/mimoru/MimoruProvider";
import { GuideBotAvatar } from "@/components/illust/home/HeroGuideBot";

export default function ForecastSavePrompt({ resultId, ready, targetDate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const bar = useRef(null), dialog = useRef(null), previousFocus = useRef(null);
  const key = `v126_save_prompt:${resultId}`;
  useMimoruLauncherClearance(bar, Boolean(ready && shown && !open && !barHidden));
  useEffect(() => {
    if (!resultId) return;
    try { setShown(Boolean(sessionStorage.getItem(key))); setBarHidden(sessionStorage.getItem(key) === "hidden"); } catch {}
  }, [key, resultId]);
  useEffect(() => {
    if (!ready || shown || !resultId) return;
    const onScroll = () => {
      // Date switches can remount this component while React is restoring the
      // remembered state. Check storage here too, before opening another sheet.
      try {
        const remembered = sessionStorage.getItem(key);
        if (remembered) { setShown(true); setBarHidden(remembered === "hidden"); return; }
      } catch {}
      if (window.scrollY < Math.max(240, window.innerHeight * .55)) return;
      setShown(true); setOpen(true);
      try { sessionStorage.setItem(key, "shown"); } catch {}
      trackV126("save_prompt_view");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ready, shown, resultId, key]);
  useEffect(() => {
    if (ready && shown && !open && !barHidden) trackV126("save_bar_view");
  }, [ready, shown, open, barHidden]);
  function close() { setOpen(false); trackV126("save_prompt_close"); }
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    dialog.current?.querySelector("h2")?.focus();
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const buttons = [...(dialog.current?.querySelectorAll("button:not([disabled])") || [])];
      const first = buttons[0], last = buttons.at(-1);
      if (!buttons.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previousFocus.current?.focus?.(); };
  }, [open]);
  const save = source => {
    trackV126("save_prompt_click", { source });
    router.push(temporarySignupHref(`/radar${targetDate ? `?date=${encodeURIComponent(targetDate)}` : ""}`));
  };
  if (!ready || !resultId || !shown) return null;
  return <>
    {open ? <>
      <div className="fixed inset-0 z-[100] bg-[#183E35]/25" onClick={close} aria-hidden="true" />
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="forecast-save-title" data-forecast-save-dialog
        className="fixed bottom-[calc(var(--app-bottom-tabs-height,96px)+12px)] left-3.5 right-3.5 z-[101] mx-auto max-h-[55svh] max-w-[470px] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl ring-1 ring-[#CFE7DE]">
        <button type="button" onClick={close} aria-label="保存の案内を閉じる" className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-2xl text-slate-500">×</button>
        <GuideBotAvatar mood="listening" className="h-14 w-14" />
        <h2 id="forecast-save-title" tabIndex={-1} className="mt-2 pr-5 text-[20px] font-black leading-8 text-[#24564C] outline-none">今の体質を保存して、<br />これからも使いませんか？</h2>
        <p className="mt-3 text-[14px] font-medium leading-7 text-slate-600">無料でログインすると、次回も続きから、あなたに合った予報とケアを使えます。</p>
        <button type="button" onClick={() => save("modal")} className="mt-5 min-h-12 w-full rounded-full bg-[#349B83] px-4 py-3 text-[14px] font-black text-white">無料でログインして保存</button>
        <button type="button" onClick={close} className="mt-1 min-h-11 w-full text-[13px] font-bold text-slate-500">あとで</button>
      </section>
    </> : !barHidden ? <div ref={bar} data-forecast-save-bar
      className="fixed bottom-[calc(var(--app-bottom-tabs-height,96px)+8px)] left-3 right-3 z-[64] mx-auto flex max-w-[470px] items-center rounded-[18px] bg-white/95 p-1.5 shadow-lg ring-1 ring-[#CFE7DE]">
      <button type="button" onClick={() => save("bar")} className="min-h-11 flex-1 rounded-full bg-[#349B83] px-3 text-[13px] font-black text-white">体質結果を保存する〈無料〉</button>
      <button type="button" aria-label="保存の案内バーを閉じる" onClick={() => { setBarHidden(true); trackV126("save_bar_close"); try { sessionStorage.setItem(key, "hidden"); } catch {} }} className="grid h-11 w-11 shrink-0 place-items-center text-xl text-slate-500">×</button>
    </div> : null}
  </>;
}
