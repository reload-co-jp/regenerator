import type { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { TemplateGallery } from "@/components/TemplateGallery"
import { categories, getAllTemplates } from "@/lib/template-loader"
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    url: absoluteUrl("/"),
    images: [{ url: absoluteUrl("/images/og.png"), width: 1200, height: 630 }],
  },
}

export default function HomePage() {
  const templates = getAllTemplates()
  return (
    <>
      <TemplateGallery templates={templates} categories={categories} />
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
              name: "画像テンプレート一覧",
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
