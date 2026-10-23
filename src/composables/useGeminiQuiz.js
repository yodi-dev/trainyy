import { ref } from 'vue'

export function useGeminiQuiz() {
  const isGenerating = ref(false)
  const generateError = ref(null)
  const generateProgress = ref('')

  const getSavedApiKey = () => {
    return (
      localStorage.getItem('trainyy_gemini_api_key') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    )
  }

  const saveApiKey = (key) => {
    localStorage.setItem('trainyy_gemini_api_key', key.trim())
  }

  /**
   * Helper pembersih penjelasan agar tidak memuji atau kontradiktif saat dibaca pengguna yang salah
   */
  const cleanExplanationText = (text) => {
    if (!text || typeof text !== 'string') return 'Penjelasan belum tersedia.'
    let cleaned = text.trim()
    // Hapus awalan pujian yang sering digenerate oleh AI
    cleaned = cleaned.replace(/^(benar sekali|tepat sekali|jawaban anda benar|jawaban kamu tepat|tepat|benar|hebat|luar biasa)[!.,:\s]+/i, '')
    // Jadikan huruf pertama kapital jika perlu
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
    return cleaned
  }

  /**
   * Helper pembersih teks trivia agar berupa fakta informasi murni (bukan pertanyaan)
   */
  const cleanTriviaText = (text) => {
    if (!text || typeof text !== 'string') return null
    let cleaned = text.trim()
    // Ganti tanda tanya di akhir jika ada
    cleaned = cleaned.replace(/\?+$/, '.')
    // Buang awalan meta seperti "Tahukah kamu:", "Trivia:", dsb.
    cleaned = cleaned.replace(/^(tahukah\s+kamu(\s+bahwa|\s+kalau)?\s*[:,]?\s*)/i, '')
    cleaned = cleaned.replace(/^(trivia|fakta)\s*[:,]?\s*/i, '')
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      if (!cleaned.endsWith('.')) cleaned += '.'
    }
    return cleaned || null
  }

  /**
   * Helper penentu correctIndex yang tangguh (mendukung angka, string numerik, maupun huruf A-D)
   */
  const parseCorrectIndex = (q) => {
    const optionsLen = Array.isArray(q.options) ? q.options.length : 4

    // 1. Cek properti correctIndex
    if (typeof q.correctIndex === 'number' && !isNaN(q.correctIndex)) {
      const idx = Math.floor(q.correctIndex)
      if (idx >= 0 && idx < optionsLen) return idx
    }

    if (typeof q.correctIndex === 'string') {
      const trimmed = q.correctIndex.trim().toUpperCase()
      if (['A', 'B', 'C', 'D'].includes(trimmed)) {
        const idx = ['A', 'B', 'C', 'D'].indexOf(trimmed)
        if (idx < optionsLen) return idx
      }
      const num = parseInt(trimmed, 10)
      if (!isNaN(num) && num >= 0 && num < optionsLen) return num
    }

    // 2. Cek properti correct_index atau answer
    const alt = q.correct_index ?? q.answer ?? q.correctAnswer
    if (typeof alt === 'number' && !isNaN(alt)) {
      const idx = Math.floor(alt)
      if (idx >= 0 && idx < optionsLen) return idx
    }
    if (typeof alt === 'string') {
      const trimmed = alt.trim().toUpperCase()
      if (['A', 'B', 'C', 'D'].includes(trimmed)) {
        const idx = ['A', 'B', 'C', 'D'].indexOf(trimmed)
        if (idx < optionsLen) return idx
      }
      const num = parseInt(trimmed, 10)
      if (!isNaN(num) && num >= 0 && num < optionsLen) return num

      // Cek apakah alt persis sama dengan salah satu teks pilihan di options
      if (Array.isArray(q.options)) {
        const found = q.options.findIndex(
          (opt) => opt.trim().toLowerCase() === alt.trim().toLowerCase()
        )
        if (found !== -1) return found
      }
    }

    // Default aman jika AI gagal menentukan
    return 0
  }

  /**
   * Buat soal pilihan ganda dari teks materi secara otomatis
   */
  const generateQuestionsFromText = async ({
    text,
    title,
    count = 10,
    difficulty = 'medium',
    customApiKey = null
  }) => {
    isGenerating.value = true
    generateError.value = null
    generateProgress.value = 'Membaca dan memahami isi materi...'

    const apiKey = (customApiKey || getSavedApiKey()).trim()
    if (!apiKey) {
      isGenerating.value = false
      const msg = 'Kunci AI belum diatur. Silakan atur di menu Pengaturan.'
      generateError.value = msg
      return { success: false, error: msg }
    }

    try {
      generateProgress.value = `Menyusun ${count} pertanyaan kuis berkualitas...`

      const prompt = `Anda adalah seorang pembuat kuis edukasi profesional.
Tugas Anda adalah membuat tepat ${count} soal kuis pilihan ganda yang akurat dan berbobot berdasarkan materi berikut:

JUDUL MATERI: "${title}"
TINGKAT KESULITAN: "${difficulty === 'easy' ? 'Dasar' : difficulty === 'hard' ? 'Mendalam/Analitis' : 'Standar'}"

ISI MATERI:
"""
${text.slice(0, 30000)}
"""

ATURAN WAJIB PEMBUATAN SOAL:
1. Soal harus menguji pemahaman konsep esensial, bukan sekadar hafalan nomor halaman.
2. Setiap soal memiliki tepat 4 opsi jawaban yang jelas dan masuk akal.
3. correctIndex HARUS berupa ANGKA INTEGER 0, 1, 2, atau 3 (0 untuk opsi index 0, 1 untuk index 1, 2 untuk index 2, 3 untuk index 3). Pastikan correctIndex BENAR-BENAR menunjuk ke opsi yang paling tepat dalam array options!
4. ATURAN PENJELASAN (explanation):
   - Jelaskan alasan konsep mengapa opsi yang dipilih benar dan ringkas fakta intinya.
   - DILARANG KERAS menggunakan kata pujian atau pembuka seperti "Benar sekali!", "Tepat sekali!", "Jawaban Anda benar", "Hebat!", dsb.
   - Penjelasan harus berbunyi netral dan edukatif (contoh: "Jawaban yang tepat adalah [X] karena [fakta konsep]..."), karena penjelasan ini akan dibaca baik oleh siswa yang menjawab benar maupun siswa yang menjawab salah!
5. ATURAN FAKTA KILAT TRIVIA (trivia):
   - Wajib sertakan 1-2 kalimat fakta pengetahuan / wawasan edukatif yang berdiri sendiri (standalone) tentang konsep ini.
   - Ditulis dengan gaya wawasan ensiklopedia edukatif yang menarik dan menyenangkan dibaca (gaya "Tahukah Kamu?").
   - DILARANG KERAS menggunakan kalimat tanya (jangan gunakan tanda tanya ? atau kata tanya 'Apa/Mengapa/Bagaimana').
   - DILARANG menyebut kata 'soal', 'pertanyaan', 'jawaban', 'pilihan A/B/C/D', atau 'opsi'. Murni tuliskan informasi atau fakta pengetahuan konsepnya.
6. Gunakan Bahasa Indonesia yang luwes, jelas, dan ramah orang awam.

KEMBALIKAN HANYA ARRAY JSON DENGAN STRUKTUR BERIKUT (TANPA MARKDOWN CODEBLOCK LAIN):
[
  {
    "question": "Teks pertanyaan di sini...",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "correctIndex": 0,
    "explanation": "Jawaban yang tepat adalah Pilihan A karena...",
    "trivia": "Satu atau dua kalimat fakta informasi mandiri yang menarik tentang konsep materi ini..."
  }
]`

      const candidateModels = [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-1.5-flash'
      ]

      let lastError = null
      let rawText = null

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
          const payload = {
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.2
            }
          }

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (res.ok) {
            const data = await res.json()
            rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (rawText) break
          } else {
            const errJson = await res.json().catch(() => ({}))
            lastError = errJson.error?.message || `HTTP ${res.status}`
            console.warn(`Model ${model} gagal, mencoba model berikutnya:`, lastError)
          }
        } catch (fetchErr) {
          lastError = fetchErr.message
        }
      }

      if (!rawText) {
        throw new Error(lastError || 'AI belum dapat menyusun soal dari materi ini. Coba periksa teks materi.')
      }

      let parsedQuestions = []
      try {
        parsedQuestions = JSON.parse(rawText)
      } catch (jsonErr) {
        const match = rawText.match(/\[[\s\S]*\]/)
        if (match) {
          parsedQuestions = JSON.parse(match[0])
        } else {
          throw new Error('Format pertanyaan dari AI tidak terbaca dengan benar.')
        }
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('Materi belum menghasilkan pertanyaan yang cukup.')
      }

      // Format pertanyaan yang aman & tangguh
      const sanitized = parsedQuestions.map((q, idx) => {
        const validOptions = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A', 'B', 'C', 'D']
        const correctIdx = parseCorrectIndex({ ...q, options: validOptions })

        return {
          id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          question: q.question || 'Pertanyaan',
          options: validOptions,
          correctIndex: correctIdx,
          explanation: cleanExplanationText(q.explanation),
          trivia: cleanTriviaText(q.trivia),
          timesAnswered: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
          lastAnsweredAt: null,
          isMastered: false
        }
      })

      generateProgress.value = `Selesai! ${sanitized.length} soal kuis siap dimainkan.`
      return { success: true, questions: sanitized }
    } catch (err) {
      console.error('Quiz generation error:', err)
      const errorMsg = err.message || 'Terjadi kendala saat menyusun soal kuis.'
      generateError.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    generateError,
    generateProgress,
    getSavedApiKey,
    saveApiKey,
    generateQuestionsFromText
  }
}
