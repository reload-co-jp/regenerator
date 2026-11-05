import type { FieldValues, TemplateDefinition } from "@/types/template"
import { remixUrl } from "./remix"
import { absoluteUrl } from "./site"
import { interpolateValues } from "./template-values"

export interface ShareContent {
  text: string
  hashtags: string[]
  url: string
}

export function templateUrl(templateId: string): string {
  return absoluteUrl(`/create/${templateId}/`)
}

export function buildShareContent(
  template: TemplateDefinition,
  values: FieldValues
): ShareContent {
  return {
    text: interpolateValues(template.share.text, template, values).trim(),
    hashtags: (template.share.hashtags ?? []).map((h) => h.replace(/^#/, "")),
    // 入力内容入りの作品リンク。開いた人が同じ画像を見て、そのまま自分版を作れる
    url: remixUrl(templateUrl(template.id), template, values),
  }
}

/** 投稿文（本文 + ハッシュタグ + URL）をひとつの文字列にする */
export function shareTextWithTags(content: ShareContent): string {
  const tags = content.hashtags.map((h) => `#${h}`).join(" ")
  return [content.text, tags, content.url].filter(Boolean).join("\n")
}

/** X の投稿画面（Web Intent）の URL */
export function xIntentUrl(content: ShareContent): string {
  const params = new URLSearchParams({ text: content.text, url: content.url })
  if (content.hashtags.length > 0)
    params.set("hashtags", content.hashtags.join(","))
  return `https://x.com/intent/post?${params.toString()}`
}

export function canShareFiles(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  )
}

/** Web Share API で画像を共有する。非対応なら false を返す */
export async function shareImage(
  file: File,
  content: ShareContent
): Promise<boolean> {
  if (!canShareFiles(file)) return false
  try {
    await navigator.share({
      files: [file],
      text: shareTextWithTags({ ...content, url: "" }) + `\n${content.url}`,
      title: content.text,
    })
    return true
  } catch (err) {
    // ユーザーによるキャンセルは成功扱い（フォールバックしない）
    if (err instanceof DOMException && err.name === "AbortError") return true
    return false
  }
}

export function canCopyImage(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  )
}

/** 画像をクリップボードにコピーする。Promise を渡すことで Safari のユーザー操作制約に対応 */
export async function copyImage(blob: Blob | Promise<Blob>): Promise<void> {
  if (!canCopyImage()) throw new Error("この環境では画像をコピーできません")
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement("textarea")
  ta.value = text
  ta.setAttribute("readonly", "")
  ta.style.position = "fixed"
  ta.style.opacity = "0"
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand("copy")
  ta.remove()
  if (!ok) throw new Error("コピーに失敗しました")
}
