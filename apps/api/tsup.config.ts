import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  // Bundle all workspace packages inline — their dist/ is wiped by Nixpacks' final COPY
  noExternal: [/@quotatain\//],
  // Keep @prisma/client external — it lives in node_modules/ which Nixpacks preserves,
  // and its native query engine binary must be loaded from its installed location
  external: ['@prisma/client'],
})
