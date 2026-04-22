<template>
  <section class="attendance-panel">
    <div class="panel-header">
      <h2 class="section-title">Điểm danh</h2>
      <div class="panel-stats">
        <div class="stat-chip stat-confirmed">
          <span class="stat-chip-num">{{ confirmedCount }}</span>
          <span class="stat-chip-label">Có mặt</span>
        </div>
        <div class="stat-chip stat-absent">
          <span class="stat-chip-num">{{ absentCount }}</span>
          <span class="stat-chip-label">Vắng</span>
        </div>
        <div class="stat-chip stat-total">
          <span class="stat-chip-num">{{ totalRegistered }}</span>
          <span class="stat-chip-label">Tổng</span>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar" role="progressbar"
      :aria-valuenow="confirmedCount"
      :aria-valuemax="session?.maxPlayers ?? 20"
      :aria-label="`${confirmedCount} / ${session?.maxPlayers} người`"
    >
      <div
        class="progress-fill"
        :style="{ width: progressPct + '%' }"
        :class="{ 'progress-full': confirmedCount >= (session?.maxPlayers ?? 20) }"
      ></div>
      <span class="progress-label">{{ confirmedCount }} / {{ session?.maxPlayers ?? 20 }}</span>
    </div>

    <!-- Player rows -->
    <div class="attendee-list">
      <div
        v-for="player in allPlayers"
        :key="player.id"
        class="attendee-row"
        :class="statusClass(player.id)"
      >
        <div class="ar-avatar">{{ player.avatar }}</div>
        <div class="ar-info">
          <div class="ar-name">{{ player.name }}</div>
          <SkillBadge :skill="player.skill" />
        </div>
        <div class="ar-actions">
          <button
            class="btn btn-sm ar-btn"
            :class="getStatus(player.id) === 'confirmed' ? 'btn-primary' : 'btn-ghost'"
            @click="setStatus(player.id, 'confirmed')"
            :aria-label="`${player.name} xác nhận có mặt`"
            title="Có mặt"
          >✓</button>
          <button
            class="btn btn-sm ar-btn btn-absent"
            :class="getStatus(player.id) === 'absent' ? 'active-absent' : 'btn-ghost'"
            @click="setStatus(player.id, 'absent')"
            :aria-label="`${player.name} báo vắng`"
            title="Vắng mặt"
          >✗</button>
        </div>
      </div>
    </div>

    <!-- Add guest -->
    <div class="guest-zone">
      <div class="label">Thêm khách / người đi nhờ</div>
      <div class="guest-form">
        <input
          v-model="guestName"
          type="text"
          placeholder="Tên khách..."
          @keydown.enter="addGuest"
          aria-label="Tên khách mời"
        />
        <select v-model="guestSkill" aria-label="Trình độ khách">
          <option v-for="lvl in SKILL_LEVELS" :key="lvl.value" :value="lvl.value">
            {{ lvl.label }}
          </option>
        </select>
        <button class="btn btn-primary" @click="addGuest" :disabled="!guestName.trim()">
          + Thêm
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import SkillBadge from './SkillBadge.vue'
import { useSessionStore, usePlayerStore, SKILL_LEVELS } from '@/stores/index.js'

const sessionStore = useSessionStore()
const playerStore  = usePlayerStore()

const session       = computed(() => sessionStore.session)
const confirmedCount = computed(() => sessionStore.confirmedCount)
const absentCount    = computed(() =>
  session.value?.attendees.filter(a => a.status === 'absent').length ?? 0
)
const totalRegistered = computed(() => session.value?.attendees.length ?? 0)

const progressPct = computed(() => {
  const max = session.value?.maxPlayers ?? 20
  return Math.min(100, Math.round((confirmedCount.value / max) * 100))
})

const allPlayers = computed(() => playerStore.players)

function getStatus(playerId) {
  return session.value?.attendees.find(a => a.playerId === playerId)?.status ?? null
}

function statusClass(playerId) {
  const s = getStatus(playerId)
  if (s === 'confirmed') return 'row-confirmed'
  if (s === 'absent')    return 'row-absent'
  return ''
}

function setStatus(playerId, status) {
  sessionStore.setAttendance(playerId, status)
}

// Guest
const guestName  = ref('')
const guestSkill = ref('medium')

async function addGuest() {
  const name = guestName.value.trim()
  if (!name) return
  // addPlayer returns the Firestore DocumentRef — grab ID from it
  const ref = await playerStore.addPlayer({ name, skill: guestSkill.value })
  if (ref?.id) {
    await sessionStore.setAttendance(ref.id, 'confirmed')
  }
  guestName.value = ''
}
</script>

<style scoped>
.attendance-panel { display: flex; flex-direction: column; gap: var(--sp-5); }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-4);
}
.section-title { font-size: 1.4rem; }

.panel-stats {
  display: flex;
  gap: var(--sp-3);
}
.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-2) var(--sp-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  min-width: 52px;
}
.stat-chip-num {
  font-family: var(--f-display);
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  animation: numberRoll var(--t-mid) var(--ease-snap);
}
.stat-chip-label {
  font-size: 0.65rem;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.stat-confirmed .stat-chip-num { color: var(--c-lime); }
.stat-absent    .stat-chip-num { color: var(--c-red); }
.stat-total     .stat-chip-num { color: var(--c-text); }

/* Progress */
.progress-bar {
  background: var(--c-surface-2);
  border-radius: var(--r-sm);
  height: 6px;
  position: relative;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--c-lime);
  border-radius: var(--r-sm);
  transition: width var(--t-slow) var(--ease-sport);
}
.progress-fill.progress-full { background: var(--c-orange); }
.progress-label {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 0.7rem;
  color: var(--c-text-muted);
}

/* Attendee list */
.attendee-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.attendee-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  transition:
    border-color var(--t-fast),
    background var(--t-fast);
  animation: fadeInUp var(--t-slow) var(--ease-sport) both;
}
.row-confirmed {
  border-color: rgba(181,255,26,0.3);
  background: rgba(181,255,26,0.04);
}
.row-absent {
  border-color: rgba(255,45,45,0.2);
  background: rgba(255,45,45,0.03);
  opacity: 0.65;
}

.ar-avatar {
  width: 34px;
  height: 34px;
  background: var(--c-surface-2);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--f-display);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text-muted);
  flex-shrink: 0;
}
.ar-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ar-name { font-size: 0.88rem; font-weight: 500; }
.ar-actions { display: flex; gap: var(--sp-2); flex-shrink: 0; }

.ar-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 0.9rem;
}
.btn-absent {
  color: var(--c-red);
  border-color: rgba(255,45,45,0.3);
}
.btn-absent:hover { background: rgba(255,45,45,0.1); border-color: var(--c-red); }
.active-absent {
  background: var(--c-red);
  color: #fff;
  border: none;
}

/* Guest form */
.guest-zone {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-surface);
  border: 1px dashed var(--c-border);
  border-radius: var(--r-md);
}
.guest-form {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.guest-form input { flex: 1; min-width: 120px; }
.guest-form select { width: 110px; }
</style>
