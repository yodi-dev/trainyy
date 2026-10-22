# ⚡ Trainyy — Mobile-First Offline-Ready AI Quiz PWA

> **Aplikasi web pembelajaran personal berbasis *active recall* (kuis 10 soal per sesi), bekerja 100% offline, ditenagai Google Gemini AI untuk pembuatan bank soal otomatis dari PDF/teks, dan terintegrasi penuh dalam Ekosistem Google ($0 Zero-Cost).**

[![Version](https://img.shields.io/badge/version-v1.0-6366f1.svg)](./PRD_v1.0.md)
[![Vue](https://img.shields.io/badge/Vue-3.5+-42b883.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8+-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-10b981.svg)](https://web.dev/progressive-web-apps/)
[![Ecosystem](https://img.shields.io/badge/Google-100%25_Zero--Cost-ea4335.svg)](https://cloud.google.com/)

---

## 🎯 Filosofi & Latar Belakang

Belajar yang efektif bukan sekadar membaca ulang (*passive reading*), melainkan menguji pemahaman secara berkala melalui pertanyaan (*active retrieval*). **Trainyy** (dengan inisial *y* dari nama pembuatnya, Yodi) hadir untuk memudahkan siapa saja belajar materi apa pun melalui kuis pilihan ganda 10 soal per sesi yang santai, terfokus, dan dapat diakses di mana saja—bahkan saat tidak ada sinyal internet.

---

## ✨ Fitur Utama (v1.0)

1. **📱 Mobile-First & Offline-Ready (PWA)**:
   - Didesain khusus untuk navigasi satu tangan (ramah jempol) dengan *bottom navigation bar*.
   - Dapat diinstal ke layar utama ponsel (*Add to Home Screen*) tanpa perlu app store.
   - Bekerja penuh saat offline (di pesawat, KRL, atau area minim sinyal) berkat Service Worker dan IndexedDB (Dexie.js).
2. **🤖 AI Quiz Generator (Google Gemini Flash)**:
   - Otomatis membuat bank soal pilihan ganda berkualitas tinggi beserta kunci dan pembahasan mendalam langsung dari materi Anda.
   - Menggunakan Google Gemini API Free Tier (1.500 request/hari gratis via Google AI Studio).
3. **📄 Document Ingestion (PDF & Catatan Teks)**:
   - Unggah dokumen PDF materi kuliah/kerja/sertifikasi dan sistem mengekstrak teksnya langsung di browser via `pdfjs-dist`.
   - Mendukung integrasi **Google Drive PDF Picker** untuk mengambil materi langsung dari Drive Anda.
4. **🧠 Quiz Engine 10 Soal & Spaced Repetition**:
   - Sesi micro-learning tepat 10 soal per putaran.
   - **Mode Belajar**: Feedback seketika (warna hijau/merah) begitu tombol jawaban ditekan, lengkap dengan kartu pembahasan.
   - **Mode Simulasi**: Pengerjaan berturut-turut tanpa jeda dengan rekapitulasi di akhir.
5. **🎯 Ruang Remedial (Mistake Vault)**:
   - Melacak pertanyaan-pertanyaan yang pernah salah dijawab.
   - Fitur "Latih Ulang Soal Salah" untuk memperkuat ingatan hingga benar-benar paham.
6. **☁️ 100% Ekosistem Google ($0 Zero-Cost)**:
   - **Google Identity Services (GIS)**: Login 1-klik dengan akun Google Anda.
   - **Google Drive Backup**: Seluruh deck materi, bank soal, dan riwayat tersimpan aman sebagai `trainyy-backup.json` di Google Drive pribadi Anda.
   - **Google Sheets Analytics**: Sesi kuis otomatis mencatat riwayat nilai ke Google Spreadsheet pribadi untuk visualisasi analitik dan grafik perkembangan.

---

## 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- **Icons**: [@lucide/vue](https://lucide.dev/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Offline Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **PDF Parser**: [pdfjs-dist](https://mozilla.github.io/pdf.js/)
- **Cloud & Auth**: Google Identity Services (GIS) & Google Drive API
- **Analytics**: Google Sheets API
- **AI Model**: Google Gemini 1.5/2.0 Flash via REST

---

## 🚀 Memulai (Local Development)

```bash
# 1. Masuk ke direktori
cd d:/web/trainyy

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev

# 4. Build untuk produksi / PWA
npm run build
```

---

## ☁️ Panduan Deploy ke Cloudflare Pages

1. Masuk ke dashboard [Cloudflare Pages](https://dash.cloudflare.com/) lalu pilih **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
2. Pilih repository GitHub: `yodi-dev/trainyy`.
3. Pengaturan Build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Di bagian **Environment variables (Variables and Secrets)**, tambahkan:
   - `NODE_VERSION`: `22`
   - `VITE_GOOGLE_CLIENT_ID`: `10475823948-6l2qk1g1313g4c8afujo6md17t51th20.apps.googleusercontent.com`
   - `VITE_GEMINI_API_KEY`: *(Kunci AI Google Gemini Anda)*
5. Klik **Save and Deploy**. Aplikasi PWA Trainyy akan langsung aktif di domain `*.pages.dev` dengan SSL otomatis dan Unlimited Bandwidth!

---

## 📋 Dokumentasi & Versi

Dokumentasi detail spesifikasi teknis dan riwayat versi tersedia di:
- [Product Requirements Document (PRD v1.0)](./PRD_v1.0.md)

---

## 📄 Lisensi

Proyek personal berlisensi MIT. Dibuat dengan dedikasi untuk efisiensi belajar mandiri.

