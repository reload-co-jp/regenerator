import type {
  Category,
  FieldDefinition,
  TemplateDefinition,
  TemplateElement,
} from "@/types/template"

const FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "select",
  "date",
  "list",
  "image",
])

const ELEMENT_TYPES = new Set([
  "text",
  "field",
  "rect",
  "circle",
  "ellipse",
  "line",
  "path",
  "image",
  "group",
  "list",
  "pattern",
])

/** 外部参照・スクリプトになりうる値を拒否する */
const UNSAFE_VALUE = /(javascript:|<script|url\(\s*['"]?(?!#)|https?:\/\/)/i

export class TemplateValidationError extends Error {
  constructor(
    public templateId: string,
    public problems: string[]
  ) {
    super(
      `Invalid template "${templateId}":\n` +
        problems.map((p) => `  - ${p}`).join("\n")
    )
    this.name = "TemplateValidationError"
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

function validateField(f: unknown, i: number, problems: string[]) {
  const where = `fields[${i}]`
  if (!isObject(f)) {
    problems.push(`${where} はオブジェクトである必要があります`)
    return
  }
  if (typeof f.id !== "string" || !/^[\w-]+$/.test(f.id)) {
    problems.push(`${where}.id が不正です`)
  }
  if (typeof f.label !== "string" || f.label === "") {
    problems.push(`${where}.label は必須です`)
  }
  if (!FIELD_TYPES.has(f.type as string)) {
    problems.push(`${where}.type "${String(f.type)}" は未対応です`)
  }
  if (f.type === "select") {
    if (!Array.isArray(f.options) || f.options.length === 0) {
      problems.push(`${where} (select) には options が必要です`)
    }
  }
  if (
    f.type === "list" &&
    f.default !== undefined &&
    !Array.isArray(f.default)
  ) {
    problems.push(`${where} (list) の default は配列である必要があります`)
  }
  for (const key of [
    "maxLength",
    "minLength",
    "min",
    "max",
    "maxItems",
    "minItems",
  ]) {
    if (f[key] !== undefined && typeof f[key] !== "number") {
      problems.push(`${where}.${key} は数値である必要があります`)
    }
  }
}

function validateElements(
  elements: unknown,
  where: string,
  fields: Map<string, FieldDefinition>,
  problems: string[],
  inList = false
) {
  if (!Array.isArray(elements)) {
    problems.push(`${where} は配列である必要があります`)
    return
  }
  elements.forEach((raw, i) => {
    const path = `${where}[${i}]`
    if (!isObject(raw)) {
      problems.push(`${path} はオブジェクトである必要があります`)
      return
    }
    const el = raw as unknown as TemplateElement
    if (!ELEMENT_TYPES.has(el.type)) {
      problems.push(`${path}.type "${String(el.type)}" は未対応です`)
      return
    }
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string" && UNSAFE_VALUE.test(value)) {
        problems.push(`${path}.${key} に外部参照・スクリプトは使えません`)
      }
    }
    const refField = (key: string | undefined, prop: string) => {
      if (key && key !== "item" && key !== "itemFlag" && !fields.has(key)) {
        problems.push(
          `${path}.${prop} が存在しないフィールド "${key}" を参照しています`
        )
      }
    }
    refField(el.if, "if")
    refField(el.unless, "unless")
    if (el.byIndex && !inList) {
      problems.push(`${path}.byIndex は list 要素の item 内でのみ使えます`)
    }
    switch (el.type) {
      case "text":
        if (typeof el.text !== "string")
          problems.push(`${path}.text は必須です`)
        else {
          for (const [, key] of el.text.matchAll(/\{([\w-]+)(?::[^}]*)?\}/g)) {
            if (inList && ["item", "index", "count"].includes(key)) continue
            refField(key, "text")
          }
        }
        break
      case "field":
        if (!el.field) problems.push(`${path}.field は必須です`)
        refField(el.field, "field")
        break
      case "image":
        if (el.field) {
          refField(el.field, "field")
          if (fields.get(el.field) && fields.get(el.field)!.type !== "image") {
            problems.push(
              `${path}.field は image 型のフィールドを指定してください`
            )
          }
        }
        if (el.src && !el.src.startsWith("/")) {
          problems.push(
            `${path}.src は同梱画像（/ から始まるパス）のみ指定できます`
          )
        }
        if (el.placeholder) {
          validateElements(
            el.placeholder,
            `${path}.placeholder`,
            fields,
            problems,
            inList
          )
        }
        break
      case "path":
        if (typeof el.d !== "string") problems.push(`${path}.d は必須です`)
        break
      case "circle":
        if (el.r === undefined) problems.push(`${path}.r は必須です`)
        break
      case "group":
      case "pattern":
        validateElements(
          el.children,
          `${path}.children`,
          fields,
          problems,
          inList
        )
        break
      case "list":
        refField(el.field, "field")
        if (fields.get(el.field) && fields.get(el.field)!.type !== "list") {
          problems.push(
            `${path}.field は list 型のフィールドを指定してください`
          )
        }
        validateElements(el.item, `${path}.item`, fields, problems, true)
        break
    }
  })
}

/** JSON から読み込んだテンプレート定義を検証する */
export function validateTemplate(
  raw: unknown,
  categories?: Category[]
): TemplateDefinition {
  const problems: string[] = []
  const id = isObject(raw) && typeof raw.id === "string" ? raw.id : "(unknown)"
  if (!isObject(raw))
    throw new TemplateValidationError(id, ["オブジェクトではありません"])

  if (typeof raw.id !== "string" || !/^[a-z0-9-]+$/.test(raw.id)) {
    problems.push("id は英小文字・数字・ハイフンのみで指定してください")
  }
  for (const key of ["title", "description", "category", "createdAt"]) {
    if (typeof raw[key] !== "string" || raw[key] === "") {
      problems.push(`${key} は必須です`)
    }
  }
  if (
    typeof raw.createdAt === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.createdAt)
  ) {
    problems.push("createdAt は YYYY-MM-DD 形式で指定してください")
  }
  if (categories && !categories.some((c) => c.id === raw.category)) {
    problems.push(
      `category "${String(raw.category)}" は categories.json に存在しません`
    )
  }
  if (!Array.isArray(raw.tags)) problems.push("tags は配列である必要があります")

  const canvas = raw.canvas
  if (!isObject(canvas)) {
    problems.push("canvas は必須です")
  } else {
    for (const key of ["width", "height"] as const) {
      const v = canvas[key]
      if (typeof v !== "number" || v <= 0 || v > 4096) {
        problems.push(`canvas.${key} は 1〜4096 の数値で指定してください`)
      }
    }
    if (typeof canvas.background !== "string") {
      problems.push('canvas.background は必須です（透過は "transparent"）')
    }
  }

  const fieldList = Array.isArray(raw.fields) ? raw.fields : []
  if (!Array.isArray(raw.fields))
    problems.push("fields は配列である必要があります")
  fieldList.forEach((f, i) => validateField(f, i, problems))
  const fields = new Map<string, FieldDefinition>()
  for (const f of fieldList as FieldDefinition[]) {
    if (fields.has(f.id))
      problems.push(`フィールド ID "${f.id}" が重複しています`)
    fields.set(f.id, f)
  }

  validateElements(raw.elements, "elements", fields, problems)

  if (!isObject(raw.share) || typeof raw.share.text !== "string") {
    problems.push("share.text は必須です")
  }

  if (raw.samples !== undefined) {
    if (!Array.isArray(raw.samples)) {
      problems.push("samples は配列である必要があります")
    } else {
      raw.samples.forEach((sample, i) => {
        const where = `samples[${i}]`
        if (!isObject(sample) || typeof sample.title !== "string") {
          problems.push(`${where}.title は必須です`)
          return
        }
        if (!isObject(sample.values)) {
          problems.push(`${where}.values はオブジェクトである必要があります`)
          return
        }
        for (const [key, value] of Object.entries(sample.values)) {
          const field = fields.get(key)
          if (!field) {
            problems.push(`${where}.values.${key} は存在しないフィールドです`)
          } else if (field.type === "image") {
            problems.push(`${where}.values.${key} に画像は指定できません`)
          } else if (field.type === "list" && !Array.isArray(value)) {
            problems.push(`${where}.values.${key} は配列で指定してください`)
          } else if (
            field.type === "select" &&
            !field.options?.some((o) => o.value === String(value))
          ) {
            problems.push(
              `${where}.values.${key} は options にない値です（${String(value)}）`
            )
          }
        }
      })
    }
  }
  if (raw.faq !== undefined) {
    if (
      !Array.isArray(raw.faq) ||
      raw.faq.some(
        (f) =>
          !isObject(f) || typeof f.q !== "string" || typeof f.a !== "string"
      )
    ) {
      problems.push("faq は { q, a } の配列で指定してください")
    }
  }

  if (problems.length > 0) throw new TemplateValidationError(id, problems)
  return raw as unknown as TemplateDefinition
}
