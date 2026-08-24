import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/browse", "/horse/", "/owner/", "/help", "/faq", "/safety", "/contact", "/terms", "/privacy"], disallow: ["/api/", "/dashboard/", "/messages/", "/profile", "/request"] },
    sitemap: "https://pinchmypony.com/sitemap.xml",
  };
}
