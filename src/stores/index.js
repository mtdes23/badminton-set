import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const SKILL_LEVELS = [
  { value: 'weak',   label: 'Yếu',    color: '#666',    score: 1 },
  { value: 'medium', label: 'Trung bình', color: '#FFB800', score: 2 },
  { value: 'good',   label: 'Khá',    color: '#00C2FF', score: 3 },
  { value: 'pro',    label: 'Giỏi',   color: '#B5FF1A', score: 4 },
]

let _nextId = 1
function genId() { return `p${_nextId++}` }

export const usePlayerStore = defineStore('players', () => {
  const players = ref(loadFromStorage('bs_players', []))

  function save() {
    localStorage.setItem('bs_players', JSON.stringify(players.value))
  }

  function addPlayer(data) {
    players.value.push({
      id:        genId(),
      name:      data.name.trim(),
      skill:     data.skill || 'medium',
      phone:     data.phone || '',
      avatar:    data.avatar || getInitials(data.name),
      createdAt: Date.now(),
    })
    save()
  }

  function updatePlayer(id, data) {
    const idx = players.value.findIndex(p => p.id === id)
    if (idx > -1) {
      players.value[idx] = { ...players.value[idx], ...data }
      save()
    }
  }

  function removePlayer(id) {
    players.value = players.value.filter(p => p.id !== id)
    save()
  }

  const skillInfo = computed(() => (skill) =>
    SKILL_LEVELS.find(s => s.value === skill) || SKILL_LEVELS[1]
  )

  return { players, addPlayer, updatePlayer, removePlayer, skillInfo }
})

// --- Session Store ---
export const useSessionStore = defineStore('session', () => {
  const session = ref(loadFromStorage('bs_session', null))
  const history = ref(loadFromStorage('bs_history', []))

  function save() {
    localStorage.setItem('bs_session', JSON.stringify(session.value))
    localStorage.setItem('bs_history', JSON.stringify(history.value))
  }

  function createSession(data) {
    session.value = {
      id:          `s${Date.now()}`,
      title:       data.title || 'Buổi giao lưu',
      venue:       data.venue || '',
      date:        data.date  || new Date().toISOString().slice(0, 10),
      startTime:   data.startTime || '08:00',
      courtCount:  data.courtCount || 3,
      maxPlayers:  data.maxPlayers || 20,
      deadline:    data.deadline || null,
      courts:      buildCourts(data.courtCount || 3),
      attendees:   [],       // [{ playerId, status:'confirmed'|'absent'|'guest', guestName? }]
      expenses:    [],       // [{ id, label, amount, paidBy? }]
      matchLog:    [],       // [{ courtId, players:[ids], startedAt, endedAt? }]
      status:      'active', // active | closed
      createdAt:   Date.now(),
    }
    save()
  }

  function endSession() {
    if (!session.value) return
    session.value.status = 'closed'
    session.value.closedAt = Date.now()
    // archive
    const archived = { ...session.value }
    history.value.unshift(archived)
    if (history.value.length > 30) history.value.pop()
    session.value = null
    save()
  }

  // --- Attendance ---
  function setAttendance(playerId, status, guestName = '') {
    if (!session.value) return
    const existing = session.value.attendees.find(a => a.playerId === playerId)
    if (existing) {
      existing.status    = status
      existing.guestName = guestName
    } else {
      session.value.attendees.push({ playerId, status, guestName })
    }
    save()
  }

  function removeAttendee(playerId) {
    if (!session.value) return
    session.value.attendees = session.value.attendees.filter(a => a.playerId !== playerId)
    save()
  }

  // --- Courts / Court Diagram ---
  function assignPlayerToCourt(courtId, slot, playerId) {
    if (!session.value) return
    const court = session.value.courts.find(c => c.id === courtId)
    if (court) {
      court.slots[slot] = playerId
      save()
    }
  }

  function removeFromCourt(courtId, slot) {
    if (!session.value) return
    const court = session.value.courts.find(c => c.id === courtId)
    if (court) {
      court.slots[slot] = null
      save()
    }
  }

  function clearCourt(courtId) {
    if (!session.value) return
    const court = session.value.courts.find(c => c.id === courtId)
    if (court) {
      court.slots = [null, null, null, null]
      save()
    }
  }

  // --- Expenses ---
  function addExpense(data) {
    if (!session.value) return
    session.value.expenses.push({
      id:     `e${Date.now()}`,
      label:  data.label,
      amount: Number(data.amount),
      paidBy: data.paidBy || null,
    })
    save()
  }

  function removeExpense(id) {
    if (!session.value) return
    session.value.expenses = session.value.expenses.filter(e => e.id !== id)
    save()
  }

  // --- Computed ---
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
    session, history,
    createSession, endSession,
    setAttendance, removeAttendee,
    assignPlayerToCourt, removeFromCourt, clearCourt,
    addExpense, removeExpense,
    confirmedCount, totalExpense, perPersonCost, waitingPlayers,
  }
})

// --- Helpers ---
function buildCourts(count) {
  return Array.from({ length: count }, (_, i) => ({
    id:    `court-${i + 1}`,
    label: `Sân ${i + 1}`,
    slots: [null, null, null, null], // 4 positions (2v2)
  }))
}

function getInitials(name) {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
