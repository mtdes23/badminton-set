<template>
  <span
    class="badge"
    :class="`badge-${skill}`"
    :title="info.label"
  >
    <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
      <circle cx="3" cy="3" r="3" :fill="info.color" />
    </svg>
    {{ info.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { SKILL_LEVELS } from '@/stores/index.js'

const props = defineProps({
  skill: { type: String, default: 'medium' }
})

const info = computed(() => SKILL_LEVELS.find(s => s.value === props.skill) || SKILL_LEVELS[1])
</script>
