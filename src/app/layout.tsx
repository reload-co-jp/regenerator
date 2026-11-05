import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { SiteFooter, SiteHeader } from "@/components/SiteChrome"
import { FONT_CSS_PATH } from "@/lib/fonts"
import StyledComponentsRegistry from "@/lib/registry"
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site"
import { GlobalStyle } from "@/styles/GlobalStyle"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL + "/"),
  title: {
    default: `${SITE_NAME}｜${SITE_TAGLINE}`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d7263d",
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href={FONT_CSS_PATH} />
      </head>
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </StyledComponentsRegistry>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
export default RootLayout
