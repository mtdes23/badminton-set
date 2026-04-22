import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

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

// Enable email/password authentication
auth.setPersistence = auth.setPersistence || (() => Promise.resolve())
