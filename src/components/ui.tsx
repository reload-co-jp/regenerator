"use client"

import styled, { css } from "styled-components"
import { theme } from "@/styles/theme"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "x"

const variants = {
  primary: css`
    background: ${theme.color.primary};
    color: ${theme.color.primaryText};
    border-color: ${theme.color.primary};
    &:hover:not(:disabled) {
      background: ${theme.color.primaryHover};
    }
  `,
  secondary: css`
    background: ${theme.color.surface};
    color: ${theme.color.text};
    border-color: ${theme.color.border};
    &:hover:not(:disabled) {
      background: ${theme.color.surfaceAlt};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${theme.color.textMuted};
    border-color: transparent;
    &:hover:not(:disabled) {
      color: ${theme.color.text};
      background: ${theme.color.surfaceAlt};
    }
  `,
  x: css`
    background: ${theme.color.x};
    color: #fff;
    border-color: ${theme.color.x};
    &:hover:not(:disabled) {
      background: #333;
    }
  `,
}

export const Button = styled.button<{
  $variant?: ButtonVariant
  $size?: "sm" | "md" | "lg"
  $block?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  border: 1px solid transparent;
  border-radius: ${theme.radius.md};
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  min-height: 44px;
  padding: 0 1.1em;
  font-size: 0.95rem;
  width: ${(p) => (p.$block ? "100%" : "auto")};
  ${(p) =>
    p.$size === "lg" &&
    css`
      min-height: 56px;
      font-size: 1.1rem;
      border-radius: ${theme.radius.lg};
    `}
  ${(p) =>
    p.$size === "sm" &&
    css`
      min-height: 36px;
      padding: 0 0.8em;
      font-size: 0.85rem;
    `}
  ${(p) => variants[p.$variant ?? "secondary"]}
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

export const Container = styled.div`
  width: 100%;
  max-width: ${theme.maxWidth};
  margin: 0 auto;
  padding: 0 16px;
  ${theme.bp.md} {
    padding: 0 24px;
  }
`

export const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${theme.color.textMuted};
  background: ${theme.color.surfaceAlt};
  border-radius: ${theme.radius.pill};
  padding: 0.15em 0.7em;
`
