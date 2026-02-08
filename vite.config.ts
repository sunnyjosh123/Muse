
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      // Copy MediaPipe WASM files to public folder for local serving
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@mediapipe/holistic/*',
            dest: 'mediapipe/holistic'
          }
        ]
      })
    ],
    define: {
      // Legacy support: process.env.API_KEY maps to .env file's API_KEY
      // Preferred: use import.meta.env.VITE_GEMINI_API_KEY in code
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_GEMINI_API_KEY || '')
    },
    server: {
      host: true,
      cors: true,
      proxy: {
        '/google-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/google-api/, '')
        }
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      },
      // Serve node_modules/@mediapipe as static files
      fs: {
        allow: ['..', 'node_modules/@mediapipe']
      }
    },
    // Use relative paths for assets to support any deployment context
    base: './',
    // Optimize MediaPipe dependencies
    optimizeDeps: {
      exclude: ['@mediapipe/holistic', '@mediapipe/drawing_utils', '@mediapipe/camera_utils']
    },
    // Production build optimizations for 100+ concurrent users
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      target: 'esnext',
      cssCodeSplit: true,
      // Inline assets < 8KB to reduce HTTP round trips under concurrent load
      assetsInlineLimit: 8192,
      // Manual code splitting for optimal CDN caching and parallel loading
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'genai-vendor': ['@google/genai'],
            'mediapipe-vendor': ['@mediapipe/holistic', '@mediapipe/drawing_utils', '@mediapipe/camera_utils'],
            'ui-vendor': ['lucide-react']
          }
        }
      }
    }
  }
})
