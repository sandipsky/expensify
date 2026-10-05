import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must run before react(): scans src/routes/ and generates src/routeTree.gen.ts
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    // React Compiler (automatic memoisation) via Babel
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      // `@/` -> `src/` (mirrored in tsconfig.app.json "paths")
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
