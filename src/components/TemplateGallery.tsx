"use client"

import { useEffect, useMemo, useState } from "react"
import styled, { css } from "styled-components"
import { theme } from "@/styles/theme"
import type { Category, TemplateDefinition } from "@/types/template"
import { TemplateCard } from "./TemplateCard"
import { Container, VisuallyHidden } from "./ui"

type Sort = "popular" | "new"

const Hero = styled.section`
  padding: 32px 0 20px;
  ${theme.bp.md} {
    padding: 48px 0 28px;
  }
  h1 {
    font-size: clamp(1.5rem, 5vw, 2.4rem);
    font-weight: 900;
    line-height: 1.3;
    letter-spacing: 0.01em;
  }
  h1 > span {
    display: inline-block;
  }
  h1 em {
    font-style: normal;
    color: ${theme.color.primary};
  }
  p {
    margin-top: 10px;
    color: ${theme.color.textMuted};
    font-size: 0.95rem;
    max-width: 40em;
  }
`

const Steps = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  li {
    font-size: 0.8rem;
    font-weight: 700;
    background: ${theme.color.surface};
    border: 1px solid ${theme.color.border};
    border-radius: ${theme.radius.pill};
    padding: 0.3em 0.9em;
  }
  li span {
    color: ${theme.color.primary};
    margin-right: 0.4em;
  }
`

const Toolbar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  background: ${theme.color.bg};
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface}
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none' stroke='%236b665c' stroke-width='2'%3E%3Ccircle cx='8' cy='8' r='6'/%3E%3Cpath d='m13 13 4 4'/%3E%3C/svg%3E")
    no-repeat 12px center;
  padding: 0 12px 0 38px;
  font-size: 1rem;
`

const SortSelect = styled.select`
  height: 44px;
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  padding: 0 10px;
  font-size: 0.9rem;
`

const Chips = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 0 16px 2px;
  &::-webkit-scrollbar {
    display: none;
  }
  ${theme.bp.md} {
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
  }
`

const Chip = styled.button<{ $active: boolean }>`
  flex: none;
  height: 36px;
  border-radius: ${theme.radius.pill};
  border: 1px solid ${theme.color.border};
  background: ${theme.color.surface};
  padding: 0 14px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  ${(p) =>
    p.$active &&
    css`
      background: ${theme.color.accent};
      border-color: ${theme.color.accent};
      color: #fff;
    `}
`

const Section = styled.section`
  margin-top: 28px;
  h2 {
    font-size: 1.15rem;
    font-weight: 900;
    margin-bottom: 12px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  h2 small {
    font-size: 0.8rem;
    font-weight: 400;
    color: ${theme.color.textMuted};
  }
`

const Grid = styled.ul`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  ${theme.bp.sm} {
    grid-template-columns: repeat(2, 1fr);
  }
  ${theme.bp.lg} {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
`

const Rail = styled.ul`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(250px, 78%);
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  margin: 0 -16px;
  padding: 2px 16px 12px;
  & > li {
    scroll-snap-align: start;
  }
  ${theme.bp.sm} {
    grid-auto-columns: minmax(250px, 44%);
  }
  ${theme.bp.lg} {
    grid-auto-columns: calc((100% - 28px) / 3);
    margin: 0;
    padding: 2px 0 12px;
  }
`

const Empty = styled.p`
  padding: 40px 0;
  text-align: center;
  color: ${theme.color.textMuted};
`

/** 検索用に全角・半角、ひらがな・カタカナの違いを吸収する */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, " ")
    .trim()
}

export function filterTemplates(
  templates: TemplateDefinition[],
  {
    query,
    category,
    sort,
  }: { query: string; category: string | null; sort: Sort }
): TemplateDefinition[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean)
  return templates
    .filter((t) => !category || t.category === category)
    .filter((t) => {
      if (words.length === 0) return true
      const haystack = normalizeSearch(
        [t.title, t.description, t.id, ...t.tags].join(" ")
      )
      return words.every((w) => haystack.includes(w))
    })
    .sort((a, b) =>
      sort === "new"
        ? b.createdAt.localeCompare(a.createdAt) ||
          a.title.localeCompare(b.title)
        : (b.popularity ?? 0) - (a.popularity ?? 0)
    )
}

export function TemplateGallery({
  templates,
  categories,
}: {
  templates: TemplateDefinition[]
  categories: Category[]
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>("popular")

  // ?category= / ?q= を初期値として反映（静的書き出しのためクライアントで読む）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get("category")
    const q = params.get("q")
    /* eslint-disable react-hooks/set-state-in-effect */
    if (c && categories.some((x) => x.id === c)) setCategory(c)
    if (q) setQuery(q)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [categories])

  useEffect(() => {
    const params = new URLSearchParams()
    if (category) params.set("category", category)
    if (query) params.set("q", query)
    const qs = params.toString()
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname
    )
  }, [category, query])

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )
  const results = useMemo(
    () => filterTemplates(templates, { query, category, sort }),
    [templates, query, category, sort]
  )
  const popular = useMemo(
    () =>
      filterTemplates(templates, {
        query: "",
        category: null,
        sort: "popular",
      }).slice(0, 3),
    [templates]
  )
  const newest = useMemo(
    () =>
      filterTemplates(templates, {
        query: "",
        category: null,
        sort: "new",
      }).slice(0, 3),
    [templates]
  )
  const filtering = query.trim() !== "" || category !== null

  const renderCard = (t: TemplateDefinition, priority = false) => (
    <li key={t.id}>
      <TemplateCard
        template={t}
        category={categoryMap.get(t.category)}
        priority={priority}
      />
    </li>
  )

  return (
    <Container>
      <Hero>
        <h1>
          <span>文字を入れるだけで、</span>
          <span>
            <em>ニュース風の発表画像</em>
          </span>
          <span>ができる。</span>
        </h1>
        <p>
          「今年の漢字」「号外」「緊急記者会見」「〇〇大賞」など、おなじみの発表スタイルをテンプレート化しました。登録不要・無料で、作った画像はPNGで保存してそのままSNSに投稿できます。
        </p>
        <Steps aria-label="使い方">
          <li>
            <span>1</span>テンプレートを選ぶ
          </li>
          <li>
            <span>2</span>文字を入力
          </li>
          <li>
            <span>3</span>PNGで保存・Xに投稿
          </li>
        </Steps>
      </Hero>

      <Toolbar role="search">
        <SearchRow>
          <VisuallyHidden as="label" htmlFor="template-search">
            テンプレートを検索
          </VisuallyHidden>
          <SearchInput
            id="template-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="テンプレートを検索（例: 漢字、号外）"
            enterKeyHint="search"
          />
          <VisuallyHidden as="label" htmlFor="template-sort">
            並び順
          </VisuallyHidden>
          <SortSelect
            id="template-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="popular">人気順</option>
            <option value="new">新着順</option>
          </SortSelect>
        </SearchRow>
        <Chips role="group" aria-label="カテゴリで絞り込み">
          <Chip
            type="button"
            $active={category === null}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            すべて
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              type="button"
              $active={category === c.id}
              aria-pressed={category === c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
            >
              <span aria-hidden="true">{c.icon} </span>
              {c.name}
            </Chip>
          ))}
        </Chips>
      </Toolbar>

      {!filtering && (
        <>
          <Section aria-labelledby="popular-heading">
            <h2 id="popular-heading">🔥 人気のテンプレート</h2>
            <Rail>{popular.map((t, i) => renderCard(t, i < 3))}</Rail>
          </Section>
          <Section aria-labelledby="new-heading">
            <h2 id="new-heading">✨ 新着テンプレート</h2>
            <Rail>{newest.map((t) => renderCard(t))}</Rail>
          </Section>
        </>
      )}

      <Section id="templates" aria-labelledby="all-heading">
        <h2 id="all-heading">
          {category
            ? `${categoryMap.get(category)?.name}のテンプレート`
            : "すべてのテンプレート"}
          <small aria-live="polite">{results.length}件</small>
        </h2>
        {results.length > 0 ? (
          <Grid>{results.map((t) => renderCard(t))}</Grid>
        ) : (
          <Empty>
            「{query}」に一致するテンプレートは見つかりませんでした。
            <br />
            別のキーワードやカテゴリでお試しください。
          </Empty>
        )}
      </Section>
    </Container>
  )
}
