<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from './db'
import { useGoogleDrive } from './composables/useGoogleDrive'
import { useTheme } from './composables/useTheme'
import { synthesizeTrivia } from './utils/triviaHelper'

// Components
import BottomNav from './components/BottomNav.vue'
import HomeTab from './components/HomeTab.vue'
import TriviaTab from './components/TriviaTab.vue'
import DecksTab from './components/DecksTab.vue'
import RemedialTab from './components/RemedialTab.vue'
import SettingsTab from './components/SettingsTab.vue'
import QuizRunner from './components/QuizRunner.vue'

// Composables
useTheme() // Inisialisasi tema
const {
  accessToken,
  userProfile,
  lastBackupTime,
  linkedSheetId,
  isBackingUp: isDriveBackingUp,
  isRestoring: isDriveRestoring,
  isConnecting: isDriveConnecting,
  isLoading: isDriveLoading,
  statusMessage: driveStatusMessage,
  isConnected: isGoogleConnected,
  connect: connectGoogle,
  disconnect: disconnectGoogle,
  backup: backupToDrive,
  restore: restoreFromDrive,
  listDrivePdfs,
  downloadDrivePdf,
  appendQuizToSheet,
  ensureAnalyticsSheet,
  createAnalyticsSheet
} = useGoogleDrive()

// Navigation & View State
const currentTab = ref('home')
const activeQuiz = ref(null) // null or { questions, deckTitle, deckId, mode }
const drivePdfs = ref([])

// Database State
const decks = ref([])
const questions = ref([])
const sessions = ref([])

// Network Status
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

// Load data from Dexie IndexedDB
const loadLocalData = async () => {
  try {
    decks.value = await db.decks.toArray()
    questions.value = await db.questions.toArray()
    sessions.value = await db.sessions.toArray()

    // Background sync: lengkapi fakta trivia untuk soal-soal materi lama yang belum memilikinya
    const missingTrivia = questions.value.filter((q) => !q.trivia)
    if (missingTrivia.length > 0) {
      for (const q of missingTrivia) {
        const syn = synthesizeTrivia(q)
        if (syn?.fact) {
          await db.questions.update(q.id, { trivia: syn.fact })
        }
      }
      questions.value = await db.questions.toArray()
    }
  } catch (err) {
    console.error('Error loading local data:', err)
  }
}

// Remedial questions calculation
const remedialQuestions = computed(() => {
  return questions.value.filter((q) => (q.timesIncorrect || 0) > 0 && !q.isMastered)
})

// ==========================================
// QUIZ FLOW ACTIONS
// ==========================================

// 1. Start Quick 10-Question Quiz (Random mix with priority to unmastered/incorrect questions)
const startQuickQuiz = () => {
  if (questions.value.length === 0) return

  // Algorithm: Pick incorrect first, then unseen, then random
  const pool = [...questions.value]
  const incorrect = pool.filter((q) => (q.timesIncorrect || 0) > 0 && !q.isMastered)
  const rest = pool.filter((q) => !incorrect.includes(q))

  // Shuffle arrays
  const shuffledIncorrect = incorrect.sort(() => 0.5 - Math.random())
  const shuffledRest = rest.sort(() => 0.5 - Math.random())

  const selected = [...shuffledIncorrect, ...shuffledRest].slice(0, 10)
  const defaultMode =
    localStorage.getItem('trainyy_default_mode') ||
    localStorage.getItem('trainyy_quiz_mode') ||
    'study'

  activeQuiz.value = {
    questions: selected,
    deckTitle: 'Latihan 10 Soal Acak',
    deckId: null,
    mode: defaultMode
  }
}

// 2. Start Deck Quiz (10 questions from specific deck)
const startDeckQuiz = (deck) => {
  const deckQuestions = questions.value.filter((q) => q.deckId === deck.id)
  if (deckQuestions.length === 0) return

  const shuffled = [...deckQuestions].sort(() => 0.5 - Math.random()).slice(0, 10)
  const defaultMode =
    localStorage.getItem('trainyy_default_mode') ||
    localStorage.getItem('trainyy_quiz_mode') ||
    'study'

  activeQuiz.value = {
    questions: shuffled,
    deckTitle: deck.title,
    deckId: deck.id,
    mode: defaultMode
  }
}

// 3. Start Remedial Quiz (specifically for incorrect questions)
const startRemedialQuiz = (customList = null) => {
  const list = customList || remedialQuestions.value
  if (list.length === 0) return

  const shuffled = [...list].sort(() => 0.5 - Math.random()).slice(0, 10)

  activeQuiz.value = {
    questions: shuffled,
    deckTitle: 'Latih Ulang Soal yang Salah',
    deckId: null,
    mode: 'study'
  }
}

// 4. Handle Finished Quiz
const handleFinishQuiz = async (sessionData) => {
  try {
    // 1. Add session record to local Dexie DB
    const sessionRecord = {
      id: `sess_${Date.now()}`,
      ...sessionData
    }
    await db.sessions.add(sessionRecord)

    // 2. Update question statistics in local Dexie DB
    const updates = []
    sessionData.wrongQuestionIds.forEach((wId) => {
      updates.push(
        db.questions
          .where('id')
          .equals(wId)
          .modify((q) => {
            q.timesAnswered = (q.timesAnswered || 0) + 1
            q.timesIncorrect = (q.timesIncorrect || 0) + 1
            q.lastAnsweredAt = Date.now()
            q.isMastered = false
          })
      )
    })

    // Update correctly answered questions
    const wrongSet = new Set(sessionData.wrongQuestionIds)
    Object.keys(sessionData.answersMap || {}).forEach((qId) => {
      if (!wrongSet.has(qId)) {
        updates.push(
          db.questions
            .where('id')
            .equals(qId)
            .modify((q) => {
              q.timesAnswered = (q.timesAnswered || 0) + 1
              q.timesCorrect = (q.timesCorrect || 0) + 1
              q.lastAnsweredAt = Date.now()
              // If correct twice in a row, mark mastered
              if ((q.timesCorrect || 0) >= 2 && (q.timesIncorrect || 0) === 0) {
                q.isMastered = true
              }
            })
        )
      }
    })

    await Promise.all(updates)
    await loadLocalData()

    // 3. Auto-sync: Append to Google Sheets (if connected & online)
    if (isGoogleConnected.value && isOnline.value) {
      appendQuizToSheet(sessionRecord).catch((err) => {
        console.warn('Auto-append to Google Sheets failed:', err)
      })
    }

    // 4. Auto-sync: Backup full data to Google Drive in background
    if (isGoogleConnected.value && isOnline.value) {
      triggerBackgroundDriveBackup()
    }
  } catch (err) {
    console.error('Error recording quiz session:', err)
  }
}

const exitQuiz = () => {
  activeQuiz.value = null
  loadLocalData()
}

// Mark question as mastered manually
const handleMarkMastered = async (questionId) => {
  await db.questions.update(questionId, { isMastered: true })
  await loadLocalData()
  if (isGoogleConnected.value && isOnline.value) {
    triggerBackgroundDriveBackup()
  }
}

// Connect Google and trigger initial auto-backup & auto-sheet setup
const handleConnectGoogle = async () => {
  const res = await connectGoogle()
  if (res?.success && isOnline.value) {
    // 1. Auto ensure Google Sheets study report exists & linked
    ensureAnalyticsSheet().catch((e) => console.warn('Auto-setup sheets error:', e))

    // 2. Auto backup to Google Drive
    const totalDecks = await db.decks.count()
    if (totalDecks > 0) {
      triggerBackgroundDriveBackup()
    }
  }
}

// Delete Deck
const handleDeleteDeck = async (deckId) => {
  if (confirm('Yakin ingin menghapus materi ini beserta soal-soalnya?')) {
    await db.decks.delete(deckId)
    await db.questions.where('deckId').equals(deckId).delete()
    await loadLocalData()
    if (isGoogleConnected.value && isOnline.value) {
      triggerBackgroundDriveBackup()
    }
  }
}

// Handle AI-Generated Deck Success
const handleCreateDeckSuccess = async ({ deck, questions: newQuestions }) => {
  await db.decks.add(deck)
  await db.questions.bulkAdd(newQuestions)
  await loadLocalData()

  // Auto-backup to Google Drive
  if (isGoogleConnected.value && isOnline.value) {
    triggerBackgroundDriveBackup()
  }
}

// Background Drive Backup
const triggerBackgroundDriveBackup = async () => {
  try {
    const fullData = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      decks: await db.decks.toArray(),
      questions: await db.questions.toArray(),
      sessions: await db.sessions.toArray()
    }
    await backupToDrive(fullData, false, true)
  } catch (err) {
    console.warn('Background Drive backup error:', err)
  }
}

// Manual Drive Backup (triggered by user button click in Settings)
const handleManualBackup = async () => {
  try {
    const fullData = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      decks: await db.decks.toArray(),
      questions: await db.questions.toArray(),
      sessions: await db.sessions.toArray()
    }
    const res = await backupToDrive(fullData, true)
    if (res?.success) {
      alert('Cadangan data berhasil disimpan ke Google Drive Anda!')
    } else {
      alert(res?.error || 'Gagal menyimpan cadangan. Pastikan akun Google sudah terhubung dengan benar.')
    }
  } catch (err) {
    alert('Gagal menyimpan cadangan: ' + err.message)
  }
}

// Drive Restore
const handleDriveRestore = async () => {
  try {
    const res = await restoreFromDrive(true)
    if (res?.success && res.data) {
      const deckCount = res.data.decks ? res.data.decks.length : 0
      const questionCount = res.data.questions ? res.data.questions.length : 0
      if (confirm(`Ingin memulihkan ${deckCount} materi dan ${questionCount} soal dari Google Drive? Data lokal saat ini akan digantikan dengan cadangan.`)) {
        await db.transaction('rw', [db.decks, db.questions, db.sessions], async () => {
          if (Array.isArray(res.data.decks)) {
            await db.decks.clear()
            await db.decks.bulkAdd(res.data.decks)
          }
          if (Array.isArray(res.data.questions)) {
            await db.questions.clear()
            await db.questions.bulkAdd(res.data.questions)
          }
          if (Array.isArray(res.data.sessions)) {
            await db.sessions.clear()
            await db.sessions.bulkAdd(res.data.sessions)
          }
        })
        await loadLocalData()
        alert('Data berhasil dipulihkan dari Google Drive!')
      }
    } else {
      alert(res?.error || 'Gagal memulihkan cadangan. Pastikan file cadangan (trainyy-backup.json) ada di Google Drive Anda.')
    }
  } catch (err) {
    alert('Terjadi kesalahan saat memulihkan cadangan: ' + (err.message || err))
  }
}

// Local JSON Backup: Export
const handleExportLocalBackup = async () => {
  try {
    const fullData = {
      version: '1.1',
      app: 'Trainyy',
      exportedAt: new Date().toISOString(),
      decks: await db.decks.toArray(),
      questions: await db.questions.toArray(),
      sessions: await db.sessions.toArray()
    }

    const jsonStr = JSON.stringify(fullData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const dateStr = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = url
    link.download = `trainyy-backup-${dateStr}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    alert('Gagal mengekspor file cadangan lokal: ' + (err.message || err))
  }
}

// Local JSON Backup: Import
const handleImportLocalBackup = async (file) => {
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!Array.isArray(data.decks) && !Array.isArray(data.questions)) {
      throw new Error('Format file cadangan tidak sesuai (tidak ditemukan data materi atau kuis).')
    }

    const deckCount = data.decks ? data.decks.length : 0
    const questionCount = data.questions ? data.questions.length : 0

    if (confirm(`Pulihkan ${deckCount} materi dan ${questionCount} soal dari file "${file.name}"? Data di perangkat saat ini akan digantikan.`)) {
      await db.transaction('rw', [db.decks, db.questions, db.sessions], async () => {
        if (Array.isArray(data.decks)) {
          await db.decks.clear()
          await db.decks.bulkAdd(data.decks)
        }
        if (Array.isArray(data.questions)) {
          await db.questions.clear()
          await db.questions.bulkAdd(data.questions)
        }
        if (Array.isArray(data.sessions)) {
          await db.sessions.clear()
          await db.sessions.bulkAdd(data.sessions)
        }
      })
      await loadLocalData()
      alert('Data berhasil dipulihkan dari file cadangan lokal!')

      // Sync to Google Drive in background if connected
      if (isGoogleConnected.value && isOnline.value) {
        triggerBackgroundDriveBackup()
      }
    }
  } catch (err) {
    alert('Gagal memulihkan file cadangan: ' + (err.message || err))
  }
}

// Fetch Google Drive PDFs
const handleFetchDrivePdfs = async () => {
  const res = await listDrivePdfs()
  if (res.success) {
    drivePdfs.value = res.files
  }
}

// Download Google Drive PDF for extraction
const handleDownloadDrivePdf = async (fileId, callback) => {
  const res = await downloadDrivePdf(fileId)
  callback(res)
}

onMounted(async () => {
  await loadLocalData()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  // Auto-sync in background if connected & online
  if (isGoogleConnected.value && isOnline.value) {
    setTimeout(async () => {
      if (!linkedSheetId.value) {
        await ensureAnalyticsSheet().catch(() => {})
      }
      triggerBackgroundDriveBackup()
    }, 1500)
  }
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <div class="min-h-screen bg-app-bg text-app-text safe-top px-4 selection:bg-theme-primary selection:text-white">
    <!-- Main Shell Container (Centered max-w-md for native phone ergonomics) -->
    <main class="max-w-md mx-auto min-h-screen">
      <!-- Active Quiz View (Overlays entire screen when quiz is running) -->
      <QuizRunner
        v-if="activeQuiz"
        :questions="activeQuiz.questions"
        :deck-title="activeQuiz.deckTitle"
        :deck-id="activeQuiz.deckId"
        :mode="activeQuiz.mode"
        @finish-quiz="handleFinishQuiz"
        @exit-quiz="exitQuiz"
        @retry-wrong="startRemedialQuiz"
      />

      <!-- Tab Views -->
      <template v-else>
        <HomeTab
          v-if="currentTab === 'home'"
          :decks="decks"
          :sessions="sessions"
          :questions="questions"
          :remedial-questions="remedialQuestions"
          :user-profile="userProfile"
          :is-online="isOnline"
          @start-quick-quiz="startQuickQuiz"
          @start-deck-quiz="startDeckQuiz"
          @open-new-deck-modal="currentTab = 'decks'"
          @navigate="currentTab = $event"
        />

        <TriviaTab
          v-else-if="currentTab === 'trivia'"
          :questions="questions"
          :decks="decks"
          @start-deck-quiz="startDeckQuiz"
          @open-new-deck-modal="currentTab = 'decks'"
          @navigate="currentTab = $event"
        />

        <DecksTab
          v-else-if="currentTab === 'decks'"
          :decks="decks"
          :is-google-connected="isGoogleConnected"
          :drive-pdfs="drivePdfs"
          @start-deck-quiz="startDeckQuiz"
          @delete-deck="handleDeleteDeck"
          @create-deck-success="handleCreateDeckSuccess"
          @fetch-drive-pdfs="handleFetchDrivePdfs"
          @download-drive-pdf="handleDownloadDrivePdf"
        />

        <RemedialTab
          v-else-if="currentTab === 'remedial'"
          :questions="questions"
          @start-remedial-quiz="startRemedialQuiz"
          @mark-mastered="handleMarkMastered"
        />

        <SettingsTab
          v-else-if="currentTab === 'settings'"
          :user-profile="userProfile"
          :is-connected="isGoogleConnected"
          :last-backup-time="lastBackupTime"
          :linked-sheet-id="linkedSheetId"
          :is-loading="isDriveLoading"
          :is-backing-up="isDriveBackingUp"
          :is-restoring="isDriveRestoring"
          :is-connecting="isDriveConnecting"
          :status-message="driveStatusMessage"
          @navigate="currentTab = $event"
          @connect-google="handleConnectGoogle"
          @disconnect-google="disconnectGoogle"
          @backup-drive="handleManualBackup"
          @restore-drive="handleDriveRestore"
          @create-sheet="createAnalyticsSheet"
          @export-local-backup="handleExportLocalBackup"
          @import-local-backup="handleImportLocalBackup"
        />

        <!-- Bottom Navigation Bar -->
        <BottomNav
          :current-tab="currentTab"
          :remedial-count="remedialQuestions.length"
          @update:tab="currentTab = $event"
        />
      </template>
    </main>
  </div>
</template>

