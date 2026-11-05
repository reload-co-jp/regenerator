/** @type {import('next').NextConfig} */

// 独自ドメイン（https://gen.reload.co.jp）のルートで公開するため basePath は使わない
const basePath = ""

const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  compiler: {
    styledComponents: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
