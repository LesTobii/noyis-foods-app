import React from 'react'
import logoImg from '../assets/logo.png'

const Navbar: React.FC<{ onToggleMenu: () => void }> = ({ onToggleMenu }) => {
  return (
    <header className="header">
      {/* Left: Menu button */}
      <div className="header-left">
        <button className="menu-btn" aria-label="Open menu" onClick={onToggleMenu}>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="1" width="20" height="2" rx="1" fill="currentColor" />
            <rect y="6" width="20" height="2" rx="1" fill="currentColor" />
            <rect y="11" width="20" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Center: Logo - BIGGER */}
      <div className="header-center">
        <div className="logo-stack">
          <div className="logo-icon" style={{width:'64px', height:'64px'}}>
            <img src={logoImg} alt="NOYIS FOODS" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
          </div>
        </div>
      </div>

      <div className="header-right" aria-hidden />
    </header>
  )
}

export default Navbar
