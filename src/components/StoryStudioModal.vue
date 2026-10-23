<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  Clapperboard, 
  Play, 
  Square, 
  Download, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  X,
  Share2,
  Video
} from '@lucide/vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// State
const canvasRef = ref(null)
const isPlaying = ref(false)
const isRecording = ref(false)
const isVoiceEnabled = ref(true)
const recordingProgress = ref(0)
const totalDuration = 28 // 28 detik
const recordedVideoUrl = ref(null)
const recordStatusText = ref('')

let animationFrameId = null
let startTime = null
let mediaRecorder = null
let recordedChunks = []
let audioCtx = null
let audioDest = null
let bgmInterval = null

// Scene definitions
const scenes = [
  {
    start: 0,
    end: 7,
    title: 'Latihan Ingatan Harian',
    subtitle: 'Asah Memori Tanpa Stres',
    caption: 'Bosan belajar dengan cara baca catatan berulang-ulang? Latih ingatan aktifmu dengan Trainyy!',
    voice: 'Bosan belajar dengan cara membaca catatan berulang-ulang? Latih ingatan aktifmu dengan Trainyy!'
  },
  {
    start: 7,
    end: 14,
    title: 'Kartu Fakta Kilat (Trivia)',
    subtitle: 'Wawasan Ringkas Setiap Hari',
    caption: 'Tiap hari dapat Fakta Kilat 3D interaktif untuk asah wawasan materi dalam sekejap!',
    voice: 'Tiap hari dapat Fakta Kilat 3 dimensi interaktif untuk asah wawasan materi dalam sekejap!'
  },
  {
    start: 14,
    end: 21,
    title: 'Kuis Kilat Active Recall',
    subtitle: '10 Pertanyaan Acak Berbobot',
    caption: 'Kuis kilat 10 soal dengan analisis instan yang langsung memperkuat ingatan jangka panjang.',
    voice: 'Kuis kilat 10 soal dengan analisis instan yang langsung memperkuat ingatan jangka panjang!'
  },
  {
    start: 21,
    end: 28,
    title: 'Tingkatkan Ingatanmu Sekarang',
    subtitle: 'Gratis & 100% Offline Ready',
    caption: 'Mulai latihan active recall di trainyy.pages.dev atau tap link di story ini!',
    voice: 'Mulai latihan active recall sekarang di trainyy.pages.dev atau tap link di story ini!'
  }
]

let currentSceneIndex = 0

// Web Audio BGM Synthesizer (Gentle Lo-Fi ambient chords)
const initAudio = () => {
  if (audioCtx) return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  audioCtx = new AudioContextClass()
  audioDest = audioCtx.createMediaStreamDestination()
}

const playTone = (freq, duration, type = 'sine', gainVal = 0.08) => {
  if (!audioCtx) return
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime)

    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration)

    osc.connect(gain)
    gain.connect(audioCtx.destination)
    if (audioDest) {
      gain.connect(audioDest)
    }

    osc.start()
    osc.stop(audioCtx.currentTime + duration)
  } catch (e) {
    // Ignore audio context errors
  }
}

const playBgmChord = (step) => {
  if (!audioCtx) return
  // Akor lo-fi santai: Cmaj7, Am7, Fmaj7, G7
  const chordSets = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 349.23]  // G7
  ]
  const chord = chordSets[step % chordSets.length]
  chord.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 1.8, 'triangle', 0.04)
    }, i * 60)
  })
}

// Web Speech Synthesis (Narasi Suara ID)
const speakSceneNarration = (text) => {
  if (!isVoiceEnabled.value || typeof window === 'undefined' || !window.speechSynthesis) return

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID'
    utterance.rate = 1.05
    utterance.pitch = 1.0

    // Cari suara bahasa Indonesia jika tersedia
    const voices = window.speechSynthesis.getVoices()
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'))
    if (idVoice) {
      utterance.voice = idVoice
    }

    window.speechSynthesis.speak(utterance)
  } catch (e) {
    console.warn('Speech synthesis error:', e)
  }
}

// ==========================================
// CANVAS RENDERER ENGINE (720 x 1280 HD 9:16)
// ==========================================
const drawFrame = (time) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  // 1. Background Gradient (Deep Navy / Indigo Space)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#090d16')
  bgGrad.addColorStop(0.4, '#0d1527')
  bgGrad.addColorStop(1, '#05080e')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Subtle ambient radial glow behind phone
  const glow = ctx.createRadialGradient(width / 2, height / 2 - 30, 40, width / 2, height / 2 - 30, 360)
  glow.addColorStop(0, 'rgba(99, 102, 241, 0.22)')
  glow.addColorStop(0.6, 'rgba(124, 58, 237, 0.08)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  // Floating ambient particles
  const particleTime = time * 0.001
  for (let i = 0; i < 18; i++) {
    const px = (Math.sin(i * 123 + particleTime * 0.4) * 0.5 + 0.5) * width
    const py = (Math.cos(i * 321 + particleTime * 0.3) * 0.5 + 0.5) * height
    const pr = ((i % 3) + 1.5)
    ctx.fillStyle = i % 2 === 0 ? 'rgba(129, 140, 248, 0.25)' : 'rgba(56, 189, 248, 0.2)'
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fill()
  }

  // 2. Top Header Bar (Instagram Story Header)
  // Story Progress Bars (4 segments for 4 scenes)
  const barCount = 4
  const barGap = 6
  const totalBarWidth = width - 48
  const barWidth = (totalBarWidth - (barCount - 1) * barGap) / barCount
  const barY = 28
  const barHeight = 4

  for (let i = 0; i < barCount; i++) {
    const bx = 24 + i * (barWidth + barGap)
    // Background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.beginPath()
    ctx.roundRect(bx, barY, barWidth, barHeight, 2)
    ctx.fill()

    // Filled bar
    let fillPct = 0
    if (i < currentSceneIndex) {
      fillPct = 1
    } else if (i === currentSceneIndex) {
      const curScene = scenes[currentSceneIndex]
      fillPct = Math.min(1, Math.max(0, (time - curScene.start) / (curScene.end - curScene.start)))
    }

    if (fillPct > 0) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(bx, barY, barWidth * fillPct, barHeight, 2)
      ctx.fill()
    }
  }

  // Brand Pill
  ctx.save()
  ctx.translate(24, 48)
  // Monogram logo icon
  ctx.fillStyle = '#6366f1'
  ctx.beginPath()
  ctx.roundRect(0, 0, 36, 36, 10)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px system-ui, sans-serif'
  ctx.fillText('T', 12, 26)

  // Text title
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Trainyy', 46, 20)
  ctx.font = '500 12px system-ui, sans-serif'
  ctx.fillStyle = '#818cf8'
  ctx.fillText('Active Recall App', 46, 34)
  ctx.restore()

  // 3. Main Scene Headline
  const curScene = scenes[currentSceneIndex]
  ctx.textAlign = 'center'
  ctx.fillStyle = '#38bdf8'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.letterSpacing = '1px'
  ctx.fillText(curScene.subtitle.toUpperCase(), width / 2, 126)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 28px system-ui, sans-serif'
  ctx.fillText(curScene.title, width / 2, 162)

  // 4. Smartphone Mockup Center Frame
  const phoneW = 440
  const phoneH = 750
  const phoneX = (width - phoneW) / 2
  const phoneY = 196
  const phoneR = 42

  // Phone Bezel / Outer Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 35
  ctx.shadowOffsetY = 18
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, phoneR)
  ctx.fill()
  ctx.restore()

  // Phone Border Rim
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, phoneR)
  ctx.stroke()

  // Phone Screen Content (Clipped)
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(phoneX + 6, phoneY + 6, phoneW - 12, phoneH - 12, phoneR - 4)
  ctx.clip()

  // Screen Background
  ctx.fillStyle = '#090d16'
  ctx.fillRect(phoneX, phoneY, phoneW, phoneH)

  // Dynamic Island / Camera Notch
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.roundRect(phoneX + (phoneW - 100) / 2, phoneY + 12, 100, 24, 12)
  ctx.fill()

  // Render Scene inside phone screen
  renderPhoneContent(ctx, phoneX + 6, phoneY + 6, phoneW - 12, phoneH - 12, time)
  ctx.restore()

  // 5. Dynamic Captions Bar (Bottom Instagram Story Subtitle)
  const capBoxW = width - 48
  const capBoxH = 80
  const capBoxX = 24
  const capBoxY = height - 120

  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(capBoxX, capBoxY, capBoxW, capBoxH, 18)
  ctx.fill()
  ctx.stroke()

  // Caption Icon & Text
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 15px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('💡 ' + curScene.caption, capBoxX + 16, capBoxY + 32, capBoxW - 32)
  ctx.restore()
}

// Render dynamic content inside the phone screen
const renderPhoneContent = (ctx, sx, sy, sw, sh, time) => {
  const contentY = sy + 50

  if (currentSceneIndex === 0) {
    // ==========================================
    // SCENE 1: BERANDA & STATISTIK BELAJAR
    // ==========================================
    // User Greeting Header
    ctx.textAlign = 'left'
    ctx.fillStyle = '#818cf8'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillText('⚡ LATIHAN INGATAN HARIAN', sx + 22, contentY + 20)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillText('Hai, Sobat Trainyy 👋', sx + 22, contentY + 48)

    // Stats Grid Container
    const gridY = contentY + 85
    const cardW = (sw - 58) / 3

    // Card 1: Soal Dikerjakan
    drawMiniStatCard(ctx, sx + 20, gridY, cardW, '48', 'Soal Selesai', '#818cf8')
    // Card 2: Nilai Rata-rata
    drawMiniStatCard(ctx, sx + 20 + cardW + 9, gridY, cardW, '89%', 'Nilai Rata-rata', '#34d399')
    // Card 3: Perlu Diulang
    drawMiniStatCard(ctx, sx + 20 + (cardW + 9) * 2, gridY, cardW, '2', 'Perlu Diulang', '#f43f5e')

    // Animated Hero Banner
    const heroY = gridY + 115
    const heroH = 180
    const heroGrad = ctx.createLinearGradient(sx + 20, heroY, sx + sw - 20, heroY + heroH)
    heroGrad.addColorStop(0, '#4f46e5')
    heroGrad.addColorStop(1, '#7c3aed')

    ctx.fillStyle = heroGrad
    ctx.beginPath()
    ctx.roundRect(sx + 20, heroY, sw - 40, heroH, 20)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px system-ui, sans-serif'
    ctx.fillText('Tantang Ingatanmu', sx + 38, heroY + 45)
    ctx.font = '400 13px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText('10 pertanyaan acak untuk menguji', sx + 38, heroY + 72)
    ctx.fillText('dan memperkuat daya ingat aktif.', sx + 38, heroY + 92)

    // Play button
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(sx + 38, heroY + 115, sw - 76, 44, 12)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('▶  Mulai Kuis 10 Soal', sx + sw / 2, heroY + 143)

  } else if (currentSceneIndex === 1) {
    // ==========================================
    // SCENE 2: KARTU TRIVIA 3D FLIP
    // ==========================================
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.fillText('✨ FAKTA KILAT (TRIVIA)', sx + 22, contentY + 20)

    const cardY = contentY + 50
    const cardH = 260
    const cardW = sw - 40

    // Animasi rotasi flip 3D (flip terjadi di detik ke-10)
    const sceneTime = time - 7
    const isFlipped = sceneTime >= 3.2

    ctx.save()
    ctx.translate(sx + 20 + cardW / 2, cardY + cardH / 2)

    // Simulasi visual 3D flip card
    let flipScaleX = 1
    if (sceneTime >= 2.8 && sceneTime <= 3.6) {
      const prog = (sceneTime - 2.8) / 0.8
      flipScaleX = Math.abs(Math.cos(prog * Math.PI))
    }
    ctx.scale(Math.max(0.05, flipScaleX), 1)

    // Card background
    ctx.fillStyle = isFlipped ? '#063426' : '#111a2e'
    ctx.strokeStyle = isFlipped ? '#10b981' : '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 20)
    ctx.fill()
    ctx.stroke()

    ctx.textAlign = 'left'
    if (!isFlipped) {
      // SISI DEPAN
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.fillText('💡 TAHUKAH KAMU?', -cardW / 2 + 20, -cardH / 2 + 35)

      ctx.fillStyle = '#ffffff'
      ctx.font = '600 15px system-ui, sans-serif'
      const text1 = 'Riset kognitif membuktikan bahwa'
      const text2 = 'mengerjakan kuis (Testing Effect)'
      const text3 = 'melatih retensi ingatan jangka panjang'
      const text4 = 'hingga 50% lebih kuat dibanding'
      const text5 = 'hanya membaca materi berulang.'
      ctx.fillText(text1, -cardW / 2 + 20, -cardH / 2 + 80)
      ctx.fillText(text2, -cardW / 2 + 20, -cardH / 2 + 104)
      ctx.fillText(text3, -cardW / 2 + 20, -cardH / 2 + 128)
      ctx.fillText(text4, -cardW / 2 + 20, -cardH / 2 + 152)
      ctx.fillText(text5, -cardW / 2 + 20, -cardH / 2 + 176)

      ctx.fillStyle = '#818cf8'
      ctx.font = '500 12px system-ui, sans-serif'
      ctx.fillText('↻ Ketuk kartu untuk melihat poin kunci', -cardW / 2 + 20, -cardH / 2 + 230)
    } else {
      // SISI BELAKANG
      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.fillText('✓ INTISARI KONSEP', -cardW / 2 + 20, -cardH / 2 + 35)

      // Key point pill
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
      ctx.beginPath()
      ctx.roundRect(-cardW / 2 + 20, -cardH / 2 + 55, cardW - 40, 42, 8)
      ctx.fill()
      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillText('Poin Kunci: Testing Effect', -cardW / 2 + 32, -cardH / 2 + 82)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '400 13px system-ui, sans-serif'
      ctx.fillText('Otak dipaksa bekerja aktif memanggil', -cardW / 2 + 20, -cardH / 2 + 126)
      ctx.fillText('kembali informasi, memperkuat sinapsis', -cardW / 2 + 20, -cardH / 2 + 148)
      ctx.fillText('memori secara permanen.', -cardW / 2 + 20, -cardH / 2 + 170)
    }
    ctx.restore()

    // Simulated Touch Pointer on flip
    if (sceneTime >= 2.5 && sceneTime <= 3.5) {
      drawTouchRipple(ctx, sx + sw / 2, cardY + cardH / 2, sceneTime - 2.5)
    }

  } else if (currentSceneIndex === 2) {
    // ==========================================
    // SCENE 3: KUIS KILAT AKTIF
    // ==========================================
    ctx.textAlign = 'left'
    ctx.fillStyle = '#818cf8'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillText('PERTANYAAN 1 DARI 10', sx + 22, contentY + 20)

    // Progress bar inside quiz
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.beginPath()
    ctx.roundRect(sx + 20, contentY + 34, sw - 40, 6, 3)
    ctx.fill()
    ctx.fillStyle = '#6366f1'
    ctx.beginPath()
    ctx.roundRect(sx + 20, contentY + 34, (sw - 40) * 0.4, 6, 3)
    ctx.fill()

    // Question box
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.fillText('Mengapa Active Recall lebih efektif', sx + 22, contentY + 75)
    ctx.fillText('dibanding membaca catatan ulang?', sx + 22, contentY + 98)

    // Options A & B
    const optY = contentY + 125
    const sceneTime = time - 14
    const isAnswered = sceneTime >= 2.8

    // Option A (Correct answer)
    ctx.fillStyle = isAnswered ? '#064e3b' : '#1e293b'
    ctx.strokeStyle = isAnswered ? '#10b981' : 'rgba(99, 102, 241, 0.3)'
    ctx.lineWidth = isAnswered ? 2 : 1
    ctx.beginPath()
    ctx.roundRect(sx + 20, optY, sw - 40, 56, 14)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = isAnswered ? '#34d399' : '#ffffff'
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillText(isAnswered ? '✓ A. Otak merekonstruksi jalur saraf memori' : 'A. Otak merekonstruksi jalur saraf memori', sx + 34, optY + 34)

    // Option B
    ctx.fillStyle = '#1e293b'
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(sx + 20, optY + 68, sw - 40, 56, 14)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 13px system-ui, sans-serif'
    ctx.fillText('B. Menghafal urutan pilihan tanpa paham', sx + 34, optY + 102)

    // Touch tap on option A
    if (sceneTime >= 2.2 && sceneTime <= 3.2) {
      drawTouchRipple(ctx, sx + sw / 2, optY + 28, sceneTime - 2.2)
    }

    // Feedback explanation box appears after answered
    if (isAnswered) {
      const expY = optY + 142
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'
      ctx.beginPath()
      ctx.roundRect(sx + 20, expY, sw - 40, 95, 14)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.fillText('✓ Tepat Sekali!', sx + 34, expY + 28)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '400 12px system-ui, sans-serif'
      ctx.fillText('Proses pemanggilan kembali mengaktifkan', sx + 34, expY + 50)
      ctx.fillText('sinapsis otak dan mengunci ingatan kuat.', sx + 34, expY + 70)
    }

  } else if (currentSceneIndex === 3) {
    // ==========================================
    // SCENE 4: OUTRO & CALL TO ACTION
    // ==========================================
    ctx.textAlign = 'center'

    // Big Glowing Logo
    const logoY = contentY + 60
    ctx.fillStyle = '#6366f1'
    ctx.beginPath()
    ctx.roundRect(sx + sw / 2 - 40, logoY, 80, 80, 24)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px system-ui, sans-serif'
    ctx.fillText('T', sx + sw / 2, logoY + 58)

    ctx.font = '900 24px system-ui, sans-serif'
    ctx.fillText('Trainyy', sx + sw / 2, logoY + 120)

    ctx.font = '500 13px system-ui, sans-serif'
    ctx.fillStyle = '#818cf8'
    ctx.fillText('Asah Ingatan & Pemahaman Aktif', sx + sw / 2, logoY + 144)

    // Feature Badges
    const badgeY = logoY + 180
    drawFeatureBadge(ctx, sx + sw / 2, badgeY, '⚡ 100% Gratis & Bebas Iklan')
    drawFeatureBadge(ctx, sx + sw / 2, badgeY + 45, '📱 Pasang di HP (PWA Offline-Ready)')
    drawFeatureBadge(ctx, sx + sw / 2, badgeY + 90, '✨ Upload PDF / Catatan Jadi Kuis')

    // Link sticker box
    const stickY = badgeY + 155
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(sx + 30, stickY, sw - 60, 54, 16)
    ctx.fill()
    ctx.fillStyle = '#090d16'
    ctx.font = 'bold 15px system-ui, sans-serif'
    ctx.fillText('🔗 Buka: trainyy.pages.dev', sx + sw / 2, stickY + 34)
  }
}

// Helper drawing functions
const drawMiniStatCard = (ctx, x, y, w, val, label, color) => {
  ctx.fillStyle = '#111a2e'
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, w, 68, 12)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.font = 'bold 18px system-ui, sans-serif'
  ctx.fillText(val, x + w / 2, y + 32)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 10px system-ui, sans-serif'
  ctx.fillText(label, x + w / 2, y + 52)
}

const drawFeatureBadge = (ctx, cx, cy, text) => {
  ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(cx - 150, cy, 300, 34, 17)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 12px system-ui, sans-serif'
  ctx.fillText(text, cx, cy + 22)
}

const drawTouchRipple = (ctx, x, y, prog) => {
  const r = 10 + prog * 35
  const alpha = Math.max(0, 1 - prog)
  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.fill()
}

// ==========================================
// ANIMATION LOOP & RECORDING ORCHESTRATION
// ==========================================
let lastScene = -1
let lastChordStep = -1

const runLoop = (timestamp) => {
  if (!startTime) startTime = timestamp
  const elapsedSeconds = (timestamp - startTime) / 1000

  // Tentukan scene aktif
  let currentIdx = scenes.findIndex(s => elapsedSeconds >= s.start && elapsedSeconds < s.end)
  if (currentIdx === -1) {
    if (elapsedSeconds >= totalDuration) {
      stopAnimation()
      return
    }
    currentIdx = scenes.length - 1
  }

  currentSceneIndex = currentIdx

  // Trigger suara narasi saat pergantian scene
  if (currentIdx !== lastScene) {
    lastScene = currentIdx
    speakSceneNarration(scenes[currentIdx].voice)
  }

  // Trigger BGM chord setiap 3.5 detik
  const chordStep = Math.floor(elapsedSeconds / 3.5)
  if (chordStep !== lastChordStep) {
    lastChordStep = chordStep
    playBgmChord(chordStep)
  }

  // Update progress
  recordingProgress.value = Math.min(100, Math.round((elapsedSeconds / totalDuration) * 100))

  // Render Frame
  drawFrame(elapsedSeconds)

  if (isPlaying.value) {
    animationFrameId = requestAnimationFrame(runLoop)
  }
}

// Start Preview (Live Auto-Play)
const startPreview = () => {
  if (isPlaying.value) return
  initAudio()
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }

  isPlaying.value = true
  isRecording.value = false
  startTime = null
  lastScene = -1
  lastChordStep = -1
  recordedVideoUrl.value = null
  recordStatusText.value = 'Memutar Pratinjau...'

  animationFrameId = requestAnimationFrame(runLoop)
}

// Start Real Video Recording (MediaRecorder)
const startRecording = async () => {
  if (isRecording.value) return
  initAudio()
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume()
  }

  const canvas = canvasRef.value
  if (!canvas) return

  recordedChunks = []
  recordedVideoUrl.value = null

  // Capture Canvas Video Stream (30 FPS)
  const videoStream = canvas.captureStream ? canvas.captureStream(30) : null
  if (!videoStream) {
    alert('Browser ini tidak mendukung canvas.captureStream. Silakan gunakan tombol Putar Pratinjau dan rekam layar secara manual.')
    return
  }

  // Combine video + Web Audio BGM stream
  let combinedStream = videoStream
  if (audioDest && audioDest.stream) {
    const audioTracks = audioDest.stream.getAudioTracks()
    if (audioTracks.length > 0) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks
      ])
    }
  }

  // Determine supported mimeType
  let options = { mimeType: 'video/webm;codecs=vp9,opus' }
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm' }
  }

  try {
    mediaRecorder = new MediaRecorder(combinedStream, options)
  } catch (err) {
    console.warn('Fallback standard MediaRecorder without options:', err)
    mediaRecorder = new MediaRecorder(combinedStream)
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data)
    }
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    recordedVideoUrl.value = url
    recordStatusText.value = 'Video Siap! Klik Download di bawah.'

    // Auto trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = `Trainyy_IG_Story_Demo_${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Start recording
  mediaRecorder.start(100) // collect every 100ms
  isRecording.value = true
  isPlaying.value = true
  startTime = null
  lastScene = -1
  lastChordStep = -1
  recordStatusText.value = 'Sedang Merekam Video 9:16 (28s)...'

  animationFrameId = requestAnimationFrame(runLoop)
}

const stopAnimation = () => {
  isPlaying.value = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  if (isRecording.value && mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

onMounted(() => {
  // Initial frame drawing
  drawFrame(0)
})

onUnmounted(() => {
  stopAnimation()
  if (audioCtx) {
    audioCtx.close().catch(() => {})
  }
})
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
  >
    <div 
      class="bg-app-card border border-theme-border rounded-3xl w-full max-w-xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-slide-up"
    >
      <!-- Header Studio -->
      <div class="px-5 py-3.5 border-b border-app-border flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <Clapperboard class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h2 class="text-sm font-bold text-white leading-none">Trainyy Story Studio</h2>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 leading-none">
                9:16 IG Story
              </span>
            </div>
            <p class="text-[10px] text-app-muted mt-0.5">Generator Video Demo & Narasi Otomatis</p>
          </div>
        </div>

        <button 
          @click="stopAnimation(); emit('close')"
          class="p-1.5 rounded-lg text-app-muted hover:text-white hover:bg-app-surface transition-colors cursor-pointer"
          title="Tutup Studio"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Main Studio Body -->
      <div class="p-4 overflow-y-auto space-y-4 flex flex-col items-center">
        <!-- Canvas Stage Container (9:16 Mobile Mockup) -->
        <div class="relative w-full flex justify-center">
          <canvas
            ref="canvasRef"
            width="720"
            height="1280"
            class="w-[270px] h-[480px] rounded-3xl shadow-2xl border border-indigo-500/30 bg-black select-none"
          ></canvas>

          <!-- Recording Active Badge -->
          <div 
            v-if="isRecording"
            class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-bold shadow-lg animate-pulse"
          >
            <span class="w-2 h-2 rounded-full bg-white"></span>
            <span>Merekam: {{ recordingProgress }}%</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full max-w-xs space-y-1">
          <div class="w-full h-1.5 rounded-full bg-app-surface overflow-hidden">
            <div 
              class="h-full bg-theme-gradient transition-all duration-200"
              :style="{ width: `${recordingProgress}%` }"
            ></div>
          </div>
          <div class="flex justify-between text-[10px] text-app-muted font-mono">
            <span>{{ isPlaying ? `${Math.round((recordingProgress / 100) * totalDuration)}s` : '0s' }}</span>
            <span>{{ recordStatusText || 'Siap Diputar' }}</span>
            <span>28s</span>
          </div>
        </div>

        <!-- Video Player Preview (If already recorded) -->
        <div v-if="recordedVideoUrl" class="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-1.5 font-bold text-emerald-300">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              <span>Video Berhasil Dirender!</span>
            </span>
            <span class="text-[10px] text-emerald-400/80">Format WebM (Instagram Ready)</span>
          </div>

          <div class="flex items-center gap-2">
            <a
              :href="recordedVideoUrl"
              download="Trainyy_IG_Story_Demo.webm"
              class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer shadow-md"
            >
              <Download class="w-4 h-4" />
              <span>Download File Video Lagi</span>
            </a>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="w-full grid grid-cols-2 gap-2.5 max-w-sm">
          <!-- Tombol Putar Pratinjau -->
          <button
            v-if="!isPlaying"
            @click="startPreview"
            class="py-2.5 px-3 rounded-xl bg-app-surface hover:bg-app-card text-white font-semibold text-xs border border-app-border flex items-center justify-center gap-1.5 active-press cursor-pointer"
          >
            <Play class="w-4 h-4 text-theme-light" />
            <span>Putar Pratinjau</span>
          </button>
          <button
            v-else
            @click="stopAnimation"
            class="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/40 flex items-center justify-center gap-1.5 active-press cursor-pointer"
          >
            <Square class="w-4 h-4 fill-current" />
            <span>Hentikan</span>
          </button>

          <!-- Tombol Rekam & Download -->
          <button
            :disabled="isRecording"
            @click="startRecording"
            class="py-2.5 px-3 rounded-xl bg-theme-primary hover:bg-theme-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 active-press cursor-pointer shadow-theme-glow disabled:opacity-50"
          >
            <Video class="w-4 h-4" />
            <span>{{ isRecording ? 'Sedang Merekam...' : 'Rekam Video 9:16' }}</span>
          </button>
        </div>

        <!-- Voice Toggle & Tips -->
        <div class="flex items-center justify-between w-full max-w-sm pt-2 border-t border-app-border/60 text-xs text-app-muted">
          <button 
            @click="isVoiceEnabled = !isVoiceEnabled"
            class="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <Volume2 v-if="isVoiceEnabled" class="w-4 h-4 text-theme-light" />
            <VolumeX v-else class="w-4 h-4 text-rose-400" />
            <span>{{ isVoiceEnabled ? 'Suara Narasi: Aktif' : 'Suara Narasi: Hening' }}</span>
          </button>

          <span class="text-[10px] text-app-dim">Musik BGM Lo-Fi Sintesis Aktif</span>
        </div>
      </div>
    </div>
  </div>
</template>
