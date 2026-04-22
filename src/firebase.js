import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyD4PhECyKV3tfb5F0loNITJumN97VuRGLs',
  authDomain: 'badminton-set.firebaseapp.com',
  projectId: 'badminton-set',
  storageBucket: 'badminton-set.firebasestorage.app',
  messagingSenderId: '195720103533',
  appId: '1:195720103533:web:aa88022c70f0b87e166164',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Set browser persistence explicitly for email/password auth
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn('Could not set auth persistence:', error)
})

// Connect to emulators only when explicitly enabled
if (import.meta.env.VITE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099')
    connectFirestoreEmulator(db, 'localhost', 8080)
    console.log('Connected to Firebase emulators')
  } catch (error) {
    console.warn('Firebase emulators connection failed:', error)
  }
}
