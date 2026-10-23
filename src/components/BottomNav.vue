<script setup>
import { 
  Home, 
  Lightbulb,
  BookOpen, 
  Target 
} from '@lucide/vue'

const props = defineProps({
  currentTab: {
    type: String,
    required: true
  },
  remedialCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:tab'])

const tabs = [
  { id: 'decks', label: 'Materi', icon: BookOpen },
  { id: 'home', label: 'Beranda', icon: Home },
  { id: 'trivia', label: 'Trivia', icon: Lightbulb },
  { id: 'remedial', label: 'Soal Salah', icon: Target, badge: true }
]
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-30 bg-app-surface/90 backdrop-blur-md border-t border-app-border safe-bottom px-2 pt-2"
    aria-label="Navigasi Utama"
  >
    <div class="max-w-md mx-auto grid grid-cols-4 items-center">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        @click="emit('update:tab', tab.id)"
        class="relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 active-press cursor-pointer"
        :class="[
          currentTab === tab.id
            ? 'text-white font-medium'
            : 'text-app-dim hover:text-app-muted'
        ]"
      >
        <!-- Active Pill Background Indicator -->
        <div
          v-if="currentTab === tab.id"
          class="absolute -top-1.5 w-8 h-1 rounded-full bg-theme-gradient shadow-sm shadow-theme-glow"
        ></div>

        <div class="relative">
          <component
            :is="tab.icon"
            class="w-5 h-5 transition-transform duration-200"
            :class="{ 'scale-110 text-theme-light': currentTab === tab.id }"
          />

          <!-- Remedial Badge Counter -->
          <span
            v-if="tab.badge && remedialCount > 0"
            class="absolute -top-1 -right-2.5 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-4 text-center shadow-xs leading-none"
          >
            {{ remedialCount > 99 ? '99+' : remedialCount }}
          </span>
        </div>

        <span class="text-[11px] mt-1 tracking-tight truncate max-w-full text-center">
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>
