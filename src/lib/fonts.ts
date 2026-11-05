import fontConfig from "@/data/fonts.json"
import { assetPath } from "./site"
import type { MeasureFn } from "./text-layout"

export interface FontFamilyDefinition {
  family: string
  package: string
  weights: number[]
  fallback: string[]
}

export const FONT_FAMILIES = fontConfig.families as Record<
  string,
  FontFamilyDefinition
>

export const DEFAULT_FONT = "sans"

const quote = (name: string) =>
  /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(name)
    ? name
    : `'${name.replace(/'/g, "")}'`

/** テンプレートの fontFamily（キーまたはフォント名）を CSS の font-family に変換 */
export function fontStack(key: string | undefined): string {
  const def = FONT_FAMILIES[key ?? DEFAULT_FONT]
  const names = def
    ? [def.family, ...def.fallback]
    : [key ?? "", ...FONT_FAMILIES[DEFAULT_FONT].fallback]
  const generic: string[] = names.filter(
    (n) => n === "serif" || n === "sans-serif"
  )
  const specific = names.filter((n) => n && !generic.includes(n))
  return [...specific, ...fontConfig.emoji, ...generic].map(quote).join(", ")
}

/** 定義済みのウェイトのうち最も近いものを返す（合成ボールドを避ける） */
export function resolveWeight(
  key: string | undefined,
  weight: number | "normal" | "bold" | undefined
): number {
  const w =
    weight === "bold" ? 700 : weight === "normal" || !weight ? 400 : weight
  const def = FONT_FAMILIES[key ?? DEFAULT_FONT]
  if (!def) return w
  return def.weights.reduce((best, cur) =>
    Math.abs(cur - w) < Math.abs(best - w) ? cur : best
  )
}

export function primaryFamily(key: string | undefined): string {
  return FONT_FAMILIES[key ?? DEFAULT_FONT]?.family ?? key ?? ""
}

let ctx: CanvasRenderingContext2D | null | undefined

function getContext(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  if (typeof document === "undefined") return null
  try {
    ctx = document.createElement("canvas").getContext("2d")
  } catch {
    ctx = null
  }
  return ctx
}

const cache = new Map<string, number>()

/** Canvas で実際のフォントを使って計測する関数を作る。使えない環境では null */
export function createCanvasMeasure(
  key: string | undefined,
  weight: number
): MeasureFn | null {
  const c = getContext()
  if (!c) return null
  const stack = fontStack(key)
  return (text, fontSize) => {
    const font = `${weight} ${fontSize}px ${stack}`
    const cacheKey = `${font}|${text}`
    const hit = cache.get(cacheKey)
    if (hit !== undefined) return hit
    c.font = font
    const w = c.measureText(text).width
    cache.set(cacheKey, w)
    return w
  }
}

/** フォント読み込み後に古い計測結果を捨てる */
export function clearMeasureCache() {
  cache.clear()
}

/**
 * 指定テキストの描画に必要なフォント（unicode-range 分割ファイル）を読み込む。
 * key -> weight -> text
 */
export async function loadFontsFor(
  usage: Map<string, Map<number, string>>
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return
  const jobs: Promise<unknown>[] = []
  for (const [key, weights] of usage) {
    const family = primaryFamily(key)
    for (const [weight, text] of weights) {
      if (!text) continue
      jobs.push(
        document.fonts.load(`${weight} 32px '${family}'`, text).catch(() => [])
      )
    }
  }
  await Promise.all(jobs)
}

export const FONT_CSS_PATH = assetPath("/fonts/fonts.css")
export const FONT_MANIFEST_PATH = assetPath("/fonts/manifest.json")
