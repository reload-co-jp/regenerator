import type { MetadataRoute } from "next"
import { getAllTemplates } from "@/lib/template-loader"
import { absoluteUrl } from "@/lib/site"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...getAllTemplates().map((t) => ({
      url: absoluteUrl(`/create/${t.id}/`),
      lastModified: t.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]
}
