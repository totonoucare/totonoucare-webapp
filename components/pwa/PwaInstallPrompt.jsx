"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_UNTIL_KEY = "mibyo-radar-pwa-install-dismiss-until";
const DISMISS_DAYS = 14;
const INSTALLED_DISMISS_DAYS = 365;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    window.navigator?.standalone === true
  );
}

function isProbablyIos() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";

  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === "MacIntel" && Number(window.navigator.maxTouchPoints || 0) > 1)
  );
}

function isProbablySafari() {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium|Android/i.test(ua);
}

function getDismissUntil() {
  try {
    return Number(window.localStorage.getItem(DISMISS_UNTIL_KEY) || 0);
  } catch (_) {
    return 0;
  }
}

function dismissForDays(days) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_UNTIL_KEY, String(until));
  } catch (_) {}
}

function isQuietPage(pathname) {
  if (!pathname) return false;

  return (
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/tokutei")
  );
}

export default function PwaInstallPrompt() {
  const pathname = usePathname();
  const deferredPromptRef = useRef(null);

  const [canPrompt, setCanPrompt] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isQuietPage(pathname)) return;
    if (isStandaloneMode()) return;
    if (getDismissUntil() > Date.now()) return;

    const shouldShowIosGuide = isProbablyIos() && isProbablySafari();
    setIsIosSafari(shouldShowIosGuide);

    const showTimer = window.setTimeout(() => {
      if (shouldShowIosGuide) setIsVisible(true);
    }, 1200);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      setCanPrompt(true);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setIsVisible(false);
      setIsGuideOpen(false);
      dismissForDays(INSTALLED_DISMISS_DAYS);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [pathname]);

  const hideBanner = () => {
    dismissForDays(DISMISS_DAYS);
    setIsVisible(false);
    setIsGuideOpen(false);
  };

  const handlePrimaryAction = async () => {
    const deferredPrompt = deferredPromptRef.current;

    if (!deferredPrompt) {
      setIsGuideOpen(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPromptRef.current = null;
      setCanPrompt(false);

      if (choice?.outcome === "accepted") {
        dismissForDays(INSTALLED_DISMISS_DAYS);
      } else {
        dismissForDays(DISMISS_DAYS);
      }

      setIsVisible(false);
    } catch (_) {
      setIsGuideOpen(true);
    }
  };

  if (!isVisible || (!canPrompt && !isIosSafari)) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-[80] px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[390px] items-center gap-3 rounded-[24px] border border-emerald-900/10 bg-white/95 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#F7FBF4] text-xl shadow-inner">
            🎯
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black leading-snug text-slate-900">
              ホーム画面に追加できます
            </p>
            <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">
              毎朝の体調予報を、アプリみたいにすぐ開けます。
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrimaryAction}
            className="shrink-0 rounded-full bg-[#244235] px-3 py-2 text-[12px] font-black text-white shadow-sm active:scale-[0.98]"
          >
            {canPrompt ? "追加" : "手順"}
          </button>

          <button
            type="button"
            onClick={hideBanner}
            aria-label="ホーム画面追加の案内を閉じる"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      </div>

      {isGuideOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/35 px-4 pb-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[430px] rounded-[28px] bg-white p-5 shadow-[0_24px_72px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-900">ホーム画面に追加する手順</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
                  iPhone / iPad では、Safari の共有メニューから追加します。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                aria-label="手順を閉じる"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
              >
                ×
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-sm font-bold leading-relaxed text-slate-700">
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F7FBF4] text-xs font-black text-[#244235]">
                  1
                </span>
                <span>Safari で未病レーダーを開く</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F7FBF4] text-xs font-black text-[#244235]">
                  2
                </span>
                <span>共有ボタンを押す</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F7FBF4] text-xs font-black text-[#244235]">
                  3
                </span>
                <span>「ホーム画面に追加」を選ぶ</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={hideBanner}
              className="mt-5 w-full rounded-full bg-[#244235] px-4 py-3 text-sm font-black text-white"
            >
              わかった
            </button>
          </div>
        </div>
      )}
    </>
  );
}
