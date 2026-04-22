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
          <div class="label">Thanh toán nhanh qua VietQR</div>
          <div class="qr-amount">{{ formatVND(perPersonCost) }} / người</div>
        </div>
      </div>
      
      <div v-if="hostBank" class="qr-display-wrap">
        <div class="qr-image-box">
          <img :src="qrUrl" class="qr-image" alt="Mã VietQR" />
        </div>
        <div class="qr-info">
          <div class="bank-details">
            <div class="bank-name">{{ bankName }}</div>
            <div class="acc-row">
              <span class="acc-num">{{ hostBank.accountNo }}</span>
              <button class="btn btn-ghost btn-sm copy-btn" @click="copyAcc"> Sao chép </button>
            </div>
            <div class="acc-holder">{{ hostBank.accountName }}</div>
          </div>
          <div class="qr-note muted">
            🏦 Quét mã để chuyển khoản <strong>tự động nhập số tiền & nội dung</strong>.
          </div>
        </div>
      </div>
      <div v-else class="qr-empty-state">
        <p class="muted">Chưa có thông tin ngân hàng của Host để tạo mã QR.</p>
        <button v-if="authStore.user" class="btn btn-ghost btn-sm" @click="openSettings">
          Thiết lập ngân hàng của tôi
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSessionStore, BANK_LIST } from '@/stores/index.js'
import { useAuthStore } from '@/stores/auth.js'

const store = useSessionStore()
const authStore = useAuthStore()

const session        = computed(() => store.session)
const expenses       = computed(() => session.value?.expenses ?? [])
const confirmedCount = computed(() => store.confirmedCount)
const totalExpense   = computed(() => store.totalExpense)
const perPersonCost  = computed(() => store.perPersonCost)

const newLabel  = ref('')
const newAmount = ref(null)

const hostBank = computed(() => session.value?.hostBankInfo)

const bankName = computed(() => {
  if (!hostBank.value) return ''
  return BANK_LIST.find(b => b.id === hostBank.value.bankId)?.name || hostBank.value.bankId
})

const qrUrl = computed(() => {
  if (!hostBank.value || perPersonCost.value <= 0) return ''
  const bank = hostBank.value.bankId
  const acc  = hostBank.value.accountNo
  const name = encodeURIComponent(hostBank.value.accountName)
  const desc = encodeURIComponent(`Dong tien cau long ${session.value?.title || ''}`)
  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${perPersonCost.value}&addInfo=${desc}&accountName=${name}`
})

const PRESETS = [
  { label: '💡 Tiền sân',  amount: 200000 },
  { label: '🏸 Tiền cầu', amount: 50000  },
  { label: '💧 Nước uống', amount: 30000  },
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

function copyAcc() {
  if (!hostBank.value) return
  navigator.clipboard.writeText(hostBank.value.accountNo)
  alert('Đã sao chép số tài khoản!')
}

function openSettings() {
  // We don't have direct access to AppNav's modal, but we can instruct the user
  alert('Vui lòng click vào Avatar (góc trên phải) -> Thiết lập tài khoản để nhập STK của bạn.')
}
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

.qr-display-wrap {
  display: flex;
  gap: var(--sp-6);
  align-items: center;
  flex-wrap: wrap;
}
.qr-image-box {
  background: #fff;
  padding: var(--sp-3);
  border-radius: var(--r-md);
  flex-shrink: 0;
  display: flex;
}
.qr-image {
  width: 180px;
  height: 180px;
  display: block;
}

.qr-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.bank-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bank-name { font-weight: 700; color: var(--c-text); font-size: 1rem; }
.acc-row { display: flex; align-items: center; gap: var(--sp-3); }
.acc-num { 
  font-family: var(--f-display); 
  font-size: 1.4rem; 
  font-weight: 700; 
  color: var(--c-lime); 
}
.acc-holder { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-text-muted); }

.qr-note { font-size: 0.85rem; line-height: 1.6; }
.qr-note strong { color: var(--c-text); }

.qr-empty-state {
  text-align: center;
  padding: var(--sp-8) var(--sp-4);
  border: 1px dashed var(--c-border);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
}
</style>
