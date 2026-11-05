import { describe, expect, it } from "vitest"
import { validateAll } from "@/components/DynamicForm"
import type { FieldValues } from "@/types/template"
import {
  decodeValues,
  encodeValues,
  readRemixFromSearch,
  remixUrl,
} from "../remix"
import { buildShareContent } from "../share"
import {
  howToSteps,
  relatedTemplates,
  sampleLinks,
  templateFaq,
} from "../seo-content"
import { getAllTemplates, getTemplate } from "../template-loader"
import { initialValues } from "../template-values"
import { validateTemplate } from "../template-validation"

describe("remix links", () => {
  const kanji = getTemplate("kanji-of-the-year")!

  it("returns null when nothing changed", () => {
    expect(encodeValues(kanji, initialValues(kanji))).toBeNull()
    expect(
      remixUrl("https://example.com/x/", kanji, initialValues(kanji))
    ).toBe("https://example.com/x/")
  })

  it("round-trips Japanese text with URL-safe characters", () => {
    const values = {
      ...initialValues(kanji),
      kanji: "推",
      reason: "遠征＆グッズ😊",
    }
    const encoded = encodeValues(kanji, values)!
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeValues(kanji, encoded)).toEqual({
      kanji: "推",
      reason: "遠征＆グッズ😊",
    })
    expect(readRemixFromSearch(kanji, `?v=${encoded}`)).toEqual({
      kanji: "推",
      reason: "遠征＆グッズ😊",
    })
  })

  it("ignores broken input and unknown fields", () => {
    expect(decodeValues(kanji, "!!!")).toBeNull()
    expect(decodeValues(kanji, btoa("not json"))).toBeNull()
    const unknown = btoa(JSON.stringify({ nope: "x" }))
    expect(decodeValues(kanji, unknown)).toBeNull()
  })

  it("sanitizes values to the field constraints", () => {
    const mvp = getTemplate("monthly-mvp")!
    const raw = btoa(
      JSON.stringify({
        month: "13",
        name: 123,
        photo: "data:image/png;base64,AA",
        year: "20260",
      })
    )
    // month は options 外、name は文字列でない、photo は画像なので無視。year は maxLength で切り詰め
    expect(decodeValues(mvp, raw)).toEqual({ year: "2026" })
  })

  it("never includes image fields", () => {
    const news = getTemplate("breaking-news")!
    const values: FieldValues = {
      ...initialValues(news),
      headline: "速報",
      photo: "data:image/png;base64,AAAA",
    }
    const decoded = decodeValues(news, encodeValues(news, values)!)
    expect(decoded).toEqual({ headline: "速報" })
  })

  it("uses the remix link in share content", () => {
    const values = { ...initialValues(kanji), kanji: "推" }
    const url = new URL(buildShareContent(kanji, values).url)
    expect(url.pathname).toBe("/create/kanji-of-the-year/")
    expect(decodeValues(kanji, url.searchParams.get("v")!)).toEqual({
      kanji: "推",
    })
  })
})

describe("samples and SEO content", () => {
  for (const template of getAllTemplates()) {
    it(`${template.id}: samples are valid inputs`, () => {
      expect(template.samples?.length ?? 0).toBeGreaterThan(0)
      for (const sample of template.samples ?? []) {
        const values = { ...initialValues(template), ...sample.values }
        expect(validateAll(template.fields, values), sample.title).toEqual({})
      }
    })

    it(`${template.id}: sample links restore the sample`, () => {
      const links = sampleLinks(template)
      links.forEach((link, i) => {
        const search = new URL(link.href, "https://example.com").search
        const restored = readRemixFromSearch(template, search)
        // 既定値と同じ項目はリンクに含めないので、既定値と合成して比較する
        expect(
          { ...initialValues(template), ...restored },
          link.title
        ).toMatchObject(template.samples![i].values as Record<string, unknown>)
        expect(link.text).not.toMatch(/\{[\w-]+\}/)
      })
    })
  }

  it("builds how-to steps, FAQ and related templates", () => {
    const t = getTemplate("kanji-of-the-year")!
    expect(howToSteps(t)).toHaveLength(3)
    expect(templateFaq(t).length).toBeGreaterThan(t.faq!.length)
    const related = relatedTemplates(t, getAllTemplates())
    expect(related).toHaveLength(3)
    expect(related.map((r) => r.id)).not.toContain(t.id)
    // 同じカテゴリのテンプレートが先頭に来る
    expect(related[0].category).toBe(t.category)
  })

  it("rejects samples that reference unknown fields or invalid options", () => {
    const base = getTemplate("monthly-mvp")!
    expect(() =>
      validateTemplate({
        ...base,
        samples: [{ title: "x", values: { nope: "1" } }],
      })
    ).toThrow(/存在しないフィールド/)
    expect(() =>
      validateTemplate({
        ...base,
        samples: [{ title: "x", values: { month: "13" } }],
      })
    ).toThrow(/options にない値/)
  })
})
