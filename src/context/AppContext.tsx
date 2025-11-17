import React, { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  enableIndexedDbPersistence
} from 'firebase/firestore'

/**
 * AppContext: Step 4 implementation with Firebase Auth + Firestore.
 * - Real user authentication (email/password)
 * - Real-time sales synced to Firestore
 * - Per-user sales records
 */

export type Sale = {
  id: string
  userId: string
  userEmail?: string | null
  product: string
  flavor: string
  unit: number
  price: number
  total: number
  paymentMode?: string
  date: string
  time?: string
  createdAt?: Timestamp | null
}

type AppContextType = {
  user: User | null
  sales: Sale[]
  globalSales: Sale[]
  isAdmin: boolean
  loading: boolean
  error: string | null
  isOnline: boolean
  hasPendingWrites: boolean
  addSale: (sale: Omit<Sale, 'id' | 'userId' | 'date'>) => Promise<void>
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>
  deleteSale: (id: string) => Promise<void>
  // editingSale state for edit flow
  editingSale: Sale | null
  setEditingSale: (s: Sale | null) => void
  // toast/confirm helpers
  pushToast: (msg: string, kind?: 'info' | 'success' | 'error') => string
  pushConfirm: (msg: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const OFFLINE_USER_KEY = 'offlineUser'
const OFFLINE_SESSION_KEY = 'offlineSessionCache'

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

type CachedSession = {
  email: string
  salt: number[]
  hash: string
  user: {
    uid: string
    email: string | null
    displayName: string | null
  }
}

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

const hashWithSalt = async (value: string, salt: Uint8Array) => {
  if (!textEncoder || !(window?.crypto?.subtle)) {
    return value
  }
  const valueBuffer = textEncoder.encode(value)
  const combined = new Uint8Array(salt.length + valueBuffer.length)
  combined.set(salt)
  combined.set(valueBuffer, salt.length)
  const digest = await window.crypto.subtle.digest('SHA-256', combined)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const persistOfflineSession = async (email: string, password: string, user: User) => {
  if (!isBrowser || !(window.crypto?.subtle)) return
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const hash = await hashWithSalt(password, salt)
  const payload: CachedSession = {
    email,
    salt: Array.from(salt),
    hash,
    user: {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null
    }
  }
  localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(payload))
}

const tryOfflineSessionLogin = async (email: string, password: string) => {
  if (!isBrowser) return null
  const raw = localStorage.getItem(OFFLINE_SESSION_KEY)
  if (!raw) return null
  try {
    const session: CachedSession = JSON.parse(raw)
    if (session.email !== email) return null
    const salt = new Uint8Array(session.salt)
    const hash = await hashWithSalt(password, salt)
    if (hash !== session.hash) return null
    return session.user
  } catch (err) {
    console.error('[AppContext] Failed to parse offline session', err)
    return null
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [globalSales, setGlobalSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean>(false)

  // simple toast queue
  const [toasts, setToasts] = useState<Array<any>>([])

  // Determine admin users from env (comma separated emails)
  const adminEmailsRaw = typeof import.meta !== 'undefined' ? (import.meta.env.VITE_ADMIN_EMAILS || '') : ''
  const adminEmails = adminEmailsRaw.split(',').map(s => s.trim()).filter(Boolean)
  const isAdmin = !!(user && user.email && adminEmails.includes(user.email))

  // Initialize Firebase Auth persistence + Firestore offline persistence
  useEffect(() => {
    let cancelled = false

    const setupPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
        console.log('[AppContext] Auth persistence set to browserLocalPersistence')
      } catch (err) {
        console.warn('[AppContext] Failed to set auth persistence', err)
      }

      try {
        await enableIndexedDbPersistence(db)
        console.log('[AppContext] Firestore persistence enabled')
      } catch (err: any) {
        if (err?.code === 'failed-precondition') {
          console.warn('[AppContext] Persistence already enabled in another tab')
        } else if (err?.code === 'unimplemented') {
          console.warn('[AppContext] IndexedDB persistence not supported')
        } else {
          console.warn('[AppContext] Failed to enable persistence', err)
        }
      }
    }

    setupPersistence()

    if (isBrowser) {
      const handleOnline = () => !cancelled && setIsOnline(true)
      const handleOffline = () => !cancelled && setIsOnline(false)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        cancelled = true
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        const userObj = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        }
        localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(userObj))
      } else if (!isOnline) {
        const cached = localStorage.getItem(OFFLINE_USER_KEY)
        if (cached) {
          try {
            const offlineUser = JSON.parse(cached)
            setUser(offlineUser as any)
          } catch (err) {
            console.warn('[AppContext] Failed to parse offline user cache', err)
            localStorage.removeItem(OFFLINE_USER_KEY)
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } else {
        localStorage.removeItem(OFFLINE_USER_KEY)
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Listen to Firestore sales for current user (real-time sync)
  useEffect(() => {
    if (!user) {
      setSales([])
      return
    }

    const q = query(
      collection(db, 'sales'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Track if there are pending (un-synced) writes
        setHasPendingWrites(snapshot.metadata.hasPendingWrites)
        
        const salesData: Sale[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // prefer explicit `time`, otherwise fall back to `createdAt` timestamp
          const timeFromCreatedAt = data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString().split('T')[1].split('Z')[0]
            : ''

          // Ensure date is always in YYYY-MM-DD format
          let dateStr = data.date
          if (data.date instanceof Timestamp) {
            const d = data.date.toDate()
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const dy = String(d.getDate()).padStart(2, '0')
            dateStr = `${y}-${m}-${dy}`
          } else if (typeof data.date === 'string' && data.date.includes('T')) {
            // ISO format - extract just the date part
            dateStr = data.date.split('T')[0]
          }

          salesData.push({
            id: doc.id,
            userId: data.userId,
            userEmail: data.userEmail || null,
            product: data.product,
            flavor: data.flavor,
            unit: data.unit,
            price: data.price,
            total: data.total,
            paymentMode: data.paymentMode || 'POS',
            date: dateStr,
            time: data.time || timeFromCreatedAt || '',
            createdAt: data.createdAt || null
          })
        })
        console.log('[AppContext] user sales snapshot, count=', snapshot.size, 'pending=', snapshot.metadata.hasPendingWrites)
        setSales(salesData)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError('Failed to load sales')
      }
    )

    return unsubscribe
  }, [user])

  // If user is admin, listen to global sales (no where clause)
  useEffect(() => {
    if (!isAdmin) {
      setGlobalSales([])
      return
    }

    const q = query(
      collection(db, 'sales'),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Track if there are pending (un-synced) writes
        setHasPendingWrites(snapshot.metadata.hasPendingWrites)
        
        const all: Sale[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          const timeFromCreatedAt = data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString().split('T')[1].split('Z')[0]
            : ''

          // Ensure date is always in YYYY-MM-DD format
          let dateStr = data.date
          if (data.date instanceof Timestamp) {
            const d = data.date.toDate()
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const dy = String(d.getDate()).padStart(2, '0')
            dateStr = `${y}-${m}-${dy}`
          } else if (typeof data.date === 'string' && data.date.includes('T')) {
            // ISO format - extract just the date part
            dateStr = data.date.split('T')[0]
          }

          all.push({
            id: doc.id,
            userId: data.userId,
            userEmail: data.userEmail || null,
            product: data.product,
            flavor: data.flavor,
            unit: data.unit,
            price: data.price,
            total: data.total,
            paymentMode: data.paymentMode || 'POS',
            date: dateStr,
            time: data.time || timeFromCreatedAt || '',
            createdAt: data.createdAt || null
          })
        })
        console.log('[AppContext] global sales snapshot, count=', snapshot.size, 'pending=', snapshot.metadata.hasPendingWrites)
        setGlobalSales(all)
      },
      (err) => {
        console.error('Firestore error (global):', err)
        setError('Failed to load global sales')
      }
    )

    return unsubscribe
  }, [isAdmin])

  // Add a new sale to Firestore
  const addSale = async (sale: Omit<Sale, 'id' | 'userId' | 'date'>) => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    try {
      const now = new Date()
      // Get local date and time (not UTC)
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      
      const dateOnly = `${year}-${month}-${day}` // YYYY-MM-DD
      const timeOnly = `${hours}:${minutes}:${seconds}` // HH:MM:SS

      const docRef = await addDoc(collection(db, 'sales'), {
        userId: user.uid,
        userEmail: user.email || null,
        product: sale.product,
        flavor: sale.flavor,
        unit: sale.unit,
        price: sale.price,
        total: sale.total,
        paymentMode: sale.paymentMode || 'POS',
        date: dateOnly,
        time: timeOnly,
        createdAt: serverTimestamp()
      })
      console.log('[AppContext] added sale doc', docRef.id)
      setError(null)
    } catch (err) {
      console.error('Error adding sale:', err)
      setError('Failed to save sale')
    }
  }

  // Update an existing sale
  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const ref = doc(db, 'sales', id)
      // Only pass primitive fields expected by Firestore
      const payload: any = {}
      if (updates.product !== undefined) payload.product = updates.product
      if (updates.flavor !== undefined) payload.flavor = updates.flavor
      if (updates.unit !== undefined) payload.unit = updates.unit
      if (updates.price !== undefined) payload.price = updates.price
      if (updates.total !== undefined) payload.total = updates.total
      if (updates.paymentMode !== undefined) payload.paymentMode = updates.paymentMode
      if (updates.date !== undefined) payload.date = updates.date
      if (updates.time !== undefined) payload.time = updates.time
      await updateDoc(ref, payload)
      console.log('[AppContext] updated sale', id)
      setError(null)
    } catch (err) {
      console.error('Error updating sale:', err)
      setError('Failed to update sale')
    }
  }

  // Delete a sale by id
  const deleteSale = async (id: string) => {
    try {
      const ref = doc(db, 'sales', id)
      await deleteDoc(ref)
      console.log('[AppContext] deleted sale', id)
      setError(null)
    } catch (err) {
      console.error('Error deleting sale:', err)
      setError('Failed to delete sale')
    }
  }

  const pushToast = (msg: string, kind: 'info'|'success'|'error' = 'info') => {
    const id = Date.now() + Math.random().toString(36).slice(2,8)
    setToasts(t => [...t, { id, msg, kind }])
    // auto remove
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    return id
  }

  const pushConfirm = (msg: string) => {
    return new Promise<boolean>((resolve) => {
      const id = Date.now() + Math.random().toString(36).slice(2,8)
      const remove = () => setToasts(t => t.filter(x => x.id !== id))
      const onConfirm = () => { remove(); resolve(true) }
      const onCancel = () => { remove(); resolve(false) }
      setToasts(t => [...t, { id, msg, kind: 'info', confirm: true, onConfirm, onCancel }])
    })
  }

  // Sign up with email and password
  const signup = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setError(null)
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Signup failed')
    }
  }

  // Login with email and password (supports offline after initial sync)
  const login = async (email: string, password: string) => {
    if (!isOnline) {
      try {
        const offlineUser = await tryOfflineSessionLogin(email, password)
        if (offlineUser) {
          setUser(offlineUser as any)
          setError(null)
          pushToast('Signed in (offline mode)', 'success')
          return
        }
        setError('Offline mode requires a prior successful online login.')
      } catch (err) {
        setError('Offline login unavailable on this device')
        console.error('Offline login error:', err)
      }
      return
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      setError(null)
      await persistOfflineSession(email, password, credential.user)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    }
  }

  // Logout
  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      setSales([])
      setError(null)
      if (isBrowser) {
        localStorage.removeItem(OFFLINE_SESSION_KEY)
        localStorage.removeItem(OFFLINE_USER_KEY)
      }
    } catch (err: any) {
      console.error('Logout error:', err)
      setError(err.message || 'Logout failed')
    }
  }

  // Send password reset email
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      setError(null)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to send password reset email')
      throw err
    }
  }

  return (
    <AppContext.Provider value={{ user, sales, globalSales, isAdmin, loading, error, isOnline, hasPendingWrites, addSale, updateSale, deleteSale, editingSale, setEditingSale, pushToast, pushConfirm, login, signup, logout, resetPassword }}>
      {children}
      {/* Toasts overlay rendered by provider - centered at top for visibility */}
      <div style={{position:'fixed',top:40,left:'50%',transform:'translateX(-50%)',zIndex:200,display:'flex',flexDirection:'column',gap:12,maxWidth:500,width:'calc(100% - 40px)'}}>
        {toasts.map((t: any) => (
          <div key={t.id} style={{background: t.kind === 'error' ? '#fee2e2' : t.kind === 'success' ? '#ecfdf5' : '#eef2ff',padding:16,borderRadius:10,boxShadow:'0 12px 32px rgba(2,6,23,0.15)',minWidth:'auto',border: t.kind === 'error' ? '1px solid #fca5a5' : t.kind === 'success' ? '1px solid #86efac' : '1px solid #bfdbfe',animation:'slideDown 0.3s ease-out'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div style={{fontSize:14,color: t.kind === 'error' ? '#991b1b' : t.kind === 'success' ? '#166534' : '#1e40af',fontWeight:600}}>{t.msg}</div>
              {t.confirm ? (
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => t.onConfirm && t.onConfirm()} style={{background:'#dc2626',color:'#fff',border:'none',padding:'8px 12px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,transition:'transform 0.18s ease',transform:'translateY(0)'}} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>Delete</button>
                  <button onClick={() => t.onCancel && t.onCancel()} style={{background:'#fff',border:'1px solid #e6e9ef',padding:'8px 12px',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,transition:'transform 0.18s ease',transform:'translateY(0)'}} onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>Cancel</button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
