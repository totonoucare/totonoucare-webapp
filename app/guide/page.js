import GuideClient from "./GuideClient";

const pageTitle = "使い方ガイド｜未病レーダー";
const pageDescription =
  "体質トリセツ、今日・明日の体調予報、対策ケア、実感記録、ケアナビAI：EKIKENへの体調相談、自分に合う整え方の振り返り、国家資格者によるオンライン相談までをまとめたガイドです。";

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
      name: "体質トリセツを作る",
      text: "質問に答えて、ベース体質、気血水傾向、天気との相性、負担が出やすい体のラインを整理します。",
    },
    {
      "@type": "HowToStep",
      name: "今日と明日の体調予報を見る",
      text: "体調ゆらぎ度と安定・いたわり・守りのモードから、その日にどのくらい備えるかを確認します。",
    },
    {
      "@type": "HowToStep",
      name: "対策ケアで先回りする",
      text: "暮らす・食べる・ほぐすから無理なくできるケアを選び、実際に試した項目の「やってみた」を押して記録します。",
    },
    {
      "@type": "HowToStep",
      name: "実感を記録する",
      text: "夜に実際の体調を丸・三角・バツから選び、当日ケアのタイミングを確認します。",
    },
    {
      "@type": "HowToStep",
      name: "記録から自分に合う整え方を探す",
      text: "予報、試したケア、実際の体調を振り返り、どんな日に何をすると過ごしやすかったかと、次に試すことを整理します。",
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
