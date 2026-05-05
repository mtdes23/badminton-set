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
        <div class="live-header-share" v-if="!isGuest">
          <button 
            v-if="!store.shareToken" 
            @click="showShareModal = true"
            class="btn btn-primary btn-sm"
            title="Tạo link để chia sẻ"
          >
            🔗 Chia sẻ
          </button>
          <div v-else class="share-active">
            <span class="share-badge">🔗 Đã chia sẻ</span>
            <button 
              @click="showShareModal = true"
              class="btn btn-ghost btn-xs"
              title="Quản lý link chia sẻ"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <!-- Share Modal -->
      <Teleport to="body">
        <div v-if="showShareModal" class="modal-mask" @click.self="showShareModal = false" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div class="modal-box share-modal">
            <div class="modal-header">
              <h3 id="share-title">Chia sẻ buổi giao lưu</h3>
              <button class="btn btn-icon btn-ghost" @click="showShareModal = false" aria-label="Đóng">✕</button>
            </div>

            <div v-if="!store.shareToken" class="share-content">
              <p class="modal-desc muted">Tạo một link để những người khác có thể xem trực tiếp sơ đồ sân, danh sách điểm danh và chi phí (chỉ xem, không chỉnh sửa).</p>
              <button @click="generateShare" class="btn btn-primary btn-lg" :disabled="generatingShare">
                {{ generatingShare ? 'Đang tạo...' : '🔗 Tạo link chia sẻ' }}
              </button>
            </div>

            <div v-else class="share-content">
              <div class="share-url-box">
                <input 
                  type="text" 
                  :value="store.shareUrl" 
                  readonly 
                  class="share-url-input"
                  id="share-url-input"
                />
                <button @click="copyShareLink" class="btn btn-primary btn-sm">
                  {{ copiedLink ? '✓ Đã copy!' : '📋 Copy' }}
                </button>
              </div>

              <div class="share-actions">
                <button 
                  @click="shareViaWhatsApp"
                  class="btn-share-method"
                  title="Chia sẻ qua WhatsApp"
                >
                  💬 WhatsApp
                </button>
                <button 
                  @click="shareViaMail"
                  class="btn-share-method"
                  title="Chia sẻ qua Email"
                >
                  📧 Email
                </button>
                <button 
                  @click="showQR = true"
                  class="btn-share-method"
                  title="Hiển thị QR Code"
                >
                  📱 QR Code
                </button>
              </div>

              <hr class="divider" />

              <button @click="revokeShare" class="btn btn-danger" :disabled="revokingShare">
                {{ revokingShare ? 'Đang hủy...' : '🔒 Hủy chia sẻ' }}
              </button>
            </div>
          </div>
        </div>

        <!-- QR Code Modal -->
        <div v-if="showQR && store.shareUrl" class="modal-mask" @click.self="showQR = false" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <div class="modal-box qr-modal">
            <div class="modal-header">
              <h3 id="qr-title">QR Code</h3>
              <button class="btn btn-icon btn-ghost" @click="showQR = false" aria-label="Đóng">✕</button>
            </div>
            <div class="qr-content">
              <canvas id="qrCanvas" class="qr-canvas"></canvas>
              <p class="muted" style="text-align: center; margin-top: var(--sp-3);">Quét mã này để xem buổi giao lưu</p>
            </div>
          </div>
        </div>
      </Teleport>

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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AttendancePanel from '@/components/AttendancePanel.vue'
import CourtDiagram    from '@/components/CourtDiagram.vue'
import CostSplitter    from '@/components/CostSplitter.vue'
import { useSessionStore } from '@/stores/index.js'

const route          = useRoute()
const router         = useRouter()
const store          = useSessionStore()
const session        = computed(() => store.session)
const confirmedCount = computed(() => store.confirmedCount)
const waitingCount   = computed(() => store.waitingPlayers.length)
const perPersonCost  = computed(() => store.perPersonCost)

const isGuest = computed(() => route.name === 'shared')

onMounted(() => {
  if (route.name === 'shared' && route.params.uid) {
    store.bindSharedSession(route.params.uid)
  }
})

// Validate token for guests
watch(() => store.shareToken, (newShareToken) => {
  if (route.name === 'shared') {
    if (store.loading) return // Don't redirect while initial load
    if (!newShareToken || newShareToken !== route.params.token) {
      alert("Link chia sẻ không hợp lệ hoặc đã bị quản lý thu hồi.")
      router.push('/')
    }
  }
})

const activeTab = ref('attendance')
const showShareModal = ref(false)
const showQR = ref(false)
const generatingShare = ref(false)
const revokingShare = ref(false)
const copiedLink = ref(false)

const TABS = computed(() => [
  { id: 'attendance', icon: '📋', label: 'Điểm danh', badge: confirmedCount.value || null },
  { id: 'courts',     icon: '🏟️', label: 'Sơ đồ sân', badge: waitingCount.value ? `${waitingCount.value} chờ` : null },
  { id: 'costs',      icon: '💰', label: 'Chi phí',   badge: null },
])

async function generateShare() {
  generatingShare.value = true
  try {
    console.log('Generating share token...')
    const token = await store.generateShareToken()
    console.log('Generated token:', token)
    console.log('Current session after generation:', store.session)
    console.log('Share URL:', store.shareUrl)
  } catch (error) {
    console.error('Error generating share token:', error)
    alert('Lỗi khi tạo link chia sẻ')
  } finally {
    generatingShare.value = false
  }
}

async function revokeShare() {
  if (!confirm('Bạn có chắc muốn hủy chia sẻ? Các link cũ sẽ không còn hoạt động.')) return
  revokingShare.value = true
  try {
    await store.revokeShareToken()
    showShareModal.value = false
  } catch (error) {
    console.error('Error revoking share token:', error)
    alert('Lỗi khi hủy chia sẻ')
  } finally {
    revokingShare.value = false
  }
}

async function copyShareLink() {
  const url = store.shareUrl
  if (!url) return

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      // Fallback for older browsers
      const input = document.getElementById('share-url-input')
      if (input) {
        input.select()
        document.execCommand('copy')
      }
    }
    copiedLink.value = true
    setTimeout(() => { copiedLink.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy link:', err)
  }
}

function shareViaWhatsApp() {
  const msg = `Xem trực tiếp buổi giao lưu: ${store.shareUrl}`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}

function shareViaMail() {
  const subject = `Buổi giao lưu: ${session.value?.title || 'Badminton'}`
  const body = `Xem trực tiếp buổi giao lưu tại: ${store.shareUrl}`
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Generate QR Code when modal opens
watch(showQR, async (newVal) => {
  if (newVal && store.shareUrl) {
    // Dynamically import QRCode library
    await import('qrcode').then(QRCode => {
      const canvas = document.getElementById('qrCanvas')
      if (canvas) {
        QRCode.default.toCanvas(canvas, store.shareUrl, { width: 250 }, (error) => {
          if (error) console.error('QR Code error:', error)
        })
      }
    })
  }
})

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

/* Share Header */
.live-header-share {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.share-active {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.share-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  background: rgba(100, 200, 150, 0.15);
  border: 1px solid rgba(100, 200, 150, 0.3);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64c896;
}

/* Share Modal */
.share-modal {
  max-width: 500px;
}

.modal-desc {
  margin-bottom: var(--sp-4);
  line-height: 1.5;
}

.share-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.share-url-box {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--c-bg-secondary);
  border: 1px solid var(--c-border);
  border-radius: 8px;
}

.share-url-input {
  flex: 1;
  padding: var(--sp-2);
  border: none;
  background: transparent;
  font-family: monospace;
  font-size: 0.85rem;
  word-break: break-all;
}

.share-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--sp-2);
}

.btn-share-method {
  padding: var(--sp-3);
  background: var(--c-bg-secondary);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-share-method:hover {
  background: var(--c-primary);
  color: white;
  border-color: var(--c-primary);
}

.divider {
  border: none;
  border-top: 1px solid var(--c-border);
}

/* QR Modal */
.qr-modal {
  max-width: 350px;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-6);
}

.qr-canvas {
  max-width: 100%;
  height: auto;
  border: 2px solid var(--c-border);
  border-radius: 8px;
  padding: var(--sp-2);
}

.btn-sm {
  padding: var(--sp-2) var(--sp-3);
  font-size: 0.85rem;
}

.btn-xs {
  padding: var(--sp-1) var(--sp-2);
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .live-view { padding: var(--sp-4); gap: var(--sp-4); }
  .mini-stat { align-items: flex-start; }
  .live-header-stats { gap: var(--sp-4); }
  .share-actions { grid-template-columns: 1fr; }
}
</style>
