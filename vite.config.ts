import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        terminos: resolve(__dirname, 'terminos.html'),
        privacidad: resolve(__dirname, 'privacidad.html'),
        servVoz: resolve(__dirname, 'servicios/voz.html'),
        servChat: resolve(__dirname, 'servicios/chat.html'),
        servWeb: resolve(__dirname, 'servicios/web.html'),
        servWhatsapp: resolve(__dirname, 'servicios/whatsapp.html'),
        indSalud: resolve(__dirname, 'industrias/salud.html'),
        indEcommerce: resolve(__dirname, 'industrias/ecommerce.html'),
        indServiciosLocales: resolve(__dirname, 'industrias/servicios-locales.html'),
        indInmobiliaria: resolve(__dirname, 'industrias/inmobiliaria.html'),
        indNegocioLocal: resolve(__dirname, 'industrias/negocio-local.html'),
      },
    },
  },
})
