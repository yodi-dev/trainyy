<script setup>
import { ref } from 'vue'
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  Upload, 
  FileText, 
  Cloud, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  FileCheck,
  X
} from '@lucide/vue'
import { useGeminiQuiz } from '../composables/useGeminiQuiz'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker src from local node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

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

// Modal & Form State
const isModalOpen = ref(false)
const sourceMode = ref('text') // 'text' | 'pdf' | 'gdrive'
const titleInput = ref('')
const categoryInput = ref('')
const textInput = ref('')
const questionCount = ref(10)
const difficulty = ref('medium')

// File handling
const selectedFile = ref(null)
const isParsing = ref(false)
const parsingProgress = ref('')
const localError = ref(null)

// Google Drive selected file
const selectedDriveFileId = ref('')

const openModal = () => {
  isModalOpen.value = true
  titleInput.value = ''
  categoryInput.value = ''
  textInput.value = ''
  selectedFile.value = null
  selectedDriveFileId.value = ''
  localError.value = null
  if (props.isGoogleConnected && props.drivePdfs.length === 0) {
    emit('fetch-drive-pdfs')
  }
}

const closeModal = () => {
  if (isGenerating.value || isParsing.value) return
  isModalOpen.value = false
}

// Local PDF file picker change
const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    localError.value = 'Hanya file format PDF yang didukung.'
    return
  }
  selectedFile.value = file
  if (!titleInput.value) {
    titleInput.value = file.name.replace(/\.[^/.]+$/, '')
  }
}

// Extract text from PDF ArrayBuffer
const extractTextFromPdfBuffer = async (arrayBuffer) => {
  isParsing.value = true
  parsingProgress.value = 'Mengekstrak teks materi dari PDF...'
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise
    let fullText = ''
    const maxPages = Math.min(pdfDoc.numPages, 15) // Batas hemat 15 halaman pertama

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      parsingProgress.value = `Mengekstrak halaman ${pageNum} dari ${maxPages}...`
      const page = await pdfDoc.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item) => item.str).join(' ')
      fullText += `\n--- Halaman ${pageNum} ---\n` + pageText
    }

    if (!fullText.trim()) {
      throw new Error('Tidak ada teks yang dapat dibaca pada file PDF ini (mungkin dokumen berupa gambar/scan).')
    }

    return fullText
  } finally {
    isParsing.value = false
    parsingProgress.value = ''
  }
}

// Submit Create Deck with AI
const handleCreateDeck = async () => {
  localError.value = null
  let extractedContent = ''

  if (!titleInput.value.trim()) {
    localError.value = 'Mohon masukkan nama materi belajar.'
    return
  }

  try {
    if (sourceMode.value === 'text') {
      if (!textInput.value.trim() || textInput.value.trim().length < 30) {
        localError.value = 'Isi materi teks minimal berisi 30 karakter.'
        return
      }
      extractedContent = textInput.value.trim()
    } else if (sourceMode.value === 'pdf') {
      if (!selectedFile.value) {
        localError.value = 'Pilih satu file PDF terlebih dahulu.'
        return
      }
      const buffer = await selectedFile.value.arrayBuffer()
      extractedContent = await extractTextFromPdfBuffer(buffer)
    } else if (sourceMode.value === 'gdrive') {
      if (!selectedDriveFileId.value) {
        localError.value = 'Pilih salah satu file PDF dari daftar Google Drive.'
        return
      }

      isParsing.value = true
      parsingProgress.value = 'Mengunduh file PDF dari Google Drive...'

      await new Promise((resolve, reject) => {
        emit('download-drive-pdf', selectedDriveFileId.value, async (res) => {
          if (res.success && res.data) {
            try {
              extractedContent = await extractTextFromPdfBuffer(res.data)
              resolve()
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(res.error || 'Gagal mengunduh file dari Drive.'))
          }
        })
      })
    }

    // Panggil Gemini AI Generator
    const genRes = await generateQuestionsFromText({
      text: extractedContent,
      title: titleInput.value.trim(),
      count: questionCount.value,
      difficulty: difficulty.value
    })

    if (!genRes.success) {
      localError.value = genRes.error
      return
    }

    // Buat Deck baru
    const newDeckId = `deck_${Date.now()}`
    const newDeck = {
      id: newDeckId,
      title: titleInput.value.trim(),
      category: categoryInput.value.trim() || 'Umum',
      description: `${genRes.questions.length} Soal kuis pilihan ganda`,
      totalQuestions: genRes.questions.length,
      sourceType: sourceMode.value,
      sourceName: sourceMode.value === 'pdf' ? selectedFile.value?.name : sourceMode.value === 'gdrive' ? 'Google Drive PDF' : 'Catatan Teks',
      createdAt: Date.now()
    }

    // Kaitkan deckId ke masing-masing pertanyaan
    const questionsWithDeckId = genRes.questions.map((q) => ({
      ...q,
      deckId: newDeckId
    }))

    // Emit sukses untuk disimpan ke IndexedDB di App.vue
    emit('create-deck-success', {
      deck: newDeck,
      questions: questionsWithDeckId
    })

    closeModal()
  } catch (err) {
    localError.value = err.message || 'Gagal membuat materi kuis.'
  } finally {
    isParsing.value = false
  }
}
</script>

<template>
  <div class="space-y-4 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between pt-2">
      <div>
        <h1 class="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen class="w-5 h-5 text-theme-light" />
          <span>Materi Belajar</span>
        </h1>
        <p class="text-xs text-app-muted mt-0.5">
          Daftar materi yang kamu pelajari ({{ decks.length }} materi)
        </p>
      </div>

      <button
        @click="openModal"
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-primary hover:bg-theme-hover text-white text-xs font-bold shadow-md active-press cursor-pointer"
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
        class="bg-app-card border border-app-border rounded-2xl p-4 space-y-3 hover:border-theme-border transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-theme-soft text-theme-light border border-theme-border mb-1.5">
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
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-primary hover:bg-theme-hover text-white font-semibold active-press cursor-pointer"
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
      <div class="w-12 h-12 mx-auto rounded-2xl bg-theme-soft flex items-center justify-center text-theme-light">
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
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold active-press cursor-pointer hover:bg-theme-hover"
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
            <Sparkles class="w-5 h-5 text-theme-light" />
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
                ? 'bg-theme-primary text-white shadow-xs'
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
                ? 'bg-theme-primary text-white shadow-xs'
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
                ? 'bg-theme-primary text-white shadow-xs'
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
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-theme-primary"
            />
          </div>

          <div>
            <label class="block text-app-muted font-medium mb-1">Kategori (Opsional)</label>
            <input
              v-model="categoryInput"
              type="text"
              placeholder="Contoh: Umum, Kuliah, Ujian, dll."
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-theme-primary"
            />
          </div>

          <!-- Mode 1: Teks Bebas -->
          <div v-if="sourceMode === 'text'">
            <label class="block text-app-muted font-medium mb-1">Salin atau Ketik Isi Catatan</label>
            <textarea
              v-model="textInput"
              rows="6"
              placeholder="Ketik atau tempelkan teks materi catatan belajarmu di sini..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white placeholder-app-dim focus:outline-hidden focus:border-theme-primary resize-none font-mono text-[11px]"
            ></textarea>
            <div class="text-[10px] text-app-dim text-right mt-0.5">
              {{ textInput.length }} karakter
            </div>
          </div>

          <!-- Mode 2: Upload PDF -->
          <div v-if="sourceMode === 'pdf'">
            <label class="block text-app-muted font-medium mb-1">Pilih Berkas PDF</label>
            <label
              class="border-2 border-dashed border-app-border rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-theme-border transition-colors bg-app-bg/50"
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
            <div v-if="!isGoogleConnected" class="p-4 rounded-xl bg-theme-soft border border-theme-border text-center space-y-2">
              <Cloud class="w-6 h-6 text-theme-light mx-auto" />
              <p class="text-xs text-white font-medium">Akun Google Belum Terhubung</p>
              <p class="text-[11px] text-app-muted">Hubungkan akun Google di menu Pengaturan untuk membuka file PDF langsung dari Google Drive Anda.</p>
            </div>

            <div v-else class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-app-muted font-medium">Pilih PDF dari Google Drive</label>
                <button
                  @click="emit('fetch-drive-pdfs')"
                  class="text-[11px] text-theme-light hover:text-white cursor-pointer"
                >
                  Muat Ulang
                </button>
              </div>

              <select
                v-model="selectedDriveFileId"
                class="w-full px-3.5 py-2.5 rounded-xl bg-app-bg border border-app-border text-white text-xs focus:outline-hidden focus:border-theme-primary cursor-pointer"
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
          class="p-3 rounded-xl bg-theme-soft border border-theme-border flex items-center gap-2.5 text-xs text-white"
        >
          <Loader2 class="w-4 h-4 text-theme-light animate-spin shrink-0" />
          <span>{{ parsingProgress || generateProgress || 'Sedang menyiapkan soal...' }}</span>
        </div>

        <!-- Submit Button -->
        <button
          @click="handleCreateDeck"
          :disabled="isGenerating || isParsing"
          class="w-full py-3 rounded-xl bg-theme-gradient hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-theme-glow active-press cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          <span>{{ isGenerating || isParsing ? 'Sedang Menyusun Soal...' : 'Buat Soal Kuis Sekarang' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
