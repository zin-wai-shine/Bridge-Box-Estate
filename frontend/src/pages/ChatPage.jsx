import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiPaperAirplane, 
  HiCog8Tooth, 
  HiArrowRightOnRectangle, 
  HiSparkles, 
  HiMapPin, 
  HiBars3BottomLeft,
  HiChevronDown,
  HiBars3,
  HiMicrophone,
  HiArrowUp,
  HiPlus,
  HiBolt
} from 'react-icons/hi2'
import briboxLogo from '../assets/logo/bribox.svg'
import { sendMessage, getSessions, createSession, updateSession, deleteSession, getSessionHistory } from '../services/api'
import ChatSidebar from '../components/ChatSidebar'

const quickActions = [
  { label: 'Find a Home', icon: HiSparkles, message: 'Find me available properties' },
  { label: 'Bridge a Listing', icon: HiSparkles, message: 'How do I bridge a listing?' },
  { label: 'Market Insights', icon: HiSparkles, message: 'What are the current market trends?' },
]

// PropertyCard component for rendering structured property data
function PropertyCard({ property }) {
  const formatPrice = (price) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`
    if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
    return `$${price.toLocaleString()}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
            {property.address || 'Property'}
          </div>
          {property.city && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <HiMapPin style={{ fontSize: 12 }} />
              {property.city}{property.state ? `, ${property.state}` : ''} {property.zip || ''}
            </div>
          )}
        </div>
        <div style={{
          fontWeight: 800, fontSize: 18, color: 'var(--text-primary)',
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)',
          padding: '4px 12px', borderRadius: 8,
        }}>
          {formatPrice(property.price)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {property.bedrooms > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>{property.bedrooms}</strong> Beds
          </div>
        )}
        {property.bathrooms > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>{property.bathrooms}</strong> Baths
          </div>
        )}
        {property.square_footage > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>{property.square_footage.toLocaleString()}</strong> sqft
          </div>
        )}
        {property.status && (
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: property.status === 'Active' ? 'var(--success)' : 'var(--text-muted)',
            background: property.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input)',
            border: `1px solid ${property.status === 'Active' ? 'var(--success)' : 'var(--border)'}`,
            padding: '2px 8px', borderRadius: 4,
            marginLeft: 'auto',
          }}>
            {property.status}
          </div>
        )}
      </div>

      {property.description && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
          {property.description.length > 120 ? property.description.slice(0, 120) + '...' : property.description}
        </div>
      )}
    </motion.div>
  )
}

// Parse AI message content to separate text and property cards
function parseMessageContent(content) {
  const parts = []
  const regex = /~~~property\n([\s\S]*?)~~~/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before the property block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim()
      if (text) parts.push({ type: 'text', content: text })
    }
    // Add the property block
    try {
      const propData = JSON.parse(match[1].trim())
      parts.push({ type: 'property', content: propData })
    } catch {
      parts.push({ type: 'text', content: match[1] })
    }
    lastIndex = regex.lastIndex
  }

  // Add remaining text after the last property block
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim()
    if (text) parts.push({ type: 'text', content: text })
  }

  // If no property blocks found, return the whole thing as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return parts
}

// Simple markdown renderer for bold and headers
function renderMarkdown(text) {
  if (!text) return null

  return text.split('\n').map((line, i) => {
    // Headers
    if (line.startsWith('### ')) {
      return <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 12, marginBottom: 4, color: 'var(--text-primary)' }}>{renderBold(line.slice(4))}</div>
    }
    if (line.startsWith('## ')) {
      return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 14, marginBottom: 6, color: 'var(--text-primary)' }}>{renderBold(line.slice(3))}</div>
    }

    // List items
    if (line.startsWith('- ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2, paddingLeft: 4 }}>
          <span style={{ color: '#a3a3a3' }}>•</span>
          <span>{renderBold(line.slice(2))}</span>
        </div>
      )
    }

    // Numbered list items
    const numberedMatch = line.match(/^(\d+)\.\s(.*)/)
    if (numberedMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2, paddingLeft: 4 }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 16 }}>{numberedMatch[1]}.</span>
          <span>{renderBold(numberedMatch[2])}</span>
        </div>
      )
    }

    // Empty line = spacing
    if (line.trim() === '') {
      return <div key={i} style={{ height: 6 }} />
    }

    // Normal text with bold
    return <div key={i} style={{ marginBottom: 2 }}>{renderBold(line)}</div>
  })
}

// Render **bold** text
function renderBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part}</strong>
    }
    // Also handle *italic*
    const italicParts = part.split(/\*(.*?)\*/g)
    return italicParts.map((ip, j) => {
      if (j % 2 === 1) return <em key={`${i}-${j}`}>{ip}</em>
      return <span key={`${i}-${j}`}>{ip}</span>
    })
  })
}

// MessageContent component that renders text + property cards
function MessageContent({ content }) {
  const parts = parseMessageContent(content)

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'property') {
          return <PropertyCard key={i} property={part.content} />
        }
        return <div key={i} style={{ lineHeight: 1.6 }}>{renderMarkdown(part.content)}</div>
      })}
    </div>
  )
}

export default function ChatPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const user = JSON.parse(localStorage.getItem('bribox_user') || '{}')

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (activeSessionId) {
      loadSessionHistory(activeSessionId)
    } else {
      setMessages([])
    }
  }, [activeSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSessions = async () => {
    try {
      const res = await getSessions()
      const data = res.data.sessions || []
      setSessions(data)
      // Auto-select first pinned or most recent session if none active
      if (!activeSessionId && data.length > 0) {
        setActiveSessionId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }

  const loadSessionHistory = async (id) => {
    try {
      const res = await getSessionHistory(id)
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

  const handleNewChat = async () => {
    setMessages([])
    setActiveSessionId(null)
    inputRef.current?.focus()
  }

  const handleSelectSession = (id) => {
    setActiveSessionId(id)
  }

  const handleUpdateSession = async (id, data) => {
    try {
      await updateSession(id, data)
      fetchSessions()
    } catch (err) {
      console.error('Failed to update session:', err)
    }
  }

  const handleDeleteSession = async (id) => {
    try {
      await deleteSession(id)
      if (activeSessionId === id) {
        setActiveSessionId(null)
      }
      fetchSessions()
    } catch (err) {
      console.error('Failed to delete session:', err)
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
      const res = await sendMessage(msg, activeSessionId)
      // If a new session was created by the backend, update active session and session list
      if (!activeSessionId && res.data.session_id) {
        setActiveSessionId(res.data.session_id)
        fetchSessions()
      }
      
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
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onUpdateSession={handleUpdateSession}
        onDeleteSession={handleDeleteSession}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'transparent',
          position: 'relative', zIndex: 10,
          minHeight: 88
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <img src={briboxLogo} alt="BriBox" style={{ height: 32, width: 'auto', filter: 'brightness(0.85)' }} />
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '800', 
                color: '#dadada', 
                letterSpacing: '0.5px'
              }}>bribox</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAgent && (
              <Link to="/admin"
                style={{ textDecoration: 'none', background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', padding: 8, borderRadius: 8 }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <HiCog8Tooth style={{ fontSize: 20 }} />
              </Link>
            )}
            <button 
              onClick={handleLogout} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 8, borderRadius: 8 }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <HiArrowRightOnRectangle style={{ fontSize: 20 }} />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px 24px',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', flex: 1 }}>
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
                  <HiSparkles style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  What are you looking for?
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
                  Tell me a location, budget, or property type and I'll search for you.
                </p>
              </motion.div>
            )}

            {/* Messages */}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
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
                    maxWidth: msg.role === 'user' ? '80%' : '100%',
                    padding: msg.role === 'user' ? '12px 18px' : '8px 0',
                    background: msg.role === 'user' ? 'var(--bg-card)' : 'transparent',
                    borderRadius: msg.role === 'user' ? 20 : 0,
                    color: msg.error ? 'var(--danger)' : 'var(--text-primary)',
                    fontSize: 15,
                    lineHeight: 1.6,
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                  }}>
                    {msg.role === 'ai' && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiSparkles /> BriBox AI
                      </div>
                    )}
                    {msg.role === 'ai' ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <div>{msg.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
          borderTop: 'none',
          background: '#121212',
          padding: '0 24px 24px',
        }}>
          <div style={{ maxWidth: 740, margin: '0 auto' }}>
            {/* Quick Actions */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
              >
                {quickActions.map((action) => (
                  <motion.button
                    key={action.label}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSend(action.message)}
                    style={{ 
                      fontSize: 12, 
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      border: 'none',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {action.label}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Tactical Input Bar */}
            <div 
              className="glass-strong"
              style={{ 
                borderRadius: 24, 
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 120,
                position: 'relative',
                background: 'rgba(255,255,255,0.03)'
              }}
            >
              {/* Top Right Indicator Dot */}
              <div style={{ position: 'absolute', top: 16, right: 20, width: 8, height: 8, borderRadius: '50%', background: '#7c4dff', boxShadow: '0 0 10px #7c4dff' }} />

              <textarea 
                ref={inputRef}
                placeholder="Search properties, ask about market trends..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={loading}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text-primary)', fontSize: 16, outline: 'none',
                  resize: 'none', flex: 1, padding: '4px 0',
                  lineHeight: 1.5
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', color: '#9aa0a6', cursor: 'pointer' }}>
                    <HiPlus style={{ fontSize: 18 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', color: '#9aa0a6' }}>
                    <HiBolt style={{ fontSize: 16 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <HiMicrophone style={{ color: '#9aa0a6', fontSize: 20, cursor: 'pointer' }} />
                  <motion.button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ 
                      background: 'white', color: 'black', border: 'none', borderRadius: '50%',
                      width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: (input.trim() && !loading) ? 'pointer' : 'default', 
                      opacity: (loading || !input.trim()) ? 0.3 : 1, 
                      transition: 'transform 0.2s'
                    }}
                  >
                    <HiArrowUp style={{ fontSize: 20 }} />
                  </motion.button>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}
