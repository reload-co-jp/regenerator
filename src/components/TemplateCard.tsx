"use client"

import Link from "next/link"
import styled from "styled-components"
import { track } from "@/lib/analytics"
import { assetPath } from "@/lib/site"
import { TemplateSvg } from "@/lib/template-renderer"
import { initialValues } from "@/lib/template-values"
import { theme } from "@/styles/theme"
import type { Category, TemplateDefinition } from "@/types/template"
import { CategoryBadge } from "./ui"

const Card = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${theme.color.surface};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadow.card};
  overflow: hidden;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;
  &:hover {
    box-shadow: ${theme.shadow.raised};
    transform: translateY(-2px);
  }
  &:focus-within {
    box-shadow: 0 0 0 3px ${theme.color.focus};
  }
`

const Thumb = styled.div`
  aspect-ratio: 1200 / 630;
  background: ${theme.color.surfaceAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 16px;
`

const Name = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  a {
    text-decoration: none;
    &::after {
      content: "";
      position: absolute;
      inset: 0;
    }
    &:focus-visible {
      outline: none;
    }
  }
`

const Desc = styled.p`
  font-size: 0.82rem;
  color: ${theme.color.textMuted};
  line-height: 1.5;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
`

const Size = styled.span`
  font-size: 0.7rem;
  color: ${theme.color.textMuted};
`

export function TemplateCard({
  template,
  category,
  priority = false,
  headingLevel = 3,
}: {
  template: TemplateDefinition
  category?: Category
  priority?: boolean
  headingLevel?: 2 | 3
}) {
  const { width, height } = template.canvas
  return (
    <Card>
      <Thumb>
        {template.thumbnail ? (
          <img
            src={assetPath(template.thumbnail.replace(/\.png$/, ".webp"))}
            alt={`${template.title}のサンプル画像`}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <TemplateSvg
            template={template}
            values={initialValues(template)}
            idPrefix={`card-${template.id}`}
          />
        )}
      </Thumb>
      <Body>
        <Name as={`h${headingLevel}`}>
          <Link
            href={`/create/${template.id}/`}
            onClick={() =>
              track("template_select", { template_id: template.id })
            }
          >
            {template.title}
          </Link>
        </Name>
        <Desc>{template.description}</Desc>
        <Meta>
          {category && (
            <CategoryBadge>
              <span aria-hidden="true">{category.icon}</span>
              {category.name}
            </CategoryBadge>
          )}
          <Size>
            {width}×{height}
          </Size>
        </Meta>
      </Body>
    </Card>
  )
}
