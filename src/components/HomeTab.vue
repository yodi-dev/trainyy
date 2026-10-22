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
  <div class="space-y-6 pb-24">
    <!-- Header Greeting & Connection Status -->
    <div class="flex items-center justify-between pt-2">
      <div>
        <div class="flex items-center gap-1.5 text-xs font-medium text-indigo-400 uppercase tracking-wider">
          <Zap class="w-3.5 h-3.5 fill-indigo-400" />
          <span>Active Recall Mode</span>
        </div>
        <h1 class="text-xl font-bold text-white mt-0.5">
          Hai, {{ userProfile?.name?.split(' ')[0] || 'Sobat Trainyy' }} 👋
        </h1>
      </div>

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
    </div>

    <!-- Quick Play Hero Card (Primary CTA) -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 shadow-lg shadow-indigo-950/40 text-white">
      <!-- Background decorative circle -->
      <div class="absolute -right-6 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

      <div class="relative z-10 space-y-3">
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
          <Sparkles class="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          <span>Sesi Cepat 10 Soal</span>
        </div>

        <div>
          <h2 class="text-lg font-bold leading-tight">
            Asah Ingatanmu Sekarang
          </h2>
          <p class="text-xs text-indigo-100/90 mt-1">
            10 pertanyaan acak dari materi tersimpan untuk memperkuat memori jangka panjang.
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
        <div class="text-[10px] text-app-muted">Soal Dijawab</div>
      </div>

      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
        <div class="flex items-center justify-center text-emerald-400 mb-1">
          <Award class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white">{{ averageScore }}%</div>
        <div class="text-[10px] text-app-muted">Rata-rata Skor</div>
      </div>

      <div 
        @click="emit('navigate', 'remedial')"
        class="bg-app-card border border-app-border rounded-xl p-3 text-center active-press cursor-pointer hover:border-rose-500/40 transition-colors"
      >
        <div class="flex items-center justify-center text-rose-400 mb-1">
          <RotateCcw class="w-4 h-4" />
        </div>
        <div class="text-lg font-bold text-white">{{ remedialQuestions.length }}</div>
        <div class="text-[10px] text-rose-400/90 font-medium">Soal Remedial</div>
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
            Unggah file PDF atau buat catatan teks materi Anda untuk di-generate otomatis oleh AI.
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
        <span>Riwayat Kuis Terakhir</span>
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
