"use client"

import Link from "next/link"
import styled, { css } from "styled-components"
import { track } from "@/lib/analytics"
import type { SampleLink } from "@/lib/seo-content"
import { assetPath } from "@/lib/site"
import { TemplateSvg } from "@/lib/template-renderer"
import { initialValues } from "@/lib/template-values"
import { theme } from "@/styles/theme"
import type { Category, TemplateDefinition } from "@/types/template"
import { Container } from "./ui"

export interface FeatureItem {
  template: TemplateDefinition
  category?: Category
  samples: SampleLink[]
}

/** "#rrggbb" の相対輝度（0〜1）。解釈できない色は明るい色として扱う */
export function luminance(color: string): number {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(color.trim())
  if (!m) return 1
  const hex =
    m[1].length === 3
      ? m[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : m[1]
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const pad = (n: number) => String(n).padStart(2, "0")

/* ---------- ヒーロー ---------- */

const Hero = styled.section`
  padding: 40px 0 28px;
  ${theme.bp.md} {
    padding: 64px 0 40px;
  }
`

const Kicker = styled.p`
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.24em;
  color: ${theme.color.primary};
`

const HeroTitle = styled.h1`
  margin-top: 10px;
  font-size: clamp(1.7rem, 6vw, 3rem);
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: 0.01em;
  & > span {
    display: inline-block;
  }
  em {
    font-style: normal;
    color: ${theme.color.primary};
  }
`

const HeroLead = styled.p`
  margin-top: 14px;
  color: ${theme.color.textMuted};
  font-size: 0.95rem;
  line-height: 1.8;
  max-width: 40em;
`

const Toc = styled.nav`
  margin-top: 28px;
  border-top: 2px solid ${theme.color.text};
  h2 {
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.2em;
    padding: 10px 0 4px;
  }
  ol {
    display: grid;
    ${theme.bp.sm} {
      grid-template-columns: repeat(2, 1fr);
      column-gap: 24px;
    }
    ${theme.bp.lg} {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  li {
    border-bottom: 1px solid ${theme.color.border};
  }
  a {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 0;
    text-decoration: none;
    font-weight: 700;
    &:hover strong {
      color: ${theme.color.primary};
    }
  }
  a > span {
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 1.1rem;
    color: ${theme.color.textMuted};
    min-width: 1.8em;
  }
  a > small {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 400;
    color: ${theme.color.textMuted};
    white-space: nowrap;
  }
`

/* ---------- 特集 ---------- */

const Feature = styled.section<{
  $bg: string
  $dark: boolean
  $portrait: boolean
}>`
  --feature-bg: ${(p) => p.$bg};
  --feature-text: ${(p) => (p.$dark ? "#ffffff" : theme.color.text)};
  --feature-muted: ${(p) =>
    p.$dark ? "rgba(255,255,255,.72)" : theme.color.textMuted};
  --feature-line: ${(p) =>
    p.$dark ? "rgba(255,255,255,.22)" : "rgba(29,27,23,.16)"};
  --feature-chip: ${(p) =>
    p.$dark ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.7)"};
  background: var(--feature-bg);
  color: var(--feature-text);
  padding: 48px 0 56px;
  scroll-margin-top: 0;
  ${theme.bp.md} {
    padding: 80px 0 88px;
  }
  & + & {
    border-top: 1px solid var(--feature-line);
  }
`

const FeatureGrid = styled.div<{ $portrait: boolean; $reverse: boolean }>`
  display: grid;
  gap: 28px;
  align-items: center;
  ${theme.bp.md} {
    gap: 48px;
    ${(p) =>
      p.$portrait
        ? css`
            grid-template-columns: ${p.$reverse ? "1fr 0.9fr" : "0.9fr 1fr"};
          `
        : css`
            grid-template-columns: 1fr;
          `}
  }
`

const Visual = styled(Link)<{ $portrait: boolean; $reverse: boolean }>`
  display: block;
  border-radius: ${theme.radius.lg};
  overflow: hidden;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.12),
    0 24px 60px rgba(0, 0, 0, 0.22);
  transition: transform 0.2s ease;
  &:hover {
    transform: translateY(-4px) rotate(-0.3deg);
  }
  ${(p) =>
    p.$portrait &&
    css`
      max-width: 460px;
      width: 100%;
      justify-self: center;
    `}
  ${theme.bp.md} {
    ${(p) => p.$portrait && p.$reverse && "order: 2;"}
  }
  img,
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`

const Copy = styled.div<{ $portrait: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  ${(p) =>
    !p.$portrait &&
    css`
      ${theme.bp.md} {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 48px;
        align-items: start;
      }
    `}
`

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--feature-muted);
  b {
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 2.6rem;
    line-height: 1;
    letter-spacing: 0;
    color: var(--feature-text);
  }
`

const Title = styled.h2`
  font-size: clamp(2rem, 7vw, 3.4rem);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: 0.02em;
  a {
    text-decoration: none;
  }
`

const Catch = styled.p`
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.7;
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  p {
    font-size: 0.9rem;
    line-height: 1.9;
    color: var(--feature-muted);
  }
`

const Samples = styled.div`
  h3 {
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    color: var(--feature-muted);
    margin-bottom: 8px;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  a {
    display: inline-block;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    padding: 0.45em 0.95em;
    border-radius: ${theme.radius.pill};
    border: 1px solid var(--feature-line);
    background: var(--feature-chip);
    &:hover {
      border-color: currentColor;
    }
  }
`

const Cta = styled(Link)`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  min-height: 52px;
  padding: 0 1.6em;
  border-radius: ${theme.radius.pill};
  background: ${theme.color.primary};
  color: ${theme.color.primaryText};
  font-weight: 900;
  font-size: 1rem;
  text-decoration: none;
  box-shadow: 0 6px 18px rgba(215, 38, 61, 0.35);
  transition:
    background 0.15s ease,
    transform 0.15s ease;
  &:hover {
    background: ${theme.color.primaryHover};
    transform: translateX(2px);
  }
`

const Spec = styled.p`
  font-size: 0.75rem;
  color: var(--feature-muted);
`

export function TemplateFeatures({ items }: { items: FeatureItem[] }) {
  return (
    <>
      <Container>
        <Hero>
          <Kicker>FEATURED TEMPLATES</Kicker>
          <HeroTitle>
            <span>文字を入れるだけで、</span>
            <span>
              <em>ニュース風の発表画像</em>
            </span>
            <span>ができる。</span>
          </HeroTitle>
          <HeroLead>
            「今年の漢字」「号外」「緊急記者会見」「〇〇大賞」など、おなじみの発表スタイルを一つずつ作り込みました。登録不要・無料で、作った画像はPNGで保存してそのままSNSに投稿できます。
          </HeroLead>
          <Toc aria-labelledby="toc-heading">
            <h2 id="toc-heading">CONTENTS</h2>
            <ol>
              {items.map(({ template, category }, i) => (
                <li key={template.id}>
                  <a href={`#${template.id}`}>
                    <span>{pad(i + 1)}</span>
                    <strong>{template.title}</strong>
                    {category && <small>{category.name}</small>}
                  </a>
                </li>
              ))}
            </ol>
          </Toc>
        </Hero>
      </Container>

      <div id="features">
        {items.map(({ template, category, samples }, i) => {
          const { width, height, background } = template.canvas
          const portrait = height > width
          const reverse = i % 2 === 1
          const href = `/create/${template.id}/`
          const select = () =>
            track("template_select", { template_id: template.id })
          return (
            <Feature
              key={template.id}
              id={template.id}
              aria-labelledby={`${template.id}-title`}
              $bg={background}
              $dark={luminance(background) < 0.2}
              $portrait={portrait}
            >
              <Container>
                <FeatureGrid $portrait={portrait} $reverse={reverse}>
                  <Visual
                    href={href}
                    onClick={select}
                    tabIndex={-1}
                    aria-hidden="true"
                    $portrait={portrait}
                    $reverse={reverse}
                  >
                    {template.thumbnail ? (
                      <img
                        src={assetPath(
                          template.thumbnail.replace(/\.png$/, ".webp")
                        )}
                        alt=""
                        width={width}
                        height={height}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : (
                      <TemplateSvg
                        template={template}
                        values={initialValues(template)}
                        idPrefix={`feature-${template.id}`}
                      />
                    )}
                  </Visual>
                  <Copy $portrait={portrait}>
                    <Head>
                      <Eyebrow>
                        <b>{pad(i + 1)}</b>
                        {category && (
                          <span>
                            <span aria-hidden="true">{category.icon} </span>
                            {category.name}
                          </span>
                        )}
                      </Eyebrow>
                      <Title id={`${template.id}-title`}>
                        <Link href={href} onClick={select}>
                          {template.title}
                        </Link>
                      </Title>
                      <Catch>{template.description}</Catch>
                    </Head>
                    <Body>
                      {template.longDescription && (
                        <p>{template.longDescription}</p>
                      )}
                      {samples.length > 0 && (
                        <Samples>
                          <h3>たとえば、こんな一枚</h3>
                          <ul>
                            {samples.map((s, j) => (
                              <li key={s.href}>
                                <Link
                                  href={s.href}
                                  onClick={() =>
                                    track("template_select", {
                                      template_id: template.id,
                                      sample: j,
                                    })
                                  }
                                >
                                  {s.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </Samples>
                      )}
                      <Cta href={href} onClick={select}>
                        {template.title}を作る
                        <span aria-hidden="true">→</span>
                      </Cta>
                      <Spec>
                        {width}×{height}px ・{" "}
                        {portrait
                          ? "縦長"
                          : width === height
                            ? "正方形"
                            : "横長"}
                        ・PNG保存
                      </Spec>
                    </Body>
                  </Copy>
                </FeatureGrid>
              </Container>
            </Feature>
          )
        })}
      </div>
    </>
  )
}
