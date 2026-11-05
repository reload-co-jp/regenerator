/* global console, process, document, Image, Buffer */
// テンプレートのサンプル画像（OGP 用 PNG とカード用 WebP）を実際の PNG 出力処理で生成する。
// 使い方: pnpm dev を起動した状態で `pnpm thumbnails`（BASE_URL で接続先を変更可）
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

// playwright は devDependencies に含めていない（グローバルにインストールされたものを使う）
const { chromium } = createRequire(import.meta.url)("playwright")

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
)
const outDir = path.join(root, "public/images/templates")
const ids = fs
  .readdirSync(path.join(root, "src/data/templates"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))

fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1400, height: 1000 },
  acceptDownloads: true,
})

for (const id of ids) {
  await page.goto(`${baseUrl}/create/${id}/`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /画像をダウンロード/ }).click(),
  ])
  const pngPath = path.join(outDir, `${id}.png`)
  await download.saveAs(pngPath)

  // カード表示用に幅 640px の WebP を作る
  const dataUrl = `data:image/png;base64,${fs.readFileSync(pngPath).toString("base64")}`
  const webp = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const w = 640
    const h = Math.round((img.naturalHeight / img.naturalWidth) * w)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d").drawImage(img, 0, 0, w, h)
    return canvas.toDataURL("image/webp", 0.85)
  }, dataUrl)
  fs.writeFileSync(
    path.join(outDir, `${id}.webp`),
    Buffer.from(webp.split(",")[1], "base64")
  )
  console.log(`thumbnail: ${id}`)
}

// トップページ用 OGP 画像（1200x630）: サンプル画像を並べる
const pick = [
  "kanji-of-the-year",
  "breaking-news",
  "kohaku-lineup",
  "emergency-press",
  "monthly-mvp",
  "buzzword-of-the-year",
]
const tiles = pick
  .map(
    (id) =>
      `<img src="data:image/webp;base64,${fs.readFileSync(path.join(outDir, `${id}.webp`)).toString("base64")}">`
  )
  .join("")
await page.setViewportSize({ width: 1200, height: 630 })
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" })
await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${baseUrl}/fonts/fonts.css"><style>
  body{margin:0;width:1200px;height:630px;background:#1d1b17;font-family:'Noto Sans JP';overflow:hidden;position:relative}
  .grid{position:absolute;inset:-40px -60px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;transform:rotate(-6deg);opacity:.55}
  .grid img{width:100%;height:250px;object-fit:cover;border-radius:12px}
  .title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center}
  .badge{background:#d7263d;padding:6px 26px;border-radius:999px;font-weight:900;font-size:30px}
  h1{font-size:96px;font-weight:900;margin:18px 0 8px;text-shadow:0 6px 24px rgba(0,0,0,.6)}
  p{font-size:34px;font-weight:700;margin:0;text-shadow:0 4px 16px rgba(0,0,0,.7)}
</style></head><body><div class="grid">${tiles}${tiles}</div>
<div class="title"><span class="badge">無料・登録不要</span><h1>発表ジェネレーター</h1><p>文字を入れるだけで、ニュース風の発表画像ができる</p></div></body></html>`)
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(800)
await page.screenshot({ path: path.join(root, "public/images/og.png") })
console.log("og image: public/images/og.png")

await browser.close()
