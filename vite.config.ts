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
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable splitting for now
      }
    },
    minify: 'esbuild',
    target: 'es2020'
  },
});
