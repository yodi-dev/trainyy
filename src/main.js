import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { seedDemoDataIfEmpty } from './db'

// Inisialisasi basis data lokal & materi demo pertama
seedDemoDataIfEmpty().catch((err) => {
  console.warn('Gagal menginisialisasi database lokal:', err)
})

createApp(App).mount('#app')
