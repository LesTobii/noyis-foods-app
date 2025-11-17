import React, { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import Splash from './components/Splash'
import Auth from './components/Auth'
import SalesForm from './components/SalesForm'
import AdminDashboard from './components/AdminDashboard'
import ProductsAdmin from './components/ProductsAdmin'
import SideMenu from './components/SideMenu'
import BackgroundCurves from './components/BackgroundCurves'

/**
 * App: Top-level application component for Step 4 (Firebase Integration).
 * - Shows splash on load
 * - Shows Auth UI until user logs in
 * - Provides fixed header and side menu for authenticated users
 * - Renders either Staff (SalesForm) or Admin (AdminDashboard) view
 * - Sales sync in real-time from Firestore
 */

const AppContent: React.FC = () => {
  // Get auth state from context
  const { user, loading } = useApp()

  // Brief splash at start (animated)
  const [showSplash, setShowSplash] = useState(true)
  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  // Local UI state
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState<'staff' | 'admin' | 'products'>('staff')
  const { editingSale, isAdmin } = useApp()

  // when an edit is started from AdminDashboard, switch to staff view automatically
  useEffect(() => {
    if (editingSale) setView('staff')
  }, [editingSale])

  // Show loading or splash
  if (loading || showSplash) {
    return <Splash onComplete={handleSplashComplete} />
  }

  // Show auth if not logged in
  if (!user) {
    return (
      <div className="app-root">
        <BackgroundCurves />
        <Navbar onToggleMenu={() => {}} />
        <main className="app-main">
          <Auth />
        </main>
      </div>
    )
  }

  // Show main app if logged in
  return (
    <div className="app-root">
      <BackgroundCurves />
      <Navbar onToggleMenu={() => setMenuOpen(s => !s)} />
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} onSelect={(v) => { setView(v); setMenuOpen(false) }} />

      <main className="app-main">
        {view === 'staff' ? (
          <div className="center-view">
            <SalesForm />
          </div>
        ) : view === 'admin' ? (
          <div className="center-view">
            <AdminDashboard />
          </div>
        ) : (
          <div className="center-view">
            <ProductsAdmin />
          </div>
        )}
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
