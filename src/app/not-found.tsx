import type { Metadata } from "next"
import { NotFoundView } from "@/components/NotFoundView"

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false },
}

export default function NotFound() {
  return <NotFoundView />
}
