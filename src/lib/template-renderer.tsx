/**
 * テンプレート定義(JSON) + 入力値 → SVG の共通レンダリングエンジン。
 * プレビュー表示と PNG 出力の両方がこの描画結果を使う。
 */
import type { ReactNode, SVGProps } from "react"
import type {
  FieldDefinition,
  FieldElement,
  FieldValues,
  GradientDefinition,
  ImageElement,
  Length,
  ListElement,
  ShadowDefinition,
  TemplateDefinition,
  TemplateElement,
  TextElement,
} from "@/types/template"
import {
  DEFAULT_FONT,
  createCanvasMeasure,
  fontStack,
  resolveWeight,
} from "./fonts"
import { assetPath } from "./site"
import {
  estimateMeasure,
  fitText,
  graphemes,
  type FitResult,
  type MeasureFn,
} from "./text-layout"
import { formatValue, interpolate, isEmptyValue } from "./template-values"

interface Box {
  width: number
  height: number
}

interface ListItemContext {
  value: string
  index: number
  count: number
  /** 先頭に「*」が付いた項目（初出場などの目印） */
  flag: boolean
}

/** list の項目文字列から目印（先頭の * / ＊）を取り出す */
export function listItemContext(
  raw: string,
  index: number,
  count: number
): ListItemContext {
  const flag = /^[*＊]/.test(raw)
  return {
    value: flag ? raw.replace(/^[*＊]\s*/, "") : raw,
    index,
    count,
    flag,
  }
}

/** "{item:label}" "{item:value}" 用。最初の空白で項目を「ラベル」と「値」に分ける */
function splitItem(value: string, part: string | undefined): string {
  if (part !== "label" && part !== "value") return value
  const m = value.match(/^(\S+)\s+(.+)$/)
  if (!m) return part === "label" ? value : ""
  return part === "label" ? m[1] : m[2]
}

export interface RenderContext {
  values: FieldValues
  fields: Map<string, FieldDefinition>
  idPrefix: string
  box: Box
  item?: ListItemContext
  measureFor: (fontKey: string, weight: number) => MeasureFn
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** "50%" / "100%-40" / 数値 を px に変換する */
export function resolveLength(
  value: Length | undefined,
  ref: number,
  fallback = 0
): number {
  if (value === undefined || value === null) return fallback
  if (typeof value === "number") return value
  const m = String(value)
    .replace(/\s+/g, "")
    .match(/^(-?[\d.]+)(%)?(?:([+-])([\d.]+))?$/)
  if (!m) return fallback
  let n = Number(m[1])
  if (m[2]) n = (n / 100) * ref
  if (m[3]) n += (m[3] === "-" ? -1 : 1) * Number(m[4])
  return n
}

function paint(
  value: string | undefined,
  ctx: RenderContext
): string | undefined {
  if (!value) return value
  if (value.startsWith("gradient:")) {
    return `url(#${ctx.idPrefix}-g-${value.slice("gradient:".length)})`
  }
  return value
}

function resolveText(text: string, ctx: RenderContext): string {
  return interpolate(text, (key, format) => {
    if (ctx.item) {
      if (key === "item") return splitItem(ctx.item.value, format)
      if (key === "index") {
        return format === "02"
          ? String(ctx.item.index).padStart(2, "0")
          : String(ctx.item.index)
      }
      if (key === "count") return String(ctx.item.count)
    }
    if (!ctx.fields.has(key)) return undefined
    return formatValue(ctx.values[key], ctx.fields.get(key), format)
  })
}

/** text / field 要素の表示文字列 */
export function textContent(
  el: TextElement | FieldElement,
  ctx: RenderContext
): string {
  let content: string
  if (el.type === "text") {
    content = resolveText(el.text, ctx)
  } else {
    const field = ctx.fields.get(el.field)
    const raw = formatValue(ctx.values[el.field], field, el.format)
    content = raw === "" ? "" : `${el.prefix ?? ""}${raw}${el.suffix ?? ""}`
  }
  if (content.trim() === "" && el.emptyText) {
    content = resolveText(el.emptyText, ctx)
  }
  return content
}

function isVisible(el: TemplateElement, ctx: RenderContext): boolean {
  const empty = (key: string) =>
    key === "item"
      ? !ctx.item?.value
      : key === "itemFlag"
        ? !ctx.item?.flag
        : isEmptyValue(ctx.values[key])
  if (el.if && empty(el.if)) return false
  if (el.unless && !empty(el.unless)) return false
  return true
}

function applyIndex<T extends TemplateElement>(el: T, ctx: RenderContext): T {
  if (!ctx.item || !el.byIndex) return el
  // "odd" / "even" で奇数・偶数番目、数字で特定の順位を上書き（数字が優先）
  const parity = el.byIndex[ctx.item.index % 2 === 1 ? "odd" : "even"]
  const exact = el.byIndex[String(ctx.item.index)]
  if (!parity && !exact) return el
  return { ...el, ...parity, ...exact } as T
}

function transformFor(
  x: number,
  y: number,
  rotation: number | undefined
): string | undefined {
  return rotation ? `rotate(${rotation} ${r2(x)} ${r2(y)})` : undefined
}

function shadowFilter(
  shadow: ShadowDefinition | undefined,
  id: string
): ReactNode {
  if (!shadow) return null
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow
        dx={shadow.dx ?? 0}
        dy={shadow.dy ?? 4}
        stdDeviation={shadow.blur ?? 6}
        floodColor={shadow.color ?? "#000"}
        floodOpacity={shadow.opacity ?? 0.35}
      />
    </filter>
  )
}

function common(
  el: TemplateElement,
  ctx: RenderContext,
  key: string
): SVGProps<SVGElement> {
  return {
    fill: paint(el.fill, ctx),
    stroke: paint(el.stroke, ctx),
    strokeWidth: el.strokeWidth,
    opacity: el.opacity,
    filter: el.shadow ? `url(#${ctx.idPrefix}-${key}-sh)` : undefined,
  }
}

/** テキストのレイアウト計算（自動縮小・改行） */
export function layoutText(
  el: TextElement | FieldElement,
  content: string,
  ctx: RenderContext
): FitResult & { weight: number; fontKey: string } {
  const fontKey = el.fontFamily ?? DEFAULT_FONT
  const weight = resolveWeight(fontKey, el.fontWeight)
  const maxWidth = el.maxWidth ?? el.width
  const maxHeight = el.maxHeight ?? el.height
  if (el.vertical) {
    // 縦書き: 行 = 列。列の長さ = height、列を並べる幅 = width
    const pitch = 1 + (el.letterSpacing ?? 0)
    const fit = fitText(content, {
      fontSize: el.fontSize ?? 32,
      minFontSize: el.minFontSize,
      maxWidth: resolveLength(
        el.height ?? el.maxHeight,
        ctx.box.height,
        Infinity
      ),
      maxHeight:
        el.width !== undefined || el.maxWidth !== undefined
          ? resolveLength(el.width ?? el.maxWidth, ctx.box.width, Infinity)
          : undefined,
      maxLines: el.maxLines,
      lineHeight: el.lineHeight ?? 1.5,
      wrap: el.wrap ?? true,
      autoFit: el.autoFit ?? true,
      keepWords: el.keepWords,
      balance: el.balance,
      measure: (text, size) => verticalTokens(text).length * size * pitch,
    })
    return { ...fit, weight, fontKey }
  }
  const wrap = el.wrap ?? maxWidth !== undefined
  const fit = fitText(content, {
    fontSize: el.fontSize ?? 32,
    minFontSize: el.minFontSize,
    maxWidth:
      maxWidth !== undefined
        ? resolveLength(maxWidth, ctx.box.width, Infinity)
        : undefined,
    maxHeight:
      maxHeight !== undefined
        ? resolveLength(maxHeight, ctx.box.height, Infinity)
        : undefined,
    maxLines: el.maxLines,
    lineHeight: el.lineHeight ?? 1.3,
    letterSpacing: el.letterSpacing ?? 0,
    condense: el.condense ?? 1,
    wrap,
    autoFit: el.autoFit ?? true,
    keepWords: el.keepWords,
    balance: el.balance,
    measure: ctx.measureFor(fontKey, weight),
  })
  return { ...fit, weight, fontKey }
}

function renderText(
  el: TextElement | FieldElement,
  ctx: RenderContext,
  key: string
): ReactNode {
  const content = textContent(el, ctx)
  if (content === "") return null
  const layout = layoutText(el, content, ctx)
  if (el.vertical) return renderVerticalText(el, layout, ctx, key)
  const x = resolveLength(el.x, ctx.box.width)
  const y = resolveLength(el.y, ctx.box.height)
  const anchor =
    el.textAnchor ??
    (el.textAlign === "center"
      ? "middle"
      : el.textAlign === "right"
        ? "end"
        : "start")
  const valign = el.verticalAlign ?? "middle"
  const top =
    valign === "top"
      ? y
      : valign === "bottom"
        ? y - layout.height
        : y - layout.height / 2
  // SVG の letter-spacing は最後の文字の後ろにも付くため、その分を補正する
  const ls = (el.letterSpacing ?? 0) * layout.fontSize
  const condense = el.condense ?? 1
  const lineX = anchor === "middle" ? x + ls / 2 : anchor === "end" ? x + ls : x
  const transforms = [
    transformFor(x, y, el.rotation),
    condense !== 1
      ? `translate(${r2(x)} 0) scale(${condense} 1) translate(${r2(-x)} 0)`
      : undefined,
  ].filter(Boolean)

  return (
    <g key={key}>
      {el.shadow && (
        <defs>{shadowFilter(el.shadow, `${ctx.idPrefix}-${key}-sh`)}</defs>
      )}
      <text
        {...(common(el, ctx, key) as SVGProps<SVGTextElement>)}
        fill={paint(el.fill ?? "#000", ctx)}
        fontFamily={fontStack(layout.fontKey)}
        fontSize={layout.fontSize}
        fontWeight={layout.weight}
        textAnchor={anchor}
        dominantBaseline="central"
        letterSpacing={ls ? r2(ls) : undefined}
        paintOrder={el.paintOrder === "stroke" ? "stroke" : undefined}
        strokeLinejoin={el.strokeLinejoin ?? (el.stroke ? "round" : undefined)}
        transform={transforms.length ? transforms.join(" ") : undefined}
        xmlSpace="preserve"
      >
        {layout.lines.map((line, i) => (
          <tspan
            key={i}
            x={r2(lineX)}
            y={r2(top + i * layout.lineHeightPx + layout.fontSize / 2)}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

/** 縦書きで向きを変える記号: 縦書き用の字形に置き換える */
const VERTICAL_FORMS: Record<string, string> = {
  "「": "﹁",
  "」": "﹂",
  "『": "﹃",
  "』": "﹄",
  "（": "︵",
  "）": "︶",
  "(": "︵",
  ")": "︶",
  "【": "︻",
  "】": "︼",
  "〔": "︹",
  "〕": "︺",
  "〈": "︿",
  "〉": "﹀",
  "《": "︽",
  "》": "︾",
  "［": "﹇",
  "］": "﹈",
  "｛": "︷",
  "｝": "︸",
  "…": "︙",
  "‥": "︰",
}
/** 縦書きで 90 度回転させる記号 */
const VERTICAL_ROTATE = new Set(Array.from("ー－—―–-〜～~＝=→←⇒：:；;"))
/** 縦書きで右上に寄せる句読点 */
const VERTICAL_PUNCT = new Set(Array.from("、。，．,."))
/** 縦書きで少し右上に寄せる小書き仮名 */
const VERTICAL_SMALL = new Set(
  Array.from(
    "ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ"
  )
)

/** 縦書きのトークン化。2桁までの半角数字は縦中横として1文字分にまとめる */
export function verticalTokens(text: string): string[] {
  const out: string[] = []
  let digits = ""
  const flush = () => {
    // 2桁までは縦中横（1文字分）、3桁以上は1字ずつ縦に並べる
    if (digits.length > 0 && digits.length <= 2) out.push(digits)
    else out.push(...Array.from(digits))
    digits = ""
  }
  for (const g of graphemes(text)) {
    if (/^[0-9]$/.test(g)) {
      digits += g
      continue
    }
    flush()
    out.push(g)
  }
  flush()
  return out
}

function renderVerticalText(
  el: TextElement | FieldElement,
  layout: FitResult & { weight: number; fontKey: string },
  ctx: RenderContext,
  key: string
): ReactNode {
  const x = resolveLength(el.x, ctx.box.width)
  const y = resolveLength(el.y, ctx.box.height)
  const width = resolveLength(
    el.width ?? el.maxWidth,
    ctx.box.width,
    layout.height
  )
  const height = resolveLength(
    el.height ?? el.maxHeight,
    ctx.box.height,
    layout.width
  )
  const size = layout.fontSize
  const pitch = size * (1 + (el.letterSpacing ?? 0))
  const blockWidth = layout.height
  const align =
    el.textAlign ?? (el.textAnchor === "middle" ? "center" : "right")
  const right =
    align === "center"
      ? x + (width + blockWidth) / 2
      : align === "left"
        ? x + blockWidth
        : x + width
  const valign = el.verticalAlign ?? "top"
  const columns = layout.lines.map(verticalTokens)
  const longest = Math.max(0, ...columns.map((c) => c.length)) * pitch
  const top =
    valign === "middle"
      ? y + (height - longest) / 2
      : valign === "bottom"
        ? y + height - longest
        : y
  const textProps = {
    ...(common(el, ctx, key) as SVGProps<SVGTextElement>),
    fill: paint(el.fill ?? "#000", ctx),
    fontFamily: fontStack(layout.fontKey),
    fontWeight: layout.weight,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    paintOrder: el.paintOrder === "stroke" ? ("stroke" as const) : undefined,
    strokeLinejoin:
      el.strokeLinejoin ?? (el.stroke ? ("round" as const) : undefined),
  }
  const glyphs: ReactNode[] = []
  columns.forEach((tokens, col) => {
    const cx = right - size / 2 - col * layout.lineHeightPx
    tokens.forEach((token, i) => {
      const cy = top + i * pitch + size / 2
      const k = `${col}-${i}`
      if (token.trim() === "") return
      if (/^[0-9]{2}$/.test(token)) {
        glyphs.push(
          <text
            key={k}
            {...textProps}
            x={r2(cx)}
            y={r2(cy)}
            fontSize={r2(size * 0.8)}
            textLength={r2(size * 0.92)}
            lengthAdjust="spacingAndGlyphs"
          >
            {token}
          </text>
        )
        return
      }
      if (VERTICAL_ROTATE.has(token)) {
        glyphs.push(
          <text
            key={k}
            {...textProps}
            x={r2(cx)}
            y={r2(cy)}
            fontSize={size}
            transform={`rotate(90 ${r2(cx)} ${r2(cy)})`}
          >
            {token}
          </text>
        )
        return
      }
      const shift = VERTICAL_PUNCT.has(token)
        ? 0.55
        : VERTICAL_SMALL.has(token)
          ? 0.1
          : 0
      glyphs.push(
        <text
          key={k}
          {...textProps}
          x={r2(cx + shift * size)}
          y={r2(cy - shift * size)}
          fontSize={size}
        >
          {VERTICAL_FORMS[token] ?? token}
        </text>
      )
    })
  })
  return (
    <g key={key} transform={transformFor(x, y, el.rotation)}>
      {el.shadow && (
        <defs>{shadowFilter(el.shadow, `${ctx.idPrefix}-${key}-sh`)}</defs>
      )}
      {glyphs}
    </g>
  )
}

function renderImage(
  el: ImageElement,
  ctx: RenderContext,
  key: string
): ReactNode {
  const x = resolveLength(el.x, ctx.box.width)
  const y = resolveLength(el.y, ctx.box.height)
  const width = resolveLength(el.width, ctx.box.width, 100)
  const height = resolveLength(el.height, ctx.box.height, 100)
  const value = el.field ? ctx.values[el.field] : null
  const href =
    typeof value === "string" && value.startsWith("data:image/")
      ? value
      : el.src
        ? assetPath(el.src)
        : undefined
  const clipId = `${ctx.idPrefix}-${key}-clip`
  const shape = el.shape ?? "rect"

  if (!href) {
    if (!el.placeholder) return null
    return (
      <g key={key} transform={`translate(${r2(x)} ${r2(y)})`}>
        {renderElements(
          el.placeholder,
          { ...ctx, box: { width, height } },
          `${key}p`
        )}
      </g>
    )
  }

  return (
    <g
      key={key}
      opacity={el.opacity}
      transform={transformFor(x, y, el.rotation)}
    >
      <defs>
        <clipPath id={clipId}>
          {shape === "circle" ? (
            <ellipse
              cx={r2(x + width / 2)}
              cy={r2(y + height / 2)}
              rx={r2(width / 2)}
              ry={r2(height / 2)}
            />
          ) : (
            <rect x={x} y={y} width={width} height={height} rx={el.rx} />
          )}
        </clipPath>
      </defs>
      <image
        href={href}
        x={x}
        y={y}
        width={width}
        height={height}
        preserveAspectRatio={
          el.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"
        }
        clipPath={`url(#${clipId})`}
      />
      {el.stroke &&
        (shape === "circle" ? (
          <ellipse
            cx={r2(x + width / 2)}
            cy={r2(y + height / 2)}
            rx={r2(width / 2)}
            ry={r2(height / 2)}
            fill="none"
            stroke={paint(el.stroke, ctx)}
            strokeWidth={el.strokeWidth}
          />
        ) : (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={el.rx}
            fill="none"
            stroke={paint(el.stroke, ctx)}
            strokeWidth={el.strokeWidth}
          />
        ))}
    </g>
  )
}

/** list 要素の各項目の配置を計算する */
export function listSlots(
  el: ListElement,
  count: number,
  box: Box
): { x: number; y: number; width: number; height: number }[] {
  if (count === 0) return []
  const x0 = resolveLength(el.x, box.width)
  const y0 = resolveLength(el.y, box.height)
  const width = resolveLength(el.width, box.width, box.width - x0)
  const height = resolveLength(el.height, box.height, box.height - y0)
  const columns = Math.max(1, Math.min(el.columns ?? 1, count))
  const gap = el.gap ?? 0
  const columnGap = el.columnGap ?? gap
  const rows = Math.ceil(count / columns)
  const slotW = (width - (columns - 1) * columnGap) / columns
  let slotH = (height - (rows - 1) * gap) / rows
  if (el.maxItemHeight) slotH = Math.min(slotH, el.maxItemHeight)
  const used = rows * slotH + (rows - 1) * gap
  const offset =
    el.verticalAlign === "middle"
      ? (height - used) / 2
      : el.verticalAlign === "bottom"
        ? height - used
        : 0
  return Array.from({ length: count }, (_, i) => {
    const col = el.flow === "row" ? i % columns : Math.floor(i / rows)
    const row = el.flow === "row" ? Math.floor(i / columns) : i % rows
    return {
      x: x0 + col * (slotW + columnGap),
      y: y0 + offset + row * (slotH + gap),
      width: slotW,
      height: slotH,
    }
  })
}

export function listItems(el: ListElement, ctx: RenderContext): string[] {
  const value = ctx.values[el.field]
  const items = Array.isArray(value) ? value.filter((v) => v.trim() !== "") : []
  const max = ctx.fields.get(el.field)?.maxItems
  return max ? items.slice(0, max) : items
}

function renderList(
  el: ListElement,
  ctx: RenderContext,
  key: string
): ReactNode {
  const items = listItems(el, ctx)
  const slots = listSlots(el, items.length, ctx.box)
  return (
    <g key={key} opacity={el.opacity}>
      {slots.map((slot, i) => (
        <g key={i} transform={`translate(${r2(slot.x)} ${r2(slot.y)})`}>
          {renderElements(
            el.item,
            {
              ...ctx,
              box: { width: slot.width, height: slot.height },
              item: listItemContext(items[i], i + 1, items.length),
            },
            `${key}i${i}`
          )}
        </g>
      ))}
    </g>
  )
}

function renderElement(
  raw: TemplateElement,
  ctx: RenderContext,
  key: string
): ReactNode {
  const el = applyIndex(raw, ctx)
  if (!isVisible(el, ctx)) return null
  const { box } = ctx
  const x = resolveLength(el.x, box.width)
  const y = resolveLength(el.y, box.height)
  const shadow = el.shadow ? (
    <defs>{shadowFilter(el.shadow, `${ctx.idPrefix}-${key}-sh`)}</defs>
  ) : null

  switch (el.type) {
    case "text":
    case "field":
      return renderText(el, ctx, key)
    case "rect": {
      const width = resolveLength(el.width, box.width, box.width)
      const height = resolveLength(el.height, box.height, box.height)
      return (
        <g key={key}>
          {shadow}
          <rect
            {...(common(el, ctx, key) as SVGProps<SVGRectElement>)}
            x={r2(x)}
            y={r2(y)}
            width={r2(Math.max(0, width))}
            height={r2(Math.max(0, height))}
            rx={el.rx}
            strokeDasharray={el.strokeDasharray}
            transform={transformFor(x + width / 2, y + height / 2, el.rotation)}
          />
        </g>
      )
    }
    case "circle":
      return (
        <g key={key}>
          {shadow}
          <circle
            {...(common(el, ctx, key) as SVGProps<SVGCircleElement>)}
            cx={r2(x)}
            cy={r2(y)}
            r={r2(resolveLength(el.r, Math.min(box.width, box.height)))}
            strokeDasharray={el.strokeDasharray}
          />
        </g>
      )
    case "ellipse":
      return (
        <g key={key}>
          {shadow}
          <ellipse
            {...(common(el, ctx, key) as SVGProps<SVGEllipseElement>)}
            cx={r2(x)}
            cy={r2(y)}
            rx={r2(resolveLength(el.rx, box.width))}
            ry={r2(resolveLength(el.ry, box.height))}
            transform={transformFor(x, y, el.rotation)}
          />
        </g>
      )
    case "line":
      return (
        <line
          key={key}
          {...(common(el, ctx, key) as SVGProps<SVGLineElement>)}
          filter={undefined}
          x1={r2(x)}
          y1={r2(y)}
          x2={r2(resolveLength(el.x2, box.width))}
          y2={r2(resolveLength(el.y2, box.height))}
          stroke={paint(el.stroke ?? "#000", ctx)}
          strokeDasharray={el.strokeDasharray}
          strokeLinecap={el.strokeLinecap}
        />
      )
    case "path": {
      const t = [
        x || y ? `translate(${r2(x)} ${r2(y)})` : "",
        el.rotation ? `rotate(${el.rotation})` : "",
        el.scale && el.scale !== 1 ? `scale(${el.scale})` : "",
      ]
        .filter(Boolean)
        .join(" ")
      return (
        <g key={key}>
          {shadow}
          <path
            {...(common(el, ctx, key) as SVGProps<SVGPathElement>)}
            d={el.d}
            strokeLinejoin={el.strokeLinejoin}
            transform={t || undefined}
          />
        </g>
      )
    }
    case "image":
      return renderImage(el, ctx, key)
    case "group": {
      const width = resolveLength(el.width, box.width, box.width)
      const height = resolveLength(el.height, box.height, box.height)
      const t = [
        x || y ? `translate(${r2(x)} ${r2(y)})` : "",
        el.rotation ? `rotate(${el.rotation})` : "",
        el.scale && el.scale !== 1 ? `scale(${el.scale})` : "",
      ]
        .filter(Boolean)
        .join(" ")
      return (
        <g
          key={key}
          transform={t || undefined}
          opacity={el.opacity}
          filter={el.shadow ? `url(#${ctx.idPrefix}-${key}-sh)` : undefined}
        >
          {shadow}
          {renderElements(el.children, { ...ctx, box: { width, height } }, key)}
        </g>
      )
    }
    case "list":
      return renderList(el, ctx, key)
    case "pattern": {
      const width = resolveLength(el.width, box.width, box.width)
      const height = resolveLength(el.height, box.height, box.height)
      const id = `${ctx.idPrefix}-${key}-pat`
      return (
        <g key={key}>
          <defs>
            <pattern
              id={id}
              x={r2(x)}
              y={r2(y)}
              width={el.tileWidth}
              height={el.tileHeight}
              patternUnits="userSpaceOnUse"
              patternTransform={
                el.rotation ? `rotate(${el.rotation})` : undefined
              }
            >
              {renderElements(
                el.children,
                { ...ctx, box: { width: el.tileWidth, height: el.tileHeight } },
                `${key}t`
              )}
            </pattern>
          </defs>
          <rect
            x={r2(x)}
            y={r2(y)}
            width={r2(width)}
            height={r2(height)}
            fill={`url(#${id})`}
            opacity={el.opacity}
          />
        </g>
      )
    }
    default:
      return null
  }
}

export function renderElements(
  elements: TemplateElement[],
  ctx: RenderContext,
  prefix = "e"
): ReactNode[] {
  return elements.map((el, i) => renderElement(el, ctx, `${prefix}-${i}`))
}

function gradientDef(g: GradientDefinition, prefix: string): ReactNode {
  const id = `${prefix}-g-${g.id}`
  const stops = g.stops.map((s, i) => (
    <stop
      key={i}
      offset={s.offset}
      stopColor={s.color}
      stopOpacity={s.opacity}
    />
  ))
  if (g.type === "radial") {
    return (
      <radialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
        {stops}
      </radialGradient>
    )
  }
  const a = ((g.angle ?? 90) * Math.PI) / 180
  const dx = Math.cos(a) / 2
  const dy = Math.sin(a) / 2
  return (
    <linearGradient
      key={id}
      id={id}
      x1={r2(0.5 - dx)}
      y1={r2(0.5 - dy)}
      x2={r2(0.5 + dx)}
      y2={r2(0.5 + dy)}
    >
      {stops}
    </linearGradient>
  )
}

export type MeasureMode = "estimate" | "canvas"

export function createMeasureFor(
  mode: MeasureMode
): (fontKey: string, weight: number) => MeasureFn {
  return (fontKey, weight) =>
    (mode === "canvas" && createCanvasMeasure(fontKey, weight)) ||
    estimateMeasure
}

export interface TemplateSvgProps {
  template: TemplateDefinition
  values: FieldValues
  /** ID の衝突を避けるための接頭辞（同一ページに複数描画する場合） */
  idPrefix?: string
  /** "canvas": 実フォントで計測（ブラウザのみ）, "estimate": 概算 */
  measure?: MeasureMode
  className?: string
  style?: React.CSSProperties
  svgRef?: React.Ref<SVGSVGElement>
  /** 表示サイズ（未指定時は親要素の幅に合わせる） */
  displayWidth?: number | string
}

export function TemplateSvg({
  template,
  values,
  idPrefix = template.id,
  measure = "estimate",
  className,
  style,
  svgRef,
  displayWidth = "100%",
}: TemplateSvgProps) {
  const { canvas } = template
  const prefix = idPrefix.replace(/[^\w-]/g, "")
  const ctx: RenderContext = {
    values,
    fields: new Map(template.fields.map((f) => [f.id, f])),
    idPrefix: prefix,
    box: { width: canvas.width, height: canvas.height },
    measureFor: createMeasureFor(measure),
  }
  const transparent = canvas.background === "transparent"
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      width={displayWidth}
      className={className}
      style={{ display: "block", height: "auto", ...style }}
      role="img"
      aria-label={template.title}
      data-width={canvas.width}
      data-height={canvas.height}
    >
      {canvas.gradients && (
        <defs>{canvas.gradients.map((g) => gradientDef(g, prefix))}</defs>
      )}
      {!transparent && (
        <rect
          width={canvas.width}
          height={canvas.height}
          fill={paint(canvas.background, ctx)}
        />
      )}
      {renderElements(template.elements, ctx)}
    </svg>
  )
}

/** 描画に使われるテキストをフォント（キー・ウェイト）ごとに集める */
export function collectFontUsage(
  template: TemplateDefinition,
  values: FieldValues
): Map<string, Map<number, string>> {
  const usage = new Map<string, Map<number, string>>()
  const fields = new Map(template.fields.map((f) => [f.id, f]))
  const add = (fontKey: string, weight: number, text: string) => {
    const byWeight = usage.get(fontKey) ?? new Map<number, string>()
    byWeight.set(weight, (byWeight.get(weight) ?? "") + text)
    usage.set(fontKey, byWeight)
  }
  const walk = (elements: TemplateElement[], ctx: RenderContext) => {
    for (const raw of elements) {
      const el = applyIndex(raw, ctx)
      if (el.type === "text" || el.type === "field") {
        const fontKey = el.fontFamily ?? DEFAULT_FONT
        add(
          fontKey,
          resolveWeight(fontKey, el.fontWeight),
          textContent(el, ctx) + "…"
        )
      } else if (el.type === "group" || el.type === "pattern") {
        walk(el.children, ctx)
      } else if (el.type === "image" && el.placeholder) {
        walk(el.placeholder, ctx)
      } else if (el.type === "list") {
        const items = listItems(el, ctx)
        items.forEach((value, i) =>
          walk(el.item, {
            ...ctx,
            item: listItemContext(value, i + 1, items.length),
          })
        )
      }
    }
  }
  walk(template.elements, {
    values,
    fields,
    idPrefix: "",
    box: { width: template.canvas.width, height: template.canvas.height },
    measureFor: () => estimateMeasure,
  })
  return usage
}
