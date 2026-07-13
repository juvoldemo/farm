import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom' },
  build: {
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            { name:'supabase', test:/node_modules[\\/]@supabase/, priority:3 },
            { name:'motion', test:/node_modules[\\/](framer-motion|motion-dom|motion-utils)/, priority:2 },
            { name:'react', test:/node_modules[\\/](react|react-dom|scheduler)/, priority:2 },
          ],
        },
      },
    },
  },
})
