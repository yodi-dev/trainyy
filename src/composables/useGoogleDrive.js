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

export function useGoogleDrive() {
  const accessToken = ref(sessionStorage.getItem('trainyy_gdrive_token') || null)
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
  const requestToken = () => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        reject(
          new Error('Google Identity Services belum termuat. Periksa koneksi internet.')
        )
        return
      }

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp) => {
            if (resp.error) {
              reject(new Error(resp.error))
              return
            }
            accessToken.value = resp.access_token
            sessionStorage.setItem('trainyy_gdrive_token', resp.access_token)

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

        tokenClient.requestAccessToken({ prompt: '' })
      } catch (err) {
        reject(err)
      }
    })
  }

  // Ensure valid token
  const ensureToken = async () => {
    if (accessToken.value) return accessToken.value
    return await requestToken()
  }

  // Connect Google Account
  const connect = async () => {
    isLoading.value = true
    statusMessage.value = 'Menghubungkan ke Akun Google...'
    try {
      await requestToken()
      statusMessage.value = 'Akun Google berhasil terhubung!'
      return { success: true }
    } catch (err) {
      statusMessage.value = `Gagal menghubungkan: ${err.message}`
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Disconnect Google Account
  const disconnect = () => {
    if (accessToken.value && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken.value, () => {})
    }
    accessToken.value = null
    userProfile.value = null
    sessionStorage.removeItem('trainyy_gdrive_token')
    localStorage.removeItem('trainyy_gdrive_user')
    statusMessage.value = 'Akun Google telah diputuskan.'
  }

  // Authenticated fetch with automatic token refresh on 401
  const fetchWithAuth = async (url, options = {}, isRetry = false) => {
    let token = accessToken.value
    if (!token) {
      token = await requestToken()
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
      sessionStorage.removeItem('trainyy_gdrive_token')
      await requestToken()
      return fetchWithAuth(url, options, true)
    }

    return res
  }

  // Find existing backup file on Drive
  const findBackupFileId = async () => {
    const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`)
    const res = await fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`
    )
    if (!res.ok) {
      throw new Error('Gagal memeriksa file backup di Google Drive.')
    }
    const data = await res.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
    return null
  }

  // Backup Data to Google Drive
  const backup = async (fullData) => {
    isLoading.value = true
    statusMessage.value = 'Mengunggah cadangan ke Google Drive...'
    try {
      const existingFileId = await findBackupFileId()
      const content = JSON.stringify(fullData, null, 2)

      if (existingFileId) {
        // Update existing file
        const updateRes = await fetchWithAuth(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: content
          }
        )
        if (!updateRes.ok) throw new Error('Gagal memperbarui file cadangan di Google Drive.')
      } else {
        // Create new file
        const metadata = {
          name: BACKUP_FILENAME,
          mimeType: 'application/json',
          description: 'Trainyy PWA Cloud Backup by Yodi'
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
        if (!createRes.ok) throw new Error('Gagal membuat file cadangan di Google Drive.')
      }

      const nowIso = new Date().toISOString()
      lastBackupTime.value = nowIso
      localStorage.setItem('trainyy_gdrive_last_backup', nowIso)
      statusMessage.value = 'Cadangan berhasil disimpan ke Google Drive!'
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
      statusMessage.value = 'Cadangan berhasil dipulihkan dari Google Drive!'
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

  // Append Quiz Session to Google Sheets
  const appendQuizToSheet = async (sessionData) => {
    let sheetId = linkedSheetId.value
    if (!sheetId) return { success: false, error: 'Spreadsheet analitik belum dihubungkan.' }

    try {
      const row = [
        new Date(sessionData.completedAt).toLocaleString('id-ID'),
        sessionData.deckTitle,
        sessionData.mode,
        sessionData.correctCount,
        sessionData.totalQuestions,
        `${sessionData.scorePercentage}%`,
        sessionData.durationSeconds,
        (sessionData.wrongQuestions || []).join('; ')
      ]

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [row]
        })
      })

      if (!res.ok) throw new Error('Gagal mencatat baris sesi ke Google Sheets.')
      return { success: true }
    } catch (err) {
      console.warn('Sheets append error:', err)
      return { success: false, error: err.message }
    }
  }

  // Create New Analytics Spreadsheet in Google Drive
  const createAnalyticsSheet = async () => {
    isLoading.value = true
    statusMessage.value = 'Membuat Google Spreadsheet Analitik baru...'
    try {
      const body = {
        properties: {
          title: 'Trainyy - Rekap Analitik Belajar'
        },
        sheets: [
          {
            properties: {
              title: 'Sheet1',
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
                      { userEnteredValue: { stringValue: 'Materi / Deck' } },
                      { userEnteredValue: { stringValue: 'Mode' } },
                      { userEnteredValue: { stringValue: 'Jumlah Benar' } },
                      { userEnteredValue: { stringValue: 'Total Soal' } },
                      { userEnteredValue: { stringValue: 'Akurasi' } },
                      { userEnteredValue: { stringValue: 'Durasi (Detik)' } },
                      { userEnteredValue: { stringValue: 'Catatan Soal Salah' } }
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

      if (!res.ok) throw new Error('Gagal membuat Spreadsheet baru.')
      const data = await res.json()
      linkedSheetId.value = data.spreadsheetId
      localStorage.setItem('trainyy_linked_sheet_id', data.spreadsheetId)
      statusMessage.value = 'Spreadsheet analitik berhasil dibuat!'
      return { success: true, sheetId: data.spreadsheetId, url: data.spreadsheetUrl }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
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
    createAnalyticsSheet
  }
}
