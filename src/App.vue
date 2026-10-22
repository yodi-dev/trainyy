<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from './db'
import { useGoogleDrive } from './composables/useGoogleDrive'
import { useTheme } from './composables/useTheme'

// Components
import BottomNav from './components/BottomNav.vue'
import HomeTab from './components/HomeTab.vue'
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
  const defaultMode = localStorage.getItem('trainyy_quiz_mode') || 'study'

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
  const defaultMode = localStorage.getItem('trainyy_quiz_mode') || 'study'

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
      version: '1.0',
      exportedAt: new Date().toISOString(),
      decks: await db.decks.toArray(),
      questions: await db.questions.toArray(),
      sessions: await db.sessions.toArray()
    }
    await backupToDrive(fullData)
  } catch (err) {
    console.warn('Background Drive backup error:', err)
  }
}

// Drive Restore
const handleDriveRestore = async () => {
  const res = await restoreFromDrive()
  if (res.success && res.data) {
    if (confirm('Ingin memulihkan data materi dan catatan belajarmu dari Google Drive? Data di perangkat akan disesuaikan dengan data cadangan.')) {
      if (res.data.decks) {
        await db.decks.clear()
        await db.decks.bulkAdd(res.data.decks)
      }
      if (res.data.questions) {
        await db.questions.clear()
        await db.questions.bulkAdd(res.data.questions)
      }
      if (res.data.sessions) {
        await db.sessions.clear()
        await db.sessions.bulkAdd(res.data.sessions)
      }
      await loadLocalData()
      alert('Data berhasil dipulihkan dari Google Drive!')
    }
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
          :remedial-questions="remedialQuestions"
          :user-profile="userProfile"
          :is-online="isOnline"
          @start-quick-quiz="startQuickQuiz"
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
          :status-message="driveStatusMessage"
          @connect-google="handleConnectGoogle"
          @disconnect-google="disconnectGoogle"
          @backup-drive="triggerBackgroundDriveBackup"
          @restore-drive="handleDriveRestore"
          @create-sheet="createAnalyticsSheet"
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

