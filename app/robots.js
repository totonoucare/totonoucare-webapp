// app/robots.js
const appUrl = "https://mibyo-radar.totonoucare.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guide"],
      disallow: [
        "/api/",
        "/calendar",
        "/check",
        "/feedback",
        "/history",
        "/insights",
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
