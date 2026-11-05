import type {
  FieldDefinition,
  FieldValue,
  FieldValues,
  TemplateDefinition,
} from "@/types/template"

/** テンプレートの既定値から初期入力値を作る */
export function initialValues(template: TemplateDefinition): FieldValues {
  const values: FieldValues = {}
  for (const field of template.fields) {
    values[field.id] = defaultValue(field)
  }
  return values
}

export function defaultValue(field: FieldDefinition): FieldValue {
  switch (field.type) {
    case "list":
      return Array.isArray(field.default) ? [...field.default] : [""]
    case "number":
      return typeof field.default === "number"
        ? field.default
        : field.default !== undefined
          ? Number(field.default)
          : null
    case "image":
      return null
    case "date":
      if (field.default === "today") return todayISO()
      return typeof field.default === "string" ? field.default : ""
    default:
      return field.default !== undefined ? String(field.default) : ""
  }
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function isEmptyValue(value: FieldValue | undefined): boolean {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.every((v) => v.trim() === "")
  if (typeof value === "number") return Number.isNaN(value)
  return value.trim() === ""
}

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"]
const WEEKDAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const KANJI_DIGITS = [
  "〇",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
]

/** 日付（YYYY-MM-DD）を書式化する */
export function formatDate(iso: string, format = "YYYY年M月D日"): string {
  const m = iso.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!m) return iso
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  const tokens: Record<string, string> = {
    YYYY: String(y),
    YY: String(y).slice(-2),
    MM: String(mo).padStart(2, "0"),
    M: String(mo),
    DD: String(d).padStart(2, "0"),
    D: String(d),
    dddd: WEEKDAYS_EN[date.getDay()],
    ddd: WEEKDAYS_JA[date.getDay()],
    KY: toKanjiNumber(y),
    KM: toKanjiNumber(mo),
    KD: toKanjiNumber(d),
  }
  return format.replace(
    /YYYY|YY|MM|M|DD|D|dddd|ddd|KY|KM|KD/g,
    (t) => tokens[t]
  )
}

/** 数字を漢数字（位取りなし: 2026 → 二〇二六、12 → 十二）にする */
export function toKanjiNumber(n: number): string {
  if (n >= 10 && n < 100) {
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return (
      (tens > 1 ? KANJI_DIGITS[tens] : "") +
      "十" +
      (ones ? KANJI_DIGITS[ones] : "")
    )
  }
  return String(n)
    .split("")
    .map((c) => (/\d/.test(c) ? KANJI_DIGITS[Number(c)] : c))
    .join("")
}

/** 表示用に入力値を文字列化する */
export function formatValue(
  value: FieldValue | undefined,
  field: FieldDefinition | undefined,
  format?: string
): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) {
    return value.filter((v) => v.trim() !== "").join(format ?? "、")
  }
  if (field?.type === "number" || typeof value === "number") {
    const n = typeof value === "number" ? value : Number(value)
    if (value === "" || Number.isNaN(n)) return ""
    if (format === "comma") return n.toLocaleString("ja-JP")
    if (format === "kanji") return toKanjiNumber(n)
    return String(n)
  }
  if (field?.type === "date") return value ? formatDate(value, format) : ""
  if (field?.type === "select" && format === "label") {
    return field.options?.find((o) => o.value === value)?.label ?? value
  }
  return value
}

/** "{fieldId}" 形式のプレースホルダーを置換する */
export function interpolate(
  text: string,
  resolve: (key: string, format?: string) => string | undefined
): string {
  return text.replace(/\{([\w-]+)(?::([^}]*))?\}/g, (whole, key, format) => {
    const v = resolve(key, format)
    return v === undefined ? whole : v
  })
}

/** 投稿文などで使う、テンプレート全体の値解決 */
export function interpolateValues(
  text: string,
  template: TemplateDefinition,
  values: FieldValues
): string {
  const fields = new Map(template.fields.map((f) => [f.id, f]))
  return interpolate(text, (key, format) =>
    fields.has(key)
      ? formatValue(values[key], fields.get(key), format)
      : undefined
  )
}
