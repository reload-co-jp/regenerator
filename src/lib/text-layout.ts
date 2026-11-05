/**
 * 日本語向けテキストレイアウト。
 * - 指定領域に収まるようフォントサイズを自動縮小
 * - 自動改行（禁則処理・英単語の分割回避）
 * - 最大行数・最大高さを超える場合は末尾を「…」で省略
 * - 全角・半角・絵文字（書記素単位）混在に対応
 */

/** text を fontSize(px) で描画したときの幅(px)を返す */
export type MeasureFn = (text: string, fontSize: number) => number

/** 行頭禁則文字（行頭に来てはいけない） */
const NO_LINE_START = new Set(
  Array.from(
    "、。，．,.:;：；!?！？‼⁇⁈⁉)）]］}｝〕〉》」』】〙〗〟’”｠»" +
      "ゝゞーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻" +
      "‐゠–〜～・･…‥"
  )
)

/** 行末禁則文字（行末に来てはいけない） */
const NO_LINE_END = new Set(Array.from("(（[［{｛〔〈《「『【〘〖〝‘“｟«"))

const WORD_CHAR =
  /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}0-9０-９@#$%&*+=_'"’\-–/\\^~|<>]+$/u
const SPACE = /^\s+$/u
const KATAKANA = /^[゠-ヿㇰ-ㇿｦ-ﾟ]$/u
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

let segmenter: Intl.Segmenter | null | undefined
let wordSegmenter: Intl.Segmenter | null | undefined

function words(text: string): string[] {
  if (wordSegmenter === undefined) {
    wordSegmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter("ja", { granularity: "word" })
        : null
  }
  if (!wordSegmenter) return graphemes(text)
  return Array.from(wordSegmenter.segment(text), (s) => s.segment)
}

/** 書記素（見た目の1文字）単位に分割する。絵文字の結合文字も1文字として扱う */
export function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter("ja", { granularity: "grapheme" })
        : null
  }
  if (segmenter) {
    return Array.from(segmenter.segment(text), (s) => s.segment)
  }
  return Array.from(text)
}

/** 書記素数（文字数制限用） */
export function countGraphemes(text: string): number {
  return graphemes(text).length
}

/**
 * 改行可能位置で区切った単位に分割する。
 * 英単語は分割せず、禁則文字は前後の単位に連結する。
 */
export function toBreakUnits(text: string, keepWords = false): string[] {
  const units: string[] = []
  const hasSpace = /\S\s+\S/.test(text)
  for (const g of keepWords ? words(text) : graphemes(text)) {
    const prev = units[units.length - 1]
    if (prev !== undefined) {
      const prevLast = graphemes(prev).pop() ?? ""
      const first = graphemes(g)[0] ?? ""
      // 単語保持モード: ひらがなで始まる語（助詞・送り仮名など）は前の語に付けて文節単位にする
      const attachKana =
        keepWords &&
        /^[ぁ-ゟ]/.test(first) &&
        !/[\s、。，．,.!?！？」』）)]/.test(prevLast)
      // カタカナ語は辞書分割が細かすぎるため連結する
      const katakanaRun =
        keepWords && KATAKANA.test(first) && KATAKANA.test(prevLast)
      // 空白を含む見出しは空白区切りを語の区切りとみなす（例: 「山田 花子 さん」）
      const spaceDelimited =
        keepWords && hasSpace && !SPACE.test(g) && !SPACE.test(prevLast)
      if (
        attachKana ||
        katakanaRun ||
        spaceDelimited ||
        (WORD_CHAR.test(first) && WORD_CHAR.test(prevLast))
      ) {
        units[units.length - 1] = prev + g
        continue
      }
      if (SPACE.test(g) && SPACE.test(prevLast)) {
        units[units.length - 1] = prev + g
        continue
      }
    }
    units.push(g)
  }

  // 禁則: 行頭禁則文字は直前の単位に、行末禁則文字は直後の単位に連結
  const merged: string[] = []
  let carry = ""
  for (const unit of units) {
    const first = graphemes(unit)[0]
    if (
      merged.length > 0 &&
      carry === "" &&
      NO_LINE_START.has(first) &&
      !SPACE.test(merged[merged.length - 1])
    ) {
      merged[merged.length - 1] += unit
      continue
    }
    const current = carry + unit
    carry = ""
    const last = graphemes(current).pop() ?? ""
    if (NO_LINE_END.has(last)) {
      carry = current
      continue
    }
    merged.push(current)
  }
  if (carry) merged.push(carry)
  return merged
}

/** 1行に収まらない単位を書記素単位で強制分割する */
function splitLongUnit(
  unit: string,
  maxWidth: number,
  width: (s: string) => number
): string[] {
  const out: string[] = []
  let line = ""
  for (const g of graphemes(unit)) {
    if (line && width(line + g) > maxWidth) {
      out.push(line)
      line = g
    } else {
      line += g
    }
  }
  if (line) out.push(line)
  return out
}

/** 直近の折り返しで単語の強制分割が起きた段落（fits 判定用） */
const forcedSplits = new Set<string>()

/** 段落テキストを maxWidth で折り返す */
export function wrapParagraph(
  text: string,
  maxWidth: number,
  width: (s: string) => number,
  keepWords = false
): string[] {
  if (text === "") return [""]
  if (!Number.isFinite(maxWidth)) return [text]
  const lines: string[] = []
  let line = ""
  for (const unit of toBreakUnits(text, keepWords)) {
    const candidate = line + unit
    if (width(candidate.trimEnd()) <= maxWidth) {
      line = candidate
      continue
    }
    if (line.trim() !== "") {
      lines.push(line.trimEnd())
      line = ""
    }
    const trimmed = SPACE.test(unit) ? "" : unit
    if (trimmed === "") continue
    if (width(trimmed) <= maxWidth) {
      line = trimmed
    } else {
      forcedSplits.add(text)
      const parts = splitLongUnit(trimmed, maxWidth, width)
      lines.push(...parts.slice(0, -1))
      line = parts[parts.length - 1] ?? ""
    }
  }
  if (line !== "" || lines.length === 0) lines.push(line.trimEnd())
  return lines
}

export interface FitOptions {
  fontSize: number
  minFontSize?: number
  maxWidth?: number
  maxHeight?: number
  maxLines?: number
  /** 行の高さ（フォントサイズに対する倍率） */
  lineHeight?: number
  /** 字間（em） */
  letterSpacing?: number
  /** 横方向の縮小率（0〜1）。計測幅に掛ける */
  condense?: number
  wrap?: boolean
  autoFit?: boolean
  /** 単語（形態素）の途中で改行しない。見出し向け */
  keepWords?: boolean
  /** 複数行になる場合に各行の長さをそろえる。見出し向け */
  balance?: boolean
  measure: MeasureFn
}

export interface FitResult {
  lines: string[]
  fontSize: number
  /** 1行の高さ(px) */
  lineHeightPx: number
  /** 全体の高さ(px) */
  height: number
  /** 最も長い行の幅(px) */
  width: number
  truncated: boolean
}

const ELLIPSIS = "…"

function makeWidth(
  measure: MeasureFn,
  size: number,
  letterSpacing: number,
  condense: number
) {
  return (s: string) => {
    if (s === "") return 0
    const spacing = letterSpacing * size * graphemes(s).length
    return (measure(s, size) + spacing) * condense
  }
}

function layoutAt(text: string, size: number, opts: FitOptions) {
  const {
    maxWidth = Infinity,
    wrap = true,
    letterSpacing = 0,
    condense = 1,
  } = opts
  const width = makeWidth(opts.measure, size, letterSpacing, condense)
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n")
  const lines = wrap
    ? paragraphs.flatMap((p) =>
        wrapParagraph(p, maxWidth, width, opts.keepWords)
      )
    : paragraphs
  const widths = lines.map(width)
  return { lines, widths, width }
}

function maxLinesFor(size: number, opts: FitOptions) {
  const lh = size * (opts.lineHeight ?? 1.3)
  const byHeight =
    opts.maxHeight !== undefined && Number.isFinite(opts.maxHeight)
      ? Math.max(1, Math.floor((opts.maxHeight - size) / lh + 1 + 1e-6))
      : Infinity
  return Math.min(opts.maxLines ?? Infinity, byHeight)
}

function fits(text: string, size: number, opts: FitOptions, allowSplit = true) {
  forcedSplits.clear()
  const { lines, widths } = layoutAt(text, size, opts)
  const maxWidth = opts.maxWidth ?? Infinity
  if (!allowSplit && opts.keepWords && forcedSplits.size > 0) return false
  return (
    lines.length <= maxLinesFor(size, opts) &&
    widths.every((w) => w <= maxWidth + 0.01)
  )
}

function result(
  lines: string[],
  size: number,
  opts: FitOptions,
  truncated: boolean
): FitResult {
  const lineHeightPx = size * (opts.lineHeight ?? 1.3)
  const width = makeWidth(
    opts.measure,
    size,
    opts.letterSpacing ?? 0,
    opts.condense ?? 1
  )
  return {
    lines,
    fontSize: size,
    lineHeightPx,
    height: lines.length === 0 ? 0 : (lines.length - 1) * lineHeightPx + size,
    width: Math.max(0, ...lines.map(width)),
    truncated,
  }
}

/** balance 指定時、行数を変えずに最も狭い幅で折り返し直して行長をそろえる */
function balanced(text: string, size: number, opts: FitOptions): string[] {
  const base = layoutAt(text, size, opts)
  const maxWidth = opts.maxWidth ?? Infinity
  if (!opts.balance || base.lines.length < 2 || !Number.isFinite(maxWidth)) {
    return base.lines
  }
  const count = base.lines.length
  let lo = Math.max(...base.widths) / count
  let hi = maxWidth
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    forcedSplits.clear()
    const trial = layoutAt(text, size, { ...opts, maxWidth: mid })
    if (
      trial.lines.length <= count &&
      (!opts.keepWords || forcedSplits.size === 0)
    )
      hi = mid
    else lo = mid
  }
  return layoutAt(text, size, { ...opts, maxWidth: hi }).lines
}

/** 行を maxWidth に収まるよう末尾を省略する */
function ellipsize(
  line: string,
  maxWidth: number,
  width: (s: string) => number
) {
  if (width(line + ELLIPSIS) <= maxWidth) return line + ELLIPSIS
  const gs = graphemes(line)
  while (gs.length > 0) {
    gs.pop()
    const candidate = gs.join("").trimEnd() + ELLIPSIS
    if (width(candidate) <= maxWidth) return candidate
  }
  return ELLIPSIS
}

/**
 * テキストを領域に収める。
 * フォントサイズを fontSize から minFontSize まで縮小し、それでも収まらない
 * 場合は最大行数で打ち切って「…」を付ける。
 */
export function fitText(text: string, opts: FitOptions): FitResult {
  const autoFit = opts.autoFit ?? true
  const max = opts.fontSize
  const min = autoFit
    ? Math.min(max, opts.minFontSize ?? Math.max(8, Math.round(max * 0.3)))
    : max

  if (text === "") return result([], max, opts, false)

  // keepWords の場合はまず単語を分割せずに収まるサイズを探し、無理なら分割を許す
  for (const allowSplit of opts.keepWords ? [false, true] : [true]) {
    if (fits(text, max, opts, allowSplit)) {
      return result(balanced(text, max, opts), max, opts, false)
    }
    if (min < max && fits(text, min, opts, allowSplit)) {
      // 二分探索で収まる最大のサイズを探す（0.5px 単位）
      let lo = min
      let hi = max
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2
        if (fits(text, mid, opts, allowSplit)) lo = mid
        else hi = mid
      }
      const size = Math.floor(lo * 2) / 2
      return result(balanced(text, size, opts), size, opts, false)
    }
  }

  // 最小サイズでも収まらない: 行数で打ち切り、末尾を省略
  const { lines, width } = layoutAt(text, min, opts)
  const maxWidth = opts.maxWidth ?? Infinity
  const limit = Math.min(lines.length, maxLinesFor(min, opts))
  const kept = lines.slice(0, limit)
  const overflowLines = lines.length > limit
  const truncatedLines = kept.map((line, i) => {
    const isLast = i === kept.length - 1
    if (width(line) > maxWidth || (isLast && overflowLines)) {
      return ellipsize(line, maxWidth, width)
    }
    return line
  })
  return result(truncatedLines, min, opts, true)
}

/** フォントを使わない簡易計測（SSR・フォント読み込み前用）。やや広めに見積もる */
export const estimateMeasure: MeasureFn = (text, fontSize) => {
  let em = 0
  for (const g of graphemes(text)) {
    const cp = g.codePointAt(0) ?? 0
    if (EMOJI.test(g)) em += 1.15
    else if (/\s/.test(g)) em += cp === 0x3000 ? 1 : 0.3
    else if (cp >= 0xff61 && cp <= 0xff9f) em += 0.5
    else if (cp < 0x2000) {
      if (/[ilj.,:;'|!]/.test(g)) em += 0.32
      else if (/[A-Z@MWmw%&]/.test(g)) em += 0.72
      else em += 0.6
    } else em += 1
  }
  return em * fontSize
}
