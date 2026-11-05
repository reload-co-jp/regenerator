"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "styled-components"
import { track } from "@/lib/analytics"
import { buildShareContent } from "@/lib/share"
import { downloadBlob, pngFileName, svgToPngBlob } from "@/lib/svg-to-png"
import { initialValues } from "@/lib/template-values"
import { theme } from "@/styles/theme"
import type {
  Category,
  FieldValue,
  FieldValues,
  TemplateDefinition,
} from "@/types/template"
import { DynamicForm, validateAll } from "./DynamicForm"
import { ImageDownloadButton } from "./ImageDownloadButton"
import { ShareButtons } from "./ShareButtons"
import { TemplatePreview } from "./TemplatePreview"
import { Button, CategoryBadge, Container } from "./ui"

const Layout = styled(Container)`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "info"
    "preview"
    "form"
    "actions";
  gap: 16px;
  padding-top: 16px;
  ${theme.bp.md} {
    grid-template-columns: minmax(320px, 5fr) minmax(0, 7fr);
    grid-template-areas:
      "info preview"
      "form preview"
      "actions preview";
    grid-template-rows: auto auto 1fr;
    column-gap: 32px;
    row-gap: 20px;
    padding-top: 28px;
  }
`

const Info = styled.header`
  grid-area: info;
  nav {
    font-size: 0.8rem;
    color: ${theme.color.textMuted};
    margin-bottom: 8px;
    a {
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
  h1 {
    font-size: clamp(1.35rem, 4vw, 1.8rem);
    font-weight: 900;
    line-height: 1.3;
    margin: 6px 0;
  }
  p {
    color: ${theme.color.textMuted};
    font-size: 0.9rem;
  }
`

const PreviewArea = styled.section`
  grid-area: preview;
  /* スマートフォンでも入力しながら確認できるよう、プレビューを上部に固定 */
  position: sticky;
  top: 0;
  z-index: 4;
  margin: 0 -16px;
  padding: 8px 16px 10px;
  background: ${theme.color.bg};
  & > div {
    max-width: calc(42vh * var(--ratio));
    margin: 0 auto;
  }
  ${theme.bp.md} {
    top: 16px;
    align-self: start;
    margin: 0;
    padding: 0;
    & > div {
      max-width: min(100%, calc((100vh - 120px) * var(--ratio)));
    }
  }
`

const SizeLabel = styled.p`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  span:first-child {
    display: none;
    ${theme.bp.md} {
      display: inline;
    }
  }
  font-size: 0.75rem;
  color: ${theme.color.textMuted};
  margin-top: 6px;
`

const Panel = styled.section`
  background: ${theme.color.surface};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.lg};
  padding: 18px 16px;
  ${theme.bp.md} {
    padding: 22px;
  }
`

const FormArea = styled(Panel)`
  grid-area: form;
`

const Actions = styled(Panel)`
  grid-area: actions;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: start;
  h2 {
    font-size: 0.95rem;
  }
`

const ResetRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`

const Notice = styled.p`
  font-size: 0.8rem;
  color: ${theme.color.danger};
  font-weight: 700;
`

const AfterDownload = styled.div`
  border: 2px solid ${theme.color.success};
  background: #effaf3;
  border-radius: ${theme.radius.md};
  padding: 12px 14px;
  font-size: 0.85rem;
  strong {
    display: block;
    font-size: 0.95rem;
    margin-bottom: 2px;
  }
`

export function TemplateEditor({
  template,
  category,
}: {
  template: TemplateDefinition
  category?: Category
}) {
  const [values, setValues] = useState<FieldValues>(() =>
    initialValues(template)
  )
  const [touched, setTouched] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const blobCache = useRef<{ key: string; blob: Promise<Blob> } | null>(null)

  useEffect(() => {
    track("template_view", { template_id: template.id })
  }, [template.id])

  const errors = useMemo(
    () => validateAll(template.fields, values),
    [template.fields, values]
  )
  const hasErrors = Object.keys(errors).length > 0
  const shareContent = useMemo(
    () => buildShareContent(template, values),
    [template, values]
  )
  const valuesKey = useMemo(() => JSON.stringify(values), [values])

  const onChange = useCallback((id: string, value: FieldValue) => {
    setTouched(true)
    setDownloaded(false)
    setValues((prev) => ({ ...prev, [id]: value }))
  }, [])

  /** 現在の入力内容の PNG（同じ入力なら再生成しない） */
  const getBlob = useCallback((): Promise<Blob> => {
    if (blobCache.current?.key === valuesKey) return blobCache.current.blob
    const svg = svgRef.current
    if (!svg) return Promise.reject(new Error("プレビューが見つかりません"))
    track("image_generate", { template_id: template.id })
    const blob = svgToPngBlob(svg)
    blobCache.current = { key: valuesKey, blob }
    blob.catch(() => (blobCache.current = null))
    return blob
  }, [valuesKey, template.id])

  const download = useCallback(async () => {
    setError(null)
    try {
      const blob = await getBlob()
      downloadBlob(blob, pngFileName(template.id))
      track("image_download", { template_id: template.id })
      setDownloaded(true)
    } catch (err) {
      console.error(err)
      setError("画像の生成に失敗しました。時間をおいて再度お試しください。")
    }
  }, [getBlob, template.id])

  const reset = () => {
    if (touched && !window.confirm("入力内容を初期状態に戻しますか？")) return
    setValues(initialValues(template))
    setTouched(false)
    setDownloaded(false)
  }

  const { width, height } = template.canvas
  const orientation =
    width > height ? "横長" : width === height ? "正方形" : "縦長"

  return (
    <Layout style={{ ["--ratio" as string]: width / height }}>
      <Info>
        <nav aria-label="パンくずリスト">
          <Link href="/">トップ</Link>
          {category && (
            <>
              {" › "}
              <Link href={`/?category=${category.id}`}>{category.name}</Link>
            </>
          )}
        </nav>
        {category && (
          <CategoryBadge>
            <span aria-hidden="true">{category.icon}</span>
            {category.name}
          </CategoryBadge>
        )}
        <h1>{template.title}</h1>
        <p>{template.description}</p>
      </Info>

      <PreviewArea aria-label="プレビュー">
        <div>
          <TemplatePreview
            template={template}
            values={values}
            svgRef={svgRef}
          />
          <SizeLabel>
            <span>プレビュー（入力するとすぐに反映されます）</span>
            <span>
              出力サイズ {width}×{height}px・{orientation}
            </span>
          </SizeLabel>
        </div>
      </PreviewArea>

      <FormArea aria-label="入力フォーム">
        <DynamicForm
          fields={template.fields}
          values={values}
          errors={touched ? errors : {}}
          onChange={onChange}
        />
        <ResetRow>
          <Button type="button" $variant="ghost" $size="sm" onClick={reset}>
            ↺ 入力をリセット
          </Button>
        </ResetRow>
      </FormArea>

      <Actions aria-label="保存と共有">
        <ImageDownloadButton onDownload={download} disabled={hasErrors} />
        {hasErrors && (
          <Notice role="alert">
            未入力の必須項目、または入力内容に誤りがあります。
          </Notice>
        )}
        {error && <Notice role="alert">{error}</Notice>}
        {downloaded && (
          <AfterDownload role="status">
            <strong>✅ 画像を保存しました！</strong>
            保存した画像を添付して、Xなどに投稿してみましょう。
          </AfterDownload>
        )}
        <h2>SNSでシェア</h2>
        <ShareButtons
          templateId={template.id}
          content={shareContent}
          getBlob={getBlob}
          fileName={() => pngFileName(template.id)}
          onFallbackDownload={download}
        />
      </Actions>
    </Layout>
  )
}
