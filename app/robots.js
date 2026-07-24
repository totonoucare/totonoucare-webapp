// app/robots.js
const appUrl = "https://mibyo-radar.totonoucare.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guide"],
      disallow: [
        "/api/",
        "/check",
        "/feedback",
        "/history",
        "/radar",
        "/records",
        "/settings",
        "/signup",
      ],
    },
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
