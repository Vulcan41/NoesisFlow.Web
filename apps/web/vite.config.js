import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      __API_URL__: JSON.stringify(env.VITE_API_URL || '')
    },
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'core'),
        '@components': resolve(__dirname, 'components'),
        '@services': resolve(__dirname, 'services'),
        '@state': resolve(__dirname, 'state'),
        '@views': resolve(__dirname, 'views'),
        '@assets': resolve(__dirname, 'assets'),
        '@locales': resolve(__dirname, 'locales'),
      }
    },
    build: {
      outDir: 'dist'
    }
  }
})
