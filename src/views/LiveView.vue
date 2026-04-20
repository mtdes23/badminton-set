<template>
  <div class="live-view">
    <!-- No session guard -->
    <div v-if="!session" class="no-session">
      <div class="no-session-icon">🏸</div>
      <h2>Chưa có buổi giao lưu nào đang diễn ra</h2>
      <p class="muted">Tạo buổi mới từ trang chủ để bắt đầu quản lý.</p>
      <RouterLink to="/" class="btn btn-primary" id="btn-goto-home">← Về trang chủ</RouterLink>
    </div>

    <template v-else>
      <!-- Session header -->
      <div class="live-header">
        <div class="live-header-left">
          <div class="live-status-badge">
            <span class="pulse-dot" aria-hidden="true"></span>
            <span>LIVE</span>
          </div>
          <div>
            <h1 class="live-title">{{ session.title }}</h1>
            <div class="live-meta muted">
              {{ session.venue }} · {{ formatDate(session.date) }} · {{ session.startTime }}
            </div>
          </div>
        </div>
        <div class="live-header-stats">
          <div class="mini-stat">
            <span class="mini-stat-num lime">{{ confirmedCount }}</span>
            <span class="label">Có mặt</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-num">{{ session.courtCount }}</span>
            <span class="label">Sân</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-num">{{ waitingCount }}</span>
            <span class="label">Chờ</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-num orange">{{ formatVNDShort(perPersonCost) }}</span>
            <span class="label">/ người</span>
          </div>
        </div>
      </div>

      <!-- Tab navigation -->
      <div class="live-tabs" role="tablist" aria-label="Màn hình quản lý">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="live-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
          role="tab"
          :id="`tab-${tab.id}`"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`panel-${tab.id}`"
        >
          <span aria-hidden="true">{{ tab.icon }}</span>
          {{ tab.label }}
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- Tab panels -->
      <div class="live-panels">
        <div
          v-show="activeTab === 'attendance'"
          id="panel-attendance"
          role="tabpanel"
          aria-labelledby="tab-attendance"
        >
          <AttendancePanel />
        </div>
        <div
          v-show="activeTab === 'courts'"
          id="panel-courts"
          role="tabpanel"
          aria-labelledby="tab-courts"
        >
          <CourtDiagram />
        </div>
        <div
          v-show="activeTab === 'costs'"
          id="panel-costs"
          role="tabpanel"
          aria-labelledby="tab-costs"
        >
          <CostSplitter />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AttendancePanel from '@/components/AttendancePanel.vue'
import CourtDiagram    from '@/components/CourtDiagram.vue'
import CostSplitter    from '@/components/CostSplitter.vue'
import { useSessionStore } from '@/stores/index.js'

const store          = useSessionStore()
const session        = computed(() => store.session)
const confirmedCount = computed(() => store.confirmedCount)
const waitingCount   = computed(() => store.waitingPlayers.length)
const perPersonCost  = computed(() => store.perPersonCost)

const activeTab = ref('attendance')

const TABS = computed(() => [
  { id: 'attendance', icon: '📋', label: 'Điểm danh', badge: confirmedCount.value || null },
  { id: 'courts',     icon: '🏟️', label: 'Sơ đồ sân', badge: waitingCount.value ? `${waitingCount.value} chờ` : null },
  { id: 'costs',      icon: '💰', label: 'Chi phí',   badge: null },
])

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatVNDShort(n) {
  if (!n) return '0₫'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'tr'
  if (n >= 1000)    return Math.round(n / 1000) + 'k'
  return n + '₫'
}
</script>

<style scoped>
.live-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  padding: var(--sp-8);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.no-session {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-16) 0;
  text-align: center;
}
.no-session-icon { font-size: 4rem; }

/* Live header */
.live-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-5);
  padding-bottom: var(--sp-5);
  border-bottom: 1px solid var(--c-border);
}
.live-header-left {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}
.live-status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  background: rgba(181,255,26,0.12);
  border: 1px solid rgba(181,255,26,0.4);
  border-radius: var(--r-sm);
  font-family: var(--f-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--c-lime);
  flex-shrink: 0;
  margin-top: 4px;
}
.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-lime);
  animation: pulseLime 2s ease-in-out infinite;
}
.live-title {
  font-size: clamp(1.5rem, 4vw, 2.4rem);
  color: var(--c-text);
}
.live-meta { font-size: 0.85rem; margin-top: 2px; }

.live-header-stats {
  display: flex;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.mini-stat-num {
  font-family: var(--f-display);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  animation: numberRoll var(--t-mid) var(--ease-snap);
}

/* Tabs */
.live-tabs {
  display: flex;
  gap: var(--sp-1);
  border-bottom: 1px solid var(--c-border);
  overflow-x: auto;
}
.live-tab {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--c-text-muted);
  font-family: var(--f-display);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    color var(--t-fast),
    border-color var(--t-fast);
  white-space: nowrap;
  margin-bottom: -1px;
}
.live-tab:hover { color: var(--c-text); }
.live-tab.active {
  color: var(--c-lime);
  border-bottom-color: var(--c-lime);
}
.tab-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  background: rgba(181,255,26,0.15);
  border: 1px solid rgba(181,255,26,0.3);
  border-radius: 100px;
  font-size: 0.65rem;
  color: var(--c-lime);
  font-weight: 700;
}

.live-panels { flex: 1; }

@media (max-width: 640px) {
  .live-view { padding: var(--sp-4); gap: var(--sp-4); }
  .mini-stat { align-items: flex-start; }
  .live-header-stats { gap: var(--sp-4); }
}
</style>
