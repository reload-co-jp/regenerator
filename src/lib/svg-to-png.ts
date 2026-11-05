/**
 * SVG → Canvas → PNG 変換（クライアント側で完結）。
 *
 * SVG を <img> として Canvas に描くと、ページで読み込んだ Web フォントは
 * 使われない。そのため、描画に使っている文字を含むフォントファイル
 * （unicode-range 分割済み）だけを data URL として SVG に埋め込んでから変換する。
 */
import { FONT_MANIFEST_PATH } from "./fonts"
import { assetPath } from "./site"

interface FontFace {
  family: string
  weight: number
  file: string
  unicodeRange: string
}

interface FontManifest {
  faces: FontFace[]
}

let manifestPromise: Promise<FontManifest> | null = null

function loadManifest(): Promise<FontManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(FONT_MANIFEST_PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`font manifest: ${res.status}`)
        return res.json() as Promise<FontManifest>
      })
      .catch((err) => {
        manifestPromise = null
        throw err
      })
  }
  return manifestPromise
}

/** "U+0-ff,U+131" → [[0,255],[305,305]] */
export function parseUnicodeRange(range: string): [number, number][] {
  return range
    .split(",")
    .map((part) => part.trim().replace(/^U\+/i, ""))
    .filter(Boolean)
    .map((part) => {
      if (part.includes("?")) {
        return [
          parseInt(part.replace(/\?/g, "0"), 16),
          parseInt(part.replace(/\?/g, "f"), 16),
        ] as [number, number]
      }
      const [a, b] = part.split("-")
      return [parseInt(a, 16), parseInt(b ?? a, 16)] as [number, number]
    })
}

export function rangeContainsAny(
  ranges: [number, number][],
  codePoints: Set<number>
): boolean {
  for (const cp of codePoints) {
    for (const [a, b] of ranges) {
      if (cp >= a && cp <= b) return true
    }
  }
  return false
}

const dataUrlCache = new Map<string, Promise<string>>()

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function fetchAsDataUrl(url: string): Promise<string> {
  let p = dataUrlCache.get(url)
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${url}: ${res.status}`)
        return res.blob()
      })
      .then(blobToDataUrl)
    p.catch(() => dataUrlCache.delete(url))
    dataUrlCache.set(url, p)
  }
  return p
}

/** font-family 属性から先頭のフォント名を取り出す */
function firstFamily(fontFamily: string): string {
  return fontFamily
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "")
}

/** SVG 内のテキストを フォント名 → ウェイト → 使用文字 で集計する */
export function collectSvgGlyphs(svg: SVGSVGElement) {
  const usage = new Map<string, Map<number, Set<number>>>()
  svg.querySelectorAll("text").forEach((text) => {
    const family = firstFamily(text.getAttribute("font-family") ?? "")
    const weight = Number(text.getAttribute("font-weight") ?? 400)
    const byWeight = usage.get(family) ?? new Map<number, Set<number>>()
    const set = byWeight.get(weight) ?? new Set<number>()
    for (const ch of text.textContent ?? "") set.add(ch.codePointAt(0)!)
    byWeight.set(weight, set)
    usage.set(family, byWeight)
  })
  return usage
}

/** 使用文字を含むフォントファイルだけを埋め込む @font-face を作る */
export async function buildEmbeddedFontCss(
  svg: SVGSVGElement
): Promise<string> {
  const usage = collectSvgGlyphs(svg)
  if (usage.size === 0) return ""
  const manifest = await loadManifest()
  const jobs: Promise<string>[] = []
  for (const face of manifest.faces) {
    const chars = usage.get(face.family)?.get(face.weight)
    if (!chars || chars.size === 0) continue
    if (!rangeContainsAny(parseUnicodeRange(face.unicodeRange), chars)) continue
    jobs.push(
      fetchAsDataUrl(assetPath(`/fonts/${face.file}`)).then(
        (data) =>
          `@font-face{font-family:'${face.family}';font-weight:${face.weight};font-style:normal;` +
          `src:url(${data}) format('woff2');unicode-range:${face.unicodeRange};}`
      )
    )
  }
  return (await Promise.all(jobs)).join("\n")
}

/** プレビューの SVG から、単体で完結する SVG 文字列を作る */
export async function serializeStandaloneSvg(
  source: SVGSVGElement
): Promise<{ svg: string; width: number; height: number }> {
  const width = Number(source.dataset.width ?? source.viewBox.baseVal.width)
  const height = Number(source.dataset.height ?? source.viewBox.baseVal.height)
  const svg = source.cloneNode(true) as SVGSVGElement
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))
  svg.removeAttribute("style")
  svg.removeAttribute("class")

  // 念のためスクリプト・イベント属性・外部参照を除去
  svg.querySelectorAll("script, foreignObject").forEach((n) => n.remove())
  svg.querySelectorAll("*").forEach((n) => {
    for (const attr of Array.from(n.attributes)) {
      if (attr.name.startsWith("on")) n.removeAttribute(attr.name)
    }
  })

  // 同梱画像は data URL に変換（ユーザー画像は元から data URL）
  await Promise.all(
    Array.from(svg.querySelectorAll("image")).map(async (img) => {
      const href = img.getAttribute("href") ?? ""
      if (href.startsWith("data:")) return
      if (/^(https?:)?\/\//i.test(href)) {
        img.remove()
        return
      }
      img.setAttribute("href", await fetchAsDataUrl(href))
    })
  )

  const css = await buildEmbeddedFontCss(svg)
  if (css) {
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style"
    )
    style.textContent = css
    svg.insertBefore(style, svg.firstChild)
  }
  return { svg: new XMLSerializer().serializeToString(svg), width, height }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "sync"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("SVG の読み込みに失敗しました"))
    img.src = url
  })
}

/** SVG 要素を指定解像度（テンプレートの canvas サイズ）の PNG にする */
export async function svgToPngBlob(source: SVGSVGElement): Promise<Blob> {
  if (document.fonts?.ready) await document.fonts.ready
  const { svg, width, height } = await serializeStandaloneSvg(source)
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  )
  try {
    const img = await loadImage(url)
    if (img.decode) await img.decode().catch(() => undefined)
    // Safari は埋め込みフォントの適用が onload 直後に間に合わないことがある
    await new Promise((r) => setTimeout(r, 60))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas を利用できません")
    ctx.drawImage(img, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PNG の生成に失敗しました")),
        "image/png"
      )
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** テンプレートIDと日時からファイル名を作る（例: breaking-news-20261105-153012.png） */
export function pngFileName(templateId: string, date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  const stamp =
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  return `${templateId}-${stamp}.png`
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
