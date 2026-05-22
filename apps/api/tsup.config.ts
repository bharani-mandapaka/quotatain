import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  // Bundle pure-TS workspace packages inline (no native modules)
  noExternal: [/@quotatain\/shared/, /@quotatain\/queue/],
  // Keep Prisma and its wrapper external — Prisma uses CJS require() for native modules
  external: ['@quotatain/database', '@prisma/client'],
})
