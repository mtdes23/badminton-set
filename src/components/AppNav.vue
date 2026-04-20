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
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/index.js'

const router  = useRouter()
const store   = useSessionStore()
const session = computed(() => store.session)

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
  max-width: 200px;
  overflow: hidden;
}
.nav-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 640px) {
  .app-nav { padding: 0 var(--sp-4); gap: var(--sp-4); }
  .nav-link-text { display: none; }
  .nav-sub { display: none; }
}
</style>
