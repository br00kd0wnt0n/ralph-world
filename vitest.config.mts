import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // Explicit @/* alias (mirrors tsconfig). `vite-tsconfig-paths` also
      // does this, but having it here makes the path deterministic for
      // `vi.mock('@/...')` calls in tests.
      '@': here,
      // `server-only` throws at import-time outside a Next server context
      // (jsdom looks client-like to it). Alias to a no-op so server-coupled
      // modules can be unit-tested. The real guard still fires in `next build`.
      'server-only': path.resolve(here, './vitest.server-only-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Unit + integration tests live next to source as *.test.ts(x)
    // or under __tests__/. E2E (Playwright) is excluded — it has its
    // own runner.
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', 'tests-e2e/**'],
  },
})
