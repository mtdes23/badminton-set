<template>
  <section class="cost-splitter">
    <div class="cs-header">
      <h2 class="section-title">Chi phí buổi giao lưu</h2>
      <div class="cs-total-box">
        <div class="label">Tổng chi</div>
        <div class="cs-total-amount">{{ formatVND(totalExpense) }}</div>
      </div>
    </div>

    <!-- Expense rows -->
    <div class="expense-list">
      <div
        v-for="exp in expenses"
        :key="exp.id"
        class="expense-row anim-fade-up"
      >
        <div class="expense-icon" aria-hidden="true">{{ expenseIcon(exp.label) }}</div>
        <div class="expense-info">
          <div class="expense-label">{{ exp.label }}</div>
        </div>
        <div class="expense-amount">{{ formatVND(exp.amount) }}</div>
        <button
          class="btn btn-icon btn-danger"
          @click="removeExpense(exp.id)"
          aria-label="Xóa khoản chi"
        >✕</button>
      </div>
      <div v-if="!expenses.length" class="expense-empty muted">
        Chưa có khoản chi nào. Thêm bên dưới ↓
      </div>
    </div>

    <!-- Add expense -->
    <div class="add-expense-form">
      <div class="label">Thêm khoản chi</div>
      <div class="form-row">
        <input
          v-model="newLabel"
          type="text"
          placeholder="Tiền thuê sân, tiền cầu..."
          @keydown.enter="addExpense"
          aria-label="Tên khoản chi"
        />
        <input
          v-model.number="newAmount"
          type="number"
          placeholder="Số tiền (VND)"
          min="0"
          step="1000"
          @keydown.enter="addExpense"
          aria-label="Số tiền"
        />
        <button
          class="btn btn-orange"
          @click="addExpense"
          :disabled="!newLabel.trim() || !newAmount"
        >+ Thêm</button>
      </div>
      <!-- Quick presets -->
      <div class="quick-presets">
        <button
          v-for="preset in PRESETS"
          :key="preset.label"
          class="tag tag-btn"
          @click="applyPreset(preset)"
        >{{ preset.label }}</button>
      </div>
    </div>

    <hr class="divider" />

    <!-- Summary card -->
    <div class="summary-card">
      <div class="summary-row">
        <div class="summary-label">Số người tham gia</div>
        <div class="summary-value">{{ confirmedCount }} người</div>
      </div>
      <div class="summary-row">
        <div class="summary-label">Tổng chi phí</div>
        <div class="summary-value">{{ formatVND(totalExpense) }}</div>
      </div>
      <div class="summary-row summary-main">
        <div class="summary-label">Mỗi người đóng</div>
        <div class="summary-value-hero">{{ formatVND(perPersonCost) }}</div>
      </div>
      <div v-if="!confirmedCount" class="summary-note muted">
        Chưa có người xác nhận tham gia
      </div>
    </div>

    <!-- QR Code -->
    <div v-if="perPersonCost > 0" class="qr-section">
      <div class="qr-header">
        <div>
          <div class="label">Thanh toán nhanh qua QR</div>
          <div class="qr-amount">{{ formatVND(perPersonCost) }} / người</div>
        </div>
        <div class="qr-banks">
          <button
            v-for="bank in QR_BANKS"
            :key="bank.id"
            class="bank-btn"
            :class="{ active: selectedBank === bank.id }"
            @click="selectedBank = bank.id"
          >{{ bank.name }}</button>
        </div>
      </div>
      <div class="qr-canvas-wrap">
        <canvas ref="qrCanvas" class="qr-canvas" aria-label="Mã QR thanh toán"></canvas>
        <div class="qr-info">
          <div class="qr-note muted">
            🏦 Quét mã QR để chuyển khoản<br />
            {{ formatVND(perPersonCost) }} cho buổi hôm nay
          </div>
          <button class="btn btn-ghost btn-sm" @click="downloadQR">
            ⬇ Tải QR
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import QRCode from 'qrcode'
import { useSessionStore } from '@/stores/index.js'

const store = useSessionStore()

const session        = computed(() => store.session)
const expenses       = computed(() => session.value?.expenses ?? [])
const confirmedCount = computed(() => store.confirmedCount)
const totalExpense   = computed(() => store.totalExpense)
const perPersonCost  = computed(() => store.perPersonCost)

const newLabel  = ref('')
const newAmount = ref(null)
const qrCanvas  = ref(null)
const selectedBank = ref('vietqr')

const PRESETS = [
  { label: '💡 Tiền sân',  amount: 200000 },
  { label: '🏸 Tiền cầu', amount: 50000  },
  { label: '💧 Nước uống', amount: 30000  },
]

const QR_BANKS = [
  { id: 'vietqr', name: 'VietQR' },
  { id: 'momo',   name: 'MoMo' },
]

function addExpense() {
  if (!newLabel.value.trim() || !newAmount.value) return
  store.addExpense({ label: newLabel.value.trim(), amount: newAmount.value })
  newLabel.value  = ''
  newAmount.value = null
}

function removeExpense(id) {
  store.removeExpense(id)
}

function applyPreset(preset) {
  newLabel.value  = preset.label.replace(/^[^\s]+\s/, '')
  newAmount.value = preset.amount
}

function formatVND(n) {
  if (!n) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

function expenseIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('sân') || l.includes('san'))  return '🏟️'
  if (l.includes('cầu') || l.includes('cau'))  return '🏸'
  if (l.includes('nước') || l.includes('nuoc')) return '💧'
  if (l.includes('ăn') || l.includes('an') || l.includes('eat')) return '🍜'
  return '💰'
}

async function generateQR() {
  if (!qrCanvas.value || perPersonCost.value <= 0) return
  try {
    const text = `CHUYEN KHOAN: ${formatVND(perPersonCost.value)} - Phi cau long`
    await QRCode.toCanvas(qrCanvas.value, text, {
      width: 180,
      margin: 2,
      color: { dark: '#000000', light: '#B5FF1A' },
      errorCorrectionLevel: 'M',
    })
  } catch (e) {
    console.warn('QR error:', e)
  }
}

function downloadQR() {
  if (!qrCanvas.value) return
  const link = document.createElement('a')
  link.download = `badminton-qr-${perPersonCost.value}.png`
  link.href = qrCanvas.value.toDataURL()
  link.click()
}

watch(perPersonCost, async () => {
  await nextTick()
  generateQR()
})

onMounted(() => {
  if (perPersonCost.value > 0) generateQR()
})
</script>

<style scoped>
.cost-splitter { display: flex; flex-direction: column; gap: var(--sp-5); }

.cs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-4);
}
.section-title { font-size: 1.4rem; }
.cs-total-box {
  text-align: right;
}
.cs-total-amount {
  font-family: var(--f-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--c-orange);
  line-height: 1;
}

/* Expenses */
.expense-list { display: flex; flex-direction: column; gap: var(--sp-2); }
.expense-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
}
.expense-icon { font-size: 1.2rem; flex-shrink: 0; }
.expense-info { flex: 1; min-width: 0; }
.expense-label { font-weight: 500; font-size: 0.9rem; }
.expense-amount {
  font-family: var(--f-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-text);
  flex-shrink: 0;
}
.expense-empty { padding: var(--sp-4); text-align: center; font-size: 0.85rem; }

/* Add form */
.add-expense-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
}
.form-row {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.form-row input { flex: 1; min-width: 120px; }

.quick-presets { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.tag-btn {
  cursor: pointer;
  background: none;
  border: 1px solid var(--c-border);
  border-radius: 100px;
  padding: 3px 12px;
  font-size: 0.78rem;
  color: var(--c-text-muted);
  transition: all var(--t-fast);
}
.tag-btn:hover { border-color: var(--c-orange); color: var(--c-orange); }

/* Summary */
.summary-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--c-border);
}
.summary-row:last-of-type { border-bottom: none; padding-bottom: 0; }
.summary-label { color: var(--c-text-muted); font-size: 0.9rem; }
.summary-value { font-weight: 600; font-size: 0.95rem; }
.summary-main { margin-top: var(--sp-2); }
.summary-value-hero {
  font-family: var(--f-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--c-lime);
  animation: numberRoll var(--t-mid) var(--ease-snap);
}
.summary-note { font-size: 0.82rem; text-align: center; }

/* QR */
.qr-section {
  background: var(--c-surface);
  border: 1px solid rgba(181,255,26,0.3);
  border-radius: var(--r-md);
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.qr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
}
.qr-amount {
  font-family: var(--f-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--c-lime);
}
.qr-banks { display: flex; gap: var(--sp-2); }
.bank-btn {
  padding: var(--sp-2) var(--sp-4);
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  color: var(--c-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--t-fast);
}
.bank-btn.active {
  border-color: var(--c-lime);
  color: var(--c-lime);
  background: rgba(181,255,26,0.08);
}

.qr-canvas-wrap {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.qr-canvas {
  border-radius: var(--r-sm);
  flex-shrink: 0;
}
.qr-info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  justify-content: center;
}
.qr-note { font-size: 0.85rem; line-height: 1.8; }
</style>
