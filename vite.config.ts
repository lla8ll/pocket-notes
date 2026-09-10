import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative assets work on /, GitHub repository paths, and custom domains.
  base: './',
  plugins: [react()],
  build: { target: ['es2020', 'safari14'] },
});
