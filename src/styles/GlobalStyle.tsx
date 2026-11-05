"use client"

import { createGlobalStyle } from "styled-components"
import { theme } from "./theme"

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }
  html {
    -webkit-text-size-adjust: 100%;
  }
  body {
    margin: 0;
    background: ${theme.color.bg};
    color: ${theme.color.text};
    font-family: ${theme.font.ui};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, p, ul, ol, figure {
    margin: 0;
  }
  ul, ol {
    padding: 0;
    list-style: none;
  }
  a {
    color: inherit;
  }
  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }
  img, svg {
    max-width: 100%;
  }
  :focus-visible {
    outline: 3px solid ${theme.color.focus};
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
`
