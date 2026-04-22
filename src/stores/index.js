import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, doc,
  onSnapshot,
  setDoc, updateDoc, deleteDoc, addDoc,
} from 'firebase/firestore'
import { db } from '@/firebase.js'

export const SKILL_LEVELS = [
  { value: 'weak',   label: 'Yếu',        color: '#666',    score: 1 },
  { value: 'medium', label: 'Trung bình',  color: '#FFB800', score: 2 },
  { value: 'good',   label: 'Khá',         color: '#00C2FF', score: 3 },
  { value: 'pro',    label: 'Giỏi',        color: '#B5FF1A', score: 4 },
]

export const BANK_LIST = [
  { id: 'vietcombank', name: 'Vietcombank', bin: '970436' },
  { id: 'mbbank', name: 'MB Bank', bin: '970422' },
  { id: 'techcombank', name: 'Techcombank', bin: '970407' },
  { id: 'acb', name: 'ACB', bin: '970416' },
  { id: 'tpbank', name: 'TPBank', bin: '970423' },
  { id: 'vpbank', name: 'VPBank', bin: '970432' },
  { id: 'bidv', name: 'BIDV', bin: '970418' },
  { id: 'agribank', name: 'Agribank', bin: '970405' },
  { id: 'viettinbank', name: 'VietinBank', bin: '970415' },
  { id: 'sacombank', name: 'Sacombank', bin: '970403' },
  { id: 'momo', name: 'MoMo', bin: 'momo' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
}

function buildCourts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id:    `court-${i + 1}`,
    label: `Sân ${i + 1}`,
    slots: [null, null, null, null],
  }))
}

/** Deep-clone via JSON so nested arrays/objects are safe to mutate */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// ─── Player Store ─────────────────────────────────────────────────────────────

export const usePlayerStore = defineStore('players', () => {
  const players = ref([])
  const loading = ref(true)

  // Real-time listener — all devices see changes instantly
  onSnapshot(collection(db, 'players'), (snap) => {
    players.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    loading.value = false
  })

  async function addPlayer(data) {
    return await addDoc(collection(db, 'players'), {
      name:      data.name.trim(),
      skill:     data.skill || 'medium',
      phone:     data.phone || '',
      avatar:    getInitials(data.name),
      createdAt: Date.now(),
    })
  }

  async function updatePlayer(id, data) {
    await updateDoc(doc(db, 'players', id), data)
  }

  async function removePlayer(id) {
    await deleteDoc(doc(db, 'players', id))
  }

  const skillInfo = computed(() => (skill) =>
    SKILL_LEVELS.find(s => s.value === skill) || SKILL_LEVELS[1]
  )

  return { players, loading, addPlayer, updatePlayer, removePlayer, skillInfo }
})

// ─── Session Store ────────────────────────────────────────────────────────────

/**
 * All session state lives in a single Firestore document: app/state
 * { currentSession: {...} | null, history: [...] }
 *
 * onSnapshot keeps every connected device in sync in real-time.
 */
export const useSessionStore = defineStore('session', () => {
  const session = ref(null)
  const history = ref([])
  const loading = ref(true)

  const STATE_REF = doc(db, 'app', 'state')

  // Real-time listener
  onSnapshot(STATE_REF, (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      session.value = data.currentSession ?? null
      history.value = data.history ?? []
    } else {
      session.value = null
      history.value = []
    }
    loading.value = false
  })

  // ── Session lifecycle ─────────────────────────────────────────────────────

  async function createSession(data) {
    const s = {
      id:         `s${Date.now()}`,
      title:      data.title      || 'Buổi giao lưu',
      venue:      data.venue      || '',
      date:       data.date       || new Date().toISOString().slice(0, 10),
      startTime:  data.startTime  || '08:00',
      courtCount: data.courtCount || 3,
      maxPlayers: data.maxPlayers || 20,
      deadline:   data.deadline   || null,
      courts:     buildCourts(data.courtCount || 3),
      attendees:  [],
      expenses:   [],
      matchLog:   [],
      status:     'active',
      hostUid:    data.hostUid    || null,
      hostBankInfo: data.hostBankInfo || null,
      createdAt:  Date.now(),
    }
    await setDoc(STATE_REF, { currentSession: s }, { merge: true })
  }

  async function endSession() {
    if (!session.value) return
    const closed = { ...clone(session.value), status: 'closed', closedAt: Date.now() }
    const newHistory = [closed, ...history.value].slice(0, 30)
    await setDoc(STATE_REF, { currentSession: null, history: newHistory })
  }

  // ── Internal helper: clone → mutate → push ────────────────────────────────

  async function _patch(mutator) {
    if (!session.value) return
    const updated = mutator(clone(session.value))
    await updateDoc(STATE_REF, { currentSession: updated })
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  async function setAttendance(playerId, status, guestName = '') {
    await _patch(s => {
      const idx = s.attendees.findIndex(a => a.playerId === playerId)
      if (idx > -1) {
        s.attendees[idx] = { ...s.attendees[idx], status, guestName }
      } else {
        s.attendees.push({ playerId, status, guestName })
      }
      return s
    })
  }

  async function removeAttendee(playerId) {
    await _patch(s => {
      s.attendees = s.attendees.filter(a => a.playerId !== playerId)
      return s
    })
  }

  // ── Courts ────────────────────────────────────────────────────────────────

  async function assignPlayerToCourt(courtId, slot, playerId) {
    await _patch(s => {
      const court = s.courts.find(c => c.id === courtId)
      if (court) court.slots[slot] = playerId
      return s
    })
  }

  async function removeFromCourt(courtId, slot) {
    await _patch(s => {
      const court = s.courts.find(c => c.id === courtId)
      if (court) court.slots[slot] = null
      return s
    })
  }

  async function clearCourt(courtId) {
    await _patch(s => {
      const court = s.courts.find(c => c.id === courtId)
      if (court) court.slots = [null, null, null, null]
      return s
    })
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  async function addExpense(data) {
    await _patch(s => {
      s.expenses.push({
        id:     `e${Date.now()}`,
        label:  data.label,
        amount: Number(data.amount),
        paidBy: data.paidBy || null,
      })
      return s
    })
  }

  async function removeExpense(id) {
    await _patch(s => {
      s.expenses = s.expenses.filter(e => e.id !== id)
      return s
    })
  }

  // ── Share Links ──────────────────────────────────────────────────────────

  async function generateShareToken() {
    if (!session.value) return null
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    await _patch(s => {
      s.shareToken = token
      s.shareCreatedAt = Date.now()
      return s
    })
    return token
  }

  async function revokeShareToken() {
    if (!session.value) return
    await _patch(s => {
      s.shareToken = null
      delete s.shareToken
      return s
    })
  }

  const shareUrl = computed(() => {
    if (!session.value?.shareToken) return null
    const baseUrl = window.location.origin + window.location.pathname.replace('/index.html', '')
    return `${baseUrl}#/shared/${session.value.shareToken}`
  })

  // ── Computed ──────────────────────────────────────────────────────────────

  const confirmedCount = computed(() =>
    session.value?.attendees.filter(a => a.status === 'confirmed').length ?? 0
  )

  const totalExpense = computed(() =>
    session.value?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0
  )

  const perPersonCost = computed(() => {
    const count = confirmedCount.value
    if (!count) return 0
    return Math.ceil(totalExpense.value / count)
  })

  const waitingPlayers = computed(() => {
    if (!session.value) return []
    const onCourt = new Set(
      session.value.courts.flatMap(c => c.slots).filter(Boolean)
    )
    return session.value.attendees
      .filter(a => a.status === 'confirmed' && !onCourt.has(a.playerId))
      .map(a => a.playerId)
  })

  return {
    session, history, loading,
    createSession, endSession,
    setAttendance, removeAttendee,
    assignPlayerToCourt, removeFromCourt, clearCourt,
    addExpense, removeExpense,
    generateShareToken, revokeShareToken, shareUrl,
    confirmedCount, totalExpense, perPersonCost, waitingPlayers,
  }
})
