<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  Play, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Plus, 
  Award,
  ChevronRight,
  Lightbulb,
  Sparkles,
  Shuffle,
  Check
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
  return props.decks.reduce((acc, d) => acc + (d.totalQuestions || 0), 0)
})

// ==============================================
// LOGIKA KARTU TRIVIA (FLASHCARD)
// ==============================================
const isFlipped = ref(false)
const currentTriviaIndex = ref(0)

const getDeckTitle = (deckId) => {
  const d = props.decks.find((deck) => deck.id === deckId)
  return d ? d.title : 'Materi Belajar'
}

const currentTrivia = computed(() => {
  if (!props.questions || props.questions.length === 0) return null
  return props.questions[currentTriviaIndex.value % props.questions.length]
})

// Konversi data materi/kuis menjadi informasi fakta murni yang luwes & edukatif
const currentTriviaInfo = computed(() => {
  if (!currentTrivia.value) return null
  const item = currentTrivia.value

  const correctOpt =
    Array.isArray(item.options) && item.options[item.correctIndex]
      ? String(item.options[item.correctIndex]).trim()
      : ''

  // 1. Jika sudah ada properti dedicated 'trivia', gunakan langsung (kualitas terbaik)
  if (item.trivia && typeof item.trivia === 'string' && item.trivia.trim().length > 10) {
    let t = item.trivia.trim()
    if (!t.endsWith('.')) t += '.'
    return {
      fact: t,
      keyPoint: correctOpt
    }
  }

  // 2. Bersihkan penjelasan kuis dari format meta-kuis
  let rawExp = item.explanation ? String(item.explanation).trim() : ''
  let qText = item.question ? String(item.question).trim() : ''

  let cleanExp = rawExp
    .replace(
      /^(jawaban\s+(yang\s+)?(tepat|benar)\s+(adalah|ialah)?\s*([a-d]|pilihan\s+[a-d])?\s*(karena|yaitu|:)?\s*)/i,
      ''
    )
    .replace(/^(pilihan\s+[a-d]\s+(tepat|benar)\s*(karena|yaitu|:)?\s*)/i, '')
    .replace(/^(opsi\s+[a-d]\s+(tepat|benar)\s*(karena|yaitu|:)?\s*)/i, '')
    .replace(/^(karena\s+)/i, '')
    // Buang kalimat pembahasan opsi lain yang salah
    .replace(/\b(sedangkan|sementara)\s+(pilihan|opsi)\s+.*$/i, '')
    .trim()

  cleanExp = cleanExp.replace(/\b(opsi|pilihan)\s+(ini|tersebut)\b/gi, 'konsep ini')

  // Cek apakah cleanExp sudah menjadi kalimat fakta yang baik (dan tidak menyebut pilihan/opsi lagi)
  const isExpGoodFact =
    cleanExp.length >= 25 &&
    !/\b(pilihan|opsi)\s+[a-d]\b/i.test(cleanExp) &&
    !cleanExp.toLowerCase().includes('jawaban')

  if (isExpGoodFact) {
    cleanExp = cleanExp.charAt(0).toUpperCase() + cleanExp.slice(1)
    if (!cleanExp.endsWith('.')) cleanExp += '.'
    return {
      fact: cleanExp,
      keyPoint: correctOpt
    }
  }

  // 3. Sintesis fakta deklaratif alami dari pertanyaan + jawaban benar
  let cleanQ = qText.replace(/\?+$/, '').trim()
  let synthesized = ''

  // Pola: Apa yang dimaksud dengan X / Apa pengertian X
  const mDef = cleanQ.match(/^(?:apa\s+(?:yang\s+dimaksud\s+(?:dengan)?|pengertian\s+(?:dari)?))\s+(.+)$/i)
  if (mDef && mDef[1]) {
    const term = mDef[1].trim()
    const desc = correctOpt.replace(/^(adalah|merupakan|ialah)\s+/i, '').trim()
    synthesized = `${term} merupakan ${desc}.`
  }
  // Pola: Apa fungsi / tujuan / peran / manfaat / keunggulan
  else if (/^apa\s+(fungsi|tujuan|peran|manfaat|keunggulan|dampak|ciri)\s+(?:utama\s+)?(?:dari\s+)?(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^apa\s+(fungsi|tujuan|peran|manfaat|keunggulan|dampak|ciri)\s+(?:utama\s+)?(?:dari\s+)?(.+)$/i)
    const aspect = m[1].charAt(0).toUpperCase() + m[1].slice(1)
    synthesized = `${aspect} dari ${m[2].trim()} adalah ${correctOpt}.`
  }
  // Pola: Mengapa X
  else if (/^mengapa\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^mengapa\s+(.+)$/i)
    synthesized = `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} terjadi karena ${correctOpt.replace(/^karena\s+/i, '')}.`
  }
  // Pola: Kapan / Di mana / Siapa
  else if (/^(kapan|di mana|dimana|siapa)\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^(kapan|di mana|dimana|siapa)\s+(.+)$/i)
    synthesized = `${m[2].charAt(0).toUpperCase() + m[2].slice(1)} berkaitan dengan ${correctOpt}.`
  }
  // Fallback: gunakan cleanExp atau gabungkan topik pertanyaan dengan correctOpt
  else {
    synthesized = cleanExp || (correctOpt ? `Konsep ini menjelaskan bahwa ${correctOpt.toLowerCase().startsWith('bahwa') ? correctOpt.slice(5).trim() : correctOpt}.` : 'Informasi penting dari materi pembelajaran ini.')
  }

  if (synthesized.length > 0) {
    synthesized = synthesized.charAt(0).toUpperCase() + synthesized.slice(1)
    if (!synthesized.endsWith('.')) synthesized += '.'
  }

  return {
    fact: synthesized,
    keyPoint: correctOpt
  }
})

const shuffleTrivia = () => {
  if (!props.questions || props.questions.length <= 1) {
    isFlipped.value = false
    return
  }
  isFlipped.value = false
  let nextIdx
  do {
    nextIdx = Math.floor(Math.random() * props.questions.length)
  } while (nextIdx === currentTriviaIndex.value && props.questions.length > 1)

  setTimeout(() => {
    currentTriviaIndex.value = nextIdx
  }, 150)
}

onMounted(() => {
  if (props.questions && props.questions.length > 0) {
    currentTriviaIndex.value = Math.floor(Math.random() * props.questions.length)
  }
})

watch(
  () => props.questions.length,
  (newLen) => {
    if (newLen > 0 && currentTriviaIndex.value === 0) {
      currentTriviaIndex.value = Math.floor(Math.random() * newLen)
    }
  }
)
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

        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-base font-black tracking-tight text-white leading-none">Trainyy</span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-theme-soft text-theme-light border border-theme-border leading-none">
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
          class="cursor-pointer active-press rounded-full p-0.5 border border-theme-border hover:border-theme-primary transition-colors"
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
            class="w-7 h-7 rounded-full bg-theme-primary flex items-center justify-center text-xs font-bold text-white"
          >
            {{ userProfile.name?.charAt(0) || 'U' }}
          </div>
        </button>
      </div>
    </div>

    <!-- Header Greeting -->
    <div class="pt-1">
      <div class="flex items-center gap-1.5 text-xs font-medium text-theme-light uppercase tracking-wider">
        <Zap class="w-3.5 h-3.5 fill-current" />
        <span>Latihan Ingatan Harian</span>
      </div>
      <h1 class="text-xl font-bold text-white mt-0.5">
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
         SECTION 2: KARTU TRIVIA & FAKTA KILAT (FLASHCARD)
         ============================================== -->
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lightbulb class="w-4 h-4 text-amber-400" />
          <span>Fakta Kilat (Trivia)</span>
        </h2>
        <button
          v-if="questions.length > 1"
          type="button"
          @click.stop="shuffleTrivia"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-soft/60 hover:bg-theme-soft border border-theme-border/50 text-xs font-semibold text-theme-light hover:text-white active-press cursor-pointer transition-colors"
          title="Acak Trivia Baru"
        >
          <Shuffle class="w-3.5 h-3.5" />
          <span>Acak Baru</span>
        </button>
      </div>

      <!-- If questions exist: 3D Flippable Card -->
      <div v-if="questions.length > 0" class="perspective-1000 w-full min-h-[195px] select-none">
        <div
          role="region"
          tabindex="0"
          :aria-expanded="isFlipped"
          aria-label="Kartu fakta kilat, ketuk atau tekan Enter/Spasi untuk membalik"
          @click="isFlipped = !isFlipped"
          @keydown.enter.self="isFlipped = !isFlipped"
          @keydown.space.self.prevent="isFlipped = !isFlipped"
          class="relative w-full min-h-[195px] rounded-2xl transform-style-3d transition-transform-500 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-hidden"
          :class="{ 'rotate-y-180': isFlipped }"
        >
          <!-- SISI DEPAN (INFORMASI FAKTA KILAT) -->
          <div
            class="absolute inset-0 w-full h-full backface-hidden rounded-2xl p-4 sm:p-5 bg-app-card border border-app-border hover:border-theme-border transition-colors flex flex-col justify-between"
          >
            <!-- Header Kartu Depan -->
            <div class="flex items-center justify-between text-xs">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles class="w-3 h-3 text-amber-400" />
                <span>Tahukah Kamu?</span>
              </span>
              <span class="text-[10px] text-app-muted truncate max-w-[150px] font-medium">
                {{ getDeckTitle(currentTrivia?.deckId) }}
              </span>
            </div>

            <!-- Teks Informasi Fakta (Murni Informasi Edukatif) -->
            <div class="py-2.5">
              <p class="text-sm sm:text-base font-semibold text-white leading-relaxed line-clamp-4">
                {{ currentTriviaInfo?.fact }}
              </p>
            </div>

            <!-- Petunjuk Balik Kartu -->
            <div class="flex items-center justify-between text-[11px] text-app-muted pt-2 border-t border-app-border/50">
              <span class="flex items-center gap-1.5 text-theme-light font-medium">
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Ketuk kartu untuk melihat poin kunci</span>
              </span>
              <span class="text-[10px] shrink-0 font-mono">{{ (currentTriviaIndex % questions.length) + 1 }}/{{ questions.length }}</span>
            </div>
          </div>

          <!-- SISI BELAKANG (INTISARI KONSEP & POIN KUNCI) -->
          <div
            class="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl p-4 sm:p-5 bg-app-surface border border-theme-border shadow-theme-glow flex flex-col justify-between"
          >
            <!-- Header Kartu Belakang -->
            <div class="flex items-center justify-between text-xs">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Check class="w-3 h-3 text-emerald-400" />
                <span>Intisari Konsep</span>
              </span>
              <span class="text-[10px] text-app-muted truncate max-w-[150px] font-medium">
                {{ getDeckTitle(currentTrivia?.deckId) }}
              </span>
            </div>

            <!-- Poin Kunci & Ulasan Konteks -->
            <div class="py-2 space-y-2 overflow-y-auto max-h-[105px] pr-1.5 scrollbar-thin text-left">
              <div v-if="currentTriviaInfo?.keyPoint" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-xs font-bold">
                <Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span class="leading-tight">Poin Kunci: {{ currentTriviaInfo?.keyPoint }}</span>
              </div>
              <p class="text-xs text-app-text/90 leading-relaxed font-normal">
                {{ currentTriviaInfo?.fact }}
              </p>
            </div>

            <!-- Tombol Aksi di Kartu Belakang -->
            <div class="flex items-center justify-between text-[11px] pt-2 border-t border-app-border/60">
              <button
                type="button"
                @click.stop="isFlipped = false"
                class="text-app-muted hover:text-white flex items-center gap-1 active-press cursor-pointer py-1 px-2 rounded-lg hover:bg-app-card/60"
              >
                <RotateCcw class="w-3 h-3" />
                <span>Tutup Jawaban</span>
              </button>

              <button
                type="button"
                @click.stop="shuffleTrivia"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-theme-primary hover:bg-theme-hover text-white font-semibold text-xs shadow-xs active-press cursor-pointer"
              >
                <Shuffle class="w-3 h-3" />
                <span>Fakta Lain</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State for Trivia if 0 questions -->
      <div
        v-else
        class="bg-app-card border border-app-border/70 rounded-2xl p-5 text-center space-y-3"
      >
        <div class="w-10 h-10 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <Lightbulb class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-white">Kartu Trivia Belum Aktif</h3>
          <p class="text-xs text-app-muted mt-1 max-w-xs mx-auto">
            Tambah materi belajarmu untuk mengaktifkan kartu fakta kilat dan latihan active recall harian.
          </p>
        </div>
        <button
          type="button"
          @click="emit('open-new-deck-modal')"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-theme-primary hover:bg-theme-hover text-white text-xs font-semibold active-press cursor-pointer shadow-xs"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Tambah Materi Sekarang</span>
        </button>
      </div>
    </div>

    <!-- ==============================================
         SECTION 3: PRIMARY ACTION HERO (MULAI KUIS)
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
          v-for="deck in decks"
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
  </div>
</template>
