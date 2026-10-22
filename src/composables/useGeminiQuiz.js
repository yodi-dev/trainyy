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
   * Generate multiple choice questions from study text
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
    generateProgress.value = 'Mempersiapkan materi dan prompt AI...'

    const apiKey = (customApiKey || getSavedApiKey()).trim()
    if (!apiKey) {
      isGenerating.value = false
      const msg = 'API Key Google Gemini belum diatur. Silakan masukkan di tab Pengaturan.'
      generateError.value = msg
      return { success: false, error: msg }
    }

    try {
      generateProgress.value = `Mengirim materi ke Google Gemini (${count} soal)...`

      const prompt = `Anda adalah seorang pakar pendidikan dan spesialis Active Recall Learning.
Buatlah tepat ${count} soal pilihan ganda berkualitas tinggi berdasarkan materi berikut:

JUDUL MATERI: "${title}"
TINGKAT KESULITAN: "${difficulty}"

KONTEN MATERI:
"""
${text.slice(0, 30000)}
"""

PANDUAN KUALITAS SOAL:
1. Soal harus menguji pemahaman konsep, analisis, dan fakta penting (bukan sekadar menghafal kata demi kata).
2. Sediakan tepat 4 pilihan jawaban yang masuk akal dan relevan.
3. Tentukan satu indeks jawaban yang benar (0 untuk opsi pertama, 1 untuk opsi kedua, 2 untuk opsi ketiga, atau 3 untuk opsi keempat).
4. Buat pembahasan (explanation) yang mendalam: jelaskan mengapa jawaban tersebut benar dan mengapa opsi pengecoh lainnya salah/kurang tepat.
5. Gunakan Bahasa Indonesia yang jelas, ringkas, dan mudah dimengerti.

KEMBALIKAN HANYA ARRAY JSON DENGAN STRUKTUR BERIKUT:
[
  {
    "question": "Teks pertanyaan di sini...",
    "options": ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"],
    "correctIndex": 0,
    "explanation": "Penjelasan detail di sini..."
  }
]`

      // Try gemini-1.5-flash first, fallback to gemini-2.0-flash if needed
      const model = 'gemini-1.5-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3
        }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const errMsg =
          errJson.error?.message || `Error status ${res.status}: Gagal memproses permintaan AI.`
        throw new Error(errMsg)
      }

      generateProgress.value = 'Menganalisis dan memvalidasi format bank soal...'
      const data = await res.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        throw new Error('Respons dari Gemini kosong atau tidak valid.')
      }

      let parsedQuestions = []
      try {
        parsedQuestions = JSON.parse(rawText)
      } catch (jsonErr) {
        // Fallback: extract JSON array using regex if wrapped in markdown
        const match = rawText.match(/\[[\s\S]*\]/)
        if (match) {
          parsedQuestions = JSON.parse(match[0])
        } else {
          throw new Error('Format keluaran AI bukan array JSON yang valid.')
        }
      }

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('AI tidak menghasilkan pertanyaan yang valid.')
      }

      // Sanitize questions
      const sanitized = parsedQuestions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        question: q.question || 'Pertanyaan tanpa teks',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < (q.options?.length || 4) ? q.correctIndex : 0,
        explanation: q.explanation || 'Pembahasan belum tersedia.',
        timesAnswered: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        lastAnsweredAt: null,
        isMastered: false
      }))

      generateProgress.value = `Berhasil membuat ${sanitized.length} soal kuis!`
      return { success: true, questions: sanitized }
    } catch (err) {
      console.error('Gemini generation error:', err)
      const errorMsg = err.message || 'Terjadi kesalahan saat membuat soal AI.'
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
