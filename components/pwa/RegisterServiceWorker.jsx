"use client";

import { useEffect } from "react";

/**
 * PWA 用 Service Worker 登録。
 *
 * 未病レーダーでは、天気・予報・認証・決済を Service Worker でキャッシュしない。
 * ここでは「ホーム画面アプリ化」と「将来の Push 通知」の土台だけを作る。
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // 新しい SW が見つかったら、次回起動時に自然に反映される。
        // 強制リロードは、入力中フォームや決済導線を壊す可能性があるため行わない。
        registration.update?.().catch(() => {});
      } catch (error) {
        // PWA 登録失敗はアプリ本体の利用を妨げない。
        if (process.env.NODE_ENV !== "production") {
          console.warn("Service Worker registration failed:", error);
        }
      }
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
