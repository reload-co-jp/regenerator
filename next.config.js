/** @type {import('next').NextConfig} */

const basePath = process.env.NODE_ENV === "production" ? "/regenerator" : ""

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
