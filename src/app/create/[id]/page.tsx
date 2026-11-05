import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { JsonLd } from "@/components/JsonLd"
import { TemplateEditor } from "@/components/TemplateEditor"
import { TemplateGuide } from "@/components/TemplateGuide"
import {
  howToSteps,
  relatedTemplates,
  sampleLinks,
  templateFaq,
} from "@/lib/seo-content"
import {
  categories,
  getAllTemplates,
  getCategory,
  getTemplate,
} from "@/lib/template-loader"
import { SITE_NAME, absoluteUrl } from "@/lib/site"

export const dynamicParams = false

export function generateStaticParams() {
  return getAllTemplates().map((t) => ({ id: t.id }))
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const template = getTemplate(id)
  if (!template) return {}
  const url = absoluteUrl(`/create/${template.id}/`)
  const title = `${template.title}画像メーカー`
  const description = `${template.description}。${template.longDescription ?? ""}テキストを入力するだけで${template.canvas.width}×${template.canvas.height}のPNG画像を無料で作成できます。`
  const image = template.thumbnail
    ? {
        url: absoluteUrl(template.thumbnail),
        width: template.canvas.width,
        height: template.canvas.height,
        alt: template.title,
      }
    : undefined
  return {
    title,
    description,
    keywords: template.tags,
    alternates: { canonical: url },
    openGraph: {
      title: `${title}｜${SITE_NAME}`,
      description,
      url,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜${SITE_NAME}`,
      description,
      images: image ? [image.url] : undefined,
    },
  }
}

export default async function CreatePage({ params }: Props) {
  const { id } = await params
  const template = getTemplate(id)
  if (!template) notFound()
  const category = getCategory(template.category)
  const url = absoluteUrl(`/create/${template.id}/`)
  const steps = howToSteps(template)
  const faq = templateFaq(template)
  return (
    <>
      <TemplateEditor template={template} category={category} />
      <TemplateGuide
        template={template}
        steps={steps}
        samples={sampleLinks(template)}
        faq={faq}
        related={relatedTemplates(template, getAllTemplates())}
        categories={categories}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: `${template.title}画像メーカー`,
              url,
              description: template.description,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              inLanguage: "ja",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
              image: template.thumbnail
                ? absoluteUrl(template.thumbnail)
                : undefined,
              keywords: template.tags.join(","),
            },
            {
              "@type": "HowTo",
              name: `${template.title}画像の作り方`,
              totalTime: "PT1M",
              step: steps.map((s, i) => ({
                "@type": "HowToStep",
                position: i + 1,
                name: s.name,
                text: s.text,
                url: `${url}#howto-heading`,
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: SITE_NAME,
                  item: absoluteUrl("/"),
                },
                ...(category
                  ? [
                      {
                        "@type": "ListItem",
                        position: 2,
                        name: category.name,
                        item: absoluteUrl(`/?category=${category.id}`),
                      },
                    ]
                  : []),
                {
                  "@type": "ListItem",
                  position: category ? 3 : 2,
                  name: template.title,
                  item: url,
                },
              ],
            },
          ],
        }}
      />
    </>
  )
}
