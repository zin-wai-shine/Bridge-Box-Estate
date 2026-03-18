import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight } from 'react-icons/hi'
import { login } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await login(email, password)
      localStorage.setItem('bribox_token', res.data.token)
      localStorage.setItem('bribox_user', JSON.stringify(res.data.user))

      const role = res.data.user.role
      if (role === 'Agent' || role === 'Admin') {
        navigate('/admin')
      } else {
        navigate('/chat')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="glass-strong"
        style={{ width: '100%', maxWidth: 420, padding: 40, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
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
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to BriBox</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: '#fee2e2', border: '1px solid #fecaca',
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
              <HiOutlineMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <motion.input
                id="login-email"
                type="email"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                whileFocus={{ borderColor: 'var(--text-muted)' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <HiOutlineLockClosed style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
              <motion.input
                id="login-password"
                type="password"
                className="input"
                style={{ paddingLeft: 42 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                whileFocus={{ borderColor: 'var(--text-muted)' }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <motion.button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 20px', fontSize: 15 }}
            whileHover={{ scale: 1.02, y: -2, backgroundColor: 'var(--accent-secondary)' }}
            transition={{ duration: 0.4 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <HiOutlineArrowRight />}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
