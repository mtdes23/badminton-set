import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Views
import HomeView from './views/HomeView.vue'
import LiveView from './views/LiveView.vue'
import HistoryView from './views/HistoryView.vue'
import SharedLiveView from './views/SharedLiveView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',             name: 'home',       component: HomeView },
    { path: '/live',         name: 'live',       component: LiveView },
    { path: '/history',      name: 'history',    component: HistoryView },
    { path: '/shared/:token', name: 'shared',    component: SharedLiveView },
  ],
  scrollBehavior: () => ({ top: 0 })
})

const pinia = createPinia()
const app   = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
