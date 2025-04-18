const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // Ensure the publicPath is set to root
  publicPath: '/',
  // Output directly to dist directory (standard for Vercel)
  outputDir: '../public',
  // Don't add a subfolder for assets
  assetsDir: '',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
