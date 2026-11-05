/**
 * テンプレート定義の読み込み（ビルド時・サーバー側のみ）。
 * src/data/templates に JSON を追加するだけで新しいテンプレートが登録される。
 */
import fs from "node:fs"
import path from "node:path"
import categoriesJson from "@/data/categories.json"
import type { Category, TemplateDefinition } from "@/types/template"
import { validateTemplate } from "./template-validation"

const TEMPLATE_DIR = path.join(process.cwd(), "src/data/templates")

export const categories: Category[] = categoriesJson as Category[]

let cache: TemplateDefinition[] | null = null

export function getAllTemplates(): TemplateDefinition[] {
  if (cache && process.env.NODE_ENV === "production") return cache
  const files = fs
    .readdirSync(TEMPLATE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
  const templates = files.map((file) => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, file), "utf8")
    )
    const template = validateTemplate(raw, categories)
    if (`${template.id}.json` !== file) {
      throw new Error(
        `テンプレート ID "${template.id}" とファイル名 "${file}" が一致しません`
      )
    }
    return template
  })
  cache = templates
  return templates
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return getAllTemplates().find((t) => t.id === id)
}

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}
