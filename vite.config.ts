import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

// Plugin to preload CSS and prevent render blocking
function cssPreloadPlugin() {
  return {
    name: 'css-preload',
    transformIndexHtml(html: string, context: any) {
      if (context.bundle) {
        // Find CSS files in the bundle
        const cssFiles = Object.keys(context.bundle).filter(file => file.endsWith('.css'));

        if (cssFiles.length > 0) {
          const cssFile = cssFiles[0]; // Main CSS file

          // Insert preload links before the title tag
          const preloadTags = `
    <!-- Preload critical CSS to prevent render blocking -->
    <link rel="preload" href="/${cssFile}" as="style">
    <link rel="stylesheet" href="/${cssFile}" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="/${cssFile}"></noscript>`;

          return html.replace('<title>ChatWii</title>', `${preloadTags}\n    <title>ChatWii</title>`);
        }
      }
      return html;
    }
  };
}

export default defineConfig({
  plugins: [solid(), cssPreloadPlugin()],
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
