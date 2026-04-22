<template>
  <nav class="app-nav" role="navigation" aria-label="Navigation chính">
    <div class="nav-brand" @click="router.push('/')">
      <span class="nav-shuttle" aria-hidden="true">🏸</span>
      <div class="nav-title-group">
        <span class="nav-title">Badminton</span>
        <span class="nav-sub">Setup</span>
      </div>
    </div>

    <div class="nav-links" role="list">
      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        role="listitem"
        :aria-label="link.label"
      >
        <span class="nav-link-icon" aria-hidden="true">{{ link.icon }}</span>
        <span class="nav-link-text">{{ link.label }}</span>
      </RouterLink>
    </div>

    <div v-if="session" class="nav-session-badge">
      <span class="pulse-dot" aria-hidden="true"></span>
      <span class="nav-badge-text">{{ session.title }}</span>
    </div>

    <!-- User Auth Section -->
    <div class="nav-auth">
      <template v-if="authStore.user">
        <div class="user-profile" @click="toggleUserMenu" :title="authStore.user.displayName">
          <img :src="authStore.user.photoURL" :alt="authStore.user.displayName" class="user-avatar" />
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-header">
              <span class="user-name">{{ authStore.user.displayName }}</span>
              <span class="user-email">{{ authStore.user.email }}</span>
            </div>
            <button @click="openBankSettings" class="btn btn-ghost btn-settings">
              <span>Thiết lập tài khoản</span>
            </button>
            <button @click="authStore.logout" class="btn btn-ghost btn-logout">
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </template>
      <button v-else @click="authStore.login" class="btn btn-ghost btn-login" :disabled="authStore.loading">
        <span v-if="authStore.loading">...</span>
        <template v-else>
          <span class="btn-icon">🔑</span>
          <span class="btn-text">Đăng nhập</span>
        </template>
      </button>
    </div>

    <!-- Bank Settings Modal -->
    <Teleport to="body">
      <div v-if="showBankModal" class="modal-mask" @click.self="showBankModal = false">
        <div class="modal-box bank-modal">
          <div class="modal-header">
            <h3>Thiết lập thanh toán</h3>
            <button class="btn btn-icon btn-ghost" @click="showBankModal = false">✕</button>
          </div>
          <p class="modal-desc muted">Thông tin này dùng để tạo mã VietQR tự động khi bạn chủ trì buổi đấu.</p>
          
          <div class="bank-form">
            <div class="input-group">
              <label>Ngân hàng</label>
              <select v-model="bankForm.bankId">
                <option value="">-- Chọn ngân hàng --</option>
                <option v-for="b in BANK_LIST" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="input-group">
              <label>Số tài khoản</label>
              <input v-model="bankForm.accountNo" type="text" placeholder="Nhập STK của bạn..." />
            </div>
            <div class="input-group">
              <label>Tên chủ tài khoản (ko dấu)</label>
              <input v-model="bankForm.accountName" type="text" placeholder="VD: NGUYEN VAN A" />
            </div>
            <button @click="saveBankSettings" class="btn btn-primary" :disabled="isSavingBank">
              {{ isSavingBank ? 'Đang lưu...' : 'Lưu thiết lập' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </nav>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore, BANK_LIST } from '@/stores/index.js'
import { useAuthStore } from '@/stores/auth.js'

const router  = useRouter()
const store   = useSessionStore()
const authStore = useAuthStore()

const session = computed(() => store.session)
const showUserMenu = ref(false)
const showBankModal = ref(false)
const isSavingBank = ref(false)

const bankForm = reactive({
  bankId: '',
  accountNo: '',
  accountName: ''
})

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function openBankSettings() {
  showUserMenu.value = false
  if (authStore.bankInfo) {
    bankForm.bankId = authStore.bankInfo.bankId || ''
    bankForm.accountNo = authStore.bankInfo.accountNo || ''
    bankForm.accountName = authStore.bankInfo.accountName || authStore.user.displayName
  } else {
    bankForm.accountName = authStore.user?.displayName || ''
  }
  showBankModal.value = true
}

async function saveBankSettings() {
  isSavingBank.value = true
  try {
    await authStore.updateBankInfo(bankForm)
    showBankModal.value = false
  } catch (e) {
    alert('Lỗi khi lưu thông tin: ' + e.message)
  } finally {
    isSavingBank.value = false
  }
}

const navLinks = [
  { to: '/',        icon: '⚙️',  label: 'Thiết lập' },
  { to: '/live',    icon: '📋',  label: 'Live' },
  { to: '/history', icon: '📊',  label: 'Lịch sử' },
]
</script>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  padding: 0 var(--sp-8);
  height: 60px;
  background: rgba(9, 9, 9, 0.92);
  border-bottom: 1px solid var(--c-border);
  backdrop-filter: blur(12px);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  cursor: pointer;
  flex-shrink: 0;
}
.nav-shuttle {
  font-size: 1.4rem;
  filter: drop-shadow(0 0 8px rgba(181,255,26,0.5));
}
.nav-title-group {
  display: flex;
  flex-direction: column;
  line-height: 1;
}
.nav-title {
  font-family: var(--f-display);
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--c-lime);
}
.nav-sub {
  font-family: var(--f-display);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.nav-links {
  display: flex;
  gap: var(--sp-2);
  flex: 1;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-sm);
  color: var(--c-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    color var(--t-fast) var(--ease-sport),
    background var(--t-fast) var(--ease-sport);
}
.nav-link:hover {
  color: var(--c-text);
  background: var(--c-surface);
}
.nav-link.router-link-active {
  color: var(--c-lime);
  background: rgba(181,255,26,0.08);
}

.nav-session-badge {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  background: rgba(181,255,26,0.08);
  border: 1px solid rgba(181,255,26,0.25);
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--c-lime);
  flex-shrink: 0;
  max-width: 160px;
  overflow: hidden;
}

.nav-auth {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.btn-login {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: 0.82rem;
  color: var(--c-text-muted);
}
.btn-login:hover {
  color: var(--c-text);
  background: rgba(255,255,255,0.05);
}

.user-profile {
  position: relative;
  cursor: pointer;
}
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--c-border);
  transition: border-color var(--t-fast);
}
.user-profile:hover .user-avatar {
  border-color: var(--c-lime);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--sp-2);
  width: 220px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  z-index: 100;
  animation: slideDown FadeIn var(--t-fast) var(--ease-snap);
}

.dropdown-header {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--c-border);
  padding-bottom: var(--sp-3);
}
.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--c-text);
}
.user-email {
  font-size: 0.75rem;
  color: var(--c-text-muted);
}

.btn-logout {
  width: 100%;
  justify-content: center;
  font-size: 0.82rem;
  color: var(--c-red);
}
.btn-logout:hover {
  background: rgba(255,45,45,0.1);
}

.bank-modal { max-width: 400px; }
.modal-desc { font-size: 0.85rem; margin-bottom: var(--sp-4); }
.bank-form { display: flex; flex-direction: column; gap: var(--sp-4); }

.nav-badge-text {
  overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
  min-width: 0;
}
.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-lime);
  flex-shrink: 0;
  animation: pulseLime 2s ease-in-out infinite;
}

@media (max-width: 768px) {
  .app-nav { padding: 0 var(--sp-4); gap: var(--sp-4); }
  .nav-links { gap: var(--sp-1); }
  .nav-link { padding: var(--sp-2); }
  .nav-link-text { display: none; }
  .nav-sub { display: none; }
  .btn-text { display: none; }
  .nav-session-badge { max-width: 100px; }
}
</style>
