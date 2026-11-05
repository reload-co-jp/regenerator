"use client"

import { useEffect, useState } from "react"
import styled from "styled-components"
import { track } from "@/lib/analytics"
import {
  canCopyImage,
  canShareFiles,
  copyImage,
  copyText,
  shareImage,
  shareTextWithTags,
  xIntentUrl,
  type ShareContent,
} from "@/lib/share"
import { theme } from "@/styles/theme"
import { Button } from "./ui"

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const Status = styled.p<{ $error?: boolean }>`
  min-height: 1.4em;
  font-size: 0.8rem;
  margin-top: 6px;
  color: ${(p) => (p.$error ? theme.color.danger : theme.color.success)};
  font-weight: 700;
`

const XLogo = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

export function ShareButtons({
  templateId,
  content,
  getBlob,
  fileName,
  onFallbackDownload,
}: {
  templateId: string
  content: ShareContent
  getBlob: () => Promise<Blob>
  fileName: () => string
  /** 共有・コピーに失敗したときのダウンロード */
  onFallbackDownload: () => void
}) {
  const [supportsShare, setSupportsShare] = useState(false)
  const [supportsCopyImage, setSupportsCopyImage] = useState(false)
  const [status, setStatus] = useState<{
    text: string
    error?: boolean
  } | null>(null)

  useEffect(() => {
    const probe = new File([new Uint8Array([0])], "probe.png", {
      type: "image/png",
    })
    /* eslint-disable react-hooks/set-state-in-effect */
    setSupportsShare(canShareFiles(probe))
    setSupportsCopyImage(canCopyImage())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const flash = (text: string, error = false) => {
    setStatus({ text, error })
    setTimeout(() => setStatus(null), 4000)
  }

  const onX = () => {
    track("share_click", { template_id: templateId, method: "x" })
    window.open(xIntentUrl(content), "_blank", "noopener,noreferrer")
  }

  const onShare = async () => {
    track("share_click", { template_id: templateId, method: "web_share" })
    try {
      const blob = await getBlob()
      const file = new File([blob], fileName(), { type: "image/png" })
      const ok = await shareImage(file, content)
      if (!ok) {
        flash("共有できなかったため、画像をダウンロードします", true)
        onFallbackDownload()
      }
    } catch {
      flash("共有に失敗しました。画像をダウンロードします", true)
      onFallbackDownload()
    }
  }

  const onCopyImage = async () => {
    try {
      await copyImage(getBlob())
      track("copy_image", { template_id: templateId })
      flash("画像をコピーしました")
    } catch {
      flash("画像をコピーできませんでした。ダウンロードをご利用ください", true)
    }
  }

  const onCopyText = async () => {
    try {
      await copyText(shareTextWithTags(content))
      track("share_text_copy", { template_id: templateId })
      flash("投稿文をコピーしました")
    } catch {
      flash("コピーできませんでした", true)
    }
  }

  return (
    <div>
      <Row>
        <Button
          type="button"
          $variant="x"
          onClick={onX}
          style={{ gridColumn: supportsShare ? "auto" : "1 / -1" }}
        >
          <XLogo />
          Xに投稿
        </Button>
        {supportsShare && (
          <Button type="button" onClick={onShare}>
            画像を共有
          </Button>
        )}
        {supportsCopyImage && (
          <Button type="button" onClick={onCopyImage}>
            画像をコピー
          </Button>
        )}
        <Button
          type="button"
          onClick={onCopyText}
          style={{ gridColumn: supportsCopyImage ? "auto" : "1 / -1" }}
        >
          投稿文をコピー
        </Button>
      </Row>
      <Status $error={status?.error} role="status">
        {status?.text}
      </Status>
    </div>
  )
}
