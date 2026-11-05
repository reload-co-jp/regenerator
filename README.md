# 発表ジェネレーター（regenerator）

あらかじめ用意された画像テンプレートに文字を入力するだけで、SNS に投稿できる「発表画像」を作れる Web アプリケーションです。
「今年の漢字」「号外」「緊急記者会見」「〇〇大賞」など、ニュースやイベント発表でおなじみのビジュアルを独自のパロディデザインでテンプレート化しています。

- 画像生成はすべてブラウザ内で完結（サーバー・DB・認証なし）
- 入力内容はリアルタイムにプレビューへ反映
- PNG（テンプレートで定義した解像度）でダウンロード、X への投稿、Web Share API、クリップボードコピーに対応
- 静的書き出し（`next build` → `out/`）で GitHub Pages などにデプロイ

## 技術構成

| 項目             | 採用技術                                                      |
| ---------------- | ------------------------------------------------------------- |
| フレームワーク   | Next.js 16（App Router / Static Export）                      |
| 言語             | TypeScript                                                    |
| スタイリング     | styled-components（CSS-in-JS）                                |
| テンプレート管理 | JSON（`src/data/templates/*.json`）                           |
| 画像描画         | SVG（共通レンダリングエンジン）                               |
| 画像出力         | SVG → Canvas → PNG                                            |
| フォント         | fontsource の日本語フォントを自前ホスト（unicode-range 分割） |

## 開発

```bash
pnpm install
pnpm dev        # フォントを public/fonts に展開してから開発サーバーを起動
pnpm test       # ユニットテスト（Vitest）
pnpm typecheck
pnpm lint
pnpm build      # 静的サイトを out/ に出力
```

`public/fonts/` は `scripts/build-fonts.mjs` が `node_modules/@fontsource/*` から生成するため Git 管理外です（`dev` / `build` 実行時に自動生成）。

### サンプル画像の再生成

トップページのカード画像・OGP 画像（`public/images/templates/*.png|webp`、`public/images/og.png`）は、実際の PNG 出力処理を使って生成しています。テンプレートのデザインを変更したら、開発サーバーを起動した状態で次を実行してください（Playwright が必要です）。

```bash
pnpm thumbnails                      # 既定: http://localhost:3000
BASE_URL=http://localhost:4000 pnpm thumbnails
```

## ディレクトリ構成

```text
src/
├── app/                      # ページ（/、/create/[id]、404、sitemap、robots）
├── components/               # TemplateGallery / TemplateEditor / DynamicForm など
├── lib/
│   ├── template-loader.ts    # JSON 読み込み（ビルド時）
│   ├── template-validation.ts# JSON 定義のバリデーション
│   ├── template-renderer.tsx # JSON + 入力値 → SVG の共通エンジン
│   ├── text-layout.ts        # 自動縮小・自動改行・禁則処理
│   ├── svg-to-png.ts         # フォント埋め込み → Canvas → PNG
│   ├── fonts.ts              # フォント定義・計測・読み込み
│   ├── share.ts              # X / Web Share / クリップボード
│   └── analytics.ts          # 計測イベント（gtag / dataLayer）
├── types/template.ts         # テンプレート定義の型
├── data/
│   ├── templates/*.json      # テンプレート定義
│   ├── categories.json       # カテゴリ定義
│   └── fonts.json            # 使用フォント定義
└── styles/                   # テーマ・グローバルスタイル
scripts/
├── build-fonts.mjs           # フォントの展開
└── generate-thumbnails.mjs   # サンプル画像の生成
```

## テンプレートの追加

`src/data/templates/<id>.json` を追加するだけで、トップページ・編集ページ（`/create/<id>/`）・サイトマップに自動で登録されます（ファイル名と `id` は一致させてください）。ビルド時に `template-validation.ts` で定義が検証され、誤りがあればビルドが失敗します。

主なプロパティは次のとおりです（型の詳細は `src/types/template.ts`）。

- `id` / `title` / `description` / `longDescription` / `category` / `tags` / `createdAt` / `popularity` / `thumbnail`
- `canvas`: `width`・`height`・`background`（`"transparent"` で透過 PNG）・`gradients`
- `fields`: 入力フォーム定義。`text` `textarea` `number` `select` `date` `list` `image` に対応。`label` `placeholder` `default` `required` `maxLength` `minLength` `min` `max` `options` `maxItems` `help` を指定可能
- `elements`: 描画要素。`text` `field` `rect` `circle` `ellipse` `line` `path` `image` `group` `list` `pattern`
- `share`: 投稿文（`{fieldId}` で入力値を差し込み）とハッシュタグ

### 描画要素の主なプロパティ

- 位置・大きさ: `x` `y` `width` `height`（数値、または `"50%"` `"100%-40"` のような親領域基準の値）
- 装飾: `fill` `stroke` `strokeWidth` `opacity` `rotation` `shadow`。`fill: "gradient:<id>"` で `canvas.gradients` を参照
- テキスト: `fontSize` `fontFamily`（`src/data/fonts.json` のキー）`fontWeight` `textAnchor` `textAlign` `verticalAlign` `lineHeight` `letterSpacing`（em）`maxWidth` `maxHeight` `maxLines`
- テキスト自動調整: `autoFit`（既定 true）`minFontSize` `wrap` `keepWords`（文節単位で改行）`balance`（行長をそろえる）
- 条件表示: `if` / `unless`（フィールドが空かどうか）
- `text` 要素では `{fieldId}`、`{date:YYYY年M月D日}` のような書式付き差し込みが可能
- `list` 要素は list フィールドの各項目を `item` の要素で繰り返し描画し、`{item}` `{index}` と `byIndex`（順位ごとの上書き）が使えます

## アクセス解析

`NEXT_PUBLIC_GA_ID` を設定すると GA4 を読み込みます。GTM などで `dataLayer` が用意されている場合はそちらに送信します。

送信イベント: `template_view` `template_select` `image_generate` `image_download` `share_click` `copy_image` `share_text_copy`（いずれも `template_id` パラメータ付き）

## 環境変数

| 変数                   | 説明                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL（canonical・OGP・投稿文に使用）。既定は `https://gen.reload.co.jp` |
| `NEXT_PUBLIC_GA_ID`    | GA4 の測定 ID（任意）                                                       |

独自ドメイン `gen.reload.co.jp` のルートで公開するため `basePath` は使用していません（GitHub Pages 用に `public/CNAME` を配置）。

## 注意事項

テンプレートはすべて独自デザインのパロディであり、実在の企業・番組・団体の公式ロゴやデザインは使用していません。
