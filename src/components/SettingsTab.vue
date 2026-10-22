<script setup>
import { ref } from 'vue'
import { 
  Settings, 
  Key, 
  Cloud, 
  FileSpreadsheet, 
  Palette, 
  Download, 
  Upload, 
  LogOut, 
  ExternalLink, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  Info
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
  'create-sheet',
  'export-local-json',
  'import-local-json'
])

const { themes, currentTheme, applyTheme } = useTheme()

// Gemini API Key State
const apiKeyInput = ref(localStorage.getItem('trainyy_gemini_api_key') || '')
const showApiKey = ref(false)
const apiKeySavedMessage = ref('')

const saveApiKey = () => {
  localStorage.setItem('trainyy_gemini_api_key', apiKeyInput.value.trim())
  apiKeySavedMessage.value = 'API Key berhasil disimpan!'
  setTimeout(() => {
    apiKeySavedMessage.value = ''
  }, 3000)
}

// Quiz Mode Preference
const defaultQuizMode = ref(localStorage.getItem('trainyy_quiz_mode') || 'study')
const updateQuizMode = (mode) => {
  defaultQuizMode.value = mode
  localStorage.setItem('trainyy_quiz_mode', mode)
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <!-- Header -->
    <div class="pt-2">
      <h1 class="text-xl font-bold text-white flex items-center gap-2">
        <Settings class="w-5 h-5 text-indigo-400" />
        <span>Pengaturan & Akun</span>
      </h1>
      <p class="text-xs text-app-muted mt-0.5">
        Kelola sinkronisasi Google Cloud, API AI, dan preferensi tampilan
      </p>
    </div>

    <!-- Status Message Banner -->
    <div
      v-if="statusMessage"
      class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2"
    >
      <Info class="w-4 h-4 text-indigo-400 shrink-0" />
      <span>{{ statusMessage }}</span>
    </div>

    <!-- ==============================================
         SECTION 1: GOOGLE ACCOUNT & DRIVE SYNC
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Cloud class="w-5 h-5 text-indigo-400" />
          <h2 class="text-sm font-bold text-white">Akun Google & Google Drive ($0)</h2>
        </div>
        <span
          class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          :class="[
            isConnected
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-app-subtle text-app-muted border-app-border'
          ]"
        >
          {{ isConnected ? 'Terhubung' : 'Belum Terhubung' }}
        </span>
      </div>

      <!-- User Profile (Connected) -->
      <div v-if="isConnected" class="flex items-center justify-between p-3 rounded-xl bg-app-bg border border-app-border">
        <div class="flex items-center gap-3 min-w-0">
          <img
            v-if="userProfile?.picture"
            :src="userProfile.picture"
            alt="Google Avatar"
            class="w-9 h-9 rounded-full border border-indigo-500/40"
          />
          <div
            v-else
            class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm"
          >
            {{ userProfile?.name?.charAt(0) || 'G' }}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-white truncate">{{ userProfile?.name }}</p>
            <p class="text-[11px] text-app-muted truncate">{{ userProfile?.email }}</p>
          </div>
        </div>

        <button
          @click="emit('disconnect-google')"
          class="p-2 rounded-lg text-app-dim hover:text-rose-400 active-press cursor-pointer"
          title="Putuskan Akun"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>

      <!-- Connect Button (Not Connected) -->
      <div v-else class="space-y-2">
        <p class="text-xs text-app-muted">
          Hubungkan akun Google Anda untuk menyimpan cadangan otomatis ke Google Drive pribadi dan mengaktifkan integrasi Google Sheets.
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
            class="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer disabled:opacity-50"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>Cadangkan ke Drive</span>
          </button>

          <button
            @click="emit('restore-drive')"
            :disabled="isLoading"
            class="py-2 px-3 rounded-xl bg-app-subtle hover:bg-app-border text-white font-semibold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer border border-app-border disabled:opacity-50"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Pulihkan Data</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ==============================================
         SECTION 2: GOOGLE SHEETS ANALYTICS
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center gap-2">
        <FileSpreadsheet class="w-5 h-5 text-emerald-400" />
        <h2 class="text-sm font-bold text-white">Google Sheets Analytics</h2>
      </div>

      <p class="text-xs text-app-muted">
        Setiap kali sesi kuis selesai, Trainyy otomatis mencatat skor dan evaluasi ke Google Spreadsheet pribadi Anda.
      </p>

      <div v-if="isConnected" class="space-y-2.5">
        <div v-if="linkedSheetId" class="p-3 rounded-xl bg-app-bg border border-app-border flex items-center justify-between text-xs">
          <div>
            <p class="font-bold text-white">Trainyy - Rekap Analitik Belajar</p>
            <p class="text-[10px] text-emerald-400 mt-0.5">Spreadsheet aktif terhubung</p>
          </div>

          <a
            :href="`https://docs.google.com/spreadsheets/d/${linkedSheetId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold active-press"
          >
            <ExternalLink class="w-3 h-3" />
            <span>Buka Sheet</span>
          </a>
        </div>

        <button
          v-else
          @click="emit('create-sheet')"
          :disabled="isLoading"
          class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>Buat Google Spreadsheet Analitik Baru</span>
        </button>
      </div>

      <p v-else class="text-[11px] text-app-dim italic">
        Hubungkan akun Google di atas untuk mengaktifkan fitur pencatatan ke Google Sheets.
      </p>
    </div>

    <!-- ==============================================
         SECTION 3: GOOGLE GEMINI API KEY
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Key class="w-5 h-5 text-amber-400" />
          <h2 class="text-sm font-bold text-white">Google Gemini API Key</h2>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Free Tier
        </span>
      </div>

      <p class="text-xs text-app-muted">
        Digunakan untuk membuat bank soal kuis secara instan dari materi PDF/teks. Dapatkan API Key gratis di
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          class="text-indigo-400 underline font-medium"
        >
          Google AI Studio
        </a>.
      </p>

      <div class="space-y-2">
        <div class="relative">
          <input
            v-model="apiKeyInput"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="AIzaSy..."
            class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-app-bg border border-app-border text-white text-xs font-mono placeholder-app-dim focus:outline-hidden focus:border-indigo-500"
          />
          <button
            @click="showApiKey = !showApiKey"
            class="absolute right-3 top-2.5 text-app-dim hover:text-white cursor-pointer"
          >
            <EyeOff v-if="showApiKey" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center justify-between">
          <span v-if="apiKeySavedMessage" class="text-xs text-emerald-400 font-medium">
            {{ apiKeySavedMessage }}
          </span>
          <span v-else></span>

          <button
            @click="saveApiKey"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs active-press cursor-pointer shadow-xs"
          >
            Simpan API Key
          </button>
        </div>
      </div>
    </div>

    <!-- ==============================================
         SECTION 4: QUIZ MODE PREFERENCE
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-indigo-400" />
        <h2 class="text-sm font-bold text-white">Mode Pembelajaran Default</h2>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <button
          @click="updateQuizMode('study')"
          class="p-3 rounded-xl border text-left transition-colors cursor-pointer"
          :class="[
            defaultQuizMode === 'study'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
              : 'bg-app-bg border-app-border text-app-muted'
          ]"
        >
          <p class="text-xs">Mode Belajar (Rekomendasi)</p>
          <p class="text-[10px] text-app-dim mt-0.5 font-normal">Feedback instan & penjelasan di setiap soal</p>
        </button>

        <button
          @click="updateQuizMode('exam')"
          class="p-3 rounded-xl border text-left transition-colors cursor-pointer"
          :class="[
            defaultQuizMode === 'exam'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
              : 'bg-app-bg border-app-border text-app-muted'
          ]"
        >
          <p class="text-xs">Mode Simulasi Ujian</p>
          <p class="text-[10px] text-app-dim mt-0.5 font-normal">Jawab 10 soal sekaligus, rekap di akhir</p>
        </button>
      </div>
    </div>

    <!-- ==============================================
         SECTION 5: THEME CUSTOMIZATION
         ============================================== -->
    <div class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
      <div class="flex items-center gap-2">
        <Palette class="w-5 h-5 text-indigo-400" />
        <h2 class="text-sm font-bold text-white">Pilihan Tema Visual</h2>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="t in themes"
          :key="t.id"
          @click="applyTheme(t.id)"
          class="p-2.5 rounded-xl border flex flex-col items-center text-center cursor-pointer active-press transition-all"
          :class="[
            currentTheme === t.id
              ? 'border-indigo-500 bg-indigo-600/15 shadow-xs'
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
      <p class="text-[11px]">Dibuat untuk pembelajaran mandiri yang efektif dan gratis selamanya.</p>
    </div>
  </div>
</template>
