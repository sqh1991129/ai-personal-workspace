const { defineConfig } = require('@vue/cli-service')

const proxyTarget = process.env.VUE_APP_API_PROXY_TARGET || 'http://127.0.0.1:8000'

// TypeScript 接线：本项目不装 @vue/cli-plugin-typescript（其 cache-loader peer 仍指向 webpack 4，
// 需要仓库级 legacy-peer-deps 才能装），故转译/检查/lint 三处在此手工补齐。
// 原理与踩坑记录见 docs/PROJECT_ANALYSIS.md 第 11 节。
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  // 三个模块（总览 / 对话 / 知识库）落地后，入口包含设计系统 CSS，实测约 304 KiB（gzip 约 81 KiB）。
  // runtime 拆成独立 chunk：业务代码变更时不再让用户重新下载 runtime。
  configureWebpack: {
    optimization: {
      runtimeChunk: 'single'
    },
    // 保留 webpack 的体积提示，只把阈值调到当前实测之上（entry 400 KiB / 单文件 250 KiB），
    // 而不是关掉 hints —— 明显变大时仍然会告警。
    performance: {
      hints: 'warning',
      maxEntrypointSize: 400 * 1024,
      maxAssetSize: 250 * 1024
    }
  },
  pages: {
    index: {
      entry: 'src/main.ts',
      template: 'public/index.html',
      filename: 'index.html',
      title: process.env.VUE_APP_TITLE || '个人 AI 工作台'
    }
  },
  chainWebpack: (config) => {
    // .tsx? 先过 ts-loader 去类型，再交 babel-loader 做 preset-env 降级（loader 右→左执行）
    config.module
      .rule('ts')
        .test(/\.tsx?$/)
        .use('babel-loader')
          .loader('babel-loader')
          .end()
        .use('ts-loader')
          .loader('ts-loader')
          .options({
            transpileOnly: true,
            appendTsSuffixTo: [/\.vue$/]
          })
          .end()
    // 让 `@/api/http` 这类无扩展名导入解析到 .ts
    config.resolve.extensions.merge(['.ts', '.tsx'])
    if (config.plugins.has('eslint')) {
      config.plugin('eslint').tap((args) => {
        const options = args[0] || {}
        const extensions = options.extensions || []
        return [{ ...options, extensions: [...extensions, '.ts', '.tsx'] }]
      })
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
