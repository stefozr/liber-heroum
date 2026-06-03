/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' makes all asset URLs relative, so the build works whether it is
// served from a domain root or from a GitHub Pages project subpath
// (https://<user>.github.io/<repo>/) without knowing the repo name at build time.
export default defineConfig({
  base: './',
  plugins: [react()],
  // The legacy files are .jsx (JS + JSX). esbuild needs to treat their JSX,
  // which plugin-react handles. Keep the dep pre-bundle explicit.
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
