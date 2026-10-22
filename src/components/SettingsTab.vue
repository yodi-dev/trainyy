<script setup>
import { ref } from 'vue'
import { 
  Settings, 
  Cloud, 
  FileSpreadsheet, 
  Sparkles, 
  Palette, 
  Key, 
  ExternalLink, 
  Check, 
  Info, 
  Download, 
  Upload, 
  HelpCircle,
  Eye,
  EyeOff,
  LogOut,
  ChevronDown,
  Loader2
} from '@lucide/vue'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  userProfile: {
    type: Object,
    default: null
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  lastBackupTime: {
    type: String,
    default: null
  },
  linkedSheetId: {
    type: String,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  statusMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'connect-google',
  'disconnect-google',
  'backup-drive',
  'restore-drive',
  'create-sheet'
])

const { themes, currentTheme, applyTheme } = useTheme()

const imgError = ref(false)

// AI Key State
const apiKeyInput = ref(
  localStorage.getItem('trainyy_gemini_api_key') ||
  import.meta.env.VITE_GEMINI_API_KEY ||
  ''
)
const showKey = ref(false)
const keySaved = ref(false)
const showAiGuide = ref(false)

const hasActiveKey = ref(
  !!(
    localStorage.getItem('trainyy_gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY
  )
)

const saveApiKey = () => {
  if (apiKeyInput.value.trim()) {
    localStorage.setItem('trainyy_gemini_api_key', apiKeyInput.value.trim())
    hasActiveKey.value = true
    keySaved.value = true
    setTimeout(() => {
      keySaved.value = false
      showAiGuide.value = false
    }, 1800)
  } else {
    localStorage.removeItem('trainyy_gemini_api_key')
    hasActiveKey.value = false
  }
}

// Mode Kuis Default
const defaultQuizMode = ref(localStorage.getItem('trainyy_default_mode') || 'study')

const updateQuizMode = (mode) => {
  defaultQuizMode.value = mode
  localStorage.setItem('trainyy_default_mode', mode)
}
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Header -->
    <div class="pt-2">
      <h1 class="text-xl font-bold text-white flex items-center gap-2">
        <Settings class="w-5 h-5 text-theme-light" />
        <span>Pengaturan</span>
      </h1>
      <p class="text-xs text-app-muted mt-0.5">
        Kelola akun, cadangan data, dan tampilan aplikasi
      </p>
    </div>

    <!-- Status Message Banner -->
    <div
      v-if="statusMessage"
      class="p-3 rounded-xl bg-theme-soft border border-theme-border text-white text-xs flex items-center gap-2"
    >
      <Info class="w-4 h-4 text-theme-light shrink-0" />
      <span>{{ statusMessage }}</span>
    </div>

    <!-- ==============================================
         SECTION 1: GOOGLE ACCOUNT & DRIVE BACKUP
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <Cloud class="w-5 h-5 text-theme-light shrink-0" />
          <h2 class="text-sm font-bold text-white truncate">Akun Google & Cadangan</h2>
        </div>
        <span
          class="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none"
          :class="[
            isConnected
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-app-subtle text-app-muted border-app-border'
          ]"
        >
          {{ isConnected ? 'Tersambung' : 'Belum Masuk' }}
        </span>
      </div>

      <!-- User Profile (Connected) -->
      <div v-if="isConnected" class="space-y-3">
        <div class="flex items-center justify-between p-3 rounded-xl bg-app-bg border border-app-border">
          <div class="flex items-center gap-3 min-w-0">
            <img
              v-if="userProfile?.picture && !imgError"
              :src="userProfile.picture"
              referrerpolicy="no-referrer"
              alt="Foto Profil"
              class="w-9 h-9 rounded-full border border-theme-border object-cover shrink-0"
              @error="imgError = true"
            />
            <div
              v-else
              class="w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center font-bold text-white text-sm shrink-0 border border-theme-border"
            >
              {{ userProfile?.name?.charAt(0) || 'U' }}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-white truncate">{{ userProfile?.name }}</p>
              <p class="text-[11px] text-app-muted truncate">{{ userProfile?.email }}</p>
            </div>
          </div>

          <button
            @click="emit('disconnect-google')"
            class="p-2 rounded-lg text-app-dim hover:text-rose-400 active-press cursor-pointer"
            title="Keluar dari Akun"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>

        <!-- Indikator Cadangan Otomatis Aktif -->
        <div class="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span class="font-medium">Cadangan Otomatis Aktif</span>
          <span class="text-[10px] text-app-muted ml-auto">Google Drive</span>
        </div>
      </div>

      <!-- Connect Button (Not Connected) -->
      <div v-else class="space-y-2">
        <p class="text-xs text-app-muted leading-relaxed">
          Masuk dengan akun Google untuk menyimpan materi dan riwayat belajarmu secara gratis dan aman di Google Drive pribadi.
        </p>
        <button
          @click="emit('connect-google')"
          :disabled="isLoading"
          class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md active-press cursor-pointer transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Masuk dengan Akun Google</span>
        </button>
      </div>

      <!-- Drive Sync Actions -->
      <div v-if="isConnected" class="space-y-2 pt-2 border-t border-app-border/60">
        <div class="flex items-center justify-between text-xs">
          <span class="text-app-muted">Cadangan Terakhir:</span>
          <span class="text-app-dim font-mono text-[11px]">
            {{ lastBackupTime ? new Date(lastBackupTime).toLocaleString('id-ID') : 'Belum pernah' }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <button
            @click="emit('backup-drive')"
            :disabled="isLoading"
            class="py-2 px-3 rounded-xl bg-theme-primary hover:bg-theme-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>Simpan Cadangan</span>
          </button>

          <button
            @click="emit('restore-drive')"
            :disabled="isLoading"
            class="py-2 px-3 rounded-xl bg-app-subtle hover:bg-app-border text-white font-semibold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer border border-app-border disabled:opacity-50"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Ambil Cadangan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ==============================================
         SECTION 2: GOOGLE SHEETS RAPOR BELAJAR
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <FileSpreadsheet class="w-5 h-5 text-emerald-400 shrink-0" />
          <h2 class="text-sm font-bold text-white truncate">Rapor Belajar Otomatis</h2>
        </div>
        <span
          v-if="isConnected && linkedSheetId"
          class="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none"
        >
          Tersambung Otomatis
        </span>
      </div>

      <p class="text-xs text-app-muted leading-relaxed">
        Setiap kali kamu menyelesaikan kuis, skor dan catatan belajarmu otomatis dicatat ke Google Spreadsheet pribadi tanpa perlu input manual.
      </p>

      <div v-if="isConnected" class="space-y-2.5">
        <!-- Connected to spreadsheet -->
        <div v-if="linkedSheetId" class="p-3 rounded-xl bg-app-bg border border-app-border flex items-center justify-between gap-2 text-xs">
          <div class="min-w-0">
            <p class="font-bold text-white truncate">Trainyy - Rekap Analitik Belajar</p>
            <p class="text-[10px] text-emerald-400 mt-0.5 truncate">Tersinkron di Google Drive Anda</p>
          </div>

          <a
            :href="`https://docs.google.com/spreadsheets/d/${linkedSheetId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold active-press"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span>Buka Spreadsheet</span>
          </a>
        </div>

        <!-- Setting up / sync button if not yet linked -->
        <div v-else class="space-y-2">
          <button
            @click="emit('create-sheet')"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <FileSpreadsheet v-else class="w-4 h-4" />
            <span>{{ isLoading ? 'Menghubungkan ke Spreadsheet...' : 'Sinkronkan Buku Rapor Sekarang' }}</span>
          </button>
        </div>
      </div>

      <p v-else class="text-[11px] text-app-dim italic">
        Masuk dengan akun Google di atas untuk mengaktifkan buku rapor belajar otomatis.
      </p>
    </div>

    <!-- ==============================================
         SECTION 3: AI PEMBUAT SOAL
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <Sparkles class="w-5 h-5 text-amber-400 shrink-0" />
          <h2 class="text-sm font-bold text-white truncate">Fitur AI Pembuat Soal</h2>
        </div>
        <span
          class="shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none"
          :class="[
            hasActiveKey
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          ]"
        >
          {{ hasActiveKey ? 'Siap Digunakan' : 'Perlu Kunci AI' }}
        </span>
      </div>

      <p class="text-xs text-app-muted leading-relaxed">
        Fitur ini membuatkan 10 pertanyaan pilihan ganda secara cerdas dari materi catatan atau file PDF Anda.
      </p>

      <!-- Accordion Toggle untuk Pengaturan Kunci AI -->
      <div class="pt-1 border-t border-app-border/60">
        <button
          @click="showAiGuide = !showAiGuide"
          class="w-full flex items-center justify-between text-left font-medium text-white hover:text-theme-light transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-1.5 text-xs">
            <Key class="w-3.5 h-3.5 text-theme-light" />
            <span>{{ hasActiveKey ? 'Ubah Kunci Akses AI' : 'Atur Kunci Akses AI (Gratis)' }}</span>
          </div>
          <ChevronDown
            class="w-4 h-4 text-app-dim transition-transform duration-200"
            :class="{ 'rotate-180': showAiGuide }"
          />
        </button>

        <div v-if="showAiGuide" class="pt-3 space-y-3">
          <div class="p-3 rounded-xl bg-app-bg border border-app-border space-y-2 text-xs">
            <p class="text-app-muted leading-relaxed">
              Kunci AI bisa didapatkan gratis dari Google untuk membuat soal tanpa batasan:
            </p>
            <ol class="list-decimal list-inside space-y-1 text-app-muted text-[11px]">
              <li>Buka situs resmi Google AI Studio.</li>
              <li>Masuk dengan akun Google Anda.</li>
              <li>Klik tombol <strong>"Create API key"</strong> lalu salin kodenya ke kotak di bawah.</li>
            </ol>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-theme-light hover:underline font-medium pt-1"
            >
              <span>Buka Google AI Studio</span>
              <ExternalLink class="w-3 h-3" />
            </a>
          </div>

          <!-- Input Kunci AI -->
          <div class="space-y-1.5">
            <div class="relative">
              <input
                v-model="apiKeyInput"
                :type="showKey ? 'text' : 'password'"
                placeholder="Tempelkan kunci AI Google di sini..."
                class="w-full pl-3 pr-9 py-2 rounded-lg bg-app-card border border-app-border text-white text-xs font-mono placeholder-app-dim focus:outline-hidden focus:border-theme-primary"
              />
              <button
                @click="showKey = !showKey"
                type="button"
                class="absolute right-2.5 top-2 text-app-dim hover:text-white cursor-pointer"
              >
                <EyeOff v-if="showKey" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-[10px] text-app-dim">
                Tersimpan aman di browser perangkat Anda
              </span>
              <button
                @click="saveApiKey"
                class="px-3.5 py-1.5 rounded-lg bg-theme-primary hover:bg-theme-hover text-white font-bold text-xs active-press cursor-pointer"
              >
                <span v-if="keySaved" class="flex items-center gap-1">
                  <Check class="w-3.5 h-3.5" />
                  <span>Tersimpan</span>
                </span>
                <span v-else>Simpan Kunci</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==============================================
         SECTION 4: MODE LATIHAN KUIS
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <h2 class="text-sm font-bold text-white">Mode Latihan Kuis Bawaan</h2>
      <p class="text-xs text-app-muted">
        Pilih bagaimana kamu ingin kuis berjalan secara default:
      </p>

      <div class="grid grid-cols-1 gap-2 pt-1">
        <button
          @click="updateQuizMode('study')"
          class="p-3 rounded-xl border text-left transition-colors cursor-pointer"
          :class="[
            defaultQuizMode === 'study'
              ? 'bg-theme-soft border-theme-primary text-white font-bold'
              : 'bg-app-bg border-app-border text-app-muted'
          ]"
        >
          <p class="text-xs">Mode Santai (Rekomendasi)</p>
          <p class="text-[10px] text-app-dim mt-0.5 font-normal">Jawaban benar & penjelasan langsung terlihat setelah memilih</p>
        </button>

        <button
          @click="updateQuizMode('exam')"
          class="p-3 rounded-xl border text-left transition-colors cursor-pointer"
          :class="[
            defaultQuizMode === 'exam'
              ? 'bg-theme-soft border-theme-primary text-white font-bold'
              : 'bg-app-bg border-app-border text-app-muted'
          ]"
        >
          <p class="text-xs">Mode Ujian</p>
          <p class="text-[10px] text-app-dim mt-0.5 font-normal">Jawab 10 soal sekaligus, lihat skor di akhir</p>
        </button>
      </div>
    </div>

    <!-- ==============================================
         SECTION 5: WARNA TEMA
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center gap-2">
        <Palette class="w-5 h-5 text-theme-light" />
        <h2 class="text-sm font-bold text-white">Warna Tampilan</h2>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in themes"
          :key="t.id"
          @click="applyTheme(t.id)"
          class="p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer active-press transition-all"
          :class="[
            currentTheme === t.id
              ? 'border-theme-primary bg-theme-soft shadow-xs'
              : 'border-app-border bg-app-bg hover:border-app-muted'
          ]"
        >
          <div
            class="w-5 h-5 rounded-full mb-1.5 border border-white/20"
            :style="{ backgroundColor: t.accentColor }"
          ></div>
          <span class="text-xs font-bold text-white leading-tight">{{ t.name }}</span>
        </button>
      </div>
    </div>

    <!-- App Info & Version -->
    <div class="text-center space-y-1 text-app-dim text-xs pt-2">
      <p class="font-bold text-app-muted">Trainyy v1.0 • Inisial Y (Yodi)</p>
      <p class="text-[11px]">Dibuat untuk belajar mandiri yang praktis, cepat, dan bisa diakses kapan saja.</p>
    </div>
  </div>
</template>
