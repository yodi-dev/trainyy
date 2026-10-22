<script setup>
import { ref } from 'vue'
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  FileText, 
  Upload, 
  Cloud, 
  Sparkles, 
  X, 
  AlertCircle,
  FileCheck,
  Loader2
} from '@lucide/vue'
import { extractTextFromPdf } from '../utils/pdfExtractor'
import { useGeminiQuiz } from '../composables/useGeminiQuiz'

const props = defineProps({
  decks: {
    type: Array,
    default: () => []
  },
  isGoogleConnected: {
    type: Boolean,
    default: false
  },
  drivePdfs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'start-deck-quiz', 
  'delete-deck', 
  'create-deck-success', 
  'fetch-drive-pdfs',
  'download-drive-pdf'
])

const {
  isGenerating,
  generateError,
  generateProgress,
  generateQuestionsFromText
} = useGeminiQuiz()

// Modal State
const isModalOpen = ref(false)
const sourceMode = ref('text') // 'text' | 'pdf' | 'gdrive'
const titleInput = ref('')
const categoryInput = ref('')
const textInput = ref('')
const selectedFile = ref(null)
const selectedDriveFileId = ref('')
const questionCount = ref(10)
const difficulty = ref('medium')
const parsingProgress = ref('')
const isParsing = ref(false)
const localError = ref('')

const openModal = () => {
  titleInput.value = ''
  categoryInput.value = 'Umum'
  textInput.value = ''
  selectedFile.value = null
  selectedDriveFileId.value = ''
  questionCount.value = 10
  difficulty.value = 'medium'
  localError.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  if (isGenerating.value || isParsing.value) return
  isModalOpen.value = false
}

// Handle Local File Selection
const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (file) {
    if (file.type !== 'application/pdf') {
      localError.value = 'Hanya file PDF yang didukung saat ini.'
      return
    }
    selectedFile.value = file
    if (!titleInput.value) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, '')
    }
    localError.value = ''
  }
}

// Generate Deck Action
const handleCreateDeck = async () => {
  localError.value = ''

  if (!titleInput.value.trim()) {
    localError.value = 'Harap isi judul materi.'
    return
  }

  let finalContentText = ''

  try {
    if (sourceMode.value === 'text') {
      if (!textInput.value.trim() || textInput.value.trim().length < 50) {
        localError.value = 'Teks materi terlalu pendek (minimal 50 karakter).'
        return
      }
      finalContentText = textInput.value.trim()
    } else if (sourceMode.value === 'pdf') {
      if (!selectedFile.value) {
        localError.value = 'Harap pilih file PDF terlebih dahulu.'
        return
      }
      isParsing.value = true
      parsingProgress.value = 'Mengekstrak teks dari PDF...'
      const res = await extractTextFromPdf(selectedFile.value, (p) => {
        parsingProgress.value = `Mengekstrak halaman ${p.current} dari ${p.total}...`
      })
      finalContentText = res.text
      isParsing.value = false
    } else if (sourceMode.value === 'gdrive') {
      if (!selectedDriveFileId.value) {
        localError.value = 'Pilih salah satu file PDF dari Google Drive Anda.'
        return
      }
      isParsing.value = true
      parsingProgress.value = 'Mengunduh PDF dari Google Drive...'
      const dlRes = await new Promise((resolve) => {
        emit('download-drive-pdf', selectedDriveFileId.value, resolve)
      })
      if (!dlRes || !dlRes.success) {
        throw new Error(dlRes?.error || 'Gagal mengunduh file dari Google Drive.')
      }

      parsingProgress.value = 'Mengekstrak teks PDF...'
      const res = await extractTextFromPdf(dlRes.data, (p) => {
        parsingProgress.value = `Mengekstrak halaman ${p.current} dari ${p.total}...`
      })
      finalContentText = res.text
      isParsing.value = false
    }

    if (!finalContentText || finalContentText.trim().length < 50) {
      localError.value = 'Teks yang berhasil diekstrak terlalu sedikit untuk dibuat kuis.'
      return
    }

    // Call Gemini AI
    const result = await generateQuestionsFromText({
      text: finalContentText,
      title: titleInput.value.trim(),
      count: questionCount.value,
      difficulty: difficulty.value
    })

    if (!result.success) {
      localError.value = result.error
      return
    }

    // Emit success payload to parent (App.vue) to save in Dexie & sync
    const newDeck = {
      id: `deck_${Date.now()}`,
      title: titleInput.value.trim(),
      description: `Dibuat otomatis via Gemini Flash (${result.questions.length} Soal)`,
      category: categoryInput.value.trim() || 'Umum',
      sourceType: sourceMode.value,
      sourceName: sourceMode.value === 'pdf' ? selectedFile.value?.name : sourceMode.value === 'gdrive' ? 'Google Drive PDF' : 'Teks Catatan',
      totalQuestions: result.questions.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Assign deckId to generated questions
    const questionsWithDeck = result.questions.map((q) => ({
      ...q,
      deckId: newDeck.id
    }))

    emit('create-deck-success', { deck: newDeck, questions: questionsWithDeck })
    isModalOpen.value = false
  } catch (err) {
    console.error('Error during deck creation:', err)
    localError.value = err.message || 'Terjadi kesalahan saat memproses materi.'
  } finally {
    isParsing.value = false
  }
}
</script>

<template>
  <div class="space-y-5 pb-24">
    <!-- Header with Action -->
    <div class="flex items-center justify-between pt-2">
      <div>
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen class="w-5 h-5 text-indigo-400" />
          <span>Materi Belajar</span>
        </h1>
        <p class="text-xs text-app-muted mt-0.5">
          Daftar materi yang kamu pelajari ({{ decks.length }} materi)
        </p>
      </div>

      <button
        @click="openModal"
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active-press cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Tambah Materi</span>
      </button>
    </div>

    <!-- Decks List -->
    <div v-if="decks.length > 0" class="space-y-3">
      <div
        v-for="deck in decks"
        :key="deck.id"
        class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3 hover:border-indigo-500/40 transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-1.5">
              {{ deck.category || 'Umum' }}
            </span>
            <h2 class="text-base font-bold text-white leading-snug">
              {{ deck.title }}
            </h2>
            <p class="text-xs text-app-muted mt-1 line-clamp-2">
              {{ deck.description }}
            </p>
          </div>

          <button
            @click="emit('delete-deck', deck.id)"
            class="text-app-dim hover:text-rose-400 p-1.5 rounded-lg active-press transition-colors cursor-pointer"
            title="Hapus Materi"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-app-border/60 text-xs">
          <span class="text-app-dim">
            {{ deck.totalQuestions || 0 }} Soal • {{ deck.sourceName || 'Teks' }}
          </span>

          <button
            @click="emit('start-deck-quiz', deck)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold active-press cursor-pointer"
          >
            <Play class="w-3.5 h-3.5 fill-white" />
            <span>Mulai Kuis</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="bg-app-card border border-dashed border-app-border rounded-2xl p-8 text-center space-y-3"
    >
      <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
        <BookOpen class="w-6 h-6" />
      </div>
      <div>
        <h2 class="text-base font-bold text-white">Belum Ada Materi Belajar</h2>
        <p class="text-xs text-app-muted mt-1 max-w-xs mx-auto">
          Unggah file PDF atau ketik catatan belajarmu. Trainyy akan membuatkan soal kuis pilihan ganda secara otomatis.
        </p>
      </div>
      <button
        @click="openModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold active-press cursor-pointer hover:bg-indigo-500"
      >
        <Sparkles class="w-4 h-4 text-amber-300" />
        <span>Tambah Materi Baru</span>
      </button>
    </div>

    <!-- ==============================================
         MODAL: TAMBAH MATERI / GENERATE SOAL AI
         ============================================== -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
    >
      <div
        class="w-full sm:max-w-lg bg-app-surface border border-app-border rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-slide-up"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-app-border">
          <div class="flex items-center gap-2">
            <Sparkles class="w-5 h-5 text-indigo-400" />
            <h2 class="text-base font-bold text-white">Tambah Materi Belajar</h2>
          </div>
          <button
            @click="closeModal"
            class="p-1 rounded-lg text-app-dim hover:text-white cursor-pointer active-press"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error Banner -->
        <div
          v-if="localError || generateError"
          class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ localError || generateError }}</span>
        </div>

        <!-- Source Selector Tabs -->
        <div class="grid grid-cols-3 gap-1.5 p-1 bg-app-bg rounded-xl border border-app-border text-xs">
          <button
            @click="sourceMode = 'text'"
            class="py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
            :class="[
              sourceMode === 'text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-app-dim hover:text-white'
            ]"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Ketik Catatan</span>
          </button>

          <button
            @click="sourceMode = 'pdf'"
            class="py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
            :class="[
              sourceMode === 'pdf'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-app-dim hover:text-white'
            ]"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>Pilih File PDF</span>
          </button>

          <button
            @click="sourceMode = 'gdrive'"
            class="py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
            :class="[
              sourceMode === 'gdrive'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-app-dim hover:text-white'
            ]"
          >
            <Cloud class="w-3.5 h-3.5" />
            <span>Google Drive</span>
          </button>
        </div>

        <!-- Form Fields -->
        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-app-muted font-medium mb-1">Nama Materi Belajar</label>
            <input
              v-model="titleInput"
              type="text"
              placeholder="Contoh: Dasar Bahasa Inggris, Bab 1 Sejarah, dll."
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-app-muted font-medium mb-1">Kategori (Opsional)</label>
            <input
              v-model="categoryInput"
              type="text"
              placeholder="Contoh: Umum, Kuliah, Ujian, dll."
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <!-- Mode 1: Teks Bebas -->
          <div v-if="sourceMode === 'text'">
            <label class="block text-app-muted font-medium mb-1">Salin atau Ketik Isi Catatan</label>
            <textarea
              v-model="textInput"
              rows="6"
              placeholder="Ketik atau tempelkan teks materi catatan belajarmu di sini..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-indigo-500 resize-none font-mono text-[11px]"
            ></textarea>
            <div class="text-[10px] text-app-dim text-right mt-0.5">
              {{ textInput.length }} karakter
            </div>
          </div>

          <!-- Mode 2: Upload PDF -->
          <div v-if="sourceMode === 'pdf'">
            <label class="block text-app-muted font-medium mb-1">Pilih Berkas PDF</label>
            <label
              class="border-2 border-dashed border-app-border rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors bg-app-bg/50"
            >
              <input
                type="file"
                accept="application/pdf"
                class="hidden"
                @change="handleFileChange"
              />
              <FileCheck v-if="selectedFile" class="w-8 h-8 text-emerald-400 mb-2" />
              <Upload v-else class="w-8 h-8 text-app-dim mb-2" />
              <div v-if="selectedFile" class="text-center">
                <p class="font-bold text-white text-xs truncate max-w-xs">{{ selectedFile.name }}</p>
                <p class="text-[11px] text-emerald-400 mt-0.5">Siap dibuatkan soal ({{ (selectedFile.size / 1024).toFixed(0) }} KB)</p>
              </div>
              <div v-else class="text-center">
                <p class="font-medium text-white text-xs">Klik untuk memilih file PDF dari perangkat</p>
                <p class="text-[10px] text-app-dim mt-0.5">Diproses secara privat dan aman di perangkatmu</p>
              </div>
            </label>
          </div>

          <!-- Mode 3: Google Drive PDF Picker -->
          <div v-if="sourceMode === 'gdrive'">
            <div v-if="!isGoogleConnected" class="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-2">
              <Cloud class="w-6 h-6 text-indigo-400 mx-auto" />
              <p class="text-xs text-white font-medium">Akun Google Belum Terhubung</p>
              <p class="text-[11px] text-app-muted">Hubungkan akun Google di menu Pengaturan untuk membuka file PDF langsung dari Google Drive Anda.</p>
            </div>

            <div v-else class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-app-muted font-medium">Pilih PDF dari Google Drive</label>
                <button
                  @click="emit('fetch-drive-pdfs')"
                  class="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Muat Ulang
                </button>
              </div>

              <select
                v-model="selectedDriveFileId"
                class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="" disabled>-- Pilih salah satu file PDF --</option>
                <option v-for="f in drivePdfs" :key="f.id" :value="f.id">
                  {{ f.name }} ({{ ((f.size || 0) / 1024).toFixed(0) }} KB)
                </option>
              </select>
            </div>
          </div>

          <!-- Generator Config: Count & Difficulty -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-app-muted font-medium mb-1">Banyak Soal</label>
              <select
                v-model="questionCount"
                class="w-full px-3 py-2 rounded-xl bg-app-bg border border-app-border text-white text-xs cursor-pointer focus:outline-hidden"
              >
                <option :value="10">10 Soal (Santai)</option>
                <option :value="20">20 Soal (Standar)</option>
                <option :value="30">30 Soal (Lengkap)</option>
              </select>
            </div>

            <div>
              <label class="block text-app-muted font-medium mb-1">Tingkat Kesulitan</label>
              <select
                v-model="difficulty"
                class="w-full px-3 py-2 rounded-xl bg-app-bg border border-app-border text-white text-xs cursor-pointer focus:outline-hidden"
              >
                <option value="easy">Dasar</option>
                <option value="medium">Menengah</option>
                <option value="hard">Mendalam</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Progress Status while generating -->
        <div
          v-if="isGenerating || isParsing"
          class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-2.5 text-xs text-indigo-200"
        >
          <Loader2 class="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
          <span>{{ parsingProgress || generateProgress || 'Sedang menyiapkan soal...' }}</span>
        </div>

        <!-- Submit Button -->
        <button
          @click="handleCreateDeck"
          :disabled="isGenerating || isParsing"
          class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 active-press cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          <span>{{ isGenerating || isParsing ? 'Sedang Menyusun Soal...' : 'Buat Soal Kuis Sekarang' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
