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

      const prompt = `Anda adalah seorang guru dan mentor belajar yang ramah dan handal.
Tugas Anda adalah membuat tepat ${count} soal kuis pilihan ganda yang bermutu tinggi berdasarkan materi berikut:

JUDUL MATERI: "${title}"
TINGKAT KESULITAN: "${difficulty === 'easy' ? 'Dasar' : difficulty === 'hard' ? 'Mendalam/Analitis' : 'Standar'}"

ISI MATERI:
"""
${text.slice(0, 30000)}
"""

PETUNJUK PEMBUATAN SOAL:
1. Fokus pada pemahaman konsep inti dan penerapan penting, bukan sekadar tebak kata.
2. Sediakan tepat 4 pilihan jawaban yang masuk akal.
3. Tentukan 1 indeks jawaban yang benar (0 untuk opsi pertama, 1 untuk opsi kedua, 2 untuk opsi ketiga, atau 3 untuk opsi keempat).
4. Buat penjelasan yang jelas dan mendidik: mengapa jawaban tersebut benar dan mengapa pilihan lainnya kurang tepat.
5. Gunakan Bahasa Indonesia yang luwes, jelas, dan mudah dipahami oleh orang awam.

KEMBALIKAN HANYA ARRAY JSON DENGAN STRUKTUR BERIKUT:
[
  {
    "question": "Teks pertanyaan di sini...",
    "options": ["Pilihan 1", "Pilihan 2", "Pilihan 3", "Pilihan 4"],
    "correctIndex": 0,
    "explanation": "Penjelasan ramah mengapa jawaban ini tepat..."
  }
]`

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
          errJson.error?.message || `Koneksi ke AI bermasalah (Status ${res.status}). Coba periksa koneksi internet.`
        throw new Error(errMsg)
      }

      generateProgress.value = 'Merapikan format pertanyaan kuis...'
      const data = await res.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!rawText) {
        throw new Error('AI belum dapat menyusun soal dari materi ini. Coba periksa teks materi.')
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

      // Format pertanyaan yang aman
      const sanitized = parsedQuestions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        question: q.question || 'Pertanyaan',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < (q.options?.length || 4) ? q.correctIndex : 0,
        explanation: q.explanation || 'Penjelasan belum tersedia.',
        timesAnswered: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        lastAnsweredAt: null,
        isMastered: false
      }))

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
