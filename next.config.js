// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 今回は外部画像に依存しない（インラインSVG中心）
  images: {},
};

module.exports = nextConfig;
