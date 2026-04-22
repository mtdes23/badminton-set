<template>
  <Teleport to="body">
    <div v-if="show" class="modal-mask" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div class="modal-box auth-modal">
        <!-- Tabs -->
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: mode === 'login' }"
            @click="mode = 'login'"
          >
            Đăng nhập
          </button>
          <button
            class="auth-tab"
            :class="{ active: mode === 'signup' }"
            @click="mode = 'signup'"
          >
            Đăng ký
          </button>
        </div>

        <!-- Error message -->
        <div v-if="error" class="error-message">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>

        <!-- Login Form -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="auth-form">
          <h3 id="auth-title">Đăng nhập tài khoản</h3>

          <div class="form-group">
            <label>Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              placeholder="your@email.com"
              required
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>Mật khẩu</label>
            <input
              v-model="loginForm.password"
              type="password"
              placeholder="••••••••"
              required
              :disabled="loading"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
            {{ loading ? 'Đang xử lý...' : 'Đăng nhập' }}
          </button>

          <div class="auth-divider">hoặc</div>

          <button
            type="button"
            @click="loginGoogle"
            class="btn btn-secondary btn-lg"
            :disabled="loading"
          >
            <span>🔵</span>
            Đăng nhập với Google
          </button>
        </form>

        <!-- Signup Form -->
        <form v-if="mode === 'signup'" @submit.prevent="handleSignup" class="auth-form">
          <h3 id="auth-title">Tạo tài khoản mới</h3>

          <div class="form-group">
            <label>Tên đăng nhập</label>
            <input
              v-model="signupForm.username"
              type="text"
              placeholder="Username của bạn"
              required
              minlength="3"
              maxlength="20"
              :disabled="loading"
              @input="validateUsername"
            />
            <div v-if="usernameStatus" class="field-status" :class="usernameStatus.type">
              {{ usernameStatus.message }}
            </div>
          </div>

          <div class="form-group">
            <label>Email</label>
            <input
              v-model="signupForm.email"
              type="email"
              placeholder="your@email.com"
              required
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <label>Mật khẩu</label>
            <input
              v-model="signupForm.password"
              type="password"
              placeholder="••••••••"
              required
              minlength="6"
              :disabled="loading"
            />
            <div class="password-hint">Tối thiểu 6 ký tự</div>
          </div>

          <div class="form-group">
            <label>Xác nhận mật khẩu</label>
            <input
              v-model="signupForm.confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              :disabled="loading"
              @keyup="validatePassword"
            />
            <div v-if="passwordMatch !== null" class="field-status" :class="passwordMatch ? 'success' : 'error'">
              {{ passwordMatch ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp' }}
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-lg"
            :disabled="loading || !passwordMatch || !signupForm.username.trim()"
          >
            {{ loading ? 'Đang xử lý...' : 'Tạo tài khoản' }}
          </button>

          <div class="auth-divider">hoặc</div>

          <button
            type="button"
            @click="loginGoogle"
            class="btn btn-secondary btn-lg"
            :disabled="loading"
          >
            <span>🔵</span>
            Đăng ký với Google
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'

const emit = defineEmits(['close'])

const show = defineModel('modelValue', { type: Boolean, default: false })
const authStore = useAuthStore()

const mode = ref('login')
const loading = ref(false)
const error = ref('')
const passwordMatch = ref(null)
const usernameStatus = ref(null)

const loginForm = ref({
  email: '',
  password: '',
})

const signupForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

function close() {
  show.value = false
  error.value = ''
  passwordMatch.value = null
  usernameStatus.value = null
  loginForm.value = { email: '', password: '' }
  signupForm.value = { username: '', email: '', password: '', confirmPassword: '' }
}

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await authStore.loginWithEmail(loginForm.value.email, loginForm.value.password)
    close()
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      error.value = 'Email không tồn tại'
    } else if (err.code === 'auth/wrong-password') {
      error.value = 'Mật khẩu không chính xác'
    } else if (err.code === 'auth/invalid-email') {
      error.value = 'Email không hợp lệ'
    } else {
      error.value = err.message || 'Đăng nhập thất bại'
    }
  } finally {
    loading.value = false
  }
}

async function handleSignup() {
  error.value = ''
  if (signupForm.value.password !== signupForm.value.confirmPassword) {
    error.value = 'Mật khẩu không khớp'
    return
  }

  if (signupForm.value.username.length < 3) {
    error.value = 'Tên đăng nhập phải tối thiểu 3 ký tự'
    return
  }

  loading.value = true

  try {
    await authStore.signup(
      signupForm.value.email,
      signupForm.value.password,
      signupForm.value.username
    )
    close()
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      error.value = 'Email đã tồn tại'
    } else if (err.code === 'auth/weak-password') {
      error.value = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)'
    } else if (err.code === 'auth/invalid-email') {
      error.value = 'Email không hợp lệ'
    } else if (err.message === 'Tên đăng nhập đã tồn tại') {
      error.value = 'Tên đăng nhập đã tồn tại'
    } else {
      error.value = err.message || 'Đăng ký thất bại'
    }
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  error.value = ''
  loading.value = true

  try {
    await authStore.login()
    close()
  } catch (err) {
    error.value = 'Đăng nhập Google thất bại'
  } finally {
    loading.value = false
  }
}

function validatePassword() {
  if (!signupForm.value.password || !signupForm.value.confirmPassword) {
    passwordMatch.value = null
  } else {
    passwordMatch.value = signupForm.value.password === signupForm.value.confirmPassword
  }
}

function validateUsername() {
  const username = signupForm.value.username.trim()
  if (!username) {
    usernameStatus.value = null
    return
  }

  if (username.length < 3) {
    usernameStatus.value = { type: 'error', message: '✗ Tối thiểu 3 ký tự' }
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    usernameStatus.value = { type: 'error', message: '✗ Chỉ dùng chữ, số và _' }
  } else {
    usernameStatus.value = { type: 'success', message: '✓ Tên đăng nhập hợp lệ' }
  }
}
</script>

<style scoped>
.auth-modal {
  max-width: 420px;
  padding: 0;
  overflow: hidden;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--c-border);
}

.auth-tab {
  padding: var(--sp-4);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--c-text-secondary);
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.auth-tab:hover {
  color: var(--c-text);
}

.auth-tab.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(255, 77, 77, 0.1);
  color: #ff4d4d;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 77, 77, 0.2);
}

.auth-form {
  padding: var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.auth-form h3 {
  margin: 0 0 var(--sp-2) 0;
  font-size: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--c-text);
}

.form-group input {
  padding: var(--sp-3);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  background: var(--c-bg-secondary);
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--c-primary);
  background: var(--c-bg);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-status {
  font-size: 0.85rem;
  padding: var(--sp-1) var(--sp-2);
  border-radius: 4px;
}

.field-status.success {
  color: #64c896;
  background: rgba(100, 200, 150, 0.1);
}

.field-status.error {
  color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
}

.password-hint {
  font-size: 0.8rem;
  color: var(--c-text-secondary);
}

.btn-lg {
  padding: var(--sp-3) var(--sp-4);
  font-weight: 600;
  width: 100%;
}

.btn-secondary {
  background: var(--c-bg-secondary);
  border: 1px solid var(--c-border);
  color: var(--c-text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--c-primary);
  color: white;
  border-color: var(--c-primary);
}

.auth-divider {
  text-align: center;
  color: var(--c-text-secondary);
  font-size: 0.85rem;
  position: relative;
  margin: var(--sp-2) 0;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--c-border);
}

.auth-divider {
  background: var(--c-bg-secondary);
  padding: 0 var(--sp-2);
  margin: var(--sp-4) -var(--sp-6);
  padding: var(--sp-3) var(--sp-4);
  position: relative;
}
</style>
