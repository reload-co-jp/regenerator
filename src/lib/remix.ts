/**
 * 作品リンク（入力内容を URL に埋め込んで共有する仕組み）。
 *
 * サーバーを持たない静的サイトのため、入力値は URL の `?v=` に
 * JSON → UTF-8 → base64url で格納する。画像フィールドは容量が大きく、
 * 個人の写真が意図せず共有されるのを防ぐため含めない。
 * 受け取った側はその内容をプレビューしたまま「自分版」に編集できる。
 */
import type {
  FieldDefinition,
  FieldValue,
  FieldValues,
  TemplateDefinition,
} from "@/types/template"
import { defaultValue } from "./template-values"

export const REMIX_PARAM = "v"

/** 1フィールドあたりの文字数上限（maxLength 未指定時） */
const FALLBACK_MAX_LENGTH = 400
/** 解読する文字列の上限（異常に長い URL を無視する） */
const MAX_ENCODED_LENGTH = 8000

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}

function sameValue(a: FieldValue, b: FieldValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** 既定値から変更されたフィールドだけを URL 用の文字列にする。変更がなければ null */
export function encodeValues(
  template: TemplateDefinition,
  values: FieldValues
): string | null {
  const diff: Record<string, FieldValue> = {}
  for (const field of template.fields) {
    if (field.type === "image") continue
    const value = values[field.id]
    if (value === undefined || sameValue(value, defaultValue(field))) continue
    diff[field.id] = Array.isArray(value)
      ? value.filter((v) => v.trim() !== "")
      : value
  }
  if (Object.keys(diff).length === 0) return null
  return toBase64Url(JSON.stringify(diff))
}

function sanitize(
  field: FieldDefinition,
  raw: unknown
): FieldValue | undefined {
  const limit = field.maxLength ?? FALLBACK_MAX_LENGTH
  switch (field.type) {
    case "image":
      return undefined
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw)
      if (raw === null || Number.isNaN(n)) return null
      if (field.min !== undefined && n < field.min) return field.min
      if (field.max !== undefined && n > field.max) return field.max
      return n
    }
    case "list": {
      if (!Array.isArray(raw)) return undefined
      const items = raw
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.slice(0, limit))
        .slice(0, field.maxItems ?? 50)
      return items.length > 0 ? items : [""]
    }
    case "select":
      return field.options?.some((o) => o.value === raw)
        ? String(raw)
        : undefined
    case "date":
      return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw
        : undefined
    default:
      return typeof raw === "string" ? raw.slice(0, limit) : undefined
  }
}

/**
 * URL の文字列から入力値を復元する。
 * 不正な値・存在しないフィールドは無視し、1件も復元できなければ null。
 */
export function decodeValues(
  template: TemplateDefinition,
  encoded: string
): Partial<FieldValues> | null {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(fromBase64Url(encoded))
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null
  const result: FieldValues = {}
  for (const field of template.fields) {
    if (!(field.id in parsed)) continue
    const value = sanitize(field, (parsed as Record<string, unknown>)[field.id])
    if (value !== undefined) result[field.id] = value
  }
  return Object.keys(result).length > 0 ? result : null
}

/** 入力内容入りの作品リンク。既定値のままならテンプレートの URL を返す */
export function remixUrl(
  baseUrl: string,
  template: TemplateDefinition,
  values: FieldValues
): string {
  const encoded = encodeValues(template, values)
  return encoded ? `${baseUrl}?${REMIX_PARAM}=${encoded}` : baseUrl
}

/** 現在のページ URL（location.search）から作品の入力値を読む */
export function readRemixFromSearch(
  template: TemplateDefinition,
  search: string
): Partial<FieldValues> | null {
  const encoded = new URLSearchParams(search).get(REMIX_PARAM)
  return encoded ? decodeValues(template, encoded) : null
}
