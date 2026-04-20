<template>
  <div class="history-view">
    <div class="history-header">
      <h1>Lịch sử buổi giao lưu</h1>
      <div class="muted">{{ history.length }} buổi đã lưu</div>
    </div>

    <div v-if="!history.length" class="history-empty">
      <div class="empty-icon">📊</div>
      <h2>Chưa có lịch sử</h2>
      <p class="muted">Kết thúc buổi giao lưu đầu tiên để xem tổng kết tại đây.</p>
      <RouterLink to="/" class="btn btn-primary" id="btn-hist-home">← Tạo buổi mới</RouterLink>
    </div>

    <div v-else class="history-list">
      <div
        v-for="s in history"
        :key="s.id"
        class="history-card card"
      >
        <div class="hc-header">
          <div>
            <h3 class="hc-title">{{ s.title }}</h3>
            <div class="hc-meta muted">{{ s.venue }} · {{ formatDate(s.date) }}</div>
          </div>
          <div class="hc-status">
            <span class="tag">{{ formatTime(s.closedAt) }}</span>
          </div>
        </div>

        <div class="hc-stats">
          <div class="hc-stat">
            <div class="hc-stat-num">{{ s.attendees?.filter(a => a.status === 'confirmed').length ?? 0 }}</div>
            <div class="label">Người tham gia</div>
          </div>
          <div class="hc-stat">
            <div class="hc-stat-num">{{ s.courtCount }}</div>
            <div class="label">Sân đấu</div>
          </div>
          <div class="hc-stat">
            <div class="hc-stat-num orange">{{ formatVND(totalCost(s)) }}</div>
            <div class="label">Tổng chi</div>
          </div>
          <div class="hc-stat">
            <div class="hc-stat-num lime">{{ formatVND(perPersonCost(s)) }}</div>
            <div class="label">/ người</div>
          </div>
        </div>

        <!-- Expense breakdown -->
        <div v-if="s.expenses?.length" class="hc-expenses">
          <div class="label" style="margin-bottom:var(--sp-2)">Chi tiết chi phí</div>
          <div class="expense-pills">
            <span v-for="exp in s.expenses" :key="exp.id" class="expense-pill">
              {{ exp.label }}: {{ formatVND(exp.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from '@/stores/index.js'

const store   = useSessionStore()
const history = computed(() => store.history)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatVND(n) {
  if (!n) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

function totalCost(s) {
  return s.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0
}

function perPersonCost(s) {
  const count = s.attendees?.filter(a => a.status === 'confirmed').length ?? 0
  if (!count) return 0
  return Math.ceil(totalCost(s) / count)
}
</script>

<style scoped>
.history-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
  padding: var(--sp-8);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.history-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-16) 0;
  text-align: center;
}
.empty-icon { font-size: 3.5rem; }

.history-list { display: flex; flex-direction: column; gap: var(--sp-4); }

.history-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  animation: fadeInUp var(--t-slow) var(--ease-sport) both;
}

.hc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
}
.hc-title { font-size: 1.1rem; }
.hc-meta { font-size: 0.82rem; margin-top: 2px; }

.hc-stats {
  display: flex;
  gap: var(--sp-6);
  flex-wrap: wrap;
}
.hc-stat { display: flex; flex-direction: column; gap: 2px; }
.hc-stat-num {
  font-family: var(--f-display);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  color: var(--c-text);
}
.hc-stat-num.lime   { color: var(--c-lime); }
.hc-stat-num.orange { color: var(--c-orange); }

.hc-expenses {
  padding-top: var(--sp-3);
  border-top: 1px solid var(--c-border);
}
.expense-pills { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.expense-pill {
  padding: 3px 10px;
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: 100px;
  font-size: 0.78rem;
  color: var(--c-text-muted);
}

@media (max-width: 640px) {
  .history-view { padding: var(--sp-4); }
}
</style>
