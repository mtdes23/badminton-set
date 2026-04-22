// Firebase Debug Script
// Run this in browser console to check Firebase config

import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyD4PhECyKV3tfb5F0loNITJumN97VuRGLs',
  authDomain: 'badminton-set.firebaseapp.com',
  projectId: 'badminton-set',
  storageBucket: 'badminton-set.firebasestorage.app',
  messagingSenderId: '195720103533',
  appId: '1:195720103533:web:aa88022c70f0b87e166164',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

console.log('Firebase initialized:', app)
console.log('Auth:', auth)
console.log('Current user:', auth.currentUser)

// Check if Google provider is configured
import { GoogleAuthProvider } from 'firebase/auth'
const provider = new GoogleAuthProvider()
console.log('Google Provider:', provider)

// Test auth state
import { onAuthStateChanged } from 'firebase/auth'
onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user)
})