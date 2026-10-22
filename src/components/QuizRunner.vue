<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Home, 
  Award, 
  Clock, 
  Sparkles,
  HelpCircle
} from '@lucide/vue'

const props = defineProps({
  questions: {
    type: Array,
    required: true
  },
  deckTitle: {
    type: String,
    default: 'Kuis Kilat'
  },
  deckId: {
    type: String,
    default: null
  },
  mode: {
    type: String,
    default: 'study' // 'study' | 'exam' | 'remedial'
  }
})

const emit = defineEmits(['finish-quiz', 'exit-quiz', 'retry-wrong'])

// Quiz State
const currentIndex = ref(0)
const selectedAnswers = ref({}) // questionId -> selectedOptionIndex
const isAnswerSubmitted = ref(false) // in study mode, lock answer and show feedback
const startTime = ref(Date.now())
const elapsedTime = ref(0)
const isFinished = ref(false)
let timerInterval = null

// Current question object
const currentQuestion = computed(() => {
  return props.questions[currentIndex.value] || null
})

// Progress percentage
const progressPercentage = computed(() => {
  if (props.questions.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / props.questions.length) * 100)
})

// Haptic feedback trigger
const triggerHaptic = (isCorrect) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      if (isCorrect) {
        navigator.vibrate([40])
      } else {
        navigator.vibrate([60, 40, 60])
      }
    } catch (e) {}
  }
}

// Select an option
const selectOption = (optionIndex) => {
  if (isAnswerSubmitted.value && props.mode === 'study') return

  const q = currentQuestion.value
  if (!q) return

  selectedAnswers.value[q.id] = optionIndex

  if (props.mode === 'study') {
    isAnswerSubmitted.value = true
    const isCorrect = optionIndex === q.correctIndex
    triggerHaptic(isCorrect)
  }
}

// Next question or finish
const nextQuestion = () => {
  if (currentIndex.value < props.questions.length - 1) {
    currentIndex.value++
    isAnswerSubmitted.value = false
  } else {
    finishQuiz()
  }
}

// Calculate Results
const quizResults = computed(() => {
  let correct = 0
  let incorrect = 0
  const wrongQuestions = []

  props.questions.forEach((q) => {
    const selected = selectedAnswers.value[q.id]
    if (selected === q.correctIndex) {
      correct++
    } else {
      incorrect++
      wrongQuestions.push(q)
    }
  })

  const total = props.questions.length
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  return {
    correct,
    incorrect,
    total,
    percentage,
    wrongQuestions,
    durationSeconds: elapsedTime.value
  }
})

const finishQuiz = () => {
  clearInterval(timerInterval)
  isFinished.value = true

  const results = quizResults.value
  emit('finish-quiz', {
    deckId: props.deckId,
    deckTitle: props.deckTitle,
    mode: props.mode,
    totalQuestions: results.total,
    correctCount: results.correct,
    incorrectCount: results.incorrect,
    scorePercentage: results.percentage,
    durationSeconds: results.durationSeconds,
    completedAt: Date.now(),
    wrongQuestionIds: results.wrongQuestions.map((q) => q.id),
    answersMap: { ...selectedAnswers.value }
  })
}

// Timer
onMounted(() => {
  timerInterval = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timerInterval)
})

const formatTime = (secs) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-app-bg text-app-text flex flex-col justify-between safe-top safe-bottom p-4">
    <!-- ==============================================
         ACTIVE QUIZ VIEW
         ============================================== -->
    <template v-if="!isFinished && currentQuestion">
      <!-- Top Bar: Exit + Progress + Timer -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <button
            @click="emit('exit-quiz')"
            class="flex items-center gap-1 text-app-dim hover:text-white p-1 rounded-lg active-press cursor-pointer"
          >
            <X class="w-5 h-5" />
            <span class="font-medium">Keluar</span>
          </button>

          <div class="font-bold text-white uppercase tracking-wider text-[11px] truncate max-w-[180px]">
            {{ deckTitle }}
          </div>

          <div class="flex items-center gap-1 text-app-dim font-mono text-xs">
            <Clock class="w-3.5 h-3.5" />
            <span>{{ formatTime(elapsedTime) }}</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="flex items-center gap-3">
          <div class="flex-1 h-2 rounded-full bg-app-card border border-app-border overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          <span class="text-xs font-bold text-indigo-400 shrink-0">
            {{ currentIndex + 1 }}/{{ questions.length }}
          </span>
        </div>
      </div>

      <!-- Question Card Area (Scrollable if question is long) -->
      <div class="flex-1 overflow-y-auto py-4 space-y-4">
        <!-- Question Badge & Text -->
        <div class="bg-app-card border border-app-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Pertanyaan #{{ currentIndex + 1 }}
            </span>
            <span class="text-app-dim">Pilihan Ganda</span>
          </div>

          <h2 class="text-base sm:text-lg font-bold text-white leading-relaxed">
            {{ currentQuestion.question }}
          </h2>
        </div>

        <!-- Options List (A, B, C, D) -->
        <div class="space-y-2.5">
          <button
            v-for="(option, optIdx) in currentQuestion.options"
            :key="optIdx"
            @click="selectOption(optIdx)"
            :disabled="isAnswerSubmitted && mode === 'study'"
            class="w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 flex items-start gap-3 active-press cursor-pointer relative"
            :class="[
              // Default state
              selectedAnswers[currentQuestion.id] !== optIdx && !(isAnswerSubmitted && optIdx === currentQuestion.correctIndex)
                ? 'bg-app-card border-app-border text-app-text hover:border-indigo-500/40'
                : '',

              // In Study Mode: Correct Answer (Green)
              isAnswerSubmitted && optIdx === currentQuestion.correctIndex
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-950/50'
                : '',

              // In Study Mode: Selected but Wrong Answer (Red)
              isAnswerSubmitted && selectedAnswers[currentQuestion.id] === optIdx && optIdx !== currentQuestion.correctIndex
                ? 'bg-rose-950/40 border-rose-500 text-rose-100 shadow-md shadow-rose-950/50'
                : '',

              // In Exam Mode: Selected Option
              mode === 'exam' && selectedAnswers[currentQuestion.id] === optIdx
                ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                : ''
            ]"
          >
            <!-- Option letter pill: A, B, C, D -->
            <span
              class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-colors"
              :class="[
                isAnswerSubmitted && optIdx === currentQuestion.correctIndex
                  ? 'bg-emerald-500 text-slate-950'
                  : isAnswerSubmitted && selectedAnswers[currentQuestion.id] === optIdx
                  ? 'bg-rose-500 text-white'
                  : selectedAnswers[currentQuestion.id] === optIdx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-app-subtle text-app-muted'
              ]"
            >
              {{ String.fromCharCode(65 + optIdx) }}
            </span>

            <span class="flex-1 leading-snug">
              {{ option }}
            </span>

            <!-- Status Checkmark or Cross in Study Mode -->
            <span v-if="isAnswerSubmitted" class="shrink-0 mt-0.5">
              <CheckCircle2
                v-if="optIdx === currentQuestion.correctIndex"
                class="w-5 h-5 text-emerald-400"
              />
              <XCircle
                v-else-if="selectedAnswers[currentQuestion.id] === optIdx"
                class="w-5 h-5 text-rose-400"
              />
            </span>
          </button>
        </div>

        <!-- Explanation Sheet in Study Mode -->
        <div
          v-if="isAnswerSubmitted && mode === 'study'"
          class="rounded-xl p-4 border animate-slide-up space-y-2"
          :class="[
            selectedAnswers[currentQuestion.id] === currentQuestion.correctIndex
              ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/25 border-rose-500/30 text-rose-200'
          ]"
        >
          <div class="flex items-center gap-2 font-bold text-xs">
            <span
              v-if="selectedAnswers[currentQuestion.id] === currentQuestion.correctIndex"
              class="text-emerald-400 flex items-center gap-1.5"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Jawaban Kamu Tepat!</span>
            </span>
            <span v-else class="text-rose-400 flex items-center gap-1.5">
              <XCircle class="w-4 h-4" />
              <span>Kurang Tepat, Perhatikan Pembahasan:</span>
            </span>
          </div>

          <p class="text-xs text-app-text/90 leading-relaxed">
            {{ currentQuestion.explanation }}
          </p>
        </div>
      </div>

      <!-- Bottom Action Button -->
      <div class="pt-3 border-t border-app-border">
        <button
          v-if="mode === 'study' ? isAnswerSubmitted : selectedAnswers[currentQuestion.id] !== undefined"
          @click="nextQuestion"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active-press cursor-pointer"
        >
          <span>{{ currentIndex < questions.length - 1 ? 'Lanjut ke Soal Berikutnya' : 'Selesai & Lihat Skor' }}</span>
          <ArrowRight class="w-4 h-4" />
        </button>

        <p v-else class="text-center text-xs text-app-dim py-2">
          Pilih salah satu jawaban di atas untuk melanjutkan
        </p>
      </div>
    </template>

    <!-- ==============================================
         END OF QUIZ / RESULTS VIEW
         ============================================== -->
    <template v-else>
      <div class="flex-1 overflow-y-auto space-y-6 py-4 flex flex-col justify-center max-w-md mx-auto w-full">
        <!-- Results Badge Card -->
        <div class="text-center space-y-3">
          <div
            class="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl"
            :class="[
              quizResults.percentage >= 80
                ? 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 shadow-emerald-950/50'
                : quizResults.percentage >= 60
                ? 'bg-amber-500/15 border-2 border-amber-500 text-amber-400 shadow-amber-950/50'
                : 'bg-rose-500/15 border-2 border-rose-500 text-rose-400 shadow-rose-950/50'
            ]"
          >
            <Award class="w-10 h-10" />
          </div>

          <div>
            <h1 class="text-2xl font-black text-white tracking-tight">
              {{ quizResults.percentage >= 80 ? 'Hasil Sangat Memuaskan' : quizResults.percentage >= 60 ? 'Pemahaman Cukup Baik' : 'Perlu Diulang Kembali' }}
            </h1>
            <p class="text-xs text-app-muted mt-1">
              {{ deckTitle }}
            </p>
          </div>

          <!-- Score Metrics -->
          <div class="text-4xl font-black text-white font-mono tracking-tight">
            {{ quizResults.percentage }}%
          </div>
          <p class="text-xs text-app-dim">
            {{ quizResults.correct }} benar dari {{ quizResults.total }} soal • Durasi {{ formatTime(quizResults.durationSeconds) }}
          </p>
        </div>

        <!-- Breakdown Card -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
            <span class="text-xs text-app-muted block mb-0.5">Jawaban Tepat</span>
            <span class="text-xl font-bold text-emerald-400">{{ quizResults.correct }}</span>
          </div>

          <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
            <span class="text-xs text-app-muted block mb-0.5">Jawaban Keliru</span>
            <span class="text-xl font-bold text-rose-400">{{ quizResults.incorrect }}</span>
          </div>
        </div>

        <!-- Wrong Questions Warning & Remedial CTA -->
        <div
          v-if="quizResults.wrongQuestions.length > 0"
          class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs"
        >
          <div class="flex items-center gap-2 font-bold text-rose-300">
            <RotateCcw class="w-4 h-4" />
            <span>Ada {{ quizResults.wrongQuestions.length }} soal yang keliru</span>
          </div>
          <p class="text-app-muted text-[11px] leading-relaxed">
            Soal-soal ini sudah otomatis ditambahkan ke Ruang Remedial untuk dilatih ulang agar materi benar-benar nyantol.
          </p>
        </div>

        <!-- Bottom Actions -->
        <div class="space-y-2.5 pt-2">
          <button
            v-if="quizResults.wrongQuestions.length > 0"
            @click="emit('retry-wrong', quizResults.wrongQuestions)"
            class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active-press cursor-pointer"
          >
            <RotateCcw class="w-4 h-4" />
            <span>Latih Ulang Soal yang Salah ({{ quizResults.wrongQuestions.length }})</span>
          </button>

          <button
            @click="emit('exit-quiz')"
            class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active-press cursor-pointer"
          >
            <Home class="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
