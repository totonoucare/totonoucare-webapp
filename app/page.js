// app/page.js
import HomeClient from "./HomeClient";

const pageTitle = "未病レーダー｜体質と天気で今日・明日の整え方を選ぶ";
const pageDescription =
  "未病レーダーは、体質チェックと天気変化から今日・明日の体調の崩れやすさを見て、暮らす・食べる・ほぐすのセルフケアを提案するWebアプリです。";

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/",
    type: "website",
    siteName: "未病レーダー",
    locale: "ja_JP",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "未病レーダー",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: pageTitle,
    description: pageDescription,
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "未病レーダー",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  url: "https://mibyo-radar.totonoucare.com/",
  description: pageDescription,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
  publisher: {
    "@type": "Organization",
    name: "ととのうケアデザイン",
    url: "https://totonoucare.com/",
  },
};

export default function Page() {
  return (
    <>
      <HomeClient />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
