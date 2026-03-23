import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiEnvelope, HiLockClosed, HiUserCircle, HiArrowRight, HiXMark } from 'react-icons/hi2'
import { login, register } from '../services/api'

const roles = ['Client', 'Agent', 'Owner']

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode) // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Client')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let res
      if (mode === 'login') {
        res = await login(email, password)
      } else {
        res = await register(email, password, role)
      }

      localStorage.setItem('bribox_token', res.data.token)
      localStorage.setItem('bribox_user', JSON.stringify(res.data.user))
      
      onAuthSuccess(res.data.user)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || `${mode === 'login' ? 'Login' : 'Registration'} failed. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="glass-strong"
        onClick={e => e.stopPropagation()}
        style={{ 
          width: '100%', 
          maxWidth: 420, 
          padding: '40px 32px', 
          position: 'relative', 
          background: 'var(--bg-card)',
          borderRadius: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: 8, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <HiXMark style={{ fontSize: 20 }} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: 'white',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            B
          </motion.div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {mode === 'login' ? 'Sign in to BriBox' : 'Join BriBox today'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)',
              color: 'var(--danger)', fontSize: 13
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <HiEnvelope style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <input
                type="email"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: mode === 'register' ? 16 : 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <HiLockClosed style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <input
                type="password"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                I am a...
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={role === r ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ flex: 1, minWidth: '30%', fontSize: 12, padding: '8px 4px', display: 'flex', justifyContent: 'center', gap: 4 }}
                  >
                    <HiUserCircle style={{ fontSize: 14 }} />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 20px', fontSize: 15 }}
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            {!loading && <HiArrowRight />}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ 
              background: 'transparent', border: 'none', padding: 0,
              color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600,
              fontSize: 14, fontInherit: true
            }}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
