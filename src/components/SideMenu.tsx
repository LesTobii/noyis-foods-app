import React from 'react'
import { useApp } from '../context/AppContext'

/**
 * SideMenu: Side tray with navigation and logout
 * Props:
 * - open: whether the tray is visible
 * - onClose: callback to close
 * - onSelect: choose a view ('staff' | 'admin')
 */
const SideMenu: React.FC<{ open: boolean; onClose: () => void; onSelect: (v: 'staff'|'admin'|'products') => void }> = ({ open, onClose, onSelect }) => {
  const { user, logout, isAdmin } = useApp()

  const handleLogout = async () => {
    await logout()
    onClose()
  }

  return (
    <>
      {/* Backdrop sits underneath the tray but above the page content */}
      {open ? <div className="tray-backdrop" onClick={onClose} /> : null}

      <div className={`side-tray ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="tray-inner">
          <button className="tray-close" onClick={onClose}>✕</button>
          <nav style={{display:'flex',flexDirection:'column',gap:16}}>
            <button className="btn" onClick={() => onSelect('staff')}>Sales Form</button>
            {isAdmin && (
              <>
                <button className="btn secondary" onClick={() => onSelect('admin')}>Dashboard</button>
                <button className="btn secondary" onClick={() => onSelect('products')}>Products</button>
              </>
            )}
          </nav>

          <div style={{marginTop:'auto',fontSize:12,color:'#6b7280',marginBottom:16}}>
            <div style={{marginBottom:8}}>User: {user?.email || 'Loading...'}</div>
            <button 
              className="btn" 
              onClick={handleLogout}
              style={{fontSize:12,padding:'8px 12px',width:'100%'}}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SideMenu
