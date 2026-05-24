import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Carrega o .env correcto consoante o modo (dev | prod)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    // Expõe apenas variáveis VITE_ ao browser
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
    },

    server: {
      proxy: {
        "/.netlify/functions": {
          target: "http://localhost:8888",
          changeOrigin: true,
        },
      },
    },

    build: {
      // Avisa se algum chunk passar 500kB
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:   ["react", "react-dom", "react-router-dom"],
            firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
            charts:   ["recharts"],
          },
        },
      },
    },
  };
});
