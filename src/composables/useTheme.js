import { ref, onMounted } from 'vue'

const THEMES = [
  {
    id: 'indigo-dark',
    name: 'Indigo Dark',
    desc: 'Deep Navy & Aksen Electric Indigo',
    colorMeta: '#090d16',
    accentColor: '#6366f1'
  },
  {
    id: 'emerald-dark',
    name: 'Emerald Forest',
    desc: 'Nuansa alam sejuk & Aksen Hijau Zamrud',
    colorMeta: '#041d17',
    accentColor: '#10b981'
  },
  {
    id: 'ocean-dark',
    name: 'Ocean Abyss',
    desc: 'Samudra mendalam & Aksen Biru Langit',
    colorMeta: '#031726',
    accentColor: '#0ea5e9'
  }
]

const currentTheme = ref(localStorage.getItem('trainyy_theme_v1') || 'indigo-dark')

export function useTheme() {
  const applyTheme = (themeId) => {
    currentTheme.value = themeId
    localStorage.setItem('trainyy_theme_v1', themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    document.documentElement.classList.add('dark')

    const selected = THEMES.find((t) => t.id === themeId)
    if (selected) {
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) {
        meta.setAttribute('content', selected.colorMeta)
      }
    }
  }

  onMounted(() => {
    applyTheme(currentTheme.value)
  })

  return {
    themes: THEMES,
    currentTheme,
    applyTheme
  }
}

