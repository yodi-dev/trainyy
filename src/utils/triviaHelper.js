/**
 * Helper untuk menyintesis fakta trivia / kartu active recall
 * Mengubah soal pilihan ganda menjadi pernyataan edukatif yang alami dan informatif.
 */
export function synthesizeTrivia(q) {
  if (!q) return null

  const qText = (q.question || '').trim()
  const options = Array.isArray(q.options) ? q.options : []
  const correctIdx =
    typeof q.correctIndex === 'number' &&
    q.correctIndex >= 0 &&
    q.correctIndex < options.length
      ? q.correctIndex
      : 0
  const correctOpt = (options[correctIdx] || '').trim()
  const exp = (q.explanation || '').trim()

  // 1. Jika sudah ada properti trivia fakta murni (bukan kalimat tanya)
  if (q.trivia && typeof q.trivia === 'string' && q.trivia.trim().length > 10) {
    let cleanT = q.trivia.trim()
    if (!cleanT.includes('?') && !/^(apa|bagaimana|mengapa|siapa|kapan|manakah)\s/i.test(cleanT)) {
      cleanT = cleanT.charAt(0).toUpperCase() + cleanT.slice(1)
      if (!cleanT.endsWith('.')) cleanT += '.'
      return {
        fact: cleanT,
        keyPoint: correctOpt,
        originalQuestion: qText,
        explanation: exp
      }
    }
  }

  // 2. Bersihkan penjelasan dari segala embel-embel kuis / jawaban
  let cleanExp = exp
  // Hapus awalan: "Jawaban yang tepat/benar adalah (Opsi/Pilihan)? [A-D]? (karena|yaitu)?"
  cleanExp = cleanExp.replace(
    /^(jawaban\s+(yang\s+)?(tepat|benar)\s+(adalah|yaitu)?\s*(opsi|pilihan)?\s*[a-d]?\s*(karena|yaitu|:)?\s*)/i,
    ''
  )
  // Hapus awalan: "Opsi/Pilihan [A-D] (benar|tepat) (karena|yaitu)?"
  cleanExp = cleanExp.replace(
    /^(opsi|pilihan)\s*[a-d]\s*(benar|tepat)?\s*(karena|yaitu|:)?\s*/i,
    ''
  )
  // Hapus awalan: "Penjelasan/Pembahasan/Alasan/Catatan/Fakta:"
  cleanExp = cleanExp.replace(
    /^(penjelasan|pembahasan|alasan|catatan|fakta|karena)\s*[:\-–]\s*/i,
    ''
  )
  // Hapus pujian
  cleanExp = cleanExp.replace(
    /^(benar sekali|tepat sekali|hebat|luar biasa)[!.,:\s]+/i,
    ''
  )
  cleanExp = cleanExp.trim()

  // 3. Sintesis deklaratif dari pertanyaan + jawaban benar
  let cleanQ = qText.replace(/\?+$/, '').trim()
  let synthesized = ''

  // Pola 3a: Isian rumpang (... atau ___)
  if (/(\.{2,}|_{2,})/.test(cleanQ)) {
    synthesized = cleanQ.replace(/\s*(\.{2,}|_{2,})\s*/, ` ${correctOpt} `).trim()
  }
  // Pola 3b: "Apa yang dimaksud dengan X" atau "Pengertian dari X"
  else if (/^(?:apa\s+(?:yang\s+dimaksud\s+(?:dengan)?|pengertian\s+(?:dari)?))\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^(?:apa\s+(?:yang\s+dimaksud\s+(?:dengan)?|pengertian\s+(?:dari)?))\s+(.+)$/i)
    const term = m[1].trim()
    const desc = correctOpt.replace(/^(adalah|merupakan|ialah)\s+/i, '').trim()
    synthesized = `${term} adalah ${desc}.`
  }
  // Pola 3c: "Apa fungsi / tujuan / peran / manfaat / dampak / keunggulan dari X"
  else if (/^apa\s+(fungsi|tujuan|peran|manfaat|keunggulan|dampak|ciri|karakteristik)\s+(?:utama\s+)?(?:dari\s+)?(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^apa\s+(fungsi|tujuan|peran|manfaat|keunggulan|dampak|ciri|karakteristik)\s+(?:utama\s+)?(?:dari\s+)?(.+)$/i)
    const aspect = m[1].charAt(0).toUpperCase() + m[1].slice(1)
    const desc = correctOpt.replace(/^(adalah|merupakan|ialah)\s+/i, '').trim()
    synthesized = `${aspect} dari ${m[2].trim()} adalah ${desc}.`
  }
  // Pola 3d: "Mengapa X"
  else if (/^mengapa\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^mengapa\s+(.+)$/i)
    const reason = correctOpt.replace(/^(karena|sebab)\s+/i, '').trim()
    synthesized = `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} karena ${reason}.`
  }
  // Pola 3e: "Siapa / Siapakah X"
  else if (/^siapa(?:kah)?\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^siapa(?:kah)?\s+(.+)$/i)
    synthesized = `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} adalah ${correctOpt}.`
  }
  // Pola 3f: "Kapan X"
  else if (/^kapan\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^kapan\s+(.+)$/i)
    synthesized = `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} berlangsung pada ${correctOpt.replace(/^pada\s+/i, '')}.`
  }
  // Pola 3g: "Di mana / Dimana X"
  else if (/^(?:di\s*mana|dimana)\s+(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^(?:di\s*mana|dimana)\s+(.+)$/i)
    synthesized = `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} bertempat di ${correctOpt.replace(/^di\s+/i, '')}.`
  }
  // Pola 3h: "Manakah yang merupakan / Berikut ini yang..."
  else if (/^(?:manakah|berikut\s+ini)\s+(?:yang\s+(?:merupakan|termasuk|bukan|menjadi)?\s*)?(.+)$/i.test(cleanQ)) {
    const m = cleanQ.match(/^(?:manakah|berikut\s+ini)\s+(?:yang\s+(?:merupakan|termasuk|bukan|menjadi)?\s*)?(.+)$/i)
    synthesized = `${correctOpt} merupakan salah satu ${m[1].trim()}.`
  }
  // Pola 3i: Pertanyaan yang berakhir dengan "adalah / merupakan / disebut"
  else if (/(?:adalah|merupakan|disebut|dinamakan)$/i.test(cleanQ)) {
    synthesized = `${cleanQ} ${correctOpt}.`
  }
  // Pola 3j: Gunakan cleanExp jika informatif dan utuh
  else if (cleanExp.length > 25 && !cleanExp.includes('?') && !/^(opsi|pilihan)\s+[a-d]/i.test(cleanExp)) {
    synthesized = cleanExp
  }
  // Pola 3k: Default kalimat natural dari soal + jawaban
  else {
    synthesized = `${cleanQ}: ${correctOpt}.`
  }

  synthesized = synthesized.trim().replace(/\s{2,}/g, ' ')
  synthesized = synthesized.charAt(0).toUpperCase() + synthesized.slice(1)
  if (!synthesized.endsWith('.')) synthesized += '.'

  return {
    fact: synthesized,
    keyPoint: correctOpt,
    originalQuestion: qText,
    explanation: cleanExp || exp || ''
  }
}
