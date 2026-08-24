import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pinchmypony.com";
  return ["", "/browse", "/dashboard/membership", "/help", "/faq", "/safety", "/contact", "/terms", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/browse" ? "daily" as const : "monthly" as const,
    priority: path === "" ? 1 : path === "/browse" ? 0.9 : 0.6,
  }));
}
