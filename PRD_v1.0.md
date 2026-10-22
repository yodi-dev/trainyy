# Product Requirements Document (PRD) - v1.0

## Project: Trainyy - Mobile-First Offline-Ready AI Quiz PWA

---

### 📌 Dokumen Kontrol & Riwayat Versi (Changelog)

| Versi | Tanggal | Penulis | Ringkasan Perubahan Utama |
| :---: | :---: | :---: | :--- |
| **v1.0** | 22 Oktober 2026 | Yodi & AI Assistant | **Inisialisasi & Arsitektur MVP Trainyy:**<br>1. Branding resmi menjadi **Trainyy** (huruf *y* merupakan inisial Yodi).<br>2. Penetapan filosofi belajar berbasis *Active Recall* & *Testing Effect* (kuis pilihan ganda 10 soal per sesi).<br>3. Arsitektur **100% Google Ecosystem & Zero-Cost ($0)**: Google Identity Services (GIS), Google Drive API (Backup JSON & PDF Ingestion), Google Sheets API (Dashboard Analitik Otomatis), dan Google Gemini Flash API (AI Quiz Generator).<br>4. Arsitektur **Offline-First**: Local storage berbasis IndexedDB (Dexie.js) dan Service Worker PWA (`vite-plugin-pwa`) agar dapat dipakai di KRL, pesawat, atau tanpa sinyal.<br>5. Fitur **Document Ingestion**: Parser PDF langsung di browser via `pdfjs-dist` & input catatan teks bebas.<br>6. **Quiz Engine 10 Soal**: Evaluasi instan (Mode Belajar) dan Mode Simulasi, serta Ruang Remedial (pengulangan khusus soal yang pernah salah).<br>7. **Design System & Visual Identity**: Mobile-first ergonomis (thumb-friendly), tema Dark Canvas modern dengan aksen Electric Indigo & Vibrant Emerald. |

---

### 1. Ringkasan Eksekutif & Latar Belakang

**Trainyy** adalah aplikasi web Progressive Web App (PWA) pembelajaran personal berbasis *active recall* dan kuis pilihan ganda yang dirancang khusus untuk penggunaan mandiri secara mobile, cepat, dan bekerja secara penuh baik online maupun offline.

**Latar Belakang & Filosofi:**
Belajar bukan sekadar membaca ulang materi secara pasif (*passive reading*), melainkan menguji pemahaman melalui pertanyaan (*active retrieval*). Dengan sering diuji melalui kuis-kuis pendek (10 soal per sesi), otak dipaksa memanggil kembali ingatan sehingga pemahaman materi lebih cepat melekat dalam jangka panjang.

**Prinsip Utama Trainyy:**
1. **Local-First & Offline-Ready:** Materi dan kuis dapat dikerjakan kapan saja di mana saja tanpa memerlukan koneksi internet aktif.
2. **100% Ekosistem Google & Zero-Cost ($0):** Seluruh kebutuhan autentikasi, penyimpanan data, integrasi materi, analitik, dan kecerdasan buatan (AI) dipusatkan ke akun Google pribadi pengguna tanpa biaya server sepeser pun.
3. **AI-Powered Learning on Demand:** Pembuatan bank soal dilakukan secara otomatis oleh Google Gemini Flash AI langsung dari materi catatan teks maupun dokumen PDF.
4. **Ergonomi Ponsel (Mobile-First):** Dirancang nyaman dioperasikan dengan satu tangan (jempol), transisi cepat, dan tampilan visual berkelas.

---

### 2. Sasaran & Kriteria Keberhasilan (Success Metrics)

- **Biaya Operasional Rp 0:** Berjalan 100% tanpa server backend, memanfaatkan free tier resmi Google (GIS, Drive API, Sheets API, Gemini Flash) dan static hosting gratis (Vercel / Cloudflare Pages).
- **Keandalan Offline 100%:** Aplikasi dapat dibuka, materi tersimpan dapat diakses, kuis 10 soal dapat dikerjakan, dan skor tersimpan di perangkat meski dalam *Airplane Mode*.
- **Micro-Learning Cepat (3–5 Menit):** Sesi kuis dibatasi 10 soal agar tidak melelahkan mental dan cocok dikerjakan di sela waktu luang (misal menunggu atau di transportasi umum).
- **Zero Data Loss & Cloud Sync:** Data tersimpan lokal di IndexedDB dan otomatis dicadangkan ke Google Drive pribadi (`trainyy-backup.json`) saat terhubung online.
- **Ekspor Analitik Otomatis:** Rekap nilai otomatis tertulis ke Google Spreadsheet pengguna tanpa perlu aplikasi pihak ketiga.

---

### 3. Batasan Platform & Lingkungan

- **Target Utama:** Mobile Browser (Safari iOS & Google Chrome Android) yang dipasang sebagai **PWA Standalone (Add to Home Screen)**.
- **Dukungan Sekunder:** Desktop Browser (Chrome, Edge, Firefox, Safari).
- **Desain & Aksesibilitas:** Desain ramah jempol (*bottom navigation bar*, *large tap targets*), mendukung safe-area insets, serta Dark Mode berfokus tinggi.

---

### 4. Ruang Lingkup Fitur (Feature Scope v1.0)

#### 4.1. Shell Aplikasi Mobile-First (PWA Shell)
- **Bottom Navigation Bar:**
  - 🏠 **Beranda:** Kartu kuis kilat 10 soal, ringkasan sesi harian, materi yang sering dipelajari.
  - 📚 **Bank Materi (Decks):** Daftar topik/deck, jumlah soal, dan tombol tambah materi baru.
  - 🎯 **Ruang Remedial (Salah Belajar):** Kumpulan soal yang pernah dijawab salah untuk dilatih ulang sampai tuntas.
  - ⚙️ **Pengaturan & Akun:** Status Google Drive, integrasi Google Sheets, Gemini API Key, dan preferensi tema.
- **Indikator Konektivitas:** Status *Offline/Online badge* yang responsif.
- **PWA Service Worker:** Auto-cache aset aplikasi untuk akses instan tanpa jaringan.

#### 4.2. Manajemen Materi & Input Dokumen (Deck Management)
- **Pembuatan Deck:** Judul materi, kategori, dan deskripsi singkat.
- **Sumber Materi Fleksibel:**
  - **Teks Manual / Catatan:** Tempel rangkuman teks atau materi tulisan sendiri.
  - **Upload PDF Lokal:** Diparsing langsung di browser menggunakan `pdfjs-dist` tanpa upload ke server luar.
  - **Google Drive PDF Ingestion (Fitur Google):** Mengambil file PDF langsung dari Google Drive pengguna via Google Drive API.

#### 4.3. AI Quiz Generator (Google Gemini Flash)
- Menggunakan endpoint resmi Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash`).
- API Key Google AI Studio pengguna disimpan aman di penyimpanan lokal perangkat.
- Prompt terstruktur menghasilkan bank soal berformat JSON valid:
  - Pertanyaan berbobot (konseptual, bukan sekadar hafalan kata per kata).
  - 4 Pilihan Jawaban (1 jawaban benar, 3 pengecoh logis).
  - Pembahasan detail: alasan mengapa opsi benar tepat dan mengapa opsi lain salah.

#### 4.4. Mesin Kuis 10 Soal (Quiz Engine)
- **Format Sesi:** Tepat 10 soal per sesi untuk retensi ingatan maksimal.
- **Algoritma Seleksi Spaced Repetition Ringan:**
  - Prioritas 1: Soal-soal yang di sesi sebelumnya dijawab salah.
  - Prioritas 2: Soal yang belum pernah dikerjakan.
  - Prioritas 3: Soal lama yang diacak untuk penguatan memori.
- **Mode Belajar (Default):** Evaluasi seketika saat opsi ditekan. Muncul warna hijau/merah dan kartu pembahasan di bawah layar sebelum melanjutkan.
- **Mode Simulasi (Ujian):** Kerjakan 10 soal berturut-turut tanpa jeda, rekap skor dan analisis pembahasan di akhir.
- **Haptic Feedback:** Getaran lembut via Web Vibration API di smartphone saat memilih jawaban.

#### 4.5. Ruang Remedial & Riwayat Pembelajaran
- Pencatatan otomatis setiap kali kuis selesai (Tanggal, Deck, Skor, Durasi, Daftar Soal Salah).
- **Fitur Kuis Remedial:** Satu klik untuk membuat sesi kuis yang HANYA berisi soal-soal yang pernah gagal dijawab.

#### 4.6. Integrasi Ekosistem Google (GIS, Drive, Sheets)
- **Google Identity Services (GIS):** Login 1-klik dengan akun Google pengguna.
- **Google Drive Backup & Sync:**
  - Auto-backup file `trainyy-backup.json` (menyimpan seluruh materi, soal, dan riwayat).
  - Opsi *Pulihkan Data (Restore)* jika ganti perangkat atau setelah bersihkan cache browser.
- **Google Sheets Analytics:**
  - Pengguna dapat menghubungkan 1 file Spreadsheet di Google Drive mereka.
  - Sesi kuis otomatis menambah baris baru (*append row*) berisi riwayat skor untuk visualisasi grafik di Google Sheets.

---

### 5. Arsitektur Teknis & Tumpukan Teknologi

| Komponen | Pilihan Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework** | Vue 3 (Composition API, `<script setup>`) | Ramping, reaktivitas halus di HP, konsisten dengan Dailyy |
| **Build Tool** | Vite 8+ | Hot Module Replacement (HMR) super cepat, optimasi build |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Desain utility modern, token warna custom, bundle efisien |
| **Icons** | `@lucide/vue` | Ikon SVG berbobot ringan dan tajam di layar Retina |
| **PWA Tooling** | `vite-plugin-pwa` + Workbox | Caching aset otomatis dan instalasi standalone di mobile |
| **Local Database** | Dexie.js (IndexedDB) | Penyimpanan terstruktur di browser, query instan, offline penuh |
| **PDF Parser** | `pdfjs-dist` | Ekstraksi teks PDF in-browser tanpa kebutuhan backend |
| **Auth & Cloud** | Google Identity Services (GIS) & Google Drive API | Zero-Cost, otentikasi resmi, privasi 100% di akun user |
| **Analytics Log** | Google Sheets API | Visualisasi data personal tanpa perlu coding backend dashboard |
| **AI Engine** | Google Gemini API (REST / SDK) | Free tier 15 RPM / 1.500 RPD, cepat dan berkualitas tinggi |
| **Hosting** | Vercel / Cloudflare Pages | $0, SSL otomatis, continuous deployment dari GitHub |

---

### 6. Desain Visual & Pengalaman Pengguna (Design Tokens)

- **Dark Mode Canvas (Utama):** `#090d16` (Deep Navy Dark) & `#131c2e` (Surface Slate).
- **Border & Card Stroke:** `rgba(255, 255, 255, 0.08)`.
- **Primary Accent:** `#6366f1` (Electric Indigo) & `#818cf8`.
- **Jawaban Benar (Success):** `#10b981` (Emerald Glow).
- **Jawaban Salah (Error):** `#f43f5e` (Rose Coral).
- **Streak & XP (Warning):** `#f59e0b` (Amber Spark).
- **Tipografi:** System sans-serif modern (`Inter`, `ui-sans-serif`, `-apple-system`) dengan kontras tinggi untuk kenyamanan membaca di ponsel.
