"use client"

import Link from "next/link"
import styled from "styled-components"
import { SITE_NAME } from "@/lib/site"
import { theme } from "@/styles/theme"
import { Container } from "./ui"

const HeaderBar = styled.header`
  background: ${theme.color.surface};
  border-bottom: 1px solid ${theme.color.border};
`

const HeaderInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
`

const Logo = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
`

const LogoMark = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="7" fill={theme.color.primary} />
    <rect x="6" y="7" width="20" height="4" rx="1" fill="#fff" />
    <rect x="6" y="14" width="13" height="11" rx="1" fill="#fff" />
    <rect x="21" y="14" width="5" height="3" rx="1" fill="#fff" opacity=".8" />
    <rect x="21" y="19" width="5" height="3" rx="1" fill="#fff" opacity=".8" />
  </svg>
)

const Nav = styled.nav`
  font-size: 0.85rem;
  a {
    text-decoration: none;
    color: ${theme.color.textMuted};
    &:hover {
      color: ${theme.color.text};
    }
  }
`

export function SiteHeader() {
  return (
    <HeaderBar>
      <HeaderInner>
        <Logo href="/">
          <LogoMark />
          {SITE_NAME}
        </Logo>
        <Nav aria-label="メイン">
          <Link href="/#templates">テンプレート一覧</Link>
        </Nav>
      </HeaderInner>
    </HeaderBar>
  )
}

const FooterBar = styled.footer`
  margin-top: 64px;
  border-top: 1px solid ${theme.color.border};
  background: ${theme.color.surface};
  color: ${theme.color.textMuted};
  font-size: 0.8rem;
  padding: 24px 0 32px;
  p + p {
    margin-top: 0.5em;
  }
`

export function SiteFooter() {
  return (
    <FooterBar>
      <Container>
        <p>
          テンプレートはすべて独自デザインのパロディです。実在の企業・番組・団体とは関係ありません。
        </p>
        <p>
          画像は端末内で生成され、入力内容やアップロード画像がサーバーに送信されることはありません。
        </p>
        <p>&copy; {SITE_NAME}</p>
      </Container>
    </FooterBar>
  )
}
