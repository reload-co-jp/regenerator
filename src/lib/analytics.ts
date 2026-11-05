/**
 * アクセス解析イベント。
 * GA4（gtag）や GTM（dataLayer）が読み込まれていればそちらへ送信する。
 * どちらも無い場合は CustomEvent "regenerator:analytics" を発火するだけ。
 */

export type AnalyticsEvent =
  | "template_view"
  | "template_select"
  | "image_generate"
  | "image_download"
  | "share_click"
  | "copy_image"
  | "share_text_copy"
  | "remix_open"
  | "remix_link_copy"
  | "sample_apply"

export interface AnalyticsParams {
  template_id: string
  [key: string]: string | number | boolean | undefined
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function track(event: AnalyticsEvent, params: AnalyticsParams): void {
  if (typeof window === "undefined") return
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, params)
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...params })
    }
    window.dispatchEvent(
      new CustomEvent("regenerator:analytics", { detail: { event, ...params } })
    )
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics]", event, params)
    }
  } catch {
    // 計測の失敗で操作を妨げない
  }
}
