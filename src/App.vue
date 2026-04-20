<template>
  <AppNav />

  <main id="main-content" class="app-main">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="$route.path" />
      </Transition>
    </RouterView>
  </main>

  <footer class="app-footer" role="contentinfo">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-shuttle" aria-hidden="true">🏸</span>
        <div>
          <div class="footer-app-name">Badminton Setup</div>
          <div class="footer-tagline">Thiết kế team Cầu Lông cho bạn</div>
        </div>
      </div>
      <div class="footer-meta">
        <div class="footer-credit">
          Designed by <a href="https://www.facebook.com/mtdes233/" target="_blank" rel="noopener" aria-label="Facebook của mtdes23">mtdes23</a>
        </div>
        <a class="footer-url" href="https://www.mtdes23.id.vn" target="_blank" rel="noopener">
          www.mtdes23.id.vn
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
import AppNav from '@/components/AppNav.vue'
</script>

<style>
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--t-mid) var(--ease-sport),
    transform var(--t-mid) var(--ease-sport);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Footer */
.app-footer {
  margin-top: auto;
  border-top: 1px solid var(--c-border);
  padding: var(--sp-6) var(--sp-8);
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-4);
  max-width: 1100px;
  margin: 0 auto;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.footer-shuttle { font-size: 1.4rem; opacity: 0.6; }
.footer-app-name {
  font-family: var(--f-display);
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-text-muted);
}
.footer-tagline { font-size: 0.72rem; color: var(--c-text-dim); }
.footer-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}
.footer-credit { font-size: 0.8rem; color: var(--c-text-dim); }
.footer-credit a { color: var(--c-lime); }
.footer-url {
  font-size: 0.78rem;
  color: var(--c-text-muted);
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 1px;
  transition: color var(--t-fast);
}
.footer-url:hover { color: var(--c-lime); border-color: var(--c-lime); }

@media (max-width: 640px) {
  .app-footer { padding: var(--sp-5) var(--sp-4); }
}
</style>
