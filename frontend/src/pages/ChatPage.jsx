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
  HiArrowsPointingOut,
  HiBars3,
  HiMicrophone,
  HiArrowUp,
  HiPlus,
  HiBolt,
  HiMagnifyingGlass,
  HiCube,
  HiHeart,
  HiOutlineHeart,
  HiXMark,
  HiOutlineBanknotes
} from 'react-icons/hi2'
import briboxLogo from '../assets/logo/bribox.svg'
import { sendMessage, getSessions, createSession, updateSession, deleteSession, getSessionHistory } from '../services/api'
import ChatSidebar from '../components/ChatSidebar'

const quickActions = [
  { label: 'Find a Home', icon: HiMagnifyingGlass, message: 'Find me available properties' },
  { label: 'Bridge a Listing', icon: HiCube, message: 'How do I bridge a listing?' },
  { label: 'Market Insights', icon: HiBolt, message: 'What are the current market trends?' },
]

// Stacked thumbnail for multiple properties
function PropertyStack({ properties, onClick }) {
  const count = properties.length
  const firstProp = properties[0]
  
  const containerVariants = {
    initial: { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' },
    hover: { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }
  }

  const iconVariants = {
    initial: { scale: 1, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)' },
    hover: { scale: 1.15, color: 'var(--accent-primary)', background: 'rgba(255,255,255,0.08)' }
  }
  
  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      variants={containerVariants}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px',
        borderRadius: 12,
        border: '0.5px solid',
        cursor: 'pointer',
        marginTop: 8,
        marginBottom: 8,
        maxWidth: 320,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Rotating Border Light (Border Beam) */}
      <motion.div 
        variants={{
          initial: { opacity: 0 },
          hover: { opacity: 1 }
        }}
        style={{
          position: 'absolute', inset: -1, zIndex: 0,
          background: 'conic-gradient(from var(--border-angle), transparent, rgba(255,255,255,0.15), transparent 30%)',
          borderRadius: 12,
          maskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          maskClip: 'content-box, border-box',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'destination-out',
          padding: '0.5px',
          pointerEvents: 'none'
        }}
        animate={{ '--border-angle': ['0deg', '360deg'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Static Border (Always visible but soft) */}
      <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          border: '0.5px solid rgba(255,255,255,0.08)',
          pointerEvents: 'none', zIndex: 1
      }} />

      <div 
        style={{
          display: 'flex', alignItems: 'center', gap: 16, width: '100%', position: 'relative', zIndex: 2
        }}
      >
        {/* Layered Image Stack */}
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          {/* Background Layers */}
          {count > 1 && (
            <div style={{ 
              position: 'absolute', top: -3, left: 3, width: '100%', height: '100%', 
              background: 'rgba(255,255,255,0.05)', borderRadius: 9, 
              zIndex: 1
            }} />
          )}
          
          {/* Main Image */}
          <div style={{ 
            position: 'relative', width: '100%', height: '100%', 
            borderRadius: 9, overflow: 'hidden', zIndex: 2, background: '#222',
            border: '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {firstProp.image_url ? (
              <img src={firstProp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <HiCube style={{ fontSize: 20, opacity: 0.3 }} />
            )}
            
            {count > 1 && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 11, fontWeight: 850
              }}>
                +{count - 1}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: 0.2, marginBottom: 1 }}>
            {count} {count === 1 ? 'property' : 'properties'} found
          </div>
          <div style={{ 
            fontSize: 14, fontWeight: 400, color: 'white',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {firstProp.city || firstProp.address} {count > 1 ? '& more' : ''}
          </div>
        </div>

        <motion.div 
          variants={iconVariants}
          style={{ 
            width: 28, height: 28, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            border: '0.5px solid rgba(255,255,255,0.1)'
          }}
        >
          <HiArrowsPointingOut style={{ fontSize: 14 }} />
        </motion.div>
      </div>
    </motion.div>
  )
}

function PropertyModal({ properties, onClose }) {
  const [activeProperty, setActiveProperty] = useState(properties[0])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: 40
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          width: '100%', height: '100%', overflow: 'hidden',
          background: '#0a0a0a', border: 'none',
          borderRadius: 32, padding: 32, position: 'relative',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginBottom: 24, flexShrink: 0
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 750, color: 'white', letterSpacing: -0.5 }}>Property Results</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Showing {properties.length} matching properties</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', 
              width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <HiXMark style={{ fontSize: 24 }} />
          </button>
        </div>

        {/* Main Content: Two Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32, flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Property List */}
          <div style={{ overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {properties.map((property, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover="hover"
                onClick={() => setActiveProperty(property)}
                style={{ 
                  background: 'transparent', 
                  borderRadius: 0, cursor: 'pointer', padding: 0,
                  border: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ position: 'relative', height: 350, borderRadius: 32, overflow: 'hidden', background: '#1a1a1a', marginBottom: 16, border: 'none', outline: 'none' }}>
                  {property.image_url ? (
                    <motion.img 
                      src={property.image_url} 
                      variants={{ hover: { scale: 1.1 } }}
                      transition={{ duration: 0.5 }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', outline: 'none' }} 
                    />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <motion.div variants={{ hover: { scale: 1.2 } }}>
                        <HiCube style={{ fontSize: 40, opacity: 0.1 }} />
                      </motion.div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '0 4px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 400, color: 'white', marginBottom: 4 }}>
                    {property.address}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
                    <HiMapPin style={{ fontSize: 14, color: 'var(--text-muted)' }} />
                    <span>{property.city}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-primary)' }}>
                    ฿{property.price?.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Property Detail View */}
          <div style={{ overflowY: 'auto', borderRadius: 24, background: 'transparent', padding: 0 }}>
            {activeProperty && (
              <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
                {/* Photo Grid Structure */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, height: 450, marginBottom: 32, borderRadius: 24, overflow: 'hidden' }}>
                  <div style={{ background: '#1a1a1a', position: 'relative', border: 'none', outline: 'none' }}>
                     <img src={activeProperty.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', border: 'none', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                       <div style={{ background: '#1a1a1a', border: 'none', outline: 'none' }}><img src={activeProperty.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, border: 'none', outline: 'none' }} /></div>
                       <div style={{ background: '#1a1a1a', border: 'none', outline: 'none' }}><img src={activeProperty.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3, border: 'none', outline: 'none' }} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                       <div style={{ background: '#1a1a1a', border: 'none', outline: 'none' }}><img src={activeProperty.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, border: 'none', outline: 'none' }} /></div>
                       <div style={{ background: '#1a1a1a', position: 'relative', border: 'none', outline: 'none' }}>
                          <img src={activeProperty.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, border: 'none', outline: 'none' }} />
                          <button style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <HiArrowsPointingOut style={{ fontSize: 18 }} />
                            Show all photos
                          </button>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Amenities Row */}
                <div style={{ 
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, 
                  background: 'rgba(255,255,255,0.05)', borderRadius: 20, overflow: 'hidden', 
                  marginBottom: 32, border: 'none'
                }}>
                  {[
                    { label: 'Bedrooms', value: activeProperty.bedrooms, icon: HiCube },
                    { label: 'Bathrooms', value: activeProperty.bathrooms, icon: HiSparkles },
                    { label: 'Area', value: `${activeProperty.square_footage?.toLocaleString()} Sqm`, icon: HiArrowsPointingOut },
                    { label: '฿/Sqm', value: `฿${Math.round(activeProperty.price / activeProperty.square_footage).toLocaleString()}`, icon: HiOutlineBanknotes },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#0d0d0d', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                        <item.icon style={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{item.value || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* About Listing Section */}
                <div style={{ padding: '0 8px' }}>
                  <h3 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 12 }}>About this listing</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.8, maxWidth: '90%' }}>
                    {activeProperty.description || "Experience refined living in this exceptional property. Featuring modern architectural design, high-end finishes, and thoughtful layouts that maximize space and natural light. Perfect for those seeking both comfort and style."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
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

// MessageContent component that renders text + property thumbnails
function MessageContent({ content, onShowProperties }) {
  const parts = parseMessageContent(content)
  
  // Group consecutive properties
  const groupedParts = []
  let currentGroup = null

  parts.forEach(part => {
    if (part.type === 'property') {
      if (!currentGroup) {
        currentGroup = { type: 'property-stack', properties: [part.content] }
        groupedParts.push(currentGroup)
      } else {
        currentGroup.properties.push(part.content)
      }
    } else {
      currentGroup = null
      groupedParts.push(part)
    }
  })

  return (
    <div>
      {groupedParts.map((part, i) => {
        if (part.type === 'property-stack') {
          return <PropertyStack key={i} properties={part.properties} onClick={() => onShowProperties(part.properties)} />
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
  const [selectedProperty, setSelectedProperty] = useState(null)
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
        onLogout={handleLogout}
        isAdmin={isAgent}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

        {/* Messages Area */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px 24px 40px',
          display: 'flex', flexDirection: 'column',
          background: 'transparent'
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
                  style={{ 
                    width: 48, height: 48, margin: '0 auto 16px',
                    backgroundImage: `url(${briboxLogo})`,
                    backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
                    filter: 'brightness(0.9)'
                  }}
                />
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
                    background: msg.role === 'user' ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderRadius: msg.role === 'user' ? 24 : 0,
                    color: msg.error ? 'var(--danger)' : 'var(--text-primary)',
                    fontSize: 15,
                    lineHeight: 1.6,
                    boxShadow: 'none',
                    border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}>
                    {msg.role === 'ai' && (
                      <div style={{ color: '#dadada', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 2, transform: 'translateX(-4px)' }}>
                        <div style={{
                          width: '45px',
                          height: '45px',
                          backgroundImage: `url(${briboxLogo})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'left center',
                          filter: 'brightness(0.9)',
                          position: 'relative',
                          top: '1px'
                        }} />
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '800', 
                          letterSpacing: '0.5px',
                          position: 'relative',
                          top: '-1px'
                        }}>bribox</span>
                      </div>
                    )}
                    {msg.role === 'ai' ? (
                      <MessageContent content={msg.content} onShowProperties={setSelectedProperty} />
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
          background: 'transparent',
          padding: '0 24px 16px',
        }}>
          <div style={{ maxWidth: 740, margin: '0 auto', background: 'transparent' }}>
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
                      borderRadius: 16,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    {action.label}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Tactical Input Bar */}
            <div 
              style={{ 
                borderRadius: 24, 
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 120,
                position: 'relative',
                background: 'rgba(255,255,255,0.04)',
                transition: 'all 0.3s ease'
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

      <AnimatePresence>
        {selectedProperty && (
          <PropertyModal 
            properties={selectedProperty} 
            onClose={() => setSelectedProperty(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
