/**
 * テンプレートページの解説コンテンツ（使い方・作例・よくある質問・関連テンプレート）。
 * ビルド時に生成して静的 HTML に含めることで、検索エンジンに読まれるテキストを増やす。
 */
import type { FaqItem, FieldValues, TemplateDefinition } from "@/types/template"
import { encodeValues, REMIX_PARAM } from "./remix"
import { initialValues, interpolateValues } from "./template-values"

export interface SampleLink {
  title: string
  /** 投稿文に差し込んだときの文面（作例の説明として表示） */
  text: string
  href: string
}

export interface HowToStep {
  name: string
  text: string
}

/** 全テンプレート共通のよくある質問 */
export const COMMON_FAQ: FaqItem[] = [
  {
    q: "無料で使えますか？会員登録は必要ですか？",
    a: "すべてのテンプレートを無料で、会員登録なしで使えます。作った画像はPNGで保存できます。",
  },
  {
    q: "入力した文字や写真はサーバーに送信されますか？",
    a: "画像の生成はすべてお使いのブラウザの中で行われ、入力内容や写真がサーバーに送信・保存されることはありません。「作品リンク」を共有した場合のみ、入力した文字（写真は除く）がリンクのURLに含まれます。",
  },
  {
    q: "スマートフォンでも作れますか？",
    a: "iPhone・Androidのブラウザで作成できます。対応端末では「画像を共有」ボタンから、そのままXやLINE、Instagramなどに送れます。",
  },
  {
    q: "実在の番組やイベントの公式画像ですか？",
    a: "いいえ。すべて独自にデザインしたパロディテンプレートで、実在の企業・番組・団体とは関係ありません。個人の楽しみの範囲でご利用ください。",
  },
]

export function templateFaq(template: TemplateDefinition): FaqItem[] {
  return [...(template.faq ?? []), ...COMMON_FAQ]
}

export function howToSteps(template: TemplateDefinition): HowToStep[] {
  const labels = template.fields
    .filter((f) => f.type !== "image")
    .slice(0, 3)
    .map((f) => `「${f.label}」`)
    .join("")
  return [
    {
      name: "文字を入力する",
      text:
        `${labels}などを入力すると、プレビューにすぐ反映されます。` +
        (template.samples?.length
          ? "迷ったら「おまかせで入力」で入力例を呼び出せます。"
          : ""),
    },
    {
      name: "画像を保存する",
      text: `「画像をダウンロード」を押すと、${template.canvas.width}×${template.canvas.height}ピクセルのPNG画像として保存できます。`,
    },
    {
      name: "SNSでシェアする",
      text: "保存した画像を添付してXなどに投稿しましょう。「作品リンク」を一緒に貼ると、見た人が同じテンプレートで自分版を作れます。",
    },
  ]
}

export function sampleLinks(template: TemplateDefinition): SampleLink[] {
  const base = `/create/${template.id}/`
  return (template.samples ?? []).map((sample) => {
    const values: FieldValues = { ...initialValues(template), ...sample.values }
    const encoded = encodeValues(template, values)
    return {
      title: sample.title,
      text: interpolateValues(template.share.text, template, values).trim(),
      href: encoded ? `${base}?${REMIX_PARAM}=${encoded}` : base,
    }
  })
}

/** 同じカテゴリを優先し、人気順に関連テンプレートを選ぶ */
export function relatedTemplates(
  template: TemplateDefinition,
  all: TemplateDefinition[],
  limit = 3
): TemplateDefinition[] {
  return all
    .filter((t) => t.id !== template.id)
    .sort(
      (a, b) =>
        Number(b.category === template.category) -
          Number(a.category === template.category) ||
        (b.popularity ?? 0) - (a.popularity ?? 0)
    )
    .slice(0, limit)
}
