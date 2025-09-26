import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es', 'cjs'],
    },
    outDir: 'dist/',
    minify: 'terser',
    terserOptions: {
      mangle: {
        reserved: ['RpcServerError'],
      },
    },
  },
});
