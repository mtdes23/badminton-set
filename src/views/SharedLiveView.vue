<template>
  <div class="shared-live-view">
    <!-- Loading or error state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải...</p>
    </div>

    <div v-else-if="!sessionData" class="error-state">
      <div class="error-icon">🔒</div>
      <h2>Link không tồn tại hoặc đã hết hạn</h2>
      <p class="muted">Vui lòng yêu cầu link mới từ người quản lý buổi giao lưu.</p>
      <RouterLink to="/" class="btn btn-primary">← Quay lại trang chủ</RouterLink>
    </div>

    <!-- Session content (read-only) -->
    <template v-else>
      <!-- Read-only badge -->
      <div class="readonly-banner">
        <span class="banner-icon">👁️</span>
        <span>Xem trực tiếp (chỉ đọc)</span>
      </div>

      <!-- Session header -->
      <div class="live-header">
        <div class="live-header-left">
          <div class="live-status-badge">
            <span class="pulse-dot" aria-hidden="true"></span>
            <span>LIVE</span>
          </div>
          <div>
            <h1 class="live-title">{{ sessionData.title }}</h1>
            <div class="live-meta muted">
              {{ sessionData.venue }} · {{ formatDate(sessionData.date) }} · {{ sessionData.startTime }}
            </div>
          </div>
        </div>
        <div class="live-header-stats">
          <div class="mini-stat">
            <span class="mini-stat-num lime">{{ confirmedCount }}</span>
            <span class="label">Có mặt</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-num">{{ sessionData.courtCount }}</span>
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
      <div class="live-tabs" role="tablist" aria-label="Màn hình xem">
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

      <!-- Tab panels - read-only versions -->
      <div class="live-panels">
        <div
          v-show="activeTab === 'attendance'"
          id="panel-attendance"
          role="tabpanel"
          aria-labelledby="tab-attendance"
          class="panel-content"
        >
          <div class="attendance-list">
            <div v-for="attendee in attendeeDetails" :key="attendee.playerId" class="attendee-row">
              <div class="attendee-avatar">{{ attendee.avatar }}</div>
              <div class="attendee-info">
                <div class="attendee-name">{{ attendee.name }}</div>
                <SkillBadge :skill="attendee.skill" />
              </div>
              <div class="attendee-status" :class="attendee.status">
                {{ attendee.status === 'confirmed' ? '✓ Có mặt' : '' }}
              </div>
            </div>
            <div v-if="!attendeeDetails.length" class="muted" style="text-align: center; padding: var(--sp-6)">
              Chưa có người điểm danh
            </div>
          </div>
        </div>

        <div
          v-show="activeTab === 'courts'"
          id="panel-courts"
          role="tabpanel"
          aria-labelledby="tab-courts"
          class="panel-content"
        >
          <div class="courts-grid">
            <div v-for="court in sessionData.courts" :key="court.id" class="court-card card">
              <h3 class="court-label">{{ court.label }}</h3>
              <div class="court-slots">
                <div v-for="(playerId, idx) in court.slots" :key="idx" class="court-slot">
                  <div v-if="playerId" class="player-in-slot">
                    <div class="slot-avatar">{{ playerMap[playerId]?.avatar }}</div>
                    <div class="slot-name">{{ playerMap[playerId]?.name }}</div>
                  </div>
                  <div v-else class="slot-empty">Trống</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-show="activeTab === 'costs'"
          id="panel-costs"
          role="tabpanel"
          aria-labelledby="tab-costs"
          class="panel-content"
        >
          <div class="cost-summary">
            <div class="cost-item">
              <span>Tổng chi phí:</span>
              <span class="cost-value">{{ formatVND(totalExpense) }}</span>
            </div>
            <div class="cost-item">
              <span>Số người:</span>
              <span class="cost-value">{{ confirmedCount }}</span>
            </div>
            <div class="cost-item highlight">
              <span>Chi phí/người:</span>
              <span class="cost-value">{{ formatVND(perPersonCost) }}</span>
            </div>
            <hr class="divider" />
            <div v-if="sessionData.expenses.length" class="expenses-list">
              <h4>Chi tiết</h4>
              <div v-for="exp in sessionData.expenses" :key="exp.id" class="expense-row">
                <span>{{ exp.label }}</span>
                <span>{{ formatVND(exp.amount) }}</span>
              </div>
            </div>
            <div v-else class="muted" style="text-align: center; padding: var(--sp-4)">
              Chưa có chi phí nào
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import { usePlayerStore } from '@/stores/index.js'
import SkillBadge from '@/components/SkillBadge.vue'

const route = useRoute()
const playerStore = usePlayerStore()

const loading = ref(true)
const sessionData = ref(null)
const activeTab = ref('attendance')

const shareUid = route.params.uid
const shareToken = route.params.token

// Load session data by share token
let unsub = null
let timeoutId = null

onMounted(() => {
  console.log('🔍 SharedLiveView: Loading for user:', shareUid, 'with token:', shareToken)
  if (!shareUid || !shareToken) {
    console.error('❌ Missing UID or Token in URL')
    loading.value = false
    return
  }
  
  // Safety timeout: If Firebase takes more than 5s, hide loading to show error
  timeoutId = setTimeout(() => {
    if (loading.value) {
      console.warn('⚠️ Timeout: Firestore took too long to respond')
      loading.value = false
    }
  }, 5000)
  
  const path = shareUid === 'app' ? 'app/state' : `sessions/${shareUid}`
  const hostSessionRef = doc(db, path)
  
  // Real-time listener for shared view
  unsub = onSnapshot(hostSessionRef, (snap) => {
    console.log(`📡 Snapshot received from ${path}. Exists:`, snap.exists())
    
    if (snap.exists()) {
      const data = snap.data()
      const session = data.currentSession
      const tokenInDb = data.shareToken
      
      console.log('📄 Data from DB:', { 
        hasSession: !!session, 
        tokenMatch: tokenInDb === shareToken,
        dbToken: tokenInDb 
      })

      if (session && tokenInDb === shareToken) {
        console.log('✅ Session found and token matches!')
        sessionData.value = session
      } else {
        console.warn('⚠️ Session not found or token mismatch')
        sessionData.value = null
      }
    } else {
      console.warn('❌ Document does not exist at path:', path)
      sessionData.value = null
    }
    
    if (timeoutId) clearTimeout(timeoutId)
    loading.value = false
  }, (error) => {
    console.error('🔥 Firestore Error:', error)
    if (timeoutId) clearTimeout(timeoutId)
    loading.value = false
  })
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
  if (unsub) unsub()
})

const playerMap = computed(() => {
  const map = {}
  playerStore.players.forEach(p => {
    map[p.id] = p
  })
  return map
})

const confirmedCount = computed(() =>
  sessionData.value?.attendees.filter(a => a.status === 'confirmed').length ?? 0
)

const waitingCount = computed(() => {
  if (!sessionData.value) return 0
  const onCourt = new Set(
    sessionData.value.courts.flatMap(c => c.slots).filter(Boolean)
  )
  return sessionData.value.attendees
    .filter(a => a.status === 'confirmed' && !onCourt.has(a.playerId))
    .length
})

const totalExpense = computed(() =>
  sessionData.value?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0
)

const perPersonCost = computed(() => {
  if (!confirmedCount.value) return 0
  return Math.ceil(totalExpense.value / confirmedCount.value)
})

const attendeeDetails = computed(() =>
  sessionData.value?.attendees
    .filter(a => a.status === 'confirmed')
    .map(a => playerMap.value[a.playerId])
    .filter(Boolean) ?? []
)

const TABS = computed(() => [
  { id: 'attendance', icon: '📋', label: 'Điểm danh', badge: confirmedCount.value || null },
  { id: 'courts',     icon: '🏟️', label: 'Sơ đồ sân', badge: waitingCount.value ? `${waitingCount.value} chờ` : null },
  { id: 'costs',      icon: '💰', label: 'Chi phí',   badge: null },
])

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function formatVND(n) {
  if (!n) return '0₫'
  return n.toLocaleString('vi-VN') + '₫'
}

function formatVNDShort(n) {
  if (!n) return '0₫'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'tr'
  if (n >= 1000)    return Math.round(n / 1000) + 'k'
  return n + '₫'
}
</script>

<style scoped>
.shared-live-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  padding: var(--sp-8);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.readonly-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(100, 150, 255, 0.1);
  border-left: 3px solid #6496ff;
  border-radius: 4px;
  color: #6496ff;
  font-size: 0.9rem;
}

.banner-icon {
  font-size: 1.2rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-16) var(--sp-8);
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 4rem;
}

/* Reuse live view styles */
.live-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sp-6);
  padding: var(--sp-6);
  background: var(--c-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--c-border);
}

.live-header-left {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
}

.live-status-badge {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: linear-gradient(135deg, #ff3366 0%, #ff6b9d 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  animation: pulseLive 1.5s ease infinite;
}

@keyframes pulseLive {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: var(--sp-1);
}

.live-meta {
  font-size: 0.85rem;
}

.live-header-stats {
  display: flex;
  gap: var(--sp-4);
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
}

.mini-stat-num {
  font-size: 1.5rem;
  font-weight: 700;
}

.mini-stat-num.lime {
  color: #b5ff1a;
}

.mini-stat-num.orange {
  color: #ffb800;
}

.live-tabs {
  display: flex;
  gap: var(--sp-3);
  border-bottom: 1px solid var(--c-border);
  overflow-x: auto;
  padding-bottom: var(--sp-2);
}

.live-tab {
  padding: var(--sp-3) var(--sp-4);
  font-size: 0.95rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--c-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  white-space: nowrap;
}

.live-tab:hover {
  color: var(--c-text);
}

.live-tab.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}

.tab-badge {
  display: inline-flex;
  padding: 2px 6px;
  background: rgba(255, 107, 157, 0.2);
  color: #ff6b9d;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.live-panels {
  margin-top: var(--sp-4);
}

.panel-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.attendance-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.attendee-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--c-border);
}

.attendee-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
}

.attendee-info {
  flex: 1;
  min-width: 0;
}

.attendee-name {
  font-weight: 600;
  margin-bottom: var(--sp-1);
}

.attendee-status {
  font-size: 0.85rem;
  color: #b5ff1a;
}

.courts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--sp-4);
}

.court-card {
  padding: var(--sp-5);
  border-radius: 8px;
  border: 1px solid var(--c-border);
}

.court-label {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: var(--sp-4);
}

.court-slots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.court-slot {
  min-height: 100px;
  background: var(--c-bg-secondary);
  border: 1px dashed var(--c-border);
  border-radius: 6px;
  padding: var(--sp-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-in-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  text-align: center;
  width: 100%;
}

.slot-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
}

.slot-name {
  font-size: 0.75rem;
  font-weight: 600;
  word-break: break-word;
}

.slot-empty {
  color: var(--c-text-secondary);
  font-size: 0.85rem;
}

.cost-summary {
  background: var(--c-bg-secondary);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: var(--sp-6);
  max-width: 400px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-3) 0;
  font-size: 0.95rem;
}

.cost-item.highlight {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--c-primary);
  padding-top: var(--sp-4);
  padding-bottom: var(--sp-4);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
  margin: var(--sp-3) 0;
}

.cost-value {
  font-weight: 700;
  color: var(--c-primary);
}

.expenses-list {
  margin-top: var(--sp-4);
}

.expenses-list h4 {
  font-size: 0.9rem;
  margin-bottom: var(--sp-2);
  color: var(--c-text-secondary);
}

.expense-row {
  display: flex;
  justify-content: space-between;
  padding: var(--sp-2) 0;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--c-border-light);
}

.expense-row:last-child {
  border-bottom: none;
}

.divider {
  border: none;
  border-top: 1px solid var(--c-border);
  margin: var(--sp-3) 0;
}

.muted {
  color: var(--c-text-secondary);
}
</style>
