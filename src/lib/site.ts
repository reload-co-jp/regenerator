/** サイト全体の設定 */

export const SITE_NAME = "発表ジェネレーター"
export const SITE_TAGLINE = "文字を入れるだけで、ニュース風の発表画像ができる"
export const SITE_DESCRIPTION =
  "「今年の漢字」「号外」「緊急記者会見」「〇〇大賞」など、ニュースやイベント発表でおなじみのビジュアルを、テキストを入力するだけで作れる無料の画像ジェネレーター。作った画像はPNGで保存してXなどのSNSに投稿できます。"

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** サービスの公開URL（末尾スラッシュなし） */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://reload-co-jp.github.io" + BASE_PATH
).replace(/\/$/, "")

/** public 以下のファイルへのパス（basePath を考慮） */
export function assetPath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`
}

/** 絶対URL */
export function absoluteUrl(path = "/"): string {
  const origin = SITE_URL.replace(new RegExp(`${BASE_PATH}$`), "")
  return `${origin}${assetPath(path)}`
}
