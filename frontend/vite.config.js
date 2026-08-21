import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  plugins: [
    VitePWA({
      // [NOUVEAU] Sans ce plugin, aucun service worker n'est jamais
      // enregistré — c'est pour ça que Chrome ne proposait jamais le vrai
      // bouton d'installation (beforeinstallprompt ne se déclenche que si
      // un service worker existe et que les critères d'installabilité
      // sont remplis).
      registerType: 'autoUpdate',
      // Active le service worker même en développement (npm run dev) —
      // par défaut, vite-plugin-pwa ne l'active qu'en production
      // (npm run build), ce qui explique aussi pourquoi ça ne marchait
      // jamais en localhost.
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "E-cahier",
        short_name: "E-cahier",
        description: "Application de gestion pédagogique et suivi des cahiers de texte",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
});
