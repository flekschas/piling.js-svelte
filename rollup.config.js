import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/bundle.js',
  },
  plugins: [
    svelte({ dev: !production }),

    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),

    commonjs(),

    // Reload the browser when the build changes
    !production && livereload(),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
};
