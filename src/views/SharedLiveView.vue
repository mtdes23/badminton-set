<template>
  <div class="shared-live-view">
    <!-- Loading or error state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải...</p>
    </div>

    <div v-else-if="!sessionData" class="error-state">
      <div class="error-icon">🔒</div>
      <h2>{{ eMsg || 'Link không tồn tại hoặc đã hết hạn' }}</h2>
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
            
            <div class="self-attend-box">
              <h4>Bạn có mặt ở sân?</h4>
              <p class="muted" style="margin-bottom: var(--sp-3); font-size: 0.85rem">Chọn tên của bạn để báo có mặt với quản lý</p>
              
              <div class="self-attend-form" v-if="!selfAttendSuccess">
                <select v-model="selectedPlayerId" class="player-select" aria-label="Chọn tên bạn">
                  <option value="">-- Chọn tên của bạn --</option>
                  <option v-for="p in allPlayers" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
                <button class="btn btn-primary" @click="submitAttendance" :disabled="!selectedPlayerId || isSubmitting">
                  {{ isSubmitting ? 'Đang gửi...' : 'Báo có mặt' }}
                </button>
              </div>
              <div v-else class="success-message">
                ✅ Đã gửi! Hệ thống của quản lý sẽ tự động thêm bạn vào danh sách. (Bạn có thể cần xin link mới để thấy tên mình cập nhật).
              </div>
              <div v-if="selfAttendError" class="error-text" style="color: var(--c-red); font-size: 0.85rem; margin-top: var(--sp-2)">
                {{ selfAttendError }}
              </div>
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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { usePlayerStore } from '@/stores/index.js'
import SkillBadge from '@/components/SkillBadge.vue'

const route = useRoute()
const playerStore = usePlayerStore()

const loading = ref(true)
const sessionData = ref(null)
const activeTab = ref('attendance')

const shareUid = route.params.uid?.trim().replace(/\/$/, '')
const shareToken = route.params.token?.trim().replace(/\/$/, '')

const eMsg = ref('')

// Load session data by share token
let timeoutId = null

onMounted(() => {
  if (!shareUid || !shareToken) {
    eMsg.value = 'URL không hợp lệ (thiếu thông tin ID hoặc Token).'
    loading.value = false
    return
  }
  
  if (shareUid === 'static') {
    try {
      // Decode the URL encoded base64 token
      const b64 = decodeURIComponent(shareToken)
      // Decode from base64 (UTF-8 safe)
      const jsonStr = decodeURIComponent(escape(atob(b64)))
      const session = JSON.parse(jsonStr)
      
      sessionData.value = session
      eMsg.value = ''
      loading.value = false
    } catch (error) {
      console.error('Lỗi khi giải mã link tĩnh:', error)
      eMsg.value = 'Link tĩnh không hợp lệ hoặc dữ liệu bị lỗi định dạng.'
      sessionData.value = null
      loading.value = false
    }
    return
  }
  
  // Legacy links fallback
  eMsg.value = 'Link chia sẻ cũ này không còn được hỗ trợ. Vui lòng xin link tĩnh mới từ người quản lý.'
  sessionData.value = null
  loading.value = false
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
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

const allPlayers = computed(() => playerStore.players)
const attendeeDetails = computed(() => {
  if (!sessionData.value?.attendees) return []
  return sessionData.value.attendees.map(a => {
    const p = playerMap.value[a.playerId]
    return {
      playerId: a.playerId,
      name: p?.name || 'Khách',
      avatar: p?.avatar || '?',
      skill: p?.skill || 'medium',
      status: a.status
    }
  })
})

// ── Self Attendance ─────────────────────────────────────────────────────────
const selectedPlayerId = ref('')
const isSubmitting = ref(false)
const selfAttendSuccess = ref(false)
const selfAttendError = ref('')

async function submitAttendance() {
  if (!selectedPlayerId.value || !sessionData.value) return
  isSubmitting.value = true
  selfAttendError.value = ''
  try {
    // Write flag to the public players collection so the host can process it
    await updateDoc(doc(db, 'players', selectedPlayerId.value), {
      attending_session: sessionData.value.id
    })
    selfAttendSuccess.value = true
  } catch (error) {
    console.error('Error submitting attendance:', error)
    selfAttendError.value = 'Lỗi gửi yêu cầu: Hệ thống từ chối quyền hoặc lỗi mạng.'
  } finally {
    isSubmitting.value = false
  }
}

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
  color: var(--c-text-muted);
}

.self-attend-box {
  margin-top: var(--sp-6);
  padding: var(--sp-4);
  background: var(--c-surface);
  border: 1px dashed var(--c-border);
  border-radius: var(--r-md);
}

.self-attend-form {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.player-select {
  flex: 1;
  min-width: 150px;
  padding: 0.5rem;
  border-radius: var(--r-sm);
  border: 1px solid var(--c-border);
  background: var(--c-bg);
  color: var(--c-text);
}

.success-message {
  color: var(--c-lime);
  font-weight: 500;
  padding: var(--sp-3);
  background: rgba(181, 255, 26, 0.1);
  border-radius: var(--r-sm);
  margin-top: var(--sp-2);
}
</style>
