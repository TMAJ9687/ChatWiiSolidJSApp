import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

// Plugin to preload critical resources
function resourcePreloadPlugin() {
  return {
    name: 'resource-preload',
    transformIndexHtml(html: string, context: any) {
      if (context.bundle) {
        const cssFiles = Object.keys(context.bundle).filter(file => file.endsWith('.css'));
        const jsFiles = Object.keys(context.bundle).filter(file =>
          file.startsWith('vendor') && file.endsWith('.js')
        );

        let preloadTags = '';

        // Preload vendor JS
        jsFiles.forEach(file => {
          preloadTags += `\n    <link rel="modulepreload" href="/assets/${file}">`;
        });

        // Preload CSS
        cssFiles.forEach(file => {
          preloadTags += `\n    <link rel="preload" href="/${file}" as="style">`;
        });

        if (preloadTags) {
          return html.replace(
            '<title>ChatWii</title>',
            `${preloadTags}\n    <title>ChatWii</title>`
          );
        }
      }
      return html;
    }
  };
}

export default defineConfig({
  plugins: [solid(), resourcePreloadPlugin()],
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
        // More aggressive console removal and optimization
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.table']
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Only split major vendor libraries to avoid over-chunking
          vendor: ['solid-js', '@solidjs/router', '@solidjs/meta', '@supabase/supabase-js']
        }
      }
    }
  },
});
