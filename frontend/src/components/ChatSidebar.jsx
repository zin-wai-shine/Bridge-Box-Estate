import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import whiteIcon from '../assets/logo/white_icon.png'
import whiteLogo from '../assets/logo/white_logo.png'
import { 
  HiPlus,
  HiMagnifyingGlass,
  HiEllipsisHorizontal,
  HiChatBubbleLeft,
  HiBookmark,
  HiPencilSquare,
  HiTrash,
  HiShare,
  HiXMark,
  HiBars3,
  HiPhoto,
  HiCube,
  HiBolt,
  HiBookOpen,
  HiBars3BottomLeft
} from 'react-icons/hi2'

export default function ChatSidebar({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewChat, 
  onUpdateSession, 
  onDeleteSession,
  onToggleSidebar,
  isOpen 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [isToggleHovered, setIsToggleHovered] = useState(false)

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRename = (session) => {
    setEditingId(session.id)
    setEditTitle(session.title)
    setMenuOpenId(null)
  }

  const submitRename = (id) => {
    if (editTitle.trim()) {
      onUpdateSession(id, { title: editTitle.trim() })
    }
    setEditingId(null)
  }

  return (
    <motion.div 
      initial={false}
      animate={{ width: isOpen ? 280 : 60 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{
        height: '100%',
        background: '#090909',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 'none',
        zIndex: 20,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Sidebar Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isOpen ? 'space-between' : 'center', 
        padding: '12px 0',
        margin: '0 16px',
        marginBottom: 8,
        minHeight: 56
      }}>
        {isOpen ? (
          <>
            <img src={whiteLogo} alt="BriBox" style={{ height: 24, width: 'auto', marginLeft: 4 }} />
            
            <button 
              onClick={onToggleSidebar}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: 20,
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              title="Close sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </>
        ) : (
          <button 
            onClick={onToggleSidebar}
            onMouseEnter={() => setIsToggleHovered(true)}
            onMouseLeave={() => setIsToggleHovered(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
              width: 40,
              height: 40
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Open sidebar"
          >
            {isToggleHovered ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            ) : (
              <img src={whiteIcon} alt="B" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            )}
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div style={{ padding: isOpen ? '0 12px 10px' : '0' }}>
        <NavButton 
          icon={HiPlus} 
          label="New chat" 
          onClick={onNewChat} 
          collapsed={!isOpen} 
        />
        <NavButton 
          icon={HiMagnifyingGlass} 
          label="Search chats" 
          onClick={() => isOpen && setShowSearchInput(!showSearchInput)} 
          collapsed={!isOpen}
        />
        
        {isOpen && showSearchInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ padding: '4px 8px 8px' }}
          >
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', background: '#171717', border: '1px solid #333',
                borderRadius: 8, color: 'white', fontSize: 13, outline: 'none'
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Session List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isOpen ? '0 12px 20px' : '0', marginTop: 10 }}>
        {isOpen ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '0 12px 8px' }}>
              Recent Chats
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredSessions.map((session) => (
                <div key={session.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => !editingId && onSelectSession(session.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: 12,
                      background: activeSessionId === session.id ? 'var(--accent-glow)' : 'transparent',
                      color: activeSessionId === session.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                      border: activeSessionId === session.id ? '1px solid var(--accent-glow)' : '1px solid transparent',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (activeSessionId !== session.id) e.currentTarget.style.background = 'var(--bg-secondary)'
                      const actions = e.currentTarget.querySelector('.session-actions')
                      if (actions) actions.style.opacity = '1'
                    }}
                    onMouseOut={(e) => {
                      if (activeSessionId !== session.id) e.currentTarget.style.background = 'transparent'
                      const actions = e.currentTarget.querySelector('.session-actions')
                      if (actions && menuOpenId !== session.id) actions.style.opacity = '0'
                    }}
                  >
                    {editingId === session.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => submitRename(session.id)}
                        onKeyDown={(e) => e.key === 'Enter' && submitRename(session.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'white',
                          fontSize: 14,
                          width: '100%'
                        }}
                      />
                    ) : (
                      <>
                        <HiChatBubbleLeft style={{ flexShrink: 0 }} />
                        <span style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          flex: 1 
                        }}>
                          {session.title}
                        </span>
                      </>
                    )}

                    {session.is_pinned && <HiBookmark style={{ fontSize: 12, color: '#b4b4b4' }} />}

                    <button
                      className="session-actions"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === session.id ? null : session.id)
                      }}
                      style={{
                        opacity: menuOpenId === session.id ? 1 : 0,
                        background: 'transparent',
                        border: 'none',
                        color: '#b4b4b4',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <HiEllipsisHorizontal />
                    </button>
                  </div>

                  {/* Context Menu */}
                  <AnimatePresence>
                    {menuOpenId === session.id && (
                      <>
                        <div 
                          onClick={() => setMenuOpenId(null)}
                          style={{ position: 'fixed', inset: 0, zIndex: 30 }} 
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            width: 200,
                            background: '#2f2f2f',
                            border: '1px solid #494949',
                            borderRadius: 12,
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                            padding: 6,
                            zIndex: 40
                          }}
                        >
                          <MenuButton 
                            icon={HiShare} 
                            label="Share conversation" 
                            onClick={() => {
                              onUpdateSession(session.id, { is_shared: !session.is_shared })
                              setMenuOpenId(null)
                            }} 
                          />
                          <MenuButton 
                            icon={HiBookmark} 
                            label={session.is_pinned ? "Unpin" : "Pin"} 
                            onClick={() => {
                              onUpdateSession(session.id, { is_pinned: !session.is_pinned })
                              setMenuOpenId(null)
                            }} 
                          />
                          <MenuButton 
                            icon={HiPencilSquare} 
                            label="Rename" 
                            onClick={() => handleRename(session)} 
                          />
                          <div style={{ height: 1, background: '#494949', margin: '4px 0' }} />
                          <MenuButton 
                            icon={HiTrash} 
                            label="Delete" 
                            danger 
                            onClick={() => {
                              onDeleteSession(session.id)
                              setMenuOpenId(null)
                            }} 
                          />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

    </motion.div>
  )
}

function NavButton({ icon: Icon, label, onClick, collapsed }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: collapsed ? 44 : 'calc(100% - 12px)',
        margin: collapsed ? '0 auto' : '0 6px',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        color: 'var(--text-primary)',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        minHeight: 44
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
      title={collapsed ? label : undefined}
    >
      <Icon style={{ fontSize: 20, color: 'var(--text-secondary)', flexShrink: 0 }} />
      {!collapsed && label}
    </button>
  )
}

function MenuButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        color: danger ? '#ef4444' : '#ececec',
        fontSize: 14,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.2s'
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = '#212121')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon style={{ fontSize: 18 }} />
      {label}
    </button>
  )
}
