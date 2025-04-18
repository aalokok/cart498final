const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // Ensure the publicPath is set to root
  publicPath: '/',
  // Output to the dist directory
  outputDir: 'dist',
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
