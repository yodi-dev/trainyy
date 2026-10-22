import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * Extracts all plain text from a PDF File or ArrayBuffer
 * @param {File | ArrayBuffer} source
 * @param {(progress: { current: number, total: number }) => void} [onProgress]
 * @returns {Promise<{ text: string, numPages: number }>}
 */
export async function extractTextFromPdf(source, onProgress) {
  let data
  if (source instanceof ArrayBuffer) {
    data = source
  } else if (source instanceof Blob) {
    data = await source.arrayBuffer()
  } else {
    throw new Error('Format sumber PDF tidak valid.')
  }

  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const fullTextParts = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    
    fullTextParts.push(`--- Halaman ${i} ---\n${pageText}`)
    
    if (onProgress) {
      onProgress({ current: i, total: numPages })
    }
  }

  return {
    text: fullTextParts.join('\n\n'),
    numPages
  }
}
