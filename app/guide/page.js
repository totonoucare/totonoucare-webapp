// app/guide/page.js
import GuideClient from "./GuideClient";

const pageTitle = "使い方ガイド｜未病レーダー";
const pageDescription =
  "未病カルテの作り方、今日・明日の未病予報の見方、暮らす・食べる・ほぐすのケアカードの使い方をまとめたガイドです。";

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/guide",
    type: "article",
    siteName: "未病レーダー",
    locale: "ja_JP",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "未病レーダー 使い方ガイド",
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
  "@type": "HowTo",
  name: "未病レーダーの使い方",
  description: pageDescription,
  url: "https://mibyo-radar.totonoucare.com/guide",
  step: [
    {
      "@type": "HowToStep",
      name: "未病カルテを作る",
      text: "質問に答えて、体質・天気との相性・負担が出やすい場所を整理します。",
    },
    {
      "@type": "HowToStep",
      name: "未病予報を見る",
      text: "今日と明日の天気が、今の体質や気になる不調にどう響きそうかを確認します。",
    },
    {
      "@type": "HowToStep",
      name: "暮らす・食べる・ほぐすを選ぶ",
      text: "服装、食事、ツボケアの中から、その日に取り入れやすいものを選びます。",
    },
  ],
};

export default function Page() {
  return (
    <>
      <GuideClient />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}

