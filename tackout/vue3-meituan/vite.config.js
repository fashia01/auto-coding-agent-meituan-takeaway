import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    // Vant 4 按需自动引入（无需 import { Button } from 'vant'）
    Components({
      resolvers: [VantResolver()],
    }),
    // Vue / VueRouter / Pinia API 自动导入（无需手动 import ref/computed 等）
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    open: false,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局注入 mixin，所有 .vue 文件无需手动 @import
        // 使用 @use 替代 @import，消除 Dart Sass deprecation warning
        additionalData: `@use "@/style/mixin.scss" as *;`,
        // 静默 Dart Sass 废弃警告，保持终端输出干净
        silenceDeprecations: ['import', 'slash-div', 'global-builtin'],
      },
    },
  },
})
