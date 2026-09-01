const { defineConfig } = require('@vue/cli-service')

const proxyTarget = process.env.VUE_APP_API_PROXY_TARGET || 'http://127.0.0.1:8000'

module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: process.env.VUE_APP_TITLE || '个人 AI 工作台'
    }
  },
  devServer: {
    port: Number(process.env.VUE_APP_DEV_PORT) || 8080,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true
      }
    }
  }
})
