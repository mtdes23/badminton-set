<template>
  <div
    class="player-card"
    :class="[
      `skill-border-${player.skill}`,
      { 'is-selected': selected, 'is-dragging': dragging }
    ]"
    :draggable="draggable"
    @dragstart="onDragStart"
    @dragend="dragging = false"
  >
    <div class="player-avatar">{{ player.avatar }}</div>
    <div class="player-info">
      <div class="player-name">{{ player.name }}</div>
      <SkillBadge :skill="player.skill" />
    </div>
    <div v-if="$slots.actions" class="player-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SkillBadge from './SkillBadge.vue'

const props = defineProps({
  player:   { type: Object, required: true },
  draggable:{ type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})

const emit = defineEmits(['dragstart'])
const dragging = ref(false)

function onDragStart(e) {
  dragging.value = true
  e.dataTransfer.setData('playerId', props.player.id)
  e.dataTransfer.effectAllowed = 'move'
  emit('dragstart', props.player.id)
}
</script>

<style scoped>
.player-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  cursor: default;
  transition:
    transform var(--t-fast) var(--ease-sport),
    border-color var(--t-fast) var(--ease-sport),
    box-shadow var(--t-fast) var(--ease-sport);
  animation: fadeInUp var(--t-slow) var(--ease-sport) both;
}
.player-card[draggable="true"] { cursor: grab; }
.player-card[draggable="true"]:hover {
  transform: translateY(-2px);
  border-color: var(--c-border-lit);
}
.player-card.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: scale(0.97);
}
.player-card.is-selected {
  border-color: var(--c-lime);
  box-shadow: 0 0 0 1px rgba(181,255,26,0.2);
}

/* Skill-colored left border accent */
.skill-border-weak::before   { background: var(--c-skill-weak); }
.skill-border-medium::before { background: var(--c-skill-medium); }
.skill-border-good::before   { background: var(--c-skill-good); }
.skill-border-pro::before    { background: var(--c-skill-pro); }
.player-card::before {
  content: '';
  display: block;
  width: 3px;
  height: 100%;
  border-radius: 3px;
  flex-shrink: 0;
  align-self: stretch;
}

.player-avatar {
  width: 36px;
  height: 36px;
  background: var(--c-surface-2);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--f-display);
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  color: var(--c-text-muted);
  letter-spacing: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.player-name {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}
</style>
