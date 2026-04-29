import webpush from "web-push";

let configured = false;

function getVapidEnv() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || "mailto:support@totonoucare.com";

  if (!publicKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
  if (!privateKey) throw new Error("WEB_PUSH_VAPID_PRIVATE_KEY is not set");

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export function configureWebPush() {
  if (configured) return;
  const { publicKey, privateKey, subject } = getVapidEnv();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPush({ subscription, payload }) {
  configureWebPush();

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  return webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payload),
    {
      TTL: 60 * 60 * 6,
      urgency: "normal",
    }
  );
}
