import Dexie from 'dexie'

export class TrainyyDatabase extends Dexie {
  constructor() {
    super('TrainyyDB')
    
    this.version(1).stores({
      decks: 'id, title, category, sourceType, createdAt, updatedAt',
      questions: 'id, deckId, isMastered, timesIncorrect, timesAnswered, lastAnsweredAt',
      sessions: 'id, deckId, mode, completedAt, scorePercentage',
      settings: 'key'
    })
  }
}

export const db = new TrainyyDatabase()

// Helper: Seed demo deck if database is empty or ensure demo questions have rich trivia
export async function seedDemoDataIfEmpty() {
  const deckCount = await db.decks.count()
  const demoDeckId = 'deck_demo_active_recall'
  const now = Date.now()

  const demoQuestions = [
    {
      id: 'q_demo_1',
      deckId: demoDeckId,
      question: 'Mengapa "Active Recall" (mengingat aktif melalui kuis) jauh lebih efektif dibanding "Passive Reading" (membaca ulang)?',
      options: [
        'Karena otak dipaksa merekonstruksi jalur saraf memori sehingga jejak ingatan menguat',
        'Karena kuis membuat kita menghafal urutan pilihan A, B, C, D tanpa memahami konteks',
        'Karena membaca ulang memerlukan lebih banyak energi dan waktu',
        'Karena membaca catatan tidak melibatkan retina mata secara optimal'
      ],
      correctIndex: 0,
      explanation: 'Active recall merangsang penguatan sinapsis otak melalui efek pemanggilan kembali (retrieval effect). Otak dipaksa bekerja aktif, berbeda dengan membaca pasif yang sering menimbulkan ilusi pemahaman (illusion of competence).',
      trivia: 'Otak manusia memperkuat jalur sinapsis saat dipaksa memanggil kembali ingatan (retrieval practice), bukan saat membaca ulang materi catatan secara pasif.',
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastAnsweredAt: null,
      isMastered: false
    },
    {
      id: 'q_demo_2',
      deckId: demoDeckId,
      question: 'Apa yang dimaksud dengan "Testing Effect" dalam psikologi kognitif?',
      options: [
        'Kecemasan yang muncul ketika menghadapi ujian formal',
        'Peningkatan retensi memori jangka panjang yang terjadi akibat sering diuji',
        'Penurunan fokus belajar setelah mengerjakan soal lebih dari 15 menit',
        'Kemampuan menebak jawaban benar berdasarkan intuisi semata'
      ],
      correctIndex: 1,
      explanation: 'Testing Effect membuktikan bahwa proses mengerjakan tes/kuis sendiri merupakan alat pembelajaran yang sangat kuat, bukan sekadar alat ukur evaluasi akhir.',
      trivia: 'Riset kognitif modern membuktikan bahwa mengerjakan kuis (Testing Effect) melatih retensi ingatan jangka panjang hingga 50% lebih kuat dibanding sekadar membaca materi berulang kali.',
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastAnsweredAt: null,
      isMastered: false
    },
    {
      id: 'q_demo_3',
      deckId: demoDeckId,
      question: 'Berapa jumlah soal ideal per sesi dalam micro-learning Trainyy agar fokus tetap optimal?',
      options: [
        '50 soal agar mencakup seluruh bab',
        '10 soal untuk sesi cepat 3-5 menit tanpa membebani kognitif',
        '1 soal saja setiap kali membuka aplikasi',
        '100 soal marathon setiap akhir pekan'
      ],
      correctIndex: 1,
      explanation: '10 soal adalah titik manis (sweet spot) micro-learning: cukup menantang untuk menguji konsep inti, namun cukup singkat untuk diselesaikan di sela waktu luang (misal saat antre atau di kendaraan).',
      trivia: 'Sesi belajar 10 soal (micro-learning 3-5 menit) menjaga atensi otak pada kondisi puncak dan mencegah kelelahan kognitif (cognitive overload).',
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastAnsweredAt: null,
      isMastered: false
    },
    {
      id: 'q_demo_4',
      deckId: demoDeckId,
      question: 'Kapan waktu terbaik untuk meninjau kembali soal yang salah (Remedial)?',
      options: [
        'Diabaikan saja karena yang penting sudah mencoba',
        'Segera setelah salah dan diulang secara berkala (Spaced Repetition)',
        'Tahun depan menjelang ujian akhir',
        'Hanya jika skor kuis di bawah 50'
      ],
      correctIndex: 1,
      explanation: 'Kesalahan adalah momen emas belajar (hypercorrection effect). Mengetahui jawaban benar saat itu juga dan mengulangnya secara berkala mengoreksi miskonsepsi secara permanen.',
      trivia: 'Fenomena psikologi "Hypercorrection Effect" membuktikan kita akan mengingat suatu fakta jauh lebih kokoh jika pernah salah menebak lalu segera mengetahui jawaban yang benar.',
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastAnsweredAt: null,
      isMastered: false
    },
    {
      id: 'q_demo_5',
      deckId: demoDeckId,
      question: 'Apa keunggulan PWA (Progressive Web App) offline-ready untuk aplikasi belajar Trainyy?',
      options: [
        'Memerlukan izin root pada sistem operasi Android',
        'Bisa dipasang di Home Screen dan tetap dapat latihan kuis saat tidak ada internet',
        'Harus diunduh dengan ukuran ratusan megabyte dari App Store',
        'Hanya bisa dijalankan di komputer desktop bertenaga tinggi'
      ],
      correctIndex: 1,
      explanation: 'Dengan teknologi PWA dan Service Worker, Trainyy terpasang ringan di ponsel dan aset serta materi kuis lokal dapat diakses seketika tanpa koneksi internet (100% offline-ready).',
      trivia: 'Aplikasi PWA menyimpan materi kuis secara mandiri di memori lokal ponsel, memungkinkan latihan active recall kapan saja di mana saja bahkan saat mode pesawat.',
      timesAnswered: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastAnsweredAt: null,
      isMastered: false
    }
  ]

  if (deckCount === 0) {
    await db.decks.add({
      id: demoDeckId,
      title: 'Fondasi Active Recall & Testing Effect',
      description: 'Konsep dasar mengapa belajar dengan kuis pilihan ganda jauh lebih efektif daripada sekadar membaca materi berulang-ulang.',
      category: 'Metode Belajar',
      sourceType: 'text',
      sourceName: 'Panduan Memori Trainyy',
      totalQuestions: 10,
      createdAt: now,
      updatedAt: now
    })

    await db.questions.bulkAdd(demoQuestions)
  } else {
    // Sinkronisasi data demo agar properti trivia terisi jika belum ada
    for (const dq of demoQuestions) {
      const existing = await db.questions.get(dq.id)
      if (existing && !existing.trivia) {
        await db.questions.update(dq.id, { trivia: dq.trivia })
      }
    }
  }
}

