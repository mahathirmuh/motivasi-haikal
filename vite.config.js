import { defineConfig } from 'vite';

// Base './' keeps asset URLs relative so the build works under `vite preview`
// and when served from a sub-path.
export default defineConfig({
  base: './',
  server: {
    open: true,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
