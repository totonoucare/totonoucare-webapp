// app/sitemap.js
const appUrl = "https://mibyo-radar.totonoucare.com";

export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: appUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/guide`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
