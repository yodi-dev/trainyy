<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  Lightbulb,
  Sparkles,
  Shuffle,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  HelpCircle
} from '@lucide/vue'
import { synthesizeTrivia } from '../utils/triviaHelper'

const props = defineProps({
  questions: {
    type: Array,
    default: () => []
  },
  decks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'start-deck-quiz',
  'open-new-deck-modal',
  'navigate'
])

// Deck Filter state ('all' or deckId)
const selectedDeckId = ref('all')

// Filtered questions based on selected deck
const filteredQuestions = computed(() => {
  if (!props.questions || props.questions.length === 0) return []
  if (selectedDeckId.value === 'all') return props.questions
  return props.questions.filter((q) => q.deckId === selectedDeckId.value)
})

const currentTriviaIndex = ref(0)
const isFlipped = ref(false)

// Safe computed index that never produces negative numbers or NaN
const safeTriviaIndex = computed(() => {
  if (filteredQuestions.value.length === 0) return 0
  return Math.abs(currentTriviaIndex.value) % filteredQuestions.value.length
})

// Reset index when filter changes
watch(selectedDeckId, () => {
  currentTriviaIndex.value = 0
  isFlipped.value = false
})

// Current question object
const currentTrivia = computed(() => {
  if (filteredQuestions.value.length === 0) return null
  return filteredQuestions.value[safeTriviaIndex.value]
})

// Current Deck helper
const currentDeck = computed(() => {
  if (!currentTrivia.value) return null
  return props.decks.find((d) => d.id === currentTrivia.value.deckId) || null
})

const getDeckTitle = (deckId) => {
  if (!deckId) return 'Materi'
  const found = props.decks.find((d) => d.id === deckId)
  return found?.title || 'Materi'
}

// Smart declarative trivia synthesizer (menghasilkan pengertian/fakta konsep murni)
const currentTriviaInfo = computed(() => {
  if (!currentTrivia.value) return null
  return synthesizeTrivia(currentTrivia.value)
})

const nextTrivia = () => {
  if (filteredQuestions.value.length <= 1) return
  isFlipped.value = false
  setTimeout(() => {
    currentTriviaIndex.value = (safeTriviaIndex.value + 1) % filteredQuestions.value.length
  }, 100)
}

const prevTrivia = () => {
  if (filteredQuestions.value.length <= 1) return
  isFlipped.value = false
  setTimeout(() => {
    currentTriviaIndex.value =
      (safeTriviaIndex.value - 1 + filteredQuestions.value.length) % filteredQuestions.value.length
  }, 100)
}

const shuffleTrivia = () => {
  if (filteredQuestions.value.length <= 1) return
  isFlipped.value = false
  let nextIdx
  do {
    nextIdx = Math.floor(Math.random() * filteredQuestions.value.length)
  } while (nextIdx === safeTriviaIndex.value && filteredQuestions.value.length > 1)

  setTimeout(() => {
    currentTriviaIndex.value = nextIdx
  }, 100)
}

onMounted(() => {
  if (props.questions && props.questions.length > 0) {
    currentTriviaIndex.value = Math.floor(Math.random() * props.questions.length)
  }
})
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Header Trivia Tab -->
    <div class="pt-2">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <Lightbulb class="w-5 h-5 text-amber-400" />
          <span>Fakta Kilat (Trivia)</span>
        </h1>
        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {{ filteredQuestions.length }} Fakta
        </span>
      </div>
      <p class="text-xs text-app-muted mt-0.5">
        Kartu active recall harian untuk memperkuat ingatan konsep inti tanpa stres kuis
      </p>
    </div>

    <!-- Filter Deck Selector (Horizontal Pill Scroll) -->
    <div v-if="decks.length > 1" class="space-y-1.5">
      <div class="flex items-center gap-1.5 text-xs text-app-dim font-medium">
        <Filter class="w-3.5 h-3.5 text-theme-light" />
        <span>Pilih Topik Materi:</span>
      </div>
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          @click="selectedDeckId = 'all'"
          class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active-press"
          :class="[
            selectedDeckId === 'all'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-app-card text-app-muted border-app-border hover:text-white'
          ]"
        >
          Semua Topik ({{ questions.length }})
        </button>

        <button
          v-for="deck in decks"
          :key="deck.id"
          type="button"
          @click="selectedDeckId = deck.id"
          class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active-press truncate max-w-[200px]"
          :class="[
            selectedDeckId === deck.id
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-app-card text-app-muted border-app-border hover:text-white'
          ]"
        >
          {{ deck.title }}
        </button>
      </div>
    </div>

    <!-- Main Flashcard Area -->
    <div v-if="filteredQuestions.length > 0" class="space-y-4">
      <!-- 3D Flippable Card -->
      <div class="perspective-1000 w-full min-h-[300px] select-none">
        <div
          role="region"
          tabindex="0"
          :aria-expanded="isFlipped"
          aria-label="Kartu fakta kilat, ketuk atau tekan Enter/Spasi untuk membalik"
          @click="isFlipped = !isFlipped"
          @keydown.enter.self="isFlipped = !isFlipped"
          @keydown.space.self.prevent="isFlipped = !isFlipped"
          class="relative w-full min-h-[300px] rounded-3xl transform-style-3d transition-transform-500 cursor-pointer shadow-lg focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-hidden"
          :class="{ 'rotate-y-180': isFlipped }"
        >
          <!-- SISI DEPAN (INFORMASI FAKTA & PENGERTIAN SINGKAT) -->
          <div
            class="absolute inset-0 w-full h-full backface-hidden rounded-3xl p-5 sm:p-6 bg-app-card border border-app-border hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
            :class="[
              isFlipped 
                ? 'pointer-events-none opacity-0 invisible select-none z-0' 
                : 'pointer-events-auto opacity-100 visible z-10'
            ]"
          >
            <!-- Header Kartu Depan -->
            <div class="flex items-center justify-between text-xs">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                <span>Tahukah Kamu?</span>
              </span>
              <span class="text-[11px] text-app-muted truncate max-w-[160px] font-medium">
                {{ getDeckTitle(currentTrivia?.deckId) }}
              </span>
            </div>

            <!-- Teks Informasi Fakta / Pengertian Singkat -->
            <div class="py-3 my-auto overflow-y-auto max-h-[160px] scrollbar-thin">
              <p class="text-base sm:text-lg font-bold text-white leading-relaxed">
                {{ currentTriviaInfo?.fact }}
              </p>
            </div>

            <!-- Petunjuk Balik Kartu & Counter -->
            <div class="flex items-center justify-between text-xs text-app-muted pt-3 border-t border-app-border/50">
              <span class="flex items-center gap-1.5 text-amber-300/90 font-medium">
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Ketuk kartu untuk melihat soal terkait</span>
              </span>
              <span class="text-xs font-mono font-bold text-white bg-app-subtle px-2 py-0.5 rounded-md border border-app-border">
                {{ safeTriviaIndex + 1 }}/{{ filteredQuestions.length }}
              </span>
            </div>
          </div>

          <!-- SISI BELAKANG (PERTANYAAN ASLI & KUNCI JAWABAN) -->
          <div
            class="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl p-5 sm:p-6 bg-app-surface border border-theme-border shadow-theme-glow transition-all duration-300 flex flex-col justify-between"
            :class="[
              isFlipped 
                ? 'pointer-events-auto opacity-100 visible z-10' 
                : 'pointer-events-none opacity-0 invisible select-none z-0'
            ]"
          >
            <!-- Header Kartu Belakang -->
            <div class="flex items-center justify-between text-xs">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Check class="w-3.5 h-3.5 text-emerald-400" />
                <span>Kaitan Soal Kuis</span>
              </span>
              <span class="text-[11px] text-app-muted truncate max-w-[160px] font-medium">
                {{ getDeckTitle(currentTrivia?.deckId) }}
              </span>
            </div>

            <!-- Pertanyaan Kuis Asli & Kunci Jawaban -->
            <div class="py-2.5 space-y-2.5 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin text-left my-auto">
              <!-- Pertanyaan Asli -->
              <div class="space-y-1 bg-app-card/60 p-2.5 rounded-xl border border-app-border/70">
                <div class="text-[10px] font-bold text-theme-light uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle class="w-3 h-3" />
                  <span>Pertanyaan Kuis Asli</span>
                </div>
                <p class="text-xs font-medium text-white leading-snug">
                  {{ currentTriviaInfo?.originalQuestion }}
                </p>
              </div>

              <!-- Kunci Jawaban Benar -->
              <div v-if="currentTriviaInfo?.keyPoint" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <Check class="w-4 h-4 text-emerald-400 shrink-0" />
                <span class="leading-tight">Kunci: {{ currentTriviaInfo?.keyPoint }}</span>
              </div>
            </div>

            <!-- Tombol Aksi di Kartu Belakang -->
            <div class="flex items-center justify-between text-xs pt-3 border-t border-app-border/60">
              <button
                type="button"
                @click.stop="isFlipped = false"
                class="text-app-muted hover:text-white flex items-center gap-1.5 active-press cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-app-card/60 transition-colors"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Balik Depan</span>
              </button>

              <button
                type="button"
                @click.stop="nextTrivia"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-theme-primary hover:bg-theme-hover text-white font-semibold text-xs shadow-xs active-press cursor-pointer"
              >
                <span>Fakta Berikutnya</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Toolbar (Prev, Shuffle, Next) -->
      <div class="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          @click="prevTrivia"
          :disabled="filteredQuestions.length <= 1"
          class="flex-1 py-2.5 px-3 rounded-xl bg-app-card hover:bg-app-border border border-app-border text-white text-xs font-semibold flex items-center justify-center gap-1.5 active-press cursor-pointer disabled:opacity-40 transition-colors"
        >
          <ChevronLeft class="w-4 h-4 text-theme-light" />
          <span>Sebelumnya</span>
        </button>

        <button
          type="button"
          @click="shuffleTrivia"
          :disabled="filteredQuestions.length <= 1"
          class="py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 active-press cursor-pointer disabled:opacity-40 transition-colors"
          title="Acak Fakta Baru"
        >
          <Shuffle class="w-4 h-4" />
          <span>Acak</span>
        </button>

        <button
          type="button"
          @click="nextTrivia"
          :disabled="filteredQuestions.length <= 1"
          class="flex-1 py-2.5 px-3 rounded-xl bg-app-card hover:bg-app-border border border-app-border text-white text-xs font-semibold flex items-center justify-center gap-1.5 active-press cursor-pointer disabled:opacity-40 transition-colors"
        >
          <span>Selanjutnya</span>
          <ChevronRight class="w-4 h-4 text-theme-light" />
        </button>
      </div>
    </div>

    <!-- Empty State for Trivia if 0 questions in selected deck -->
    <div
      v-else
      class="bg-app-card border border-app-border/70 rounded-3xl p-8 text-center space-y-4"
    >
      <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
        <Lightbulb class="w-6 h-6" />
      </div>
      <div class="space-y-1">
        <h3 class="text-base font-bold text-white">
          {{ selectedDeckId !== 'all' ? 'Topik Ini Belum Memiliki Soal' : 'Belum Ada Fakta Trivia' }}
        </h3>
        <p class="text-xs text-app-muted max-w-xs mx-auto leading-relaxed">
          {{ selectedDeckId !== 'all' 
            ? 'Topik yang dipilih saat ini belum memiliki pertanyaan kuis. Pilih topik lain atau kembali ke semua topik.' 
            : 'Tambahkan materi belajar baru untuk otomatis mengaktifkan kartu fakta kilat dan melatih active recall harian Anda.' }}
        </p>
      </div>
      <button
        v-if="selectedDeckId !== 'all'"
        type="button"
        @click="selectedDeckId = 'all'"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold active-press cursor-pointer transition-colors"
      >
        <span>Tampilkan Semua Topik</span>
      </button>
      <button
        v-else
        type="button"
        @click="emit('open-new-deck-modal')"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-hover text-white text-xs font-bold active-press cursor-pointer shadow-md transition-colors"
      >
        <Plus class="w-4 h-4" />
        <span>Tambah Materi Sekarang</span>
      </button>
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

