"use client"

import styled from "styled-components"
import type { HowToStep, SampleLink } from "@/lib/seo-content"
import { theme } from "@/styles/theme"
import type { Category, FaqItem, TemplateDefinition } from "@/types/template"
import { TemplateCard } from "./TemplateCard"
import { Container } from "./ui"

const Wrap = styled(Container)`
  display: flex;
  flex-direction: column;
  gap: 36px;
  margin-top: 40px;
  section > h2 {
    font-size: 1.15rem;
    font-weight: 900;
    margin-bottom: 12px;
  }
`

const Lead = styled.p`
  color: ${theme.color.textMuted};
  font-size: 0.9rem;
  line-height: 1.8;
`

const Steps = styled.ol`
  display: grid;
  gap: 12px;
  counter-reset: step;
  ${theme.bp.md} {
    grid-template-columns: repeat(3, 1fr);
  }
  li {
    counter-increment: step;
    background: ${theme.color.surface};
    border: 1px solid ${theme.color.border};
    border-radius: ${theme.radius.lg};
    padding: 16px;
    font-size: 0.85rem;
    line-height: 1.7;
    h3 {
      font-size: 0.95rem;
      margin-bottom: 4px;
      &::before {
        content: counter(step);
        display: inline-grid;
        place-items: center;
        width: 1.6em;
        height: 1.6em;
        margin-right: 0.5em;
        border-radius: 50%;
        background: ${theme.color.primary};
        color: #fff;
        font-size: 0.85em;
      }
    }
  }
`

const Samples = styled.ul`
  display: grid;
  gap: 10px;
  ${theme.bp.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  a {
    display: block;
    height: 100%;
    background: ${theme.color.surface};
    border: 1px solid ${theme.color.border};
    border-radius: ${theme.radius.md};
    padding: 12px 14px;
    text-decoration: none;
    &:hover {
      border-color: ${theme.color.primary};
    }
    strong {
      display: block;
      font-size: 0.9rem;
    }
    span {
      display: block;
      font-size: 0.8rem;
      color: ${theme.color.textMuted};
      margin-top: 2px;
    }
  }
`

const Faq = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  details {
    background: ${theme.color.surface};
    border: 1px solid ${theme.color.border};
    border-radius: ${theme.radius.md};
    padding: 12px 14px;
  }
  summary {
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
  }
  p {
    margin-top: 8px;
    font-size: 0.85rem;
    line-height: 1.7;
    color: ${theme.color.textMuted};
  }
`

const Related = styled.ul`
  display: grid;
  gap: 16px;
  ${theme.bp.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  ${theme.bp.lg} {
    grid-template-columns: repeat(3, 1fr);
  }
`

const Tags = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  li {
    font-size: 0.75rem;
    color: ${theme.color.textMuted};
    background: ${theme.color.surfaceAlt};
    border-radius: ${theme.radius.pill};
    padding: 0.2em 0.8em;
  }
`

export function TemplateGuide({
  template,
  steps,
  samples,
  faq,
  related,
  categories,
}: {
  template: TemplateDefinition
  steps: HowToStep[]
  samples: SampleLink[]
  faq: FaqItem[]
  related: TemplateDefinition[]
  categories: Category[]
}) {
  return (
    <Wrap>
      <section aria-labelledby="about-heading">
        <h2 id="about-heading">{template.title}画像メーカーとは</h2>
        <Lead>{template.longDescription ?? template.description}</Lead>
        {template.tags.length > 0 && (
          <Tags aria-label="関連キーワード">
            {template.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </Tags>
        )}
      </section>

      <section aria-labelledby="howto-heading">
        <h2 id="howto-heading">{template.title}画像の作り方</h2>
        <Steps>
          {steps.map((s) => (
            <li key={s.name}>
              <h3>{s.name}</h3>
              {s.text}
            </li>
          ))}
        </Steps>
      </section>

      {samples.length > 0 && (
        <section aria-labelledby="samples-heading">
          <h2 id="samples-heading">作例・ネタ帳</h2>
          <Lead>
            タップすると入力済みの状態で開きます。文字を書き換えて自分版にどうぞ。
          </Lead>
          <Samples style={{ marginTop: 12 }}>
            {samples.map((s) => (
              <li key={s.href}>
                {/* 同じページへのクエリ違いの遷移なので、通常のリンクで読み込み直す */}
                <a href={s.href}>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </a>
              </li>
            ))}
          </Samples>
        </section>
      )}

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading">よくある質問</h2>
        <Faq>
          {faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Faq>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading">ほかのテンプレートも作ってみる</h2>
          <Related>
            {related.map((t) => (
              <li key={t.id}>
                <TemplateCard
                  template={t}
                  category={categories.find((c) => c.id === t.category)}
                />
              </li>
            ))}
          </Related>
        </section>
      )}
    </Wrap>
  )
}
