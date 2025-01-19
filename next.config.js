/** @type {import('next').NextConfig} */
const nextConfig = {
  // Відключаємо строгий режим React
  reactStrictMode: false,

  // Налаштування ESLint
  eslint: {
    // Відключаємо помилки ESLint під час збірки
    ignoreDuringBuilds: true,
  },

  // Налаштування TypeScript
  typescript: {
    // Відключаємо помилки TypeScript під час збірки
    ignoreBuildErrors: true,
  },

  // Відключаємо індикатори розробки
  devIndicators: {
    buildActivity: false,
  }
}

module.exports = nextConfig
