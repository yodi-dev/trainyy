import { ref, computed } from 'vue'

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '10475823948-6l2qk1g1313g4c8afujo6md17t51th20.apps.googleusercontent.com'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

const BACKUP_FILENAME = 'trainyy-backup.json'
const SHEET_FILENAME = 'Trainyy - Rekap Analitik Belajar'

export function useGoogleDrive() {
  const getInitialToken = () => {
    const saved = localStorage.getItem('trainyy_gdrive_token')
    const expiresAt = parseInt(localStorage.getItem('trainyy_gdrive_token_expires') || '0', 10)
    if (saved && expiresAt > Date.now()) {
      return saved
    }
    return null
  }

  const accessToken = ref(getInitialToken())
  const userProfile = ref(
    JSON.parse(localStorage.getItem('trainyy_gdrive_user') || 'null')
  )
  const lastBackupTime = ref(
    localStorage.getItem('trainyy_gdrive_last_backup') || null
  )
  const linkedSheetId = ref(
    localStorage.getItem('trainyy_linked_sheet_id') || null
  )
  const isLoading = ref(false)
  const statusMessage = ref('')

  const isConnected = computed(() => !!userProfile.value)

  // Request Access Token from Google Identity Services (GIS)
  const requestToken = (promptType = '') => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(
          new Error('Google Identity Services belum termuat. Periksa koneksi internet atau matikan pemblokir iklan (ad blocker).')
        )
        return
      }

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp) => {
            if (resp.error) {
              let errorDetail = resp.error
              if (resp.error === 'access_denied') {
                errorDetail = 'Izin akun Google dibatalkan atau ditolak.'
              } else if (resp.error === 'redirect_uri_mismatch' || resp.error === 'origin_mismatch') {
                errorDetail = `Domain ${window.location.origin} belum diizinkan di Google Cloud Console. Silakan tambahkan URL ini ke Authorized JavaScript Origins.`
              }
              reject(new Error(errorDetail))
              return
            }

            accessToken.value = resp.access_token
            const exp = Date.now() + (resp.expires_in || 3500) * 1000
            localStorage.setItem('trainyy_gdrive_token', resp.access_token)
            localStorage.setItem('trainyy_gdrive_token_expires', String(exp))

            // Fetch user profile info
            try {
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` }
              })
              if (infoRes.ok) {
                const profile = await infoRes.json()
                userProfile.value = {
                  name: profile.name,
                  email: profile.email,
                  picture: profile.picture
                }
                localStorage.setItem('trainyy_gdrive_user', JSON.stringify(userProfile.value))
              }
            } catch (err) {
              console.warn('Gagal memuat profil pengguna Google:', err)
            }

            resolve(resp.access_token)
          }
        })

        tokenClient.requestAccessToken({ prompt: promptType })
      } catch (err) {
        reject(err)
      }
    })
  }

  // Ensure valid token
  const ensureToken = async () => {
    const expiresAt = parseInt(localStorage.getItem('trainyy_gdrive_token_expires') || '0', 10)
    if (accessToken.value && expiresAt > Date.now()) {
      return accessToken.value
    }
    return await requestToken('')
  }

  // Authenticated fetch with automatic token refresh on 401
  const fetchWithAuth = async (url, options = {}, isRetry = false) => {
    let token = await ensureToken().catch(() => null)
    if (!token) {
      token = await requestToken('')
    }

    const headers = new Headers(options.headers || {})
    headers.set('Authorization', `Bearer ${token}`)

    const res = await fetch(url, {
      ...options,
      headers
    })

    if (res.status === 401 && !isRetry) {
      console.warn('Google Access Token kedaluwarsa (401), memperbarui...')
      accessToken.value = null
      localStorage.removeItem('trainyy_gdrive_token')
      localStorage.removeItem('trainyy_gdrive_token_expires')
      token = await requestToken('')
      return fetchWithAuth(url, options, true)
    }

    return res
  }

  // Connect Google Account
  const connect = async () => {
    isLoading.value = true
    statusMessage.value = 'Menghubungkan ke Akun Google...'
    try {
      await requestToken('select_account')
      statusMessage.value = 'Akun Google berhasil terhubung!'
      return { success: true }
    } catch (err) {
      const errMsg = err.message || 'Gagal menghubungkan Akun Google.'
      statusMessage.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      isLoading.value = false
    }
  }

  // Disconnect Google Account
  const disconnect = () => {
    if (accessToken.value && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(accessToken.value, () => {})
      } catch (e) {}
    }
    accessToken.value = null
    userProfile.value = null
    linkedSheetId.value = null
    lastBackupTime.value = null
    localStorage.removeItem('trainyy_gdrive_token')
    localStorage.removeItem('trainyy_gdrive_token_expires')
    localStorage.removeItem('trainyy_gdrive_user')
    localStorage.removeItem('trainyy_linked_sheet_id')
    localStorage.removeItem('trainyy_gdrive_last_backup')
    statusMessage.value = 'Akun Google telah diputuskan.'
  }

  // Find existing backup file on Drive
  const findBackupFileId = async () => {
    const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`)
    const res = await fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
    )
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error?.message || 'Gagal memeriksa file backup di Google Drive.')
    }
    const data = await res.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
    return null
  }

  // Find existing Spreadsheet on Drive
  const findExistingAnalyticsSheet = async () => {
    try {
      const q = encodeURIComponent(
        `name='${SHEET_FILENAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
      )
      const res = await fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=5`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.files && data.files.length > 0) {
          return data.files[0].id
        }
      }
    } catch (e) {
      console.warn('Gagal mencari spreadsheet yang sudah ada di Drive:', e)
    }
    return null
  }

  // Backup Data to Google Drive
  const backup = async (fullData) => {
    isLoading.value = true
    statusMessage.value = 'Menyimpan cadangan ke Google Drive...'
    try {
      const existingFileId = await findBackupFileId()
      const content = JSON.stringify(fullData, null, 2)

      if (existingFileId) {
        const updateRes = await fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: content
          }
        )
        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => ({}))
          throw new Error(errData.error?.message || 'Gagal memperbarui file cadangan di Google Drive.')
        }
      } else {
        const metadata = {
          name: BACKUP_FILENAME,
          mimeType: 'application/json',
          description: 'Trainyy PWA Cloud Backup'
        }

        const boundary = '-------trainyy_boundary_' + Date.now()
        const delimiter = `\r\n--${boundary}\r\n`
        const closeDelimiter = `\r\n--${boundary}--`

        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          content +
          closeDelimiter

        const createRes = await fetchWithAuth(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartBody
          }
        )
        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}))
          throw new Error(errData.error?.message || 'Gagal membuat file cadangan di Google Drive.')
        }
      }

      const nowIso = new Date().toISOString()
      lastBackupTime.value = nowIso
      localStorage.setItem('trainyy_gdrive_last_backup', nowIso)
      statusMessage.value = 'Cadangan data berhasil disimpan ke Google Drive!'
      return { success: true }
    } catch (err) {
      statusMessage.value = `Gagal cadangkan: ${err.message}`
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Restore Data from Google Drive
  const restore = async () => {
    isLoading.value = true
    statusMessage.value = 'Mengambil cadangan dari Google Drive...'
    try {
      const fileId = await findBackupFileId()
      if (!fileId) {
        throw new Error('Tidak ditemukan file cadangan (trainyy-backup.json) di Google Drive Anda.')
      }

      const res = await fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
      )
      if (!res.ok) throw new Error('Gagal mengunduh file cadangan dari Google Drive.')

      const data = await res.json()
      statusMessage.value = 'Cadangan berhasil dipulihkan!'
      return { success: true, data }
    } catch (err) {
      statusMessage.value = `Gagal pulihkan: ${err.message}`
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // List PDF files from Google Drive
  const listDrivePdfs = async () => {
    isLoading.value = true
    statusMessage.value = 'Mencari file PDF di Google Drive...'
    try {
      const q = encodeURIComponent(`mimeType='application/pdf' and trashed=false`)
      const res = await fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,size,modifiedTime)&pageSize=25`
      )
      if (!res.ok) throw new Error('Gagal mengambil daftar PDF dari Google Drive.')

      const data = await res.json()
      return { success: true, files: data.files || [] }
    } catch (err) {
      return { success: false, error: err.message, files: [] }
    } finally {
      isLoading.value = false
    }
  }

  // Download PDF file binary (ArrayBuffer) from Google Drive
  const downloadDrivePdf = async (fileId) => {
    isLoading.value = true
    statusMessage.value = 'Mengunduh materi PDF dari Google Drive...'
    try {
      const res = await fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
      )
      if (!res.ok) throw new Error('Gagal mengunduh konten PDF dari Google Drive.')
      const arrayBuffer = await res.arrayBuffer()
      return { success: true, data: arrayBuffer }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Ensure or Auto-create Analytics Google Spreadsheet
  const ensureAnalyticsSheet = async () => {
    if (linkedSheetId.value) {
      return { success: true, sheetId: linkedSheetId.value }
    }

    isLoading.value = true
    statusMessage.value = 'Menyiapkan buku rapor Google Spreadsheet...'

    try {
      // 1. Cek apakah file sudah pernah ada di Google Drive pengguna
      const existingId = await findExistingAnalyticsSheet()
      if (existingId) {
        linkedSheetId.value = existingId
        localStorage.setItem('trainyy_linked_sheet_id', existingId)
        statusMessage.value = 'Buku rapor belajar berhasil dihubungkan!'
        return { success: true, sheetId: existingId }
      }

      // 2. Jika belum ada, buat via Sheets API
      let newSheetId = null
      try {
        const body = {
          properties: {
            title: SHEET_FILENAME
          },
          sheets: [
            {
              properties: {
                title: 'Rapor Belajar',
                gridProperties: { rowCount: 1000, columnCount: 10 }
              },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: [
                        { userEnteredValue: { stringValue: 'Tanggal & Waktu' } },
                        { userEnteredValue: { stringValue: 'Materi Belajar' } },
                        { userEnteredValue: { stringValue: 'Mode Latihan' } },
                        { userEnteredValue: { stringValue: 'Jumlah Benar' } },
                        { userEnteredValue: { stringValue: 'Total Soal' } },
                        { userEnteredValue: { stringValue: 'Akurasi (%)' } },
                        { userEnteredValue: { stringValue: 'Durasi (Detik)' } },
                        { userEnteredValue: { stringValue: 'Catatan' } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }

        const res = await fetchWithAuth('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (res.ok) {
          const data = await res.json()
          newSheetId = data.spreadsheetId
        }
      } catch (sheetErr) {
        console.warn('Sheets API creation error, trying Drive API fallback:', sheetErr)
      }

      // 3. Fallback jika Sheets API belum aktif: Buat via Google Drive API
      if (!newSheetId) {
        const driveRes = await fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: SHEET_FILENAME,
            mimeType: 'application/vnd.google-apps.spreadsheet'
          })
        })

        if (driveRes.ok) {
          const driveData = await driveRes.json()
          newSheetId = driveData.id

          // Sisipkan baris judul kolom
          try {
            await fetchWithAuth(
              `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  values: [[
                    'Tanggal & Waktu',
                    'Materi Belajar',
                    'Mode Latihan',
                    'Jumlah Benar',
                    'Total Soal',
                    'Akurasi (%)',
                    'Durasi (Detik)',
                    'Catatan'
                  ]]
                })
              }
            )
          } catch (headerErr) {
            console.warn('Gagal menambahkan header ke spreadsheet:', headerErr)
          }
        }
      }

      if (newSheetId) {
        linkedSheetId.value = newSheetId
        localStorage.setItem('trainyy_linked_sheet_id', newSheetId)
        statusMessage.value = 'Buku rapor otomatis siap digunakan!'
        return { success: true, sheetId: newSheetId }
      }

      throw new Error('Tidak dapat membuat Spreadsheet di Google Drive.')
    } catch (err) {
      console.warn('ensureAnalyticsSheet error:', err)
      statusMessage.value = `Gagal menyiapkan rapor: ${err.message}`
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Append Quiz Session to Google Sheets
  const appendQuizToSheet = async (sessionData) => {
    let sheetId = linkedSheetId.value
    if (!sheetId) {
      const sheetInit = await ensureAnalyticsSheet()
      if (sheetInit.success) {
        sheetId = sheetInit.sheetId
      } else {
        return { success: false, error: 'Spreadsheet analitik belum dapat dihubungkan.' }
      }
    }

    try {
      const row = [
        new Date(sessionData.completedAt || Date.now()).toLocaleString('id-ID'),
        sessionData.deckTitle || 'Kuis Kilat',
        sessionData.mode === 'study' ? 'Metode Belajar Cepat' : sessionData.mode === 'remedial' ? 'Latihan Soal Salah' : 'Ujian',
        sessionData.correctCount ?? 0,
        sessionData.totalQuestions ?? 0,
        `${sessionData.scorePercentage ?? 0}%`,
        sessionData.durationSeconds ?? 0,
        (sessionData.wrongQuestionIds && sessionData.wrongQuestionIds.length > 0)
          ? `${sessionData.wrongQuestionIds.length} soal salah`
          : 'Sempurna (Semua Benar)'
      ]

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED`
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [row]
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || 'Gagal menambahkan baris kuis ke Spreadsheet.')
      }
      return { success: true }
    } catch (err) {
      console.warn('Sheets append error:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    accessToken,
    userProfile,
    lastBackupTime,
    linkedSheetId,
    isLoading,
    statusMessage,
    isConnected,
    connect,
    disconnect,
    backup,
    restore,
    listDrivePdfs,
    downloadDrivePdf,
    appendQuizToSheet,
    ensureAnalyticsSheet,
    createAnalyticsSheet: ensureAnalyticsSheet
  }
}
