import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  plugins: [
    cloudflare({
      configPath: './wrangler.jsonc',
      persistState: true,
    }),
    ssrPlugin()
  ],
  server: {
    hmr: false,  // WebSocketエラー回避のためHMR無効化
    port: 8787   // Cloudflare Workersのデフォルトポート
  }
})
