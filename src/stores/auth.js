import { defineStore } from 'pinia'
import { ref } from 'vue'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore'
import { auth, googleProvider, db } from '@/firebase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const bankInfo = ref(null)
  const loading = ref(true)

  let unsubMeta = null

  // Listen for auth state changes
  onAuthStateChanged(auth, (firebaseUser) => {
    if (unsubMeta) unsubMeta() // Clean up previous listener

    if (firebaseUser) {
      user.value = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      }

      // Sync bank info from Firestore
      unsubMeta = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
        if (snap.exists()) {
          bankInfo.value = snap.data()
        } else {
          bankInfo.value = null
        }
      })
    } else {
      user.value = null
      bankInfo.value = null
    }
    loading.value = false
  })

  async function login() {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async function logout() {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  async function updateBankInfo(data) {
    if (!user.value) return
    const userRef = doc(db, 'users', user.value.uid)
    await setDoc(userRef, {
      bankId:  data.bankId || '',
      accountNo: data.accountNo || '',
      accountName: data.accountName || user.value.displayName,
      updatedAt: Date.now()
    }, { merge: true })
  }

  return {
    user,
    bankInfo,
    loading,
    login,
    logout,
    updateBankInfo,
  }
})
