import { describe, expect, it } from "vitest"
import {
  countGraphemes,
  estimateMeasure,
  fitText,
  toBreakUnits,
  wrapParagraph,
} from "../text-layout"

/** 全角=1em, 半角=0.5em の単純な計測 */
const mono = (text: string, size: number) =>
  Array.from(text).reduce(
    (w, c) => w + (c.charCodeAt(0) < 0x2000 ? 0.5 : 1),
    0
  ) * size
const width = (s: string) => mono(s, 10)

describe("graphemes", () => {
  it("counts emoji sequences as one character", () => {
    expect(countGraphemes("👨‍👩‍👧‍👦🇯🇵あ")).toBe(3)
  })
})

describe("kinsoku (line breaking rules)", () => {
  it("never starts a line with closing punctuation or small kana", () => {
    const lines = wrapParagraph("あいうえおかきくけ。こさしすせそっ", 90, width)
    for (const line of lines) {
      expect(line[0]).not.toMatch(/[。、」っ]/)
    }
  })

  it("never ends a line with an opening bracket", () => {
    const lines = wrapParagraph("あいうえおかきく「けこ」さしすせそ", 90, width)
    for (const line of lines) {
      expect(line[line.length - 1]).not.toBe("「")
    }
  })

  it("keeps latin words together", () => {
    const units = toBreakUnits("Hello world です")
    expect(units).toContain("Hello")
    expect(units).toContain("world")
  })

  it("splits words that are wider than the line", () => {
    const lines = wrapParagraph("abcdefghijklmnopqrstuvwxyz", 50, width)
    expect(lines.length).toBeGreaterThan(1)
    for (const l of lines) expect(width(l)).toBeLessThanOrEqual(50)
  })

  it("keepWords keeps katakana words and attaches particles", () => {
    expect(toBreakUnits("猫、自力でドアを開ける", true)).toEqual([
      "猫、",
      "自力で",
      "ドアを",
      "開ける",
    ])
  })
})

describe("fitText", () => {
  it("keeps the font size when the text fits", () => {
    const r = fitText("今年", { fontSize: 40, maxWidth: 200, measure: mono })
    expect(r.fontSize).toBe(40)
    expect(r.lines).toEqual(["今年"])
  })

  it("shrinks a single line to fit the width", () => {
    const r = fitText("あいうえおかきくけこ", {
      fontSize: 100,
      maxWidth: 500,
      maxLines: 1,
      measure: mono,
    })
    expect(r.fontSize).toBeLessThanOrEqual(50)
    expect(r.width).toBeLessThanOrEqual(500)
    expect(r.truncated).toBe(false)
  })

  it("wraps and keeps within maxLines and maxHeight", () => {
    const text = "あ".repeat(60)
    const r = fitText(text, {
      fontSize: 40,
      maxWidth: 400,
      maxHeight: 200,
      lineHeight: 1.25,
      measure: mono,
    })
    expect(r.height).toBeLessThanOrEqual(200)
    expect(r.width).toBeLessThanOrEqual(400)
  })

  it("truncates with an ellipsis when it cannot fit at the minimum size", () => {
    const r = fitText("あ".repeat(500), {
      fontSize: 40,
      minFontSize: 20,
      maxWidth: 200,
      maxLines: 2,
      measure: mono,
    })
    expect(r.truncated).toBe(true)
    expect(r.lines).toHaveLength(2)
    expect(r.lines[1].endsWith("…")).toBe(true)
    for (const l of r.lines)
      expect(mono(l, r.fontSize)).toBeLessThanOrEqual(200)
  })

  it("respects explicit newlines", () => {
    const r = fitText("年間\n大賞", { fontSize: 40, measure: mono })
    expect(r.lines).toEqual(["年間", "大賞"])
    expect(r.fontSize).toBe(40)
  })

  it("does not shrink when autoFit is disabled", () => {
    const r = fitText("あいうえお", {
      fontSize: 100,
      maxWidth: 200,
      maxLines: 1,
      autoFit: false,
      measure: mono,
    })
    expect(r.fontSize).toBe(100)
    expect(r.truncated).toBe(true)
  })

  it("returns no lines for empty text", () => {
    expect(fitText("", { fontSize: 40, measure: mono }).lines).toEqual([])
  })

  it("balance evens out line lengths", () => {
    const r = fitText("あいうえおかきくけこさ", {
      fontSize: 10,
      maxWidth: 100,
      maxLines: 2,
      balance: true,
      autoFit: false,
      measure: mono,
    })
    expect(r.lines).toHaveLength(2)
    expect(Math.abs(r.lines[0].length - r.lines[1].length)).toBeLessThanOrEqual(
      1
    )
  })

  it("estimateMeasure handles mixed widths", () => {
    expect(estimateMeasure("あ", 10)).toBe(10)
    expect(estimateMeasure("a", 10)).toBeLessThan(10)
    expect(estimateMeasure("😀", 10)).toBeGreaterThan(10)
  })
})
