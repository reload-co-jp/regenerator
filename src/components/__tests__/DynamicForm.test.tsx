import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import type { FieldDefinition, FieldValues } from "@/types/template"
import { DynamicForm, truncateGraphemes, validateField } from "../DynamicForm"

const fields: FieldDefinition[] = [
  {
    id: "title",
    label: "タイトル",
    type: "text",
    required: true,
    maxLength: 5,
  },
  {
    id: "kind",
    label: "種類",
    type: "select",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
  { id: "count", label: "数", type: "number", min: 1, max: 10 },
  { id: "items", label: "項目", type: "list", maxItems: 3 },
  { id: "date", label: "日付", type: "date" },
  { id: "body", label: "本文", type: "textarea" },
  { id: "photo", label: "写真", type: "image" },
]

function Harness() {
  const [values, setValues] = useState<FieldValues>({
    title: "",
    kind: "a",
    count: 1,
    items: [""],
    date: "",
    body: "",
    photo: null,
  })
  return (
    <>
      <DynamicForm
        fields={fields}
        values={values}
        errors={{}}
        onChange={(id, v) => setValues((p) => ({ ...p, [id]: v }))}
      />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </>
  )
}

describe("DynamicForm", () => {
  it("renders an input for every field type", () => {
    render(<Harness />)
    expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument()
    expect(screen.getByLabelText(/種類/).tagName).toBe("SELECT")
    expect(screen.getByLabelText(/^数/)).toHaveAttribute("type", "number")
    expect(screen.getByLabelText(/日付/)).toHaveAttribute("type", "date")
    expect(screen.getByLabelText(/本文/).tagName).toBe("TEXTAREA")
    expect(screen.getByText("画像を選択")).toBeInTheDocument()
  })

  it("truncates text to maxLength", () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText(/タイトル/), {
      target: { value: "あいうえおかき" },
    })
    expect(screen.getByTestId("values").textContent).toContain(
      '"title":"あいうえお"'
    )
  })

  it("adds list items up to maxItems", () => {
    render(<Harness />)
    const add = screen.getByText(/項目を追加/)
    fireEvent.click(add)
    fireEvent.click(add)
    expect(screen.getAllByLabelText(/項目 \d件目/)).toHaveLength(3)
    expect(add).toBeDisabled()
  })
})

describe("validation helpers", () => {
  it("reports required and range errors", () => {
    expect(validateField(fields[0], "")).toMatch(/入力してください/)
    expect(validateField(fields[2], 20)).toMatch(/以下/)
    expect(validateField(fields[2], 5)).toBeNull()
  })

  it("truncates by grapheme", () => {
    expect(truncateGraphemes("👍🏽👍🏽👍🏽", 2)).toBe("👍🏽👍🏽")
  })
})
