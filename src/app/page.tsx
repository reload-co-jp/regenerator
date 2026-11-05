import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { TemplateFeatures } from "@/components/TemplateFeatures"
import { sampleLinks } from "@/lib/seo-content"
import { getAllTemplates, getCategory } from "@/lib/template-loader"
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    url: absoluteUrl("/"),
    images: [{ url: absoluteUrl("/images/og.png"), width: 1200, height: 630 }],
  },
}

export default function HomePage() {
  // 人気順に並べ、1テンプレートずつ特集として大きく紹介する
  const templates = [...getAllTemplates()].sort(
    (a, b) =>
      (b.popularity ?? 0) - (a.popularity ?? 0) ||
      a.title.localeCompare(b.title)
  )
  return (
    <>
      <TemplateFeatures
        items={templates.map((t) => ({
          template: t,
          category: getCategory(t.category),
          samples: sampleLinks(t),
        }))}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: SITE_NAME,
              url: absoluteUrl("/"),
              description: SITE_DESCRIPTION,
              inLanguage: "ja",
            },
            {
              "@type": "ItemList",
              name: "特集テンプレート",
              itemListElement: templates.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.title,
                url: absoluteUrl(`/create/${t.id}/`),
              })),
            },
          ],
        }}
      />
    </>
  )
}
