import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
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
      .filter(p => !p.isSharedSession) // Hide shared sessions from player list
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    loading.value = false
  }, (error) => {
    console.error('Error listening to players:', error)
    loading.value = false
  })

  async function addPlayer(data) {
    try {
      return await addDoc(collection(db, 'players'), {
        name:      data.name.trim(),
        skill:     data.skill || 'medium',
        phone:     data.phone || '',
        avatar:    getInitials(data.name),
        createdAt: Date.now(),
      })
    } catch (error) {
      console.error('Error adding player:', error)
      throw error
    }
  }

  async function updatePlayer(id, data) {
    try {
      await updateDoc(doc(db, 'players', id), data)
    } catch (error) {
      console.error('Error updating player:', error)
      throw error
    }
  }

  async function removePlayer(id) {
    try {
      await deleteDoc(doc(db, 'players', id))
    } catch (error) {
      console.error('Error removing player:', error)
      throw error
    }
  }

  const skillInfo = computed(() => (skill) =>
    SKILL_LEVELS.find(s => s.value === skill) || SKILL_LEVELS[1]
  )

  return { players, loading, addPlayer, updatePlayer, removePlayer, skillInfo }
})

// ─── Session Store ────────────────────────────────────────────────────────────

import { useAuthStore } from '@/stores/auth.js'

/**
 * Session state logic: Each user has their own session doc at sessions/{uid}.
 *
 * onSnapshot keeps every connected device in sync in real-time.
 */
export const useSessionStore = defineStore('session', () => {
  const authStore = useAuthStore()
  
  const session = ref(null)
  const history = ref([])
  const loading = ref(true)
  const shareToken = ref(null)

  let unsub = null

  // Function to bind listener to a specific path
  function bindSessionListener(uid) {
    if (unsub) unsub()
    
    loading.value = true
    const path = uid ? `sessions/${uid}` : 'app/state' // Fallback for legacy or anonymous
    const refDoc = doc(db, path)
    
    unsub = onSnapshot(refDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        session.value = data.currentSession ?? null
        history.value = data.history ?? []
        shareToken.value = data.shareToken ?? null
      } else {
        session.value = null
        history.value = []
        shareToken.value = null
      }
      loading.value = false
    }, (err) => {
      console.error('Session listener error:', err)
      loading.value = false
    })
  }

  // Bind listener when store initializes
  bindSessionListener(authStore.user?.uid)

  // Helper to get the correct document reference for writing
  const stateRef = computed(() => {
    const uid = authStore.user?.uid
    return uid ? doc(db, 'sessions', uid) : doc(db, 'app', 'state')
  })

  // ── Session lifecycle ─────────────────────────────────────────────────────

  async function createSession(data) {
    try {
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
        hostUid:    authStore.user?.uid || null,
        hostBankInfo: authStore.bankInfo || null,
        createdAt:  Date.now(),
      }
      await setDoc(stateRef.value, { currentSession: s }, { merge: true })
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }

  async function endSession() {
    if (!session.value) return
    try {
      const closed = { ...clone(session.value), status: 'closed', closedAt: Date.now() }
      const newHistory = [closed, ...history.value].slice(0, 30)
      
      // Clear public mirror if it exists
      if (shareToken.value) {
        await deleteDoc(doc(db, 'players', `share_${shareToken.value}`)).catch(() => {})
      }
      
      await setDoc(stateRef.value, { currentSession: null, history: newHistory })
    } catch (error) {
      console.error('Error ending session:', error)
      throw error
    }
  }

  // ── Internal helper: clone → mutate → push ────────────────────────────────

  async function _patch(mutator) {
    if (!session.value) return
    try {
      const updated = mutator(clone(session.value))
      await updateDoc(stateRef.value, { currentSession: updated })
      
      // Mirror to public document if sharing is active
      if (shareToken.value) {
        await updateDoc(doc(db, 'players', `share_${shareToken.value}`), {
          currentSession: updated,
          updatedAt: Date.now()
        }).catch(err => console.warn('Public mirror sync failed:', err))
      }
    } catch (error) {
      console.error('Error patching session:', error)
      throw error
    }
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

  async function assignMultiplePlayersToCourt(courtId, assignments) {
    await _patch(s => {
      const court = s.courts.find(c => c.id === courtId)
      if (court) {
        assignments.forEach(({ slot, playerId }) => {
          court.slots[slot] = playerId
        })
      }
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

  // Re-bind when user changes (login/logout)
  watch(() => authStore.user?.uid, (newUid) => {
    bindSessionListener(newUid)
  })

  // ── Share Links ──────────────────────────────────────────────────────────

  async function generateShareToken() {
    if (!session.value) return null
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      // Save share token in the user's specific session document
      await setDoc(stateRef.value, { 
        shareToken: token,
        shareCreatedAt: Date.now(),
      }, { merge: true })
      
      // Create public mirror document to bypass strict rules
      await setDoc(doc(db, 'players', `share_${token}`), {
        isSharedSession: true,
        shareToken: token,
        currentSession: session.value,
        hostUid: authStore.user?.uid || 'app',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
      
      return token
    } catch (error) {
      console.error('Error generating share token:', error)
      throw error
    }
  }

  async function revokeShareToken() {
    if (!session.value) return
    try {
      const currentToken = shareToken.value
      // Remove share token
      await setDoc(stateRef.value, { 
        shareToken: null,
        shareCreatedAt: null,
      }, { merge: true })
      
      // Delete public mirror
      if (currentToken) {
        await deleteDoc(doc(db, 'players', `share_${currentToken}`)).catch(() => {})
      }
    } catch (error) {
      console.error('Error revoking share token:', error)
      throw error
    }
  }

  const shareUrl = computed(() => {
    if (!session.value || !shareToken.value) return null
    
    const uid = authStore.user?.uid || 'app'
    
    // Robust way to get the base URL for hash routing without stripping subpaths
    let baseUrl = window.location.origin + window.location.pathname
    if (baseUrl.endsWith('/index.html')) {
      baseUrl = baseUrl.replace('/index.html', '/')
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/'
    }
    
    // Include UID in the link so SharedView knows which document to read
    return `${baseUrl}#/shared/${uid}/${shareToken.value}`
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
    session, history, loading, shareToken,
    createSession, endSession,
    setAttendance, removeAttendee,
    assignPlayerToCourt, removeFromCourt, clearCourt, assignMultiplePlayersToCourt,
    addExpense, removeExpense,
    generateShareToken, revokeShareToken, shareUrl,
    confirmedCount, totalExpense, perPersonCost, waitingPlayers,
    bindSessionListener, // Expose for manual calls if needed
  }
})
