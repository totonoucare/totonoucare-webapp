// app/layout.js
import "./globals.css";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

const zen = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zenkaku",
});

const appName = "未病レーダー";
const appDescription = "体質チェック×天気で、今日を崩しにくくする。";

export const metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
  themeColor: "#F7FBF4",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={zen.variable}>
      <body className="min-h-screen bg-app text-slate-900 font-app antialiased">
        <RegisterServiceWorker />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

