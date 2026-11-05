/** サイト UI のデザイントークン（テンプレート画像のデザインとは独立） */
export const theme = {
  color: {
    bg: "#f6f4ef",
    surface: "#ffffff",
    surfaceAlt: "#efece4",
    text: "#1d1b17",
    textMuted: "#6b665c",
    border: "#e2ddd2",
    primary: "#d7263d",
    primaryHover: "#b81d31",
    primaryText: "#ffffff",
    accent: "#1d1b17",
    focus: "#2f6fed",
    success: "#1f8a4c",
    danger: "#c62828",
    x: "#000000",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    pill: "999px",
  },
  shadow: {
    card: "0 1px 2px rgba(29,27,23,.06), 0 4px 16px rgba(29,27,23,.06)",
    raised: "0 2px 4px rgba(29,27,23,.08), 0 12px 32px rgba(29,27,23,.12)",
  },
  font: {
    ui: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif",
  },
  /** min-width のブレークポイント（モバイルファースト） */
  bp: {
    sm: "@media (min-width: 560px)",
    md: "@media (min-width: 860px)",
    lg: "@media (min-width: 1120px)",
  },
  maxWidth: "1200px",
} as const

export type Theme = typeof theme
