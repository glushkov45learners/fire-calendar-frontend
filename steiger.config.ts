import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  // shortcut: early project, slices are used once; re-enable when the app grows.
  { rules: { 'fsd/insignificant-slice': 'off' } },
  {
    // shadcn generates many small files in shared/ui; that's fine there.
    files: ['./src/shared/ui/**'],
    rules: { 'fsd/public-api': 'off' },
  },
])
