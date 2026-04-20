<template>
  <div class="home-view">
    <!-- Hero -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-bg-lines" aria-hidden="true">
        <div v-for="n in 8" :key="n" class="bg-line"></div>
      </div>
      <div class="hero-content">
        <div class="hero-eyebrow label">Quản lý Giao lưu Cầu lông</div>
        <h1 id="hero-title">
          <span class="hero-title-main">Badminton</span>
          <span class="hero-title-accent">Setup</span>
        </h1>
        <p class="hero-desc">
          Số hóa buổi giao lưu: điểm danh thời gian thực, sơ đồ sân kéo thả,
          ghép cặp thông minh, chia tiền minh bạch.
        </p>
        <div class="hero-ctas">
          <button
            v-if="!session"
            class="btn btn-primary btn-lg"
            @click="showCreate = true"
            id="btn-create-session"
          >
            🏸 Tạo buổi mới
          </button>
          <RouterLink v-else to="/live" class="btn btn-primary btn-lg" id="btn-go-live">
            📋 Vào buổi đang diễn ra →
          </RouterLink>
          <button class="btn btn-ghost btn-lg" @click="showPlayerMgr = true" id="btn-manage-players">
            👥 Quản lý thành viên
          </button>
        </div>
      </div>
      <div class="hero-shuttle" aria-hidden="true">🏸</div>
    </section>

    <!-- Feature cards -->
    <section class="features-section" aria-labelledby="features-heading">
      <h2 id="features-heading" class="sr-only">Tính năng</h2>
      <div class="features-grid">
        <div
          v-for="(feat, i) in FEATURES"
          :key="feat.title"
          class="feature-card card"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="feat-icon" aria-hidden="true">{{ feat.icon }}</div>
          <div class="feat-content">
            <h3 class="feat-title">{{ feat.title }}</h3>
            <p class="feat-desc muted">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Active session preview -->
    <section v-if="session" class="active-session-card card card-lit">
      <div class="as-header">
        <div class="pulse-dot" aria-hidden="true" style="width:10px;height:10px;border-radius:50%;background:var(--c-lime);animation:pulseLime 2s ease infinite"></div>
        <h2>{{ session.title }}</h2>
        <div class="as-meta muted">{{ session.venue }} · {{ formatDate(session.date) }}</div>
      </div>
      <div class="as-stats">
        <div class="as-stat">
          <div class="stat-number">{{ sessionStore.confirmedCount }}</div>
          <div class="label">Có mặt</div>
        </div>
        <div class="as-stat">
          <div class="stat-number">{{ session.courtCount }}</div>
          <div class="label">Sân</div>
        </div>
        <div class="as-stat">
          <div class="stat-number">{{ sessionStore.waitingPlayers.length }}</div>
          <div class="label">Chờ đấu</div>
        </div>
      </div>
      <div class="as-actions">
        <RouterLink to="/live" class="btn btn-primary" id="btn-goto-live">Vào màn quản lý →</RouterLink>
        <button class="btn btn-danger btn-sm" @click="confirmEndSession" id="btn-end-session">Kết thúc buổi</button>
      </div>
    </section>

    <!-- Player Manager Modal -->
    <Teleport to="body">
      <div v-if="showPlayerMgr" class="modal-mask" @click.self="showPlayerMgr = false" role="dialog" aria-modal="true" aria-labelledby="pm-title">
        <div class="modal-box player-mgr-modal">
          <div class="modal-header">
            <h3 id="pm-title">Danh sách thành viên</h3>
            <button class="btn btn-icon btn-ghost" @click="showPlayerMgr = false" aria-label="Đóng">✕</button>
          </div>

          <!-- Add player form -->
          <div class="add-player-form">
            <div class="form-row">
              <input
                v-model="newName"
                type="text"
                placeholder="Tên thành viên..."
                @keydown.enter="addPlayer"
                aria-label="Tên thành viên mới"
              />
              <select v-model="newSkill" aria-label="Trình độ">
                <option v-for="lvl in SKILL_LEVELS" :key="lvl.value" :value="lvl.value">{{ lvl.label }}</option>
              </select>
              <button class="btn btn-primary" @click="addPlayer" :disabled="!newName.trim()">+ Thêm</button>
            </div>
          </div>

          <hr class="divider" />

          <div class="pm-list">
            <div
              v-for="p in playerStore.players"
              :key="p.id"
              class="pm-row"
            >
              <div class="ar-avatar">{{ p.avatar }}</div>
              <div class="ar-info">
                <div class="ar-name">{{ p.name }}</div>
                <SkillBadge :skill="p.skill" />
              </div>
              <select
                :value="p.skill"
                @change="playerStore.updatePlayer(p.id, { skill: $event.target.value })"
                class="pm-skill-select"
                aria-label="Thay đổi trình độ"
              >
                <option v-for="lvl in SKILL_LEVELS" :key="lvl.value" :value="lvl.value">{{ lvl.label }}</option>
              </select>
              <button
                class="btn btn-icon btn-danger"
                @click="playerStore.removePlayer(p.id)"
                :aria-label="`Xóa ${p.name}`"
              >✕</button>
            </div>
            <div v-if="!playerStore.players.length" class="muted" style="text-align:center;padding:var(--sp-6)">
              Chưa có thành viên nào. Thêm ngay bên trên!
            </div>
          </div>
        </div>
      </div>

      <!-- Create Session Modal -->
      <div v-if="showCreate" class="modal-mask" @click.self="showCreate = false" role="dialog" aria-modal="true" aria-labelledby="cs-title">
        <div class="modal-box">
          <div class="modal-header">
            <h3 id="cs-title">Tạo buổi giao lưu mới</h3>
            <button class="btn btn-icon btn-ghost" @click="showCreate = false" aria-label="Đóng">✕</button>
          </div>
          <div class="create-session-form">
            <div class="input-group">
              <label for="cs-title-input">Tên buổi đấu</label>
              <input id="cs-title-input" v-model="form.title" type="text" placeholder="VD: Giao lưu thứ 7 tuần này" />
            </div>
            <div class="input-group">
              <label for="cs-venue">Địa điểm sân</label>
              <input id="cs-venue" v-model="form.venue" type="text" placeholder="VD: Sân cầu lông ABC, Q.7" />
            </div>
            <div class="form-row-2">
              <div class="input-group">
                <label for="cs-date">Ngày</label>
                <input id="cs-date" v-model="form.date" type="date" />
              </div>
              <div class="input-group">
                <label for="cs-time">Giờ bắt đầu</label>
                <input id="cs-time" v-model="form.startTime" type="time" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="input-group">
                <label for="cs-courts">Số sân</label>
                <input id="cs-courts" v-model.number="form.courtCount" type="number" min="1" max="10" />
              </div>
              <div class="input-group">
                <label for="cs-max">Tối đa người</label>
                <input id="cs-max" v-model.number="form.maxPlayers" type="number" min="4" max="100" />
              </div>
            </div>
            <button class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--sp-4)" @click="createSession" id="btn-confirm-create">
              🏸 Bắt đầu buổi giao lưu
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SkillBadge from '@/components/SkillBadge.vue'
import { useSessionStore, usePlayerStore, SKILL_LEVELS } from '@/stores/index.js'

const router       = useRouter()
const sessionStore = useSessionStore()
const playerStore  = usePlayerStore()

const session = computed(() => sessionStore.session)

// Modals
const showCreate    = ref(false)
const showPlayerMgr = ref(false)

// Create session form
const form = ref({
  title:      'Giao lưu cầu lông',
  venue:      '',
  date:       new Date().toISOString().slice(0, 10),
  startTime:  '08:00',
  courtCount: 3,
  maxPlayers: 20,
})

function createSession() {
  sessionStore.createSession(form.value)
  showCreate.value = false
  router.push('/live')
}

function confirmEndSession() {
  if (confirm('Kết thúc buổi giao lưu? Dữ liệu sẽ được lưu vào lịch sử.')) {
    sessionStore.endSession()
  }
}

// Player manager
const newName  = ref('')
const newSkill = ref('medium')

function addPlayer() {
  if (!newName.value.trim()) return
  playerStore.addPlayer({ name: newName.value, skill: newSkill.value })
  newName.value = ''
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

const FEATURES = [
  {
    icon: '📋',
    title: 'Điểm danh thời gian thực',
    desc: 'Xác nhận tham gia, báo vắng, thêm khách. Số liệu cập nhật tức thì.',
  },
  {
    icon: '🏟️',
    title: 'Sơ đồ sân kéo thả',
    desc: 'Kéo thả người chơi vào từng sân. Xem ngay ai đang đấu, ai chờ.',
  },
  {
    icon: '⚡',
    title: 'Ghép cặp thông minh',
    desc: 'Tự động ghép cặp cân bằng theo trình độ. Đảm bảo trận đấu competitive.',
  },
  {
    icon: '💰',
    title: 'Chia tiền minh bạch',
    desc: 'Tổng hợp chi phí, chia đều tự động. QR code thanh toán nhanh.',
  },
]
</script>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
  padding: 0 var(--sp-8) var(--sp-16);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

/* Hero */
.hero {
  position: relative;
  padding: var(--sp-16) 0 var(--sp-12);
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hero-bg-lines {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 80px;
  padding: 0 20px;
  pointer-events: none;
}
.bg-line {
  width: 1px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, rgba(181,255,26,0.06), transparent);
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.hero-eyebrow {
  color: var(--c-lime);
  letter-spacing: 0.15em;
}
.hero-title-main {
  display: block;
  color: var(--c-text);
}
.hero-title-accent {
  display: block;
  color: var(--c-lime);
  /* Outline effect */
  -webkit-text-stroke: 2px var(--c-lime);
  color: transparent;
}
.hero-desc {
  font-size: 1rem;
  max-width: 520px;
  color: var(--c-text-muted);
  line-height: 1.8;
}
.hero-ctas {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.hero-shuttle {
  position: absolute;
  right: -20px;
  font-size: clamp(6rem, 15vw, 12rem);
  opacity: 0.06;
  transform: rotate(-20deg);
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 0 60px rgba(181,255,26,0.3));
}

/* Features */
.features-section { display: flex; flex-direction: column; gap: var(--sp-6); }
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-4);
}
.feature-card {
  display: flex;
  gap: var(--sp-4);
  align-items: flex-start;
  animation: fadeInUp var(--t-slow) var(--ease-sport) both;
}
.feat-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
  line-height: 1;
}
.feat-content { display: flex; flex-direction: column; gap: var(--sp-2); }
.feat-title { font-size: 0.95rem; color: var(--c-text); }
.feat-desc { font-size: 0.82rem; line-height: 1.6; }

/* Active session */
.active-session-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.as-header { display: flex; align-items: center; gap: var(--sp-3); flex-wrap: wrap; }
.as-meta { font-size: 0.85rem; }
.as-stats { display: flex; gap: var(--sp-8); flex-wrap: wrap; }
.as-stat { display: flex; flex-direction: column; gap: var(--sp-1); }
.as-actions { display: flex; gap: var(--sp-3); flex-wrap: wrap; }

/* Player manager modal */
.player-mgr-modal { max-width: 560px; }
.add-player-form .form-row { display: flex; gap: var(--sp-3); flex-wrap: wrap; }
.add-player-form input { flex: 1; min-width: 120px; }
.add-player-form select { width: 110px; }
.pm-list { display: flex; flex-direction: column; gap: var(--sp-2); max-height: 360px; overflow-y: auto; }
.pm-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--c-surface-2);
  border-radius: var(--r-sm);
}
.ar-avatar {
  width: 34px;
  height: 34px;
  background: var(--c-surface);
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
.pm-skill-select { width: 100px; font-size: 0.8rem; padding: var(--sp-2) var(--sp-2); }

/* Create session form */
.create-session-form { display: flex; flex-direction: column; gap: var(--sp-4); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }

@media (max-width: 640px) {
  .home-view { padding: 0 var(--sp-4) var(--sp-12); gap: var(--sp-10); }
  .hero { padding: var(--sp-10) 0 var(--sp-8); }
  .form-row-2 { grid-template-columns: 1fr; }
}
</style>
