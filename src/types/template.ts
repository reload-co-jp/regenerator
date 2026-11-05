/**
 * テンプレート定義（JSON）の型。
 * src/data/templates/*.json はこの型に従い、template-loader で検証される。
 */

export type FieldType =
  "text" | "textarea" | "number" | "select" | "date" | "list" | "image"

export interface SelectOption {
  value: string
  label: string
}

export interface FieldDefinition {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  /** text / textarea / select / date: string, number: number, list: string[] */
  default?: string | number | string[]
  required?: boolean
  maxLength?: number
  minLength?: number
  min?: number
  max?: number
  step?: number
  options?: SelectOption[]
  /** list の最大件数 */
  maxItems?: number
  /** list の最小件数 */
  minItems?: number
  /** 入力欄の下に表示する補足 */
  help?: string
  /** image: 受け付ける最大バイト数（既定 5MB） */
  maxFileSize?: number
}

export type FieldValue = string | number | string[] | null

export type FieldValues = Record<string, FieldValue>

/** 数値、または "50%" / "100%-40" のような親領域基準の長さ */
export type Length = number | string

export type TextAnchor = "start" | "middle" | "end"
export type VerticalAlign = "top" | "middle" | "bottom"

export interface ShadowDefinition {
  dx?: number
  dy?: number
  blur?: number
  color?: string
  opacity?: number
}

export interface BaseElement {
  /** 要素の識別子（任意） */
  id?: string
  x?: Length
  y?: Length
  width?: Length
  height?: Length
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  /** 度数。要素の基準点（x, y）を中心に回転 */
  rotation?: number
  /** 指定フィールドが空のときは描画しない */
  if?: string
  /** 指定フィールドが空のときだけ描画する */
  unless?: string
  shadow?: ShadowDefinition
  /** list 要素内でのみ有効。順位（1始まり）ごとのプロパティ上書き */
  byIndex?: Record<string, Partial<Omit<TemplateElement, "type">>>
}

export interface TextLikeElement extends BaseElement {
  fontSize?: number
  fontFamily?: string
  fontWeight?: number | "normal" | "bold"
  textAnchor?: TextAnchor
  textAlign?: "left" | "center" | "right"
  lineHeight?: number
  /** 字間（em 単位。0.1 = 文字サイズの10%） */
  letterSpacing?: number
  maxWidth?: Length
  /** 折り返しを含めた最大の高さ。height と同義 */
  maxHeight?: Length
  maxLines?: number
  verticalAlign?: VerticalAlign
  /** 自動縮小（既定 true） */
  autoFit?: boolean
  minFontSize?: number
  /** 自動改行（既定 true） */
  wrap?: boolean
  /** 枠線を文字の背面に描く（袋文字） */
  paintOrder?: "stroke" | "normal"
  strokeLinejoin?: "round" | "miter" | "bevel"
  /** 全体を均等に横方向へ詰める（0〜1、既定 1） */
  condense?: number
  /** 単語の途中で改行しない（見出し向け） */
  keepWords?: boolean
  /** 複数行のとき行の長さをそろえる（見出し向け） */
  balance?: boolean
  /** フィールドが空のときに表示するテキスト */
  emptyText?: string
  /** 縦書き（1文字ずつ縦に並べる。lineHeight が字送りになる） */
  vertical?: boolean
}

export interface TextElement extends TextLikeElement {
  type: "text"
  /** {fieldId} でフィールド値を差し込める。list 内では {item} {index} */
  text: string
}

export interface FieldElement extends TextLikeElement {
  type: "field"
  field: string
  prefix?: string
  suffix?: string
  /** date: "YYYY年M月D日(ddd)" など / number: "comma" */
  format?: string
}

export interface RectElement extends BaseElement {
  type: "rect"
  rx?: number
  strokeDasharray?: string
}

export interface CircleElement extends BaseElement {
  type: "circle"
  r: Length
  strokeDasharray?: string
}

export interface EllipseElement extends BaseElement {
  type: "ellipse"
  rx: Length
  ry: Length
}

export interface LineElement extends BaseElement {
  type: "line"
  x2: Length
  y2: Length
  strokeDasharray?: string
  strokeLinecap?: "butt" | "round" | "square"
}

export interface PathElement extends BaseElement {
  type: "path"
  /** SVG path data。x, y で平行移動、scale で拡大 */
  d: string
  scale?: number
  strokeLinejoin?: "round" | "miter" | "bevel"
}

export interface ImageElement extends BaseElement {
  type: "image"
  /** 入力フィールド（type: image）の ID */
  field?: string
  /** 同梱の静的画像（public 以下のパス） */
  src?: string
  fit?: "cover" | "contain"
  shape?: "rect" | "circle"
  rx?: number
  /** 画像未設定時に描画する要素 */
  placeholder?: TemplateElement[]
}

export interface GroupElement extends BaseElement {
  type: "group"
  scale?: number
  children: TemplateElement[]
}

/** list フィールドの各項目を繰り返し描画する */
export interface ListElement extends BaseElement {
  type: "list"
  field: string
  /** 列数（既定 1）。項目は列ごとに上から順に並ぶ */
  columns?: number
  /** 項目間の縦の間隔 */
  gap?: number
  /** 列間の間隔 */
  columnGap?: number
  /** 1項目の最大の高さ。項目が少ない場合はこれ以上大きくしない */
  maxItemHeight?: number
  /** 項目を領域の上下中央に寄せる */
  verticalAlign?: VerticalAlign
  /** 列方向の並び: column=列ごと（既定）, row=行ごと */
  flow?: "column" | "row"
  /** 各項目の描画要素（座標は項目の枠基準） */
  item: TemplateElement[]
}

/** 繰り返し模様（ステップ＆リピート背景など） */
export interface PatternElement extends BaseElement {
  type: "pattern"
  tileWidth: number
  tileHeight: number
  children: TemplateElement[]
}

export type TemplateElement =
  | TextElement
  | FieldElement
  | RectElement
  | CircleElement
  | EllipseElement
  | LineElement
  | PathElement
  | ImageElement
  | GroupElement
  | ListElement
  | PatternElement

export interface GradientStop {
  offset: number
  color: string
  opacity?: number
}

export interface GradientDefinition {
  id: string
  type: "linear" | "radial"
  /** linear: 角度（度、0=左→右, 90=上→下） */
  angle?: number
  stops: GradientStop[]
}

export interface CanvasDefinition {
  width: number
  height: number
  /** 背景色。"transparent" で透過 PNG */
  background: string
  gradients?: GradientDefinition[]
}

export interface ShareDefinition {
  hashtags?: string[]
  /** {fieldId} で入力値を差し込める */
  text: string
}

export interface TemplateDefinition {
  id: string
  title: string
  description: string
  /** SEO 向けの詳しい説明 */
  longDescription?: string
  category: string
  thumbnail?: string
  createdAt: string
  tags: string[]
  /** 人気順の並び替えに使う静的スコア（大きいほど人気） */
  popularity?: number
  canvas: CanvasDefinition
  fields: FieldDefinition[]
  elements: TemplateElement[]
  share: ShareDefinition
}

export interface Category {
  id: string
  name: string
  description: string
  icon: string
}
