"use client"

import { useState } from "react"
import { Button } from "./ui"

export function ImageDownloadButton({
  onDownload,
  disabled,
}: {
  onDownload: () => Promise<void>
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      $variant="primary"
      $size="lg"
      $block
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onDownload()
        } finally {
          setBusy(false)
        }
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path
          d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {busy ? "画像を生成中…" : "画像をダウンロード（PNG）"}
    </Button>
  )
}
