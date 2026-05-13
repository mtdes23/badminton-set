import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Lazy-loaded Views for better performance
const HomeView = () => import('./views/HomeView.vue')
const LiveView = () => import('./views/LiveView.vue')
const HistoryView = () => import('./views/HistoryView.vue')
const SharedLiveView = () => import('./views/SharedLiveView.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',             name: 'home',       component: HomeView },
    { path: '/live/:id?',         name: 'live',       component: LiveView },
    { path: '/history',      name: 'history',    component: HistoryView },
    { path: '/shared/:uid/:token', name: 'shared',    component: SharedLiveView },
  ],
  scrollBehavior: () => ({ top: 0 })
})

const pinia = createPinia()
const app   = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
