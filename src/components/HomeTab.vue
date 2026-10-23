<script setup>
import { computed } from 'vue'
import { 
  Play, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Award,
  ChevronRight,
  User,
  Settings
} from '@lucide/vue'

const props = defineProps({
  decks: {
    type: Array,
    default: () => []
  },
  sessions: {
    type: Array,
    default: () => []
  },
  questions: {
    type: Array,
    default: () => []
  },
  remedialQuestions: {
    type: Array,
    default: () => []
  },
  userProfile: {
    type: Object,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'start-quick-quiz',
  'start-deck-quiz',
  'open-new-deck-modal',
  'navigate'
])

// Hitung total kuis dan rata-rata skor
const totalQuestionsAnswered = computed(() => {
  return props.sessions.reduce((acc, s) => acc + (s.totalQuestions || 0), 0)
})

const averageScore = computed(() => {
  if (props.sessions.length === 0) return 0
  const sum = props.sessions.reduce((acc, s) => acc + (s.scorePercentage || 0), 0)
  return Math.round(sum / props.sessions.length)
})

const recentSessions = computed(() => {
  return [...props.sessions]
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 3)
})

const totalAvailableQuestions = computed(() => {
  return props.questions && props.questions.length > 0 ? props.questions.length : props.decks.reduce((acc, d) => acc + (d.totalQuestions || 0), 0)
})

const getDeckTitle = (deckId) => {
  const d = props.decks.find((deck) => deck.id === deckId)
  return d ? d.title : 'Materi Belajar'
}

// Hanya tampilkan beberapa materi (maksimal 3) di beranda
const displayedDecks = computed(() => (props.decks || []).slice(0, 3))
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Top App Brand Bar -->
    <div class="flex items-center justify-between pt-1 pb-1">
      <div class="flex items-center gap-2.5">
        <!-- Trainyy Monogram Logo (Adaptive Theme Gradient) -->
        <div class="w-9 h-9 rounded-xl bg-theme-gradient p-1.5 shadow-theme-glow flex items-center justify-center">
          <svg class="w-full h-full text-white" viewBox="0 0 120 120" fill="none">
            <rect x="26" y="24" width="68" height="13" rx="6.5" fill="#ffffff" />
            <path d="M33 37 L54 65 L60 65 L43 37 Z" fill="#ffffff" opacity="0.95" />
            <path d="M87 37 L66 65 L60 65 L77 37 Z" fill="#c4b5fd" />
            <rect x="54" y="65" width="12" height="31" rx="6" fill="#ffffff" />
            <circle cx="60" cy="65" r="4" fill="#38bdf8" />
          </svg>
        </div>

        <div class="flex flex-col justify-center">
          <span class="text-base font-black tracking-tight text-white leading-none">Trainyy</span>
          <span class="inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-theme-soft text-theme-light border border-theme-border leading-none w-fit mt-1">
            Active Recall
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Offline / Online Badge -->
        <div 
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          :class="[
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          ]"
        >
          <span 
            class="w-2 h-2 rounded-full"
            :class="isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
          ></span>
          <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
        </div>

        <!-- Tombol Profil & Pengaturan (Selalu Tampil agar Pengguna Ngeh) -->
        <button
          type="button"
          @click="emit('navigate', 'settings')"
          class="relative flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-app-card border border-theme-border/70 hover:border-theme-primary text-slate-200 hover:text-white transition-all active-press cursor-pointer group shadow-xs shrink-0"
          title="Buka Pengaturan & Akun"
          aria-label="Pengaturan dan Akun"
        >
          <!-- Avatar Container dengan Mini Gear Badge -->
          <div class="relative shrink-0">
            <img
              v-if="userProfile?.picture"
              :src="userProfile.picture"
              referrerpolicy="no-referrer"
              alt="Profil"
              class="w-6 h-6 rounded-full object-cover ring-1 ring-theme-primary/40"
            />
            <div
              v-else-if="userProfile?.name"
              class="w-6 h-6 rounded-full bg-theme-primary flex items-center justify-center text-[10px] font-bold text-white"
            >
              {{ userProfile.name.charAt(0) }}
            </div>
            <div
              v-else
              class="w-6 h-6 rounded-full bg-app-surface border border-app-border flex items-center justify-center text-app-muted group-hover:text-theme-light transition-colors"
            >
              <User class="w-3.5 h-3.5" />
            </div>

            <!-- Mini Gear Badge di sudut avatar -->
            <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-theme-primary text-white flex items-center justify-center shadow-xs border border-app-surface">
              <Settings class="w-2 h-2 group-hover:rotate-45 transition-transform duration-300" />
            </span>
          </div>

          <!-- Label Pengaturan -->
          <span class="text-xs font-medium text-slate-200 group-hover:text-white pr-0.5">
            Pengaturan
          </span>
        </button>
      </div>
    </div>

    <!-- Header Greeting -->
    <div class="pt-1">
      <h1 class="text-xl font-bold text-white">
        Hai, {{ userProfile?.name?.split(' ')[0] || 'Sobat Trainyy' }}
      </h1>
      <p class="text-xs text-app-muted mt-0.5">
        Siap melatih ingatan aktifmu hari ini?
      </p>
    </div>

    <!-- ==============================================
         SECTION 1: STATISTIK RINGKASAN PROGRES
         ============================================== -->
    <div class="grid grid-cols-3 gap-2.5" role="region" aria-label="Statistik Belajar">
      <!-- Total Soal Dikerjakan -->
      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center flex flex-col items-center justify-center">
        <div class="flex items-center justify-center text-theme-light mb-1">
          <CheckCircle2 class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white leading-tight">{{ totalQuestionsAnswered }}</div>
        <div class="text-[10px] text-app-muted mt-0.5">Soal Dikerjakan</div>
      </div>

      <!-- Nilai Rata-rata -->
      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center flex flex-col items-center justify-center">
        <div class="flex items-center justify-center text-emerald-400 mb-1">
          <Award class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white leading-tight">{{ averageScore }}%</div>
        <div class="text-[10px] text-app-muted mt-0.5">Nilai Rata-rata</div>
      </div>

      <!-- Perlu Diulang (Remedial CTA Button) -->
      <button 
        type="button"
        @click="emit('navigate', 'remedial')"
        class="bg-app-card border border-app-border rounded-xl p-3 text-center active-press cursor-pointer hover:border-rose-500/40 transition-colors flex flex-col items-center justify-center relative group"
        aria-label="Lihat soal yang perlu diulang"
      >
        <div class="flex items-center justify-center text-rose-400 mb-1">
          <RotateCcw class="w-4 h-4 transition-transform group-hover:-rotate-45" />
        </div>
        <div class="text-lg font-bold text-white leading-tight">{{ remedialQuestions.length }}</div>
        <div class="text-[10px] text-rose-400/90 font-medium mt-0.5 flex items-center justify-center gap-0.5">
          <span>Perlu Diulang</span>
          <ChevronRight v-if="remedialQuestions.length > 0" class="w-3 h-3 text-rose-400" />
        </div>
      </button>
    </div>

    <!-- ==============================================
         SECTION 2: PRIMARY ACTION HERO (MULAI KUIS)
         ============================================== -->
    <div class="relative overflow-hidden rounded-2xl bg-theme-gradient p-5 shadow-theme-glow">
      <div class="relative z-10 space-y-4">
        <div>
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs mb-2">
            Kuis Kilat Active Recall
          </span>
          <h2 class="text-lg font-black text-white leading-tight">
            Tantang Ingatanmu Sekarang
          </h2>
          <p class="text-xs text-white/90 mt-1">
            {{ totalAvailableQuestions > 0 
              ? `10 pertanyaan acak dari total ${totalAvailableQuestions} soal tersimpan untuk menguji dan memperkuat ingatanmu.`
              : 'Unggah catatan atau materi PDF untuk membuat paket soal kuis secara instan.' 
            }}
          </p>
        </div>

        <button
          v-if="totalAvailableQuestions > 0"
          type="button"
          @click="emit('start-quick-quiz')"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md active-press hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Play class="w-4 h-4 fill-slate-950" />
          <span>Mulai Kuis 10 Soal</span>
        </button>
        <button
          v-else
          type="button"
          @click="emit('open-new-deck-modal')"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md active-press hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4 text-slate-950" />
          <span>Tambah Materi Belajar Pertama</span>
        </button>
      </div>
    </div>

    <!-- Material Decks Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BookOpen class="w-4 h-4 text-theme-light" />
          <span>Materi Belajar ({{ decks.length }})</span>
        </h2>
        <button
          @click="emit('open-new-deck-modal')"
          class="inline-flex items-center gap-1 text-xs font-semibold text-theme-light hover:text-white active-press cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      <!-- Decks List -->
      <div v-if="decks.length > 0" class="space-y-2.5">
        <div
          v-for="deck in displayedDecks"
          :key="deck.id"
          class="bg-app-card border border-app-border rounded-xl p-3.5 flex items-center justify-between hover:border-theme-border transition-colors"
        >
          <div class="min-w-0 pr-3">
            <div class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-theme-soft text-theme-light border border-theme-border mb-1">
              {{ deck.category || 'Umum' }}
            </div>
            <h3 class="text-sm font-semibold text-white truncate">
              {{ deck.title }}
            </h3>
            <p class="text-xs text-app-muted mt-0.5 line-clamp-1">
              {{ deck.description || `${deck.totalQuestions || 0} Soal Tersedia` }}
            </p>
          </div>

          <button
            @click="emit('start-deck-quiz', deck)"
            class="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-theme-primary hover:bg-theme-hover text-white text-xs font-semibold shadow-xs active-press cursor-pointer"
          >
            <Play class="w-3 h-3 fill-white" />
            <span>Kuis</span>
          </button>
        </div>

        <!-- Tombol Lihat Semua Materi -->
        <button
          v-if="decks.length > 3"
          @click="emit('navigate', 'decks')"
          class="w-full py-2.5 px-3 rounded-xl bg-app-subtle hover:bg-app-border border border-app-border text-center text-xs font-semibold text-theme-light hover:text-white flex items-center justify-center gap-1 active-press transition-colors cursor-pointer"
        >
          <span>Lihat Semua {{ decks.length }} Materi</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Empty State for Decks -->
      <div
        v-else
        class="bg-app-card border border-dashed border-app-border rounded-xl p-6 text-center space-y-3"
      >
        <div class="w-10 h-10 mx-auto rounded-full bg-theme-soft flex items-center justify-center text-theme-light">
          <BookOpen class="w-5 h-5" />
        </div>
        <div>
          <p class="text-sm font-medium text-white">Belum Ada Materi Belajar</p>
          <p class="text-xs text-app-muted mt-1">
            Unggah file PDF atau ketik catatan belajarmu untuk dibuatkan kuis secara otomatis.
          </p>
        </div>
        <button
          @click="emit('open-new-deck-modal')"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold active-press cursor-pointer hover:bg-theme-hover"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Buat Materi Pertama</span>
        </button>
      </div>
    </div>

    <!-- Recent Sessions Section -->
    <div v-if="recentSessions.length > 0" class="space-y-3">
      <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <Clock class="w-4 h-4 text-theme-light" />
        <span>Riwayat Latihan Terakhir</span>
      </h2>

      <div class="space-y-2">
        <div
          v-for="s in recentSessions"
          :key="s.id"
          class="bg-app-card border border-app-border rounded-xl p-3 flex items-center justify-between"
        >
          <div>
            <p class="text-xs font-semibold text-white truncate max-w-[200px]">
              {{ s.deckTitle }}
            </p>
            <p class="text-[10px] text-app-dim mt-0.5">
              {{ new Date(s.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="text-xs font-bold font-mono px-2 py-0.5 rounded-md"
              :class="[
                s.scorePercentage >= 80 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : s.scorePercentage >= 60
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              ]"
            >
              {{ s.scorePercentage }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Credit -->
    <div class="text-center text-[11px] text-app-dim pt-4 pb-2">
      <p>
        Trainyy v1.1.0 &bull; 
        <a 
          href="https://awanbeo.my.id" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="text-theme-light hover:underline font-medium"
        >
          awanbeo.my.id
        </a>
      </p>
    </div>
  </div>
</template>
