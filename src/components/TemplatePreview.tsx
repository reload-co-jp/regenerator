"use client"

import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { clearMeasureCache, loadFontsFor } from "@/lib/fonts"
import { collectFontUsage, TemplateSvg } from "@/lib/template-renderer"
import { theme } from "@/styles/theme"
import type { FieldValues, TemplateDefinition } from "@/types/template"

const Frame = styled.div`
  position: relative;
  border-radius: ${theme.radius.md};
  overflow: hidden;
  box-shadow: ${theme.shadow.raised};
  /* 透過背景のテンプレート用に市松模様 */
  background: repeating-conic-gradient(#e6e2d9 0% 25%, #f6f4ef 0% 50%) 50% /
    20px 20px;
  svg {
    width: 100%;
    height: auto;
  }
`

const Loading = styled.div`
  position: absolute;
  right: 8px;
  top: 8px;
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 8px;
  border-radius: ${theme.radius.pill};
`

/**
 * 入力値に必要なフォントを読み込み、読み込み完了ごとに再レイアウトする。
 * 読み込み前（SSR 含む）は概算の文字幅でレイアウトする。
 */
export function useFontEpoch(
  template: TemplateDefinition,
  values: FieldValues
) {
  const [epoch, setEpoch] = useState(0)
  const [loading, setLoading] = useState(true)
  const usageKey = useMemo(() => {
    const usage = collectFontUsage(template, values)
    return JSON.stringify(Array.from(usage, ([k, m]) => [k, Array.from(m)]))
  }, [template, values])

  useEffect(() => {
    let cancelled = false
    const usage = new Map<string, Map<number, string>>(
      (JSON.parse(usageKey) as [string, [number, string][]][]).map(([k, m]) => [
        k,
        new Map(m),
      ])
    )
    const timer = setTimeout(() => {
      setLoading(true)
      loadFontsFor(usage).then(() => {
        if (cancelled) return
        clearMeasureCache()
        setEpoch((e) => e + 1)
        setLoading(false)
      })
    }, 80)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [usageKey])

  return { epoch, loading }
}

export function TemplatePreview({
  template,
  values,
  svgRef,
}: {
  template: TemplateDefinition
  values: FieldValues
  svgRef: React.Ref<SVGSVGElement>
}) {
  const { epoch, loading } = useFontEpoch(template, values)
  return (
    <Frame>
      <TemplateSvg
        // epoch が変わるたびに実フォントで再計測する
        key={epoch > 0 ? "canvas" : "estimate"}
        template={template}
        values={values}
        idPrefix={`preview-${template.id}`}
        measure={epoch > 0 ? "canvas" : "estimate"}
        svgRef={svgRef}
      />
      {loading && <Loading aria-live="polite">フォント読み込み中…</Loading>}
    </Frame>
  )
}
