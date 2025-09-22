import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";

// Plugin for critical CSS inlining and async loading
function criticalCSSPlugin() {
  return {
    name: 'critical-css',
    transformIndexHtml(html: string, context: any) {
      if (context.bundle) {
        const cssFiles = Object.keys(context.bundle).filter(file => file.endsWith('.css'));

        if (cssFiles.length > 0) {
          const cssFile = cssFiles[0];

          // Security and CAPTCHA meta tags with analytics domains
          const securityMeta = `
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://static.cloudflareinsights.com https://www.clarity.ms https://scripts.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://challenges.cloudflare.com https://www.google.com https://ipapi.co https://static.cloudflareinsights.com https://www.clarity.ms https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://www.recaptcha.net; img-src 'self' data: blob: https://*.supabase.co https:;">
    <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()">`;

          // Critical CSS (above-the-fold styles)
          const criticalCSS = `
    <style>
      /* Critical CSS for above-the-fold content */
      html{font-family:"Open Sans",system-ui,sans-serif}
      body{margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
      .bg-white{background-color:#fff}
      .dark .bg-neutral-800{background-color:#262626}
      .text-text-1000{color:#0a0a0a}
      .dark .text-text-0{color:#fafafa}
      .flex{display:flex}
      .items-center{align-items:center}
      .justify-center{justify-content:center}
      .min-h-screen{min-height:100vh}
      .w-full{width:100%}
      .max-w-md{max-width:28rem}
      .mx-auto{margin-left:auto;margin-right:auto}
      .p-4{padding:1rem}
      .space-y-4>*+*{margin-top:1rem}
      .rounded-xl{border-radius:0.75rem}
      .shadow-xl{box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)}
    </style>`;

          // Async CSS loading with proper crossorigin
          const asyncCSS = `
    <link rel="preload" href="/${cssFile}" as="style" crossorigin onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="/${cssFile}"></noscript>`;

          return html.replace(
            '<title>ChatWii</title>',
            `${securityMeta}\n${criticalCSS}\n${asyncCSS}\n    <title>ChatWii</title>`
          );
        }
      }
      return html;
    }
  };
}

export default defineConfig({
  plugins: [solid(), criticalCSSPlugin()],
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
