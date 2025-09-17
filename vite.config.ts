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
          'vendor-icons': ['solid-icons/fi', 'solid-icons/bi'],
          // Admin panel (only loaded when needed)
          'admin': [
            './src/pages/AdminLogin',
            './src/pages/AdminDashboard',
            './src/components/admin/AdminStats',
            './src/components/admin/UserManagement',
            './src/components/admin/BanManagement'
          ].filter(Boolean),
          // Chat components (split desktop/mobile)
          'chat-desktop': [
            './src/components/chat/desktop/ChatArea',
            './src/components/chat/desktop/MessageBubble',
            './src/components/chat/desktop/ImageModal'
          ].filter(Boolean),
          'chat-mobile': [
            './src/components/chat/mobile/ChatArea',
            './src/components/chat/mobile/MessageBubble',
            './src/components/chat/mobile/ImageModal'
          ].filter(Boolean)
        }
      }
    }
  },
});
