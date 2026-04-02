"use client";

import { useEffect, useRef, useState } from "react";

function IconMenuDots() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export default function HomeHeaderMenu({ onGuide, onSettings, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="メニュー"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
      >
        <IconMenuDots />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-[var(--ring)] bg-white shadow-[0_18px_38px_-24px_rgba(0,0,0,0.28)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onGuide?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            使い方
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSettings?.();
            }}
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            設定
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            ログアウト
          </button>
        </div>
      ) : null}
    </div>
  );
}
