import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

/**
 * Auth: Step 4 Firebase authentication UI.
 * - Simple email/password login and signup
 * - Shows loading and error states
 */

const Auth: React.FC = () => {
  const { login, signup, error, resetPassword } = useApp()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await signup(email, password)
      }
      // Clear form on success
      setEmail('')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await resetPassword(forgotEmail || email)
      setMessage('Password reset email sent. Check your inbox.')
      setForgotEmail('')
      setForgotMode(false)
    } catch (err: any) {
      setMessage(err?.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'center' }}>
      <form className="form-container" style={{ maxWidth: 500, width: '100%' }} onSubmit={forgotMode ? handleReset : handleSubmit}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            {isLogin ? 'Login' : 'Create Account'}
          </h2>
        </div>

        {/* Divider */}
        <hr className="form-divider" />

        {/* Error / message */}
        {error ? (
          <div style={{ background: '#fee', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#c00', textAlign: 'center' }}>
            {error}
          </div>
        ) : null}
        {message ? (
          <div style={{ background: '#eef6ff', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#0b5fff', textAlign: 'center' }}>
            {message}
          </div>
        ) : null}

        {/* Form fields */}
        <div className="form-stack">
          <div className="form-item">
            <label className="form-label">Email</label>
            <input
              className="input glow"
              type="email"
              value={forgotMode ? forgotEmail : email}
              onChange={e => (forgotMode ? setForgotEmail(e.target.value) : setEmail(e.target.value))}
              required
              disabled={loading}
            />
          </div>

          {!forgotMode && (
            <div className="form-item">
              <label className="form-label">Password</label>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input
                  className="input glow"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{flex:1}}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--emerald)'}} aria-label="Toggle password visibility">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                <button type="button" onClick={() => { setForgotMode(true); setMessage(null) }} style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
                  Forgot password?
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <div style={{ marginTop: 18 }}>
          <button type="submit" className="btn primary-cta full-width" disabled={loading}>
            {loading ? 'Loading...' : forgotMode ? 'Send Reset Email' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </div>

        {/* Toggle login/signup or return from forgot mode */}
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13 }}>
          {forgotMode ? (
            <>
              <button type="button" onClick={() => { setForgotMode(false); setMessage(null); setForgotEmail('') }} style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} disabled={loading}>
                Back to Login
              </button>
            </>
          ) : (
            <>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--emerald)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                onClick={() => setIsLogin(!isLogin)}
                disabled={loading}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default Auth
