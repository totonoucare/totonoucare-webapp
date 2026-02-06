// app/layout.js
import "./globals.css";
import { Zen_Kaku_Gothic_New } from "next/font/google";

const zen = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700", "900"],
  // Zen Kaku Gothic New は subset が実質 "latin" しか選べない構成のことが多いのでこれでOK
  subsets: ["latin"],
  display: "swap",
  variable: "--font-zenkaku",
});

export const metadata = {
  title: "未病レーダー",
  description: "体質チェック×天気で、今日を崩しにくくする。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={zen.variable}>
      <body className="min-h-screen bg-app text-slate-900 font-app">{children}</body>
    </html>
  );
}
