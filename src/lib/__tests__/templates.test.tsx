import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { getAllTemplates, getTemplate } from "../template-loader"
import {
  TemplateSvg,
  collectFontUsage,
  resolveLength,
} from "../template-renderer"
import {
  validateTemplate,
  TemplateValidationError,
} from "../template-validation"
import {
  formatDate,
  initialValues,
  interpolateValues,
} from "../template-values"
import { buildShareContent, xIntentUrl } from "../share"
import { parseUnicodeRange, pngFileName, rangeContainsAny } from "../svg-to-png"
import type { FieldValues } from "@/types/template"

const REQUIRED_IDS = [
  "kanji-of-the-year",
  "kohaku-lineup",
  "buzzword-of-the-year",
  "breaking-news",
  "emergency-press",
  "ranking",
  "award",
  "monthly-mvp",
  "retirement-announcement",
  "personal-news",
]

describe("template definitions", () => {
  const templates = getAllTemplates()

  it("includes the 10 initial templates", () => {
    expect(templates.map((t) => t.id).sort()).toEqual([...REQUIRED_IDS].sort())
  })

  it("returns undefined for unknown ids", () => {
    expect(getTemplate("does-not-exist")).toBeUndefined()
  })

  for (const template of templates) {
    describe(template.id, () => {
      it("renders with default values", () => {
        const svg = renderToStaticMarkup(
          <TemplateSvg template={template} values={initialValues(template)} />
        )
        expect(svg).toContain(
          `viewBox="0 0 ${template.canvas.width} ${template.canvas.height}"`
        )
        expect(svg).not.toMatch(
          /<script|javascript:|https?:\/\/(?!www\.w3\.org)/
        )
      })

      it("renders with empty values without errors", () => {
        const empty: FieldValues = Object.fromEntries(
          template.fields.map((f) => [
            f.id,
            f.type === "list"
              ? []
              : f.type === "number" || f.type === "image"
                ? null
                : "",
          ])
        )
        expect(() =>
          renderToStaticMarkup(
            <TemplateSvg template={template} values={empty} />
          )
        ).not.toThrow()
      })

      it("renders very long input without errors", () => {
        const long: FieldValues = Object.fromEntries(
          template.fields.map((f) => [
            f.id,
            f.type === "list"
              ? Array(30).fill("とても長い項目名".repeat(10))
              : f.type === "number"
                ? 999999
                : f.type === "image" || f.type === "date" || f.type === "select"
                  ? initialValues(template)[f.id]
                  : "長文テスト😀ABC".repeat(40),
          ])
        )
        expect(() =>
          renderToStaticMarkup(
            <TemplateSvg template={template} values={long} />
          )
        ).not.toThrow()
      })

      it("has a share text that resolves all placeholders", () => {
        const text = interpolateValues(
          template.share.text,
          template,
          initialValues(template)
        )
        expect(text).not.toMatch(/\{[\w-]+\}/)
      })

      it("uses a supported output size", () => {
        expect([`1200x630`, `1080x1080`, `1080x1350`]).toContain(
          `${template.canvas.width}x${template.canvas.height}`
        )
      })
    })
  }
})

describe("SVG escaping", () => {
  it("does not interpret user input as markup", () => {
    const template = getTemplate("breaking-news")!
    const values = {
      ...initialValues(template),
      headline: '<script>alert(1)</script><a href="x">',
    }
    const svg = renderToStaticMarkup(
      <TemplateSvg template={template} values={values} />
    )
    expect(svg).not.toContain("<script>")
    expect(svg).toContain("&lt;script&gt;")
  })

  it("ignores image values that are not data URLs", () => {
    const template = getTemplate("monthly-mvp")!
    const values = {
      ...initialValues(template),
      photo: "https://evil.example/x.png",
    }
    const svg = renderToStaticMarkup(
      <TemplateSvg template={template} values={values} />
    )
    expect(svg).not.toContain("evil.example")
  })
})

describe("validation", () => {
  const base = getTemplate("kanji-of-the-year")!

  it("rejects unknown field references", () => {
    const bad = { ...base, elements: [{ type: "field", field: "nope" }] }
    expect(() => validateTemplate(bad)).toThrow(TemplateValidationError)
  })

  it("rejects external references", () => {
    const bad = {
      ...base,
      elements: [{ type: "image", src: "https://example.com/a.png" }],
    }
    expect(() => validateTemplate(bad)).toThrow(/外部参照|同梱画像/)
  })

  it("rejects unsupported field types and duplicate ids", () => {
    const bad = {
      ...base,
      fields: [...base.fields, { id: "kanji", label: "x", type: "color" }],
    }
    expect(() => validateTemplate(bad)).toThrow(/未対応|重複/)
  })

  it("rejects unknown categories", () => {
    expect(() => validateTemplate({ ...base, category: "zzz" }, [])).toThrow(
      /category/
    )
  })
})

describe("helpers", () => {
  it("resolves relative lengths", () => {
    expect(resolveLength("50%", 200)).toBe(100)
    expect(resolveLength("100%-40", 200)).toBe(160)
    expect(resolveLength(12, 200)).toBe(12)
    expect(resolveLength(undefined, 200, 7)).toBe(7)
  })

  it("formats dates", () => {
    expect(formatDate("2026-11-05", "YYYY年M月D日（ddd）")).toBe(
      "2026年11月5日（木）"
    )
    expect(formatDate("2026-01-02", "YYYY.MM.DD")).toBe("2026.01.02")
  })

  it("collects font usage per family and weight", () => {
    const t = getTemplate("kanji-of-the-year")!
    const usage = collectFontUsage(t, initialValues(t))
    expect(usage.get("brush")?.get(400)).toContain("挑")
  })

  it("builds an X intent URL with text, url and hashtags", () => {
    const t = getTemplate("kanji-of-the-year")!
    const url = new URL(xIntentUrl(buildShareContent(t, initialValues(t))))
    expect(url.origin).toBe("https://x.com")
    expect(url.searchParams.get("text")).toContain("「挑」")
    expect(url.searchParams.get("hashtags")).toContain("今年の漢字")
    expect(url.searchParams.get("url")).toContain("/create/kanji-of-the-year/")
  })

  it("parses unicode ranges", () => {
    const ranges = parseUnicodeRange("U+0-ff, U+3042, U+4E00-4E0F")
    expect(rangeContainsAny(ranges, new Set([0x3042]))).toBe(true)
    expect(rangeContainsAny(ranges, new Set([0x3043]))).toBe(false)
  })

  it("names PNG files with template id and timestamp", () => {
    expect(pngFileName("award", new Date(2026, 10, 5, 9, 8, 7))).toBe(
      "award-20261105-090807.png"
    )
  })
})

describe("vertical text", () => {
  it("renders one character per line", async () => {
    const { toVertical } = await import("../template-renderer")
    expect(toVertical("ジェネ ー")).toBe("ジ\nェ\nネ\n　\n｜")
  })
})
