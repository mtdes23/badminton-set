import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  collection, doc,
  onSnapshot,
  setDoc, updateDoc, deleteDoc, addDoc, deleteField,
} from 'firebase/firestore'
import { db } from '@/firebase.js'

import { useAuthStore } from '@/stores/auth.js'
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

/** Deep-clone via structuredClone (faster than JSON round-trip) */
function clone(obj) {
  return structuredClone(obj)
}

// ─── Player Store ─────────────────────────────────────────────────────────────

export const usePlayerStore = defineStore('players', () => {
  const authStore = useAuthStore()
  const players = ref([])
  const loading = ref(true)

  let unsub = null

  const hostUid = computed(() => {
    // Determine the owner of the players list
    const sessionStore = useSessionStore()
    return sessionStore.sharedHostUid || authStore.user?.uid || null
  })

  watch(hostUid, (uid) => {
    if (unsub) {
      unsub()
      unsub = null
    }
    loading.value = true
    if (uid) {
      const playersRef = collection(db, 'users', uid, 'players')
      unsub = onSnapshot(playersRef, (snap) => {
        players.value = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => !p.isSharedSession)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        loading.value = false
      }, (error) => {
        console.error('Error listening to players:', error)
        loading.value = false
      })
    } else {
      players.value = []
      loading.value = false
    }
  }, { immediate: true })

  async function addPlayer(data) {
    try {
      const uid = hostUid.value
      if (!uid) throw new Error('No host uid found')
      return await addDoc(collection(db, 'users', uid, 'players'), {
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
      const uid = hostUid.value
      if (!uid) return
      await updateDoc(doc(db, 'users', uid, 'players', id), data)
    } catch (error) {
      console.error('Error updating player:', error)
      throw error
    }
  }

  async function removePlayer(id) {
    try {
      const uid = hostUid.value
      if (!uid) return
      await deleteDoc(doc(db, 'users', uid, 'players', id))
    } catch (error) {
      console.error('Error removing player:', error)
      throw error
    }
  }

  return { players, loading, addPlayer, updatePlayer, removePlayer }
})

// ─── Session Store ────────────────────────────────────────────────────────────



/**
 * Session state logic: Each user has their own session doc at sessions/{uid}.
 *
 * onSnapshot keeps every connected device in sync in real-time.
 */
export const useSessionStore = defineStore('session', () => {
  const authStore = useAuthStore()
  
  const activeSessions = ref([])
  const history = ref([])
  const loading = ref(true)
  const activeSessionId = ref(null)
  
  const session = computed(() => {
    return activeSessions.value.find(s => s.id === activeSessionId.value) || activeSessions.value[0] || null
  })
  const shareToken = computed(() => session.value?.shareToken || null)
  
  const sharedHostUid = ref(null) // NEW: Track if we are viewing someone else's session
  
  function setActiveSession(id) {
    activeSessionId.value = id
  }
  
  // Public mirror for shared sessions
  const publicSharedSessions = ref({})

  // Listen to global app state to get public shared sessions (store unsub)
  let unsubPublic = null
  unsubPublic = onSnapshot(doc(db, 'app', 'state'), (snap) => {
    if (snap.exists()) {
      publicSharedSessions.value = snap.data().sharedSessions || {}
    }
  })

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
        
        // Backwards compatibility
        let active = data.activeSessions || []
        if (data.currentSession && active.length === 0) {
          active = [data.currentSession]
        }
        
        activeSessions.value = active
        history.value = data.history ?? []
      } else {
        activeSessions.value = []
        history.value = []
      }
      loading.value = false
    }, (error) => {
      console.error('Error listening to session:', error)
      loading.value = false
    })
  }

  function bindSharedSession(hostUid) {
    sharedHostUid.value = hostUid
    bindSessionListener(hostUid)
  }

  // Bind listener when store initializes (only if not viewing a shared session)
  watch(() => authStore.user, (user) => {
    if (!sharedHostUid.value) {
      bindSessionListener(user?.uid)
    }
  }, { immediate: true })

  // Helper to get the correct document reference for writing
  const stateRef = computed(() => {
    if (sharedHostUid.value) return doc(db, 'sessions', sharedHostUid.value)
    const uid = authStore.user?.uid
    return uid ? doc(db, 'sessions', uid) : doc(db, 'app', 'state')
  })

  // ── Session lifecycle ─────────────────────────────────────────────────────

  async function createSession(data) {
    try {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase()
      const s = {
        id:         `s${Date.now()}`,
        shareToken: token,
        password:   data.password   || null,
        shareCreatedAt: Date.now(),
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
      
      const newActive = [...activeSessions.value, s]
      await setDoc(stateRef.value, { activeSessions: newActive, currentSession: null }, { merge: true })
      
      // Auto-publish to public Live list
      await setDoc(doc(db, 'app', 'state'), {
        sharedSessions: {
          [token]: {
            uid: authStore.user?.uid || null,
            token: token,
            title: s.title,
            venue: s.venue,
            hostName: authStore.user?.displayName || 'Quản lý',
            hasPassword: !!s.password,
            password: s.password,
            createdAt: Date.now()
          }
        }
      }, { merge: true }).catch(console.error)
      
      return s.id
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
      const newActive = activeSessions.value.filter(s => s.id !== session.value.id)
      
      // Clear public mirror if it exists
      if (session.value.shareToken) {
        await setDoc(doc(db, 'app', 'state'), {
          sharedSessions: {
            [session.value.shareToken]: deleteField()
          }
        }, { merge: true }).catch(() => {})
      }
      
      await setDoc(stateRef.value, { activeSessions: newActive, history: newHistory, currentSession: null }, { merge: true })
      activeSessionId.value = null
    } catch (error) {
      console.error('Error ending session:', error)
      throw error
    }
  }

  // ── Internal helper: clone → mutate → push ────────────────────────────────

  async function _patch(mutator) {
    if (!session.value) return
    try {
      const idx = activeSessions.value.findIndex(s => s.id === session.value.id)
      if (idx === -1) return
      
      const updated = mutator(clone(activeSessions.value[idx]))
      const newActive = [...activeSessions.value]
      newActive[idx] = updated
      
      await updateDoc(stateRef.value, { activeSessions: newActive })
    } catch (error) {
      console.error('Error patching session:', error)
      throw error
    }
  }

  // ── Auto-process Self-Attendance Requests ─────────────────────────────────
  
  let playerStoreInstance = null
  
  // Only track the attending_session field, not the entire players array
  const pendingAttendanceIds = computed(() => {
    if (!playerStoreInstance) {
      playerStoreInstance = usePlayerStore()
    }
    return playerStoreInstance.players
      .filter(p => p.attending_session)
      .map(p => ({ id: p.id, attending_session: p.attending_session }))
  })
  
  watch(pendingAttendanceIds, async (pending) => {
    if (!session.value || !authStore.user || !pending || pending.length === 0) return
    if (session.value.hostUid !== authStore.user.uid) return
    
    const sessionId = session.value.id
    const playersToProcess = pending.filter(p => p.attending_session === sessionId)
    
    if (playersToProcess.length === 0) return
    
    console.log('Processing self-attendance for:', playersToProcess.length, 'players')
    
    await _patch(s => {
      playersToProcess.forEach(player => {
        const attendee = s.attendees.find(a => a.playerId === player.id)
        if (attendee) {
          attendee.status = 'confirmed'
        } else {
          s.attendees.push({
            playerId: player.id,
            status: 'confirmed',
            type: 'guest',
            payment: 0
          })
        }
      })
      return s
    })
    
    // Clear flags from players collection to acknowledge
    for (const player of playersToProcess) {
      try {
        await updateDoc(doc(db, 'users', authStore.user.uid, 'players', player.id), {
          attending_session: null
        })
      } catch (e) {
        console.error('Error clearing attendance flag:', e)
      }
    }
  })

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
    if (!sharedHostUid.value) {
      bindSessionListener(newUid)
    }
  })

  // ── Share Links ──────────────────────────────────────────────────────────

  async function generateShareToken(password = null) {
    if (!session.value) return null
    try {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase()
      const finalPassword = password || session.value.password || null
      
      await _patch(s => {
        s.shareToken = token
        s.shareCreatedAt = Date.now()
        if (password !== null) s.password = password
        return s
      })
      
      await setDoc(doc(db, 'app', 'state'), {
        sharedSessions: {
          [token]: {
            uid: authStore.user?.uid || session.value.hostUid,
            token: token,
            title: session.value.title,
            venue: session.value.venue,
            hostName: authStore.user?.displayName || 'Quản lý',
            hasPassword: !!finalPassword,
            password: finalPassword,
            createdAt: Date.now()
          }
        }
      }, { merge: true }).catch(console.error)
      
      return token
    } catch (error) {
      console.error('Error generating share token:', error)
      throw error
    }
  }

  async function revokeShareToken() {
    if (!session.value) return
    const currentToken = session.value.shareToken
    try {
      await _patch(s => {
        s.shareToken = null
        s.shareCreatedAt = null
        return s
      })
      
      if (currentToken) {
        await setDoc(doc(db, 'app', 'state'), {
          sharedSessions: {
            [currentToken]: deleteField()
          }
        }, { merge: true }).catch(console.error)
      }
    } catch (error) {
      console.error('Error revoking share token:', error)
      throw error
    }
  }



  const shareUrl = computed(() => {
    if (!session.value || !shareToken.value) return null
    
    const uid = authStore.user?.uid || session.value.hostUid
    if (!uid) return null
    
    let baseUrl = window.location.origin + window.location.pathname
    if (baseUrl.endsWith('/index.html')) {
      baseUrl = baseUrl.replace('/index.html', '/')
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/'
    }
    
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
    const onCourt = new Set()
    for (const court of session.value.courts) {
      for (const slot of court.slots) {
        if (slot) onCourt.add(slot)
      }
    }
    return session.value.attendees
      .filter(a => a.status === 'confirmed' && !onCourt.has(a.playerId))
      .map(a => a.playerId)
  })

  return {
    activeSessions, session, history, loading, shareToken, publicSharedSessions,
    setActiveSession, createSession, endSession,
    setAttendance, removeAttendee,
    assignPlayerToCourt, removeFromCourt, clearCourt, assignMultiplePlayersToCourt,
    addExpense, removeExpense,
    generateShareToken, revokeShareToken, shareUrl,
    confirmedCount, totalExpense, perPersonCost, waitingPlayers,
    bindSessionListener, bindSharedSession, sharedHostUid, // Expose for manual calls if needed
  }
})
