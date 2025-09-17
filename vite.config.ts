import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove most console statements in production but keep error logging
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.table']
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-core': ['solid-js', '@solidjs/router', '@solidjs/meta'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['solid-icons/fi', 'solid-icons/bi']
        }
      }
    }
  },
});
