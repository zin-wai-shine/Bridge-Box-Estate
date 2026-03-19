import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiMagnifyingGlass, 
  HiXMark, 
  HiPlus, 
  HiChatBubbleLeftRight,
  HiClock,
  HiCalendarDays,
  HiInbox
} from 'react-icons/hi2'

export default function SearchModal({ 
  isOpen, 
  onClose, 
  sessions, 
  onSelectSession, 
  onNewChat 
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter and group sessions
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase())
  )

  const groupSessions = (sessions) => {
    const now = new Date()
    const groups = {
      Today: [],
      'Last 7 days': [],
      Older: []
    }

    sessions.forEach(s => {
      const date = new Date(s.updated_at || s.created_at)
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) groups.Today.push(s)
      else if (diffDays <= 7) groups['Last 7 days'].push(s)
      else groups.Older.push(s)
    })

    return Object.entries(groups).filter(([_, items]) => items.length > 0)
  }

  const grouped = groupSessions(filteredSessions)
  const flattenGrouped = grouped.reduce((acc, [_, items]) => [...acc, ...items], [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => (prev + 1) % (flattenGrouped.length + 1))
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => (prev - 1 + flattenGrouped.length + 1) % (flattenGrouped.length + 1))
      } else if (e.key === 'Enter') {
        if (selectedIndex === 0) {
          onNewChat()
          onClose()
        } else {
          const session = flattenGrouped[selectedIndex - 1]
          if (session) {
            onSelectSession(session.id)
            onClose()
          }
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flattenGrouped, selectedIndex, onSelectSession, onNewChat, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '10vh',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
        }} onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: '100%',
              maxWidth: '640px',
              background: '#1a1a1a',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input Area */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <HiMagnifyingGlass style={{ fontSize: 22, color: 'var(--text-muted)' }} />
              <input
                autoFocus
                type="text"
                placeholder="Search tasks..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'inherit',
                }}
              />
              <button 
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 4,
                  borderRadius: 6,
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <HiXMark style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Content Area */}
            <div style={{
              flex: 1,
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: '12px 0',
            }}>
              {/* New Task Button */}
              <div 
                onClick={() => { onNewChat(); onClose(); }}
                style={{
                  margin: '0 12px 12px',
                  padding: '12px 16px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  background: selectedIndex === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseOver={() => setSelectedIndex(0)}
              >
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <HiPlus style={{ fontSize: 18, color: 'white' }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>New task</span>
              </div>

              {/* Grouped Results */}
              {grouped.map(([groupName, items]) => (
                <div key={groupName}>
                  <div style={{
                    padding: '8px 24px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'capitalize',
                  }}>
                    {groupName}
                  </div>
                  {items.map((session, idx) => {
                    const flatIdx = flattenGrouped.indexOf(session) + 1
                    const isSelected = selectedIndex === flatIdx
                    const lastUpdated = new Date(session.updated_at || session.created_at)
                    const dateStr = lastUpdated.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    
                    return (
                      <div
                        key={session.id}
                        onClick={() => { onSelectSession(session.id); onClose(); }}
                        style={{
                          margin: '2px 12px',
                          padding: '12px 16px',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={() => setSelectedIndex(flatIdx)}
                      >
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <HiChatBubbleLeftRight style={{ fontSize: 18, color: 'white' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: 14, fontWeight: 600, color: 'white', 
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                          }}>
                            {session.title || 'Untitled Chat'}
                          </div>
                          <div style={{ 
                            fontSize: 12, color: 'var(--text-muted)', 
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            marginTop: 2
                          }}>
                            {session.last_message_content || 'No messages yet'}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 
                        }}>
                          {dateStr}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {filteredSessions.length === 0 && query && (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <HiInbox style={{ fontSize: 48, opacity: 0.2 }} />
                  <div style={{ fontSize: 14 }}>No matches found for "{query}"</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
