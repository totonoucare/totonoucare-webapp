"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DISMISS_KEY = "mibyo-radar-push-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalonePwa() {
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

function isQuietPage(pathname) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/tokutei")
  );
}

function shouldSuppressByDismissal() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function dismissForNow() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function fetchVapidPublicKey() {
  const res = await fetch("/api/push/register", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.public_key) {
    throw new Error(json?.error || "通知用の公開キーを取得できませんでした");
  }
  return json.public_key;
}

async function postSubscription(subscription) {
  const token = await getAccessToken();
  if (!token) throw new Error("ログイン後に通知を設定できます");

  const res = await fetch("/api/push/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "通知設定の保存に失敗しました");
  }
  return json;
}

async function postSettings(settings) {
  const token = await getAccessToken();
  if (!token) throw new Error("ログイン後に通知を設定できます");

  const res = await fetch("/api/push/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "通知設定の更新に失敗しました");
  }
  return json;
}

export default function PushNotificationPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!supported) return;
      if (isQuietPage(pathname)) return;
      if (shouldSuppressByDismissal()) return;
      if (window.Notification?.permission === "denied") return;

      // iPhone / iPad はホーム画面追加後のPWAでのみ Push 通知が使える。
      // 通常のSafariタブでは通知案内を出さない。
      if (isProbablyIos() && !isStandalonePwa()) return;

      const token = await getAccessToken();
      if (!token) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await postSubscription(existing).catch(() => {});
          return;
        }
      } catch (_) {
        return;
      }

      if (!cancelled) setVisible(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [pathname, supported]);

  const handleDismiss = useCallback(() => {
    dismissForNow();
    setVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    try {
      setStatus("loading");
      setMessage("");

      if (!supported) throw new Error("この端末では通知に対応していません");
      if (isProbablyIos() && !isStandalonePwa()) {
        throw new Error("iPhoneでは、ホーム画面に追加したアプリから通知を設定してください");
      }

      const token = await getAccessToken();
      if (!token) throw new Error("ログイン後に通知を設定できます");

      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("通知が許可されませんでした");
      }

      const [registration, publicKey] = await Promise.all([
        navigator.serviceWorker.ready,
        fetchVapidPublicKey(),
      ]);

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await postSubscription(subscription);
      await postSettings({
        enabled: true,
        night_enabled: true,
        morning_enabled: true,
        min_score: 6,
      });

      setStatus("done");
      setMessage("通知をオンにしました。天気の影響が強めの日だけお知らせします。");
      setTimeout(() => setVisible(false), 2800);
    } catch (error) {
      setStatus("error");
      setMessage(String(error?.message || error));
    }
  }, [supported]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 px-4 sm:bottom-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[#DCE7DE] bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,244,0.97)_56%,rgba(237,245,239,0.97)_100%)] p-4 shadow-[0_18px_60px_rgba(40,55,48,0.16)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#EAF6EF_0%,#F9FBF5_58%,#FFF1CF_100%)] text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(53,95,82,0.12)] ring-1 ring-[#C9DED4]">
            🔔
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#101827]">未病予報の通知を受け取る</p>
            <p className="mt-1 text-xs font-extrabold leading-relaxed text-[#536477]">
              前日夜と当日朝に、天気の影響が強めの日だけお知らせします。通知文は短く、主因と時間帯を中心に作ります。
            </p>
            {message ? (
              <p className={`mt-2 text-xs font-black ${status === "error" ? "text-rose-600" : "text-[#2F7668]"}`}>
                {message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={status === "loading" || status === "done"}
            className="flex-1 rounded-full bg-[#5C9F88] px-4 py-3 text-sm font-black text-white shadow-[0_11px_24px_rgba(53,95,82,0.23)] ring-1 ring-[#4F8F7C]/20 active:scale-[0.99] disabled:opacity-60"
          >
            {status === "loading" ? "設定中…" : status === "done" ? "設定しました" : "通知をオンにする"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full bg-white px-4 py-3 text-sm font-black text-[#536477] shadow-sm ring-1 ring-[#DCE7DE] active:scale-[0.99]"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}


