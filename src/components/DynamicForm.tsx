"use client"

import { useId, useRef, useState } from "react"
import styled, { css } from "styled-components"
import { countGraphemes, graphemes } from "@/lib/text-layout"
import { theme } from "@/styles/theme"
import type { FieldDefinition, FieldValue, FieldValues } from "@/types/template"
import { Button } from "./ui"

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]
const MAX_IMAGE_DIMENSION = 1600

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 700;
`

const Required = styled.span`
  font-size: 0.7rem;
  color: ${theme.color.primary};
  margin-left: 6px;
`

const Counter = styled.span<{ $over: boolean }>`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${(p) => (p.$over ? theme.color.danger : theme.color.textMuted)};
  font-variant-numeric: tabular-nums;
`

const inputStyle = css<{ $invalid?: boolean }>`
  width: 100%;
  border: 1px solid
    ${(p) => (p.$invalid ? theme.color.danger : theme.color.border)};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  padding: 10px 12px;
  /* iOS のズームを防ぐため 16px 以上 */
  font-size: 1rem;
  line-height: 1.5;
`

const Input = styled.input<{ $invalid?: boolean }>`
  ${inputStyle}
  min-height: 46px;
`

const TextArea = styled.textarea<{ $invalid?: boolean }>`
  ${inputStyle}
  min-height: 96px;
  resize: vertical;
`

const Select = styled.select<{ $invalid?: boolean }>`
  ${inputStyle}
  min-height: 46px;
`

const Help = styled.p`
  font-size: 0.78rem;
  color: ${theme.color.textMuted};
`

const ErrorText = styled.p`
  font-size: 0.78rem;
  color: ${theme.color.danger};
  font-weight: 700;
`

const ListRow = styled.li`
  display: flex;
  gap: 6px;
  align-items: center;
  & + & {
    margin-top: 6px;
  }
`

const ListIndex = styled.span`
  flex: none;
  width: 1.8em;
  text-align: right;
  font-size: 0.8rem;
  color: ${theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`

const IconButton = styled.button`
  flex: none;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${theme.color.border};
  background: ${theme.color.surface};
  border-radius: ${theme.radius.sm};
  cursor: pointer;
  font-size: 0.9rem;
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

const ImageBox = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: ${theme.radius.md};
    border: 1px solid ${theme.color.border};
  }
`

const FileLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 1em;
  border: 1px dashed ${theme.color.textMuted};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  &:focus-within {
    outline: 3px solid ${theme.color.focus};
  }
  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
`

/** 書記素数で文字数を切り詰める（絵文字を途中で切らない） */
export function truncateGraphemes(text: string, max?: number): string {
  if (!max) return text
  const gs = graphemes(text)
  return gs.length > max ? gs.slice(0, max).join("") : text
}

/** 入力値の検証。エラーメッセージを返す（問題なければ null） */
export function validateField(
  field: FieldDefinition,
  value: FieldValue
): string | null {
  const isEmpty =
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.every((v) => v.trim() === "")) ||
    (typeof value === "string" && value.trim() === "")
  if (field.required && isEmpty) return `${field.label}を入力してください`
  if (isEmpty) return null
  if (
    typeof value === "string" &&
    (field.type === "text" || field.type === "textarea")
  ) {
    const n = countGraphemes(value)
    if (field.maxLength && n > field.maxLength)
      return `${field.maxLength}文字以内で入力してください`
    if (field.minLength && n < field.minLength)
      return `${field.minLength}文字以上で入力してください`
  }
  if (field.type === "number") {
    const n = Number(value)
    if (Number.isNaN(n)) return "数値を入力してください"
    if (field.min !== undefined && n < field.min)
      return `${field.min}以上で入力してください`
    if (field.max !== undefined && n > field.max)
      return `${field.max}以下で入力してください`
  }
  if (field.type === "list" && Array.isArray(value)) {
    const filled = value.filter((v) => v.trim() !== "").length
    if (field.minItems && filled < field.minItems)
      return `${field.minItems}件以上入力してください`
  }
  if (
    field.type === "date" &&
    typeof value === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "日付を正しく入力してください"
  }
  return null
}

export function validateAll(fields: FieldDefinition[], values: FieldValues) {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    const e = validateField(f, values[f.id] ?? null)
    if (e) errors[f.id] = e
  }
  return errors
}

/** アップロード画像を検証し、縮小・再エンコードした data URL にする */
export async function readImageFile(
  file: File,
  maxFileSize = DEFAULT_MAX_FILE_SIZE
): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("PNG・JPEG・WebP・GIF 形式の画像を選択してください")
  }
  if (file.size > maxFileSize) {
    throw new Error(
      `${Math.round(maxFileSize / 1024 / 1024)}MB 以下の画像を選択してください`
    )
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("画像を読み込めませんでした"))
      el.src = url
    })
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight)
    )
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("画像を処理できませんでした")
    ctx.drawImage(img, 0, 0, w, h)
    // 透過を保つため PNG/GIF/WebP は PNG、それ以外は JPEG に再エンコード（メタデータも除去される）
    return file.type === "image/jpeg"
      ? canvas.toDataURL("image/jpeg", 0.9)
      : canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface FieldProps {
  field: FieldDefinition
  value: FieldValue
  error?: string
  onChange: (value: FieldValue) => void
}

function TextField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  const composing = useRef(false)
  const text = typeof value === "string" ? value : ""
  const count = countGraphemes(text)
  const Component = (field.type === "textarea"
    ? TextArea
    : Input) as unknown as React.ComponentType<Record<string, unknown>>
  const handle = (next: string) =>
    onChange(
      composing.current ? next : truncateGraphemes(next, field.maxLength)
    )
  return (
    <FieldWrap>
      <LabelRow>
        <label htmlFor={id}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </label>
        {field.maxLength && (
          <Counter $over={count > field.maxLength} aria-live="polite">
            {count}/{field.maxLength}
          </Counter>
        )}
      </LabelRow>
      <Component
        id={id}
        name={field.id}
        value={text}
        placeholder={field.placeholder}
        $invalid={!!error}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : field.help ? `${id}-help` : undefined
        }
        rows={field.type === "textarea" ? 3 : undefined}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={(
          e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => {
          composing.current = false
          handle(e.currentTarget.value)
        }}
        onChange={(
          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => handle(e.target.value)}
        autoComplete="off"
      />
      {field.help && <Help id={`${id}-help`}>{field.help}</Help>}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </FieldWrap>
  )
}

function NumberField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  return (
    <FieldWrap>
      <LabelRow>
        <label htmlFor={id}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </label>
      </LabelRow>
      <Input
        id={id}
        name={field.id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={field.placeholder}
        $invalid={!!error}
        aria-invalid={!!error}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
      {field.help && <Help>{field.help}</Help>}
      {error && <ErrorText>{error}</ErrorText>}
    </FieldWrap>
  )
}

function SelectField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  return (
    <FieldWrap>
      <LabelRow>
        <label htmlFor={id}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </label>
      </LabelRow>
      <Select
        id={id}
        name={field.id}
        value={typeof value === "string" ? value : ""}
        $invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      >
        {!field.required && <option value="">（なし）</option>}
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {field.help && <Help>{field.help}</Help>}
      {error && <ErrorText>{error}</ErrorText>}
    </FieldWrap>
  )
}

function DateField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  return (
    <FieldWrap>
      <LabelRow>
        <label htmlFor={id}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </label>
      </LabelRow>
      <Input
        id={id}
        name={field.id}
        type="date"
        value={typeof value === "string" ? value : ""}
        $invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.help && <Help>{field.help}</Help>}
      {error && <ErrorText>{error}</ErrorText>}
    </FieldWrap>
  )
}

function ListField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  const items = Array.isArray(value) && value.length > 0 ? value : [""]
  const max = field.maxItems ?? 20
  const composing = useRef(false)
  const update = (next: string[]) => onChange(next)
  const setItem = (i: number, text: string) => {
    const next = [...items]
    next[i] = composing.current
      ? text
      : truncateGraphemes(text, field.maxLength)
    update(next)
  }
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    update(next)
  }
  const remove = (i: number) =>
    update(items.length > 1 ? items.filter((_, j) => j !== i) : [""])
  const filled = items.filter((v) => v.trim() !== "").length
  return (
    <FieldWrap role="group" aria-labelledby={`${id}-label`}>
      <LabelRow>
        <span id={`${id}-label`}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </span>
        <Counter $over={false}>
          {filled}/{max}件
        </Counter>
      </LabelRow>
      <ol>
        {items.map((item, i) => (
          <ListRow key={i}>
            <ListIndex aria-hidden="true">{i + 1}.</ListIndex>
            <Input
              value={item}
              placeholder={field.placeholder}
              aria-label={`${field.label} ${i + 1}件目`}
              onCompositionStart={() => (composing.current = true)}
              onCompositionEnd={(e) => {
                composing.current = false
                setItem(i, e.currentTarget.value)
              }}
              onChange={(e) => setItem(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  if (i === items.length - 1 && items.length < max)
                    update([...items, ""])
                }
              }}
              autoComplete="off"
            />
            <IconButton
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`${i + 1}件目を上へ`}
            >
              ↑
            </IconButton>
            <IconButton
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              aria-label={`${i + 1}件目を下へ`}
            >
              ↓
            </IconButton>
            <IconButton
              type="button"
              onClick={() => remove(i)}
              aria-label={`${i + 1}件目を削除`}
            >
              ✕
            </IconButton>
          </ListRow>
        ))}
      </ol>
      <div>
        <Button
          type="button"
          $size="sm"
          onClick={() => update([...items, ""])}
          disabled={items.length >= max}
        >
          ＋ 項目を追加
        </Button>
      </div>
      {field.help && <Help>{field.help}</Help>}
      {error && <ErrorText>{error}</ErrorText>}
    </FieldWrap>
  )
}

function ImageField({ field, value, error, onChange }: FieldProps) {
  const id = useId()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const src =
    typeof value === "string" && value.startsWith("data:image/") ? value : null
  return (
    <FieldWrap>
      <LabelRow>
        <span id={`${id}-label`}>
          {field.label}
          {field.required && <Required>必須</Required>}
        </span>
      </LabelRow>
      <ImageBox>
        {src && <img src={src} alt="選択中の画像" />}
        <FileLabel>
          {busy ? "読み込み中…" : src ? "画像を変更" : "画像を選択"}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            aria-labelledby={`${id}-label`}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (!file) return
              setBusy(true)
              setUploadError(null)
              try {
                onChange(await readImageFile(file, field.maxFileSize))
              } catch (err) {
                setUploadError(
                  err instanceof Error
                    ? err.message
                    : "画像を読み込めませんでした"
                )
              } finally {
                setBusy(false)
              }
            }}
          />
        </FileLabel>
        {src && (
          <Button
            type="button"
            $variant="ghost"
            $size="sm"
            onClick={() => onChange(null)}
          >
            削除
          </Button>
        )}
      </ImageBox>
      <Help>
        {field.help ??
          "ご自身で撮影した写真など、使用する権利のある画像のみアップロードしてください。"}
        画像は端末内だけで処理され、送信されません。
      </Help>
      {(uploadError || error) && <ErrorText>{uploadError ?? error}</ErrorText>}
    </FieldWrap>
  )
}

const FIELD_COMPONENTS: Record<
  FieldDefinition["type"],
  (p: FieldProps) => React.ReactNode
> = {
  text: TextField,
  textarea: TextField,
  number: NumberField,
  select: SelectField,
  date: DateField,
  list: ListField,
  image: ImageField,
}

export function DynamicForm({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: FieldDefinition[]
  values: FieldValues
  errors: Record<string, string>
  onChange: (id: string, value: FieldValue) => void
}) {
  return (
    <Form
      onSubmit={(e) => e.preventDefault()}
      noValidate
      aria-label="画像の入力項目"
    >
      {fields.map((field) => {
        const Component = FIELD_COMPONENTS[field.type]
        return (
          <Component
            key={field.id}
            field={field}
            value={values[field.id] ?? null}
            error={errors[field.id]}
            onChange={(v) => onChange(field.id, v)}
          />
        )
      })}
    </Form>
  )
}
