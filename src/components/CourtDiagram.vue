<template>
  <section class="court-diagram">
    <div class="court-diagram-header">
      <h2 class="section-title">Sơ đồ sân</h2>
      <div class="court-legend">
        <span class="legend-item"><span class="legend-dot active"></span>Đang đấu</span>
        <span class="legend-item"><span class="legend-dot empty"></span>Trống</span>
      </div>
    </div>

    <!-- Waiting bench -->
    <div class="waiting-zone">
      <div class="waiting-label label">
        <span>⏳ Đang chờ</span>
        <span class="waiting-count">{{ waitingIds.length }}</span>
      </div>
      <div
        class="waiting-list"
        @dragover.prevent
        @drop="onDropToWaiting"
      >
        <div
          v-for="pid in waitingIds"
          :key="pid"
          class="waiting-chip"
          :draggable="true"
          @dragstart="startDrag($event, pid)"
          :title="getPlayer(pid)?.name"
        >
          <span class="chip-avatar">{{ getPlayer(pid)?.avatar }}</span>
          <span class="chip-name">{{ getPlayer(pid)?.name }}</span>
          <span class="chip-badge badge" :class="`badge-${getPlayer(pid)?.skill}`">
            {{ skillLabel(getPlayer(pid)?.skill) }}
          </span>
        </div>
        <div v-if="!waitingIds.length" class="waiting-empty muted">
          Tất cả đang đấu 🏸
        </div>
      </div>
    </div>

    <!-- Courts grid -->
    <div class="courts-grid">
      <div
        v-for="court in courts"
        :key="court.id"
        class="court-unit"
        :class="{ 'court-active': court.slots.some(Boolean), 'court-empty': !court.slots.some(Boolean) }"
      >
        <div class="court-header-row">
          <span class="court-label">{{ court.label }}</span>
          <div class="court-status-dot"
            :class="court.slots.some(Boolean) ? 'dot-active' : 'dot-empty'"
          ></div>
          <button
            v-if="court.slots.some(Boolean)"
            class="btn btn-ghost btn-sm court-clear-btn"
            @click="clearCourt(court.id)"
            title="Xóa sân"
            aria-label="Xóa tất cả người chơi khỏi sân"
          >✕ Clear</button>
        </div>

        <!-- Court visual (top-down view) -->
        <div class="court-visual" aria-label="Sân cầu lông">
          <!-- Net line -->
          <div class="court-net" aria-hidden="true"></div>

          <!-- Team A (top) -->
          <div class="team-zone team-a">
            <div
              v-for="slot in [0, 1]"
              :key="slot"
              class="player-slot"
              :class="{ occupied: court.slots[slot] }"
              @dragover.prevent="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop($event, court.id, slot)"
            >
              <template v-if="court.slots[slot]">
                <div class="slot-player">
                  <span class="slot-avatar">{{ getPlayer(court.slots[slot])?.avatar }}</span>
                  <span class="slot-name">{{ getPlayer(court.slots[slot])?.name }}</span>
                  <button
                    class="slot-remove"
                    @click="removeFromCourt(court.id, slot)"
                    aria-label="Gỡ khỏi sân"
                  >×</button>
                </div>
              </template>
              <template v-else>
                <div class="slot-empty">
                  <span class="slot-plus">+</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Team B (bottom) -->
          <div class="team-zone team-b">
            <div
              v-for="slot in [2, 3]"
              :key="slot"
              class="player-slot"
              :class="{ occupied: court.slots[slot] }"
              @dragover.prevent="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop($event, court.id, slot)"
            >
              <template v-if="court.slots[slot]">
                <div class="slot-player">
                  <span class="slot-avatar">{{ getPlayer(court.slots[slot])?.avatar }}</span>
                  <span class="slot-name">{{ getPlayer(court.slots[slot])?.name }}</span>
                  <button
                    class="slot-remove"
                    @click="removeFromCourt(court.id, slot)"
                    aria-label="Gỡ khỏi sân"
                  >×</button>
                </div>
              </template>
              <template v-else>
                <div class="slot-empty">
                  <span class="slot-plus">+</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Auto-suggest button -->
        <button
          v-if="waitingIds.length >= 2 && !court.slots.every(Boolean)"
          class="btn btn-ghost btn-sm auto-suggest-btn"
          @click="autoFillCourt(court)"
          title="Tự động ghép cặp"
        >⚡ Ghép tự động</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore, usePlayerStore, SKILL_LEVELS } from '@/stores/index.js'

const sessionStore = useSessionStore()
const playerStore  = usePlayerStore()

const courts    = computed(() => sessionStore.session?.courts ?? [])
const waitingIds = computed(() => sessionStore.waitingPlayers)

function getPlayer(id) {
  return playerStore.players.find(p => p.id === id)
}
function skillLabel(skill) {
  return SKILL_LEVELS.find(s => s.value === skill)?.label ?? skill
}

let draggingId = null
function startDrag(e, playerId) {
  draggingId = playerId
  e.dataTransfer.setData('playerId', playerId)
  e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(e) {
  e.currentTarget.classList.add('drag-over')
}
function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over')
}
function onDrop(e, courtId, slot) {
  e.currentTarget.classList.remove('drag-over')
  const pid = e.dataTransfer.getData('playerId') || draggingId
  if (!pid) return
  // Remove from any existing slot
  courts.value.forEach(c => {
    c.slots.forEach((s, i) => {
      if (s === pid) sessionStore.removeFromCourt(c.id, i)
    })
  })
  sessionStore.assignPlayerToCourt(courtId, slot, pid)
}
function onDropToWaiting(e) {
  const pid = e.dataTransfer.getData('playerId') || draggingId
  if (!pid) return
  courts.value.forEach(c => {
    c.slots.forEach((s, i) => {
      if (s === pid) sessionStore.removeFromCourt(c.id, i)
    })
  })
}
function removeFromCourt(courtId, slot) {
  sessionStore.removeFromCourt(courtId, slot)
}
function clearCourt(courtId) {
  sessionStore.clearCourt(courtId)
}

// Auto-fill: pick 2 waiting players balanced by skill
function autoFillCourt(court) {
  const waiting = [...waitingIds.value]
  const empties = court.slots
    .map((s, i) => (s ? null : i))
    .filter(i => i !== null)
  if (empties.length < 1 || waiting.length < 1) return

  // Sort by skill score for balanced teams
  const sorted = waiting
    .map(id => ({ id, score: getPlayer(id) ? SKILL_LEVELS.find(s => s.value === getPlayer(id).skill)?.score ?? 1 : 1 }))
    .sort((a, b) => b.score - a.score)

  // Fill empty slots
  const assignments = empties
    .slice(0, Math.min(empties.length, sorted.length))
    .map((slot, idx) => ({ slot, playerId: sorted[idx].id }))

  sessionStore.assignMultiplePlayersToCourt(court.id, assignments)
}
</script>

<style scoped>
.court-diagram { display: flex; flex-direction: column; gap: var(--sp-6); }

.court-diagram-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
}
.section-title {
  font-size: 1.4rem;
  color: var(--c-text);
}
.court-legend {
  display: flex;
  gap: var(--sp-4);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 0.8rem;
  color: var(--c-text-muted);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.active { background: var(--c-lime); }
.legend-dot.empty  { background: var(--c-border-lit); }

/* Waiting zone */
.waiting-zone {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.waiting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.waiting-count {
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  padding: 1px 8px;
  font-family: var(--f-display);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-lime);
}
.waiting-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  min-height: 40px;
  border-radius: var(--r-sm);
  transition: background var(--t-fast);
}
.waiting-list.drag-over { background: rgba(181,255,26,0.05); }
.waiting-chip {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  cursor: grab;
  font-size: 0.82rem;
  transition:
    transform var(--t-fast) var(--ease-sport),
    border-color var(--t-fast);
  animation: scaleIn var(--t-mid) var(--ease-snap) both;
}
.waiting-chip:hover { border-color: var(--c-lime); transform: translateY(-2px); }
.waiting-chip:active { cursor: grabbing; }
.chip-avatar { font-size: 0.75rem; font-weight: 700; color: var(--c-text-muted); }
.chip-name { font-weight: 500; }
.waiting-empty { font-size: 0.85rem; padding: var(--sp-2); }

/* Courts grid */
.courts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4);
}
.court-unit {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  transition: border-color var(--t-mid);
}
.court-unit.court-active {
  border-color: rgba(181,255,26,0.35);
}
.court-header-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.court-label {
  font-family: var(--f-display);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex: 1;
}
.court-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-active {
  background: var(--c-lime);
  animation: pulseLime 2s ease-in-out infinite;
}
.dot-empty { background: var(--c-border-lit); }
.court-clear-btn { margin-left: auto; }

/* Court visual */
.court-visual {
  background: #0f1a0a;
  border: 2px solid #1e3a14;
  border-radius: var(--r-sm);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-height: 200px;
}
.court-net {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
  background: rgba(181,255,26,0.5);
  z-index: 2;
  box-shadow: 0 0 8px rgba(181,255,26,0.3);
}
.court-net::before {
  content: 'NET';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--f-display);
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: #0f1a0a;
  padding: 1px 6px;
  color: rgba(181,255,26,0.6);
}

.team-zone {
  flex: 1;
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3);
  align-items: center;
}
.team-a { border-bottom: 1px solid rgba(181,255,26,0.1); }

.player-slot {
  flex: 1;
  min-height: 72px;
  border: 1px dashed var(--c-border);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color var(--t-fast),
    background var(--t-fast);
  position: relative;
}
.player-slot.drag-over {
  border-color: var(--c-lime);
  background: rgba(181,255,26,0.06);
}
.player-slot.occupied {
  border-style: solid;
  border-color: var(--c-border-lit);
}

.slot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.slot-plus {
  font-size: 1.2rem;
  color: var(--c-text-dim);
}
.slot-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--sp-2);
  width: 100%;
  position: relative;
}
.slot-avatar {
  font-family: var(--f-display);
  font-size: 0.8rem;
  font-weight: 700;
  background: var(--c-surface-2);
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-muted);
}
.slot-name {
  font-size: 0.72rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slot-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255,45,45,0.15);
  color: var(--c-red);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--t-fast);
}
.slot-player:hover .slot-remove { opacity: 1; }

.auto-suggest-btn { align-self: flex-start; }
</style>
