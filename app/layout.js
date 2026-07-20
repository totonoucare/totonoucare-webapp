// app/layout.js
import "./globals.css";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import PushNotificationPrompt from "@/components/pwa/PushNotificationPrompt";

const zen = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zenkaku",
});

const appName = "未病レーダー";
const appDescription =
  "体質チェックと天気変化から、今日・明日の体調予報とセルフケアを見やすくするアプリ。";
const appUrl = "https://mibyo-radar.totonoucare.com";

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  keywords: [
    "未病レーダー",
    "未病",
    "体質チェック",
    "天気痛",
    "気圧",
    "セルフケア",
    "東洋医学",
  ],
  authors: [{ name: "ととのうケアデザイン", url: "https://totonoucare.com" }],
  creator: "ととのうケアデザイン",
  publisher: "ととのうケアデザイン",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: appName,
    description: appDescription,
    url: appUrl,
    siteName: appName,
    type: "website",
    locale: "ja_JP",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: appName,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: appName,
    description: appDescription,
    images: ["/icons/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAFAF6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={zen.variable}>
      <body className="min-h-screen bg-app text-slate-900 font-app antialiased">
        <RegisterServiceWorker />
        {children}
        <PwaInstallPrompt />
        <PushNotificationPrompt />
      </body>
    </html>
  );
}

