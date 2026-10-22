<script setup>
import { ref, computed } from 'vue'
import { 
  Target, 
  Play, 
  CheckCircle, 
  RotateCcw, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from '@lucide/vue'

const props = defineProps({
  questions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['start-remedial-quiz', 'mark-mastered'])

const expandedQuestionId = ref(null)

const toggleExpand = (id) => {
  expandedQuestionId.value = expandedQuestionId.value === id ? null : id
}

// Filter questions that have been answered incorrectly
const remedialQuestions = computed(() => {
  return props.questions.filter((q) => (q.timesIncorrect || 0) > 0 && !q.isMastered)
})

const masteredQuestions = computed(() => {
  return props.questions.filter((q) => q.isMastered)
})
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between pt-2">
      <div class="min-w-0 pr-2">
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <Target class="w-5 h-5 text-rose-400 shrink-0" />
          <span>Latihan Soal Salah</span>
        </h1>
        <p class="text-xs text-app-muted mt-0.5">
          Latih kembali pertanyaan yang belum tepat agar pemahamanmu makin kuat
        </p>
      </div>

      <div class="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
        {{ remedialQuestions.length }} Perlu Diulang
      </div>
    </div>

    <!-- Stats Bar: Ringkasan Status Soal -->
    <div class="grid grid-cols-3 gap-2.5">
      <div class="bg-app-card border border-rose-500/30 rounded-xl p-3 text-center">
        <div class="text-lg font-bold text-rose-400">{{ remedialQuestions.length }}</div>
        <div class="text-[10px] text-rose-300/90 font-medium mt-0.5">Perlu Diulang</div>
      </div>

      <div class="bg-app-card border border-emerald-500/30 rounded-xl p-3 text-center">
        <div class="text-lg font-bold text-emerald-400">{{ masteredQuestions.length }}</div>
        <div class="text-[10px] text-emerald-300/90 font-medium mt-0.5">Sudah Paham</div>
      </div>

      <div class="bg-app-card border border-app-border rounded-xl p-3 text-center">
        <div class="text-lg font-bold text-white">{{ questions.length }}</div>
        <div class="text-[10px] text-app-muted font-medium mt-0.5">Total Soal</div>
      </div>
    </div>

    <!-- Primary Action Hero Card (if remedial questions exist) -->
    <div
      v-if="remedialQuestions.length > 0"
      class="rounded-2xl bg-gradient-to-br from-rose-900/60 via-surface to-app-card border border-rose-500/30 p-5 space-y-3"
    >
      <div class="flex items-center gap-2 text-rose-300 text-xs font-bold">
        <RotateCcw class="w-4 h-4" />
        <span>Fokus Perbaiki Jawaban</span>
      </div>

      <div>
        <h2 class="text-base font-bold text-white">
          Latih Ulang Soal-Soal yang Salah
        </h2>
        <p class="text-xs text-app-muted mt-1">
          Latih ulang soal-soal yang pernah kamu jawab keliru sampai kamu benar-benar menguasainya.
        </p>
      </div>

      <button
        @click="emit('start-remedial-quiz', remedialQuestions)"
        class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 active-press cursor-pointer transition-colors"
      >
        <Play class="w-4 h-4 fill-white" />
        <span>Latih Ulang Soal Salah (Maks. 10 Soal)</span>
      </button>
    </div>

    <!-- Empty State: All mastered! -->
    <div
      v-else
      class="bg-app-card border border-app-border rounded-2xl p-8 text-center space-y-3"
    >
      <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
        <CheckCircle class="w-6 h-6" />
      </div>
      <div>
        <h2 class="text-base font-bold text-white">Semua Soal Sudah Dikuasai</h2>
        <p class="text-xs text-app-muted mt-1 max-w-xs mx-auto">
          Hebat! Tidak ada soal yang keliru saat ini. Semua pertanyaan kuis berhasil kamu jawab dengan tepat.
        </p>
      </div>
    </div>

    <!-- Question Cards List -->
    <div v-if="remedialQuestions.length > 0" class="space-y-3">
      <h2 class="text-xs font-bold text-app-muted uppercase tracking-wider">
        Daftar Pertanyaan yang Perlu Ditinjau ({{ remedialQuestions.length }})
      </h2>

      <div class="space-y-2.5">
        <div
          v-for="q in remedialQuestions"
          :key="q.id"
          class="bg-app-card border border-app-border rounded-xl p-3.5 space-y-2.5 transition-colors"
        >
          <div
            @click="toggleExpand(q.id)"
            class="flex items-start justify-between gap-2 cursor-pointer"
          >
            <div class="min-w-0">
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-1">
                Pernah Salah {{ q.timesIncorrect }}x
              </span>
              <p class="text-xs font-semibold text-white leading-relaxed">
                {{ q.question }}
              </p>
            </div>

            <button class="text-app-dim p-1 shrink-0">
              <ChevronUp v-if="expandedQuestionId === q.id" class="w-4 h-4" />
              <ChevronDown v-else class="w-4 h-4" />
            </button>
          </div>

          <!-- Expanded Explanation & Correct Answer -->
          <div
            v-if="expandedQuestionId === q.id"
            class="pt-2 border-t border-app-border/60 space-y-2 text-xs animate-slide-up"
          >
            <div>
              <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Jawaban Benar:</span>
              <p class="font-medium text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg mt-0.5">
                {{ q.options[q.correctIndex] }}
              </p>
            </div>

            <div>
              <span class="text-[10px] font-bold text-app-muted uppercase tracking-wider block">Penjelasan:</span>
              <p class="text-app-muted text-[11px] leading-relaxed mt-0.5">
                {{ q.explanation }}
              </p>
            </div>

            <div class="pt-1 flex justify-end">
              <button
                @click="emit('mark-mastered', q.id)"
                class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                <CheckCircle class="w-3.5 h-3.5" />
                <span>Tandai Sudah Paham</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
