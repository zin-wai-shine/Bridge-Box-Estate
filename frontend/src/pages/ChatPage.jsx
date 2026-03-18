import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlinePaperAirplane, HiOutlineHome, HiOutlineClipboardList, HiOutlineShieldCheck, HiOutlineLogout, HiOutlineCog, HiOutlineSparkles } from 'react-icons/hi'
import { sendMessage, getChatHistory } from '../services/api'

const quickActions = [
  { label: 'Find a Home', icon: HiOutlineHome, message: 'I want to find a home' },
  { label: 'List My Property', icon: HiOutlineClipboardList, message: 'I want to list my property' },
  { label: 'Check Permissions', icon: HiOutlineShieldCheck, message: 'I want to check my permissions' },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const user = JSON.parse(localStorage.getItem('bribox_user') || '{}')

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadHistory = async () => {
    try {
      const res = await getChatHistory()
      if (res.data.messages) {
        setMessages(res.data.messages.map(m => ({
          id: m.id,
          content: m.message_content,
          role: m.role === 'User' ? 'user' : 'ai',
          timestamp: m.timestamp,
        })))
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const handleSend = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg = { id: Date.now(), content: msg, role: 'user', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendMessage(msg)
      const aiMsg = {
        id: Date.now() + 1,
        content: res.data.response,
        role: 'ai',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        content: 'Sorry, something went wrong. Please try again.',
        role: 'ai',
        timestamp: new Date().toISOString(),
        error: true
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('bribox_token')
    localStorage.removeItem('bribox_user')
    navigate('/login')
  }

  const isAgent = user.role === 'Agent' || user.role === 'Admin'

  return (
    <div className="page-container" style={{ maxHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: 'white'
          }}>
            B
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>BriBox</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Real Estate Bridge</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAgent && (
            <Link to="/admin"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <HiOutlineCog /> Admin
            </Link>
          )}
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <HiOutlineLogout /> Logout
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 16px',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', flex: 1 }}>
          {/* Welcome state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              style={{ textAlign: 'center', paddingTop: '15vh' }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 48, marginBottom: 16 }}
              >
                <HiOutlineSparkles style={{ color: 'var(--accent-primary)' }} />
              </motion.div>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                How can I help you today?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
                I can help you find properties, manage listings, and navigate the real estate market.
              </p>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 16
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '14px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? '#e5e5e5' // bg-neutral-200
                    : msg.error ? '#fee2e2' : '#ffffff',
                  color: msg.error ? 'var(--danger)' : 'var(--text-primary)',
                  border: msg.role === 'user' ? 'none' : '1px solid #f5f5f5', // border-neutral-100
                  fontSize: 14,
                  lineHeight: 1.6,
                  boxShadow: msg.role === 'ai' && !msg.error ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                }}>
                  {msg.role === 'ai' && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <HiOutlineSparkles /> BriBox AI
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', gap: 6, padding: '16px 0' }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--text-muted)'
                  }}
                />
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        padding: '16px 24px 24px',
        position: 'sticky', bottom: 0
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Quick Actions */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
            >
              {quickActions.map((action) => (
                <motion.button
                  key={action.label}
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSend(action.message)}
                  whileHover={{ scale: 1.03, backgroundColor: '#f9fafb', borderColor: '#d4d4d8' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.4 }}
                  style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                >
                  <action.icon /> {action.label}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Input Bar */}
          <motion.div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '4px 4px 4px 16px',
            }}
            whileFocus={{ borderColor: '#a3a3a3' }}
            transition={{ duration: 0.4 }}
          >
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              placeholder="Ask me anything about real estate..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit'
              }}
            />
            <motion.button
              id="chat-send"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: input.trim() ? 'var(--accent-primary)' : '#f5f5f5',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() ? 'white' : 'var(--text-muted)'
              }}
            >
              <HiOutlinePaperAirplane style={{ fontSize: 18, transform: 'rotate(90deg)' }} />
            </motion.button>
          </motion.div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            BriBox AI can help find, list, and manage properties
          </p>
        </div>
      </div>
    </div>
  )
}
