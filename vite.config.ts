import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves project sites from /<repo-name>/. The deploy workflow sets BASE_PATH; locally it's "/".
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: { environment: 'node' },
});
