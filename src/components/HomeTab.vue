<script setup>
import { computed } from 'vue'
import { 
  Zap, 
  Play, 
  BookOpen, 
  Award, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Plus,
  Sparkles
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

const emit = defineEmits(['start-quick-quiz', 'start-deck-quiz', 'open-new-deck-modal', 'navigate'])

// Average score from past sessions
const averageScore = computed(() => {
  if (props.sessions.length === 0) return 0
  const sum = props.sessions.reduce((acc, s) => acc + (s.scorePercentage || 0), 0)
  return Math.round(sum / props.sessions.length)
})

// Total questions answered
const totalQuestionsAnswered = computed(() => {
  return props.sessions.reduce((acc, s) => acc + (s.totalQuestions || 0), 0)
})

// Recent sessions (last 3)
const recentSessions = computed(() => {
  return [...props.sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 3)
})

// Total available questions in database
const totalAvailableQuestions = computed(() => {
  return props.decks.reduce((acc, d) => acc + (d.totalQuestions || 0), 0)
})
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Top App Brand Bar -->
    <div class="flex items-center justify-between pt-1 pb-1">
      <div class="flex items-center gap-2.5">
        <!-- Trainyy Monogram Logo -->
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 shadow-md shadow-indigo-950/40 flex items-center justify-center">
          <svg class="w-full h-full text-white" viewBox="0 0 120 120" fill="none">
            <rect x="26" y="24" width="68" height="13" rx="6.5" fill="#ffffff" />
            <path d="M33 37 L54 65 L60 65 L43 37 Z" fill="#ffffff" opacity="0.95" />
            <path d="M87 37 L66 65 L60 65 L77 37 Z" fill="#c4b5fd" />
            <rect x="54" y="65" width="12" height="31" rx="6" fill="#ffffff" />
            <circle cx="60" cy="65" r="4" fill="#38bdf8" />
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-base font-black tracking-tight text-white leading-none">Trainyy</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 leading-none">
              Active Recall
            </span>
          </div>
          <p class="text-[10px] text-app-muted font-medium mt-0.5">Asah Ingatan & Pemahaman</p>
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

        <!-- User Profile Avatar thumbnail (if logged in) -->
        <button
          v-if="userProfile"
          @click="emit('navigate', 'settings')"
          class="cursor-pointer active-press rounded-full p-0.5 border border-indigo-500/40 hover:border-indigo-400 transition-colors"
          title="Buka Pengaturan"
        >
          <img
            v-if="userProfile.picture"
            :src="userProfile.picture"
            referrerpolicy="no-referrer"
            alt="Profil"
            class="w-7 h-7 rounded-full object-cover"
          />
          <div
            v-else
            class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white"
          >
            {{ userProfile.name?.charAt(0) || 'U' }}
          </div>
        </button>
      </div>
    </div>

    <!-- Header Greeting -->
    <div class="pt-1">
      <div class="flex items-center gap-1.5 text-xs font-medium text-indigo-400 uppercase tracking-wider">
        <Zap class="w-3.5 h-3.5 fill-indigo-400" />
        <span>Latihan Ingatan Harian</span>
      </div>
      <h1 class="text-xl font-bold text-white mt-0.5">
        Hai, {{ userProfile?.name?.split(' ')[0] || 'Sobat Trainyy' }}
      </h1>
      <p class="text-xs text-app-muted mt-0.5">
        Siap menguji ingatan dan pemahamanmu hari ini?
      </p>
    </div>

    <!-- Quick Play Hero Card (Primary CTA) -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 shadow-lg shadow-indigo-950/40 text-white">
      <!-- Background decorative circle -->
      <div class="absolute -right-6 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

      <div class="relative z-10 space-y-3">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
          <Sparkles class="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>Latihan 10 Soal</span>
        </div>

        <div>
          <h2 class="text-lg font-bold leading-tight">
            Asah Ingatanmu Sekarang
          </h2>
          <p class="text-xs text-indigo-100/90 mt-1">
            10 pertanyaan acak dari materi tersimpan untuk menguji dan memperkuat ingatanmu.
          </p>
        </div>

        <button
          @click="emit('start-quick-quiz')"
          :disabled="totalAvailableQuestions === 0"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-indigo-900 font-bold text-sm shadow-md active-press hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play class="w-4 h-4 fill-indigo-900" />
          <span>{{ totalAvailableQuestions > 0 ? 'Mulai Kuis 10 Soal' : 'Belum Ada Materi Tersedia' }}</span>
        </button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-3 gap-2.5">
      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
        <div class="flex items-center justify-center text-indigo-400 mb-1">
          <CheckCircle2 class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white">{{ totalQuestionsAnswered }}</div>
        <div class="text-[10px] text-app-muted">Soal Dikerjakan</div>
      </div>

      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
        <div class="flex items-center justify-center text-emerald-400 mb-1">
          <Award class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white">{{ averageScore }}%</div>
        <div class="text-[10px] text-app-muted">Nilai Rata-rata</div>
      </div>

      <div 
        @click="emit('navigate', 'remedial')"
        class="bg-app-card border border-app-border rounded-xl p-3 text-center active-press cursor-pointer hover:border-rose-500/40 transition-colors"
      >
        <div class="flex items-center justify-center text-rose-400 mb-1">
          <RotateCcw class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white">{{ remedialQuestions.length }}</div>
        <div class="text-[10px] text-rose-400/90 font-medium">Perlu Diulang</div>
      </div>
    </div>

    <!-- Material Decks Section -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BookOpen class="w-4 h-4 text-indigo-400" />
          <span>Materi Belajar ({{ decks.length }})</span>
        </h2>
        <button
          @click="emit('open-new-deck-modal')"
          class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 active-press cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      <!-- Decks List -->
      <div v-if="decks.length > 0" class="space-y-2.5">
        <div
          v-for="deck in decks"
          :key="deck.id"
          class="bg-app-card border border-app-border rounded-xl p-3.5 flex items-center justify-between hover:border-indigo-500/40 transition-colors"
        >
          <div class="min-w-0 pr-3">
            <div class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1">
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
            class="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs active-press cursor-pointer"
          >
            <Play class="w-3 h-3 fill-white" />
            <span>Kuis</span>
          </button>
        </div>
      </div>

      <!-- Empty State for Decks -->
      <div
        v-else
        class="bg-app-card border border-dashed border-app-border rounded-xl p-6 text-center space-y-3"
      >
        <div class="w-10 h-10 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
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
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold active-press cursor-pointer hover:bg-indigo-500"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Buat Materi Pertama</span>
        </button>
      </div>
    </div>

    <!-- Recent Sessions Section -->
    <div v-if="recentSessions.length > 0" class="space-y-3">
      <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <Clock class="w-4 h-4 text-indigo-400" />
        <span>Riwayat Latihan Terakhir</span>
      </h2>

      <div class="space-y-2">
        <div
          v-for="s in recentSessions"
          :key="s.id"
          class="bg-app-card/60 border border-app-border rounded-xl p-3 flex items-center justify-between text-xs"
        >
          <div>
            <div class="font-medium text-white truncate max-w-[200px]">
              {{ s.deckTitle }}
            </div>
            <div class="text-[11px] text-app-muted mt-0.5">
              {{ new Date(s.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
              • {{ s.durationSeconds }} detik
            </div>
          </div>

          <div class="text-right">
            <span
              class="font-bold text-sm px-2 py-0.5 rounded"
              :class="[
                s.scorePercentage >= 80 
                  ? 'text-emerald-400 bg-emerald-500/10' 
                  : s.scorePercentage >= 60 
                  ? 'text-amber-400 bg-amber-500/10' 
                  : 'text-rose-400 bg-rose-500/10'
              ]"
            >
              {{ s.correctCount }}/{{ s.totalQuestions }} ({{ s.scorePercentage }}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
