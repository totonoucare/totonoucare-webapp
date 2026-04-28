/* 未病レーダー PWA Service Worker
 * 方針:
 * - 予報・天気・ログイン・Stripe・GPT 結果はキャッシュしない
 * - オフライン時に古い予報を見せない
 * - ホーム画面起動と Push 通知の土台だけを担う
 */

const DEFAULT_URL = "/radar";
const ICON_URL = "/icons/icon-192.png";
const BADGE_URL = "/icons/badge-96.png";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ナビゲーションだけを扱う。API・認証・決済・画像・JS/CSS は触らない。
// オフライン時は古い予報を出さず、通信が必要な旨だけ表示する。
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => {
      return new Response(
        `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#F7FBF4" />
    <title>通信が必要です｜未病レーダー</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #F7FBF4;
        color: #0f172a;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif;
      }
      main {
        width: min(360px, calc(100vw - 32px));
        padding: 28px 24px;
        border-radius: 28px;
        background: rgba(255,255,255,.86);
        box-shadow: 0 18px 48px rgba(15, 23, 42, .08);
        border: 1px solid rgba(148, 163, 184, .24);
        text-align: center;
      }
      img { width: 64px; height: 64px; border-radius: 18px; }
      h1 { margin: 18px 0 8px; font-size: 20px; line-height: 1.5; }
      p { margin: 0; color: #64748b; font-weight: 700; line-height: 1.8; font-size: 14px; }
      button {
        margin-top: 20px;
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        background: #244235;
        color: white;
        font-weight: 800;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="${ICON_URL}" alt="" />
      <h1>通信が必要です</h1>
      <p>最新の体調予報を取得するには、インターネット接続をご確認ください。</p>
      <button onclick="location.reload()">再読み込み</button>
    </main>
  </body>
</html>`,
        {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    })
  );
});

function parsePushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch (_) {
    try {
      return { body: event.data.text() };
    } catch (_) {
      return {};
    }
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title || "未病レーダー";
  const url = payload.url || DEFAULT_URL;

  const options = {
    body: payload.body || "体調予報を確認しましょう。",
    icon: payload.icon || ICON_URL,
    badge: payload.badge || BADGE_URL,
    tag: payload.tag || "mibyo-radar-forecast",
    renotify: Boolean(payload.renotify),
    data: {
      url,
      sentAt: Date.now(),
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || DEFAULT_URL, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin || !("focus" in client)) continue;

        if ("navigate" in client && client.url !== targetUrl) {
          return client.navigate(targetUrl).then((navigatedClient) => {
            return (navigatedClient || client).focus();
          });
        }

        return client.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
