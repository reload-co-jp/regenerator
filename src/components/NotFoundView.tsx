"use client"

import Link from "next/link"
import styled from "styled-components"
import { theme } from "@/styles/theme"
import { Button, Container } from "./ui"

const Wrap = styled(Container)`
  padding-top: 64px;
  text-align: center;
`

const Stamp = styled.div`
  display: inline-block;
  font-size: 4rem;
  font-weight: 900;
  color: ${theme.color.primary};
  border: 6px solid ${theme.color.primary};
  border-radius: 12px;
  padding: 0 0.4em;
  transform: rotate(-6deg);
  margin-bottom: 24px;
`

export function NotFoundView() {
  return (
    <Wrap>
      <Stamp aria-hidden="true">404</Stamp>
      <h1>お探しのテンプレートは見つかりませんでした</h1>
      <p style={{ margin: "12px 0 28px", color: theme.color.textMuted }}>
        URLが間違っているか、テンプレートが公開終了した可能性があります。
      </p>
      <Button as={Link} href="/" $variant="primary" $size="lg">
        テンプレート一覧へ戻る
      </Button>
    </Wrap>
  )
}
