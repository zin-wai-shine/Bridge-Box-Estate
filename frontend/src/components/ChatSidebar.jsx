import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import briboxLogo from '../assets/logo/bribox.svg'
import SearchModal from './SearchModal'
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
  HiBars3BottomLeft,
  HiCog8Tooth,
  HiArrowRightOnRectangle,
  HiUser
} from 'react-icons/hi2'

export default function ChatSidebar({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewChat, 
  onUpdateSession, 
  onDeleteSession,
  onToggleSidebar,
  onLogout,
  onLoginClick,
  isAdmin,
  isAuthenticated,
  user,
  isOpen,
  isLoading
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault()
        setIsSearchModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 'none',
        zIndex: 20,
        overflow: 'visible',
        position: 'relative'
      }}
    >
      <div 
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        style={{ 
          paddingTop: `calc(${isOpen ? '16px' : '16px'} + env(safe-area-inset-top))`,
          paddingRight: isOpen ? '12px' : '0px',
          paddingBottom: '12px',
          paddingLeft: isOpen ? '12px' : '0px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOpen ? 'flex-start' : 'center',
          minHeight: isOpen ? 40 : 100,
          cursor: 'default'
        }}
      >
        {isOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: '45px',
                height: '45px',
                backgroundImage: `url(${briboxLogo})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                filter: 'brightness(0) saturate(100%) invert(26%) sepia(85%) saturate(718%) hue-rotate(113deg) brightness(97%) contrast(100%)'
              }} />
              <span style={{ 
                fontSize: '16px', 
                fontWeight: '800', 
                color: 'var(--text-secondary)', 
                letterSpacing: '1px'
              }}>bribox</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleSidebar() }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-glow)'
                  const badge = e.currentTarget.parentNode.querySelector('.hover-badge')
                  if (badge) badge.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  const badge = e.currentTarget.parentNode.querySelector('.hover-badge')
                  if (badge) badge.style.opacity = '0'
                }}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0
                }}
                title=""
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </button>
              <motion.div 
                className="hover-badge"
                initial={{ opacity: 0, x: -5, y: '-50%' }}
                animate={{ opacity: isHeaderHovered ? 1 : 0, x: 0, y: '-50%' }}
                style={{
                  position: 'absolute', left: '100%', top: '50%', marginLeft: 12,
                  padding: '4px 10px', background: '#065f46',
                  color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none',
                  transition: { duration: 0.1, ease: 'easeOut' }
                }}
              >
                Close sidebar
              </motion.div>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '40px', height: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundImage: `url(${briboxLogo})`,
              backgroundSize: 'contain',
              filter: 'brightness(0) saturate(100%) invert(26%) sepia(85%) saturate(718%) hue-rotate(113deg) brightness(97%) contrast(100%)',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: isHeaderHovered ? 0 : 1,
              transition: 'opacity 0.2s',
              zIndex: 1
            }} />

            <AnimatePresence>
              {isHeaderHovered && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); onToggleSidebar() }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-glow)'
                    const badge = e.currentTarget.parentNode.querySelector('.hover-badge')
                    if (badge) badge.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    const badge = e.currentTarget.parentNode.querySelector('.hover-badge')
                    if (badge) badge.style.opacity = '0'
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    width: 36,
                    height: 36,
                    background: 'transparent', color: 'var(--text-secondary)',
                    border: 'none', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 40,
                    margin: '0 auto'
                  }}
                >
                  <motion.div 
                    className="hover-badge"
                    initial={{ opacity: 0, x: -5, y: '-50%' }}
                    animate={{ opacity: 1, x: 0, y: '-50%' }}
                    style={{
                      position: 'absolute', left: '100%', top: '50%', marginLeft: 12,
                      padding: '4px 10px', background: '#065f46',
                      color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      whiteSpace: 'nowrap', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none',
                      transition: { duration: 0.1, ease: 'easeOut' }
                    }}
                  >
                    Open sidebar
                  </motion.div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div style={{ position: 'relative', overflow: 'visible', zIndex: 10 }}>
        <div style={{ padding: isOpen ? '0 8px 10px' : '0', overflow: 'visible' }}>
          <NavButton 
            icon={HiPlus} 
            label="New chat" 
            onClick={onNewChat} 
            collapsed={!isOpen} 
            isLoading={isLoading}
          />
          <NavButton 
            icon={HiMagnifyingGlass} 
            label="Search chats" 
            onClick={() => setIsSearchModalOpen(true)} 
            collapsed={!isOpen}
            isLoading={isLoading}
          />
        </div>
        
        {/* Search Modal */}
        <SearchModal 
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          sessions={sessions}
          onSelectSession={onSelectSession}
          onNewChat={onNewChat}
        />
      </div>

      {/* Session List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isOpen ? '0 8px 20px' : '0', marginTop: 10 }}>
        {isOpen ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 12px 12px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              Your chats
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4].map(i => (
                    <MenuSkeleton key={i} />
                  ))}
                </>
              ) : (
                filteredSessions.map((session) => (
                  <div key={session.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => !editingId && onSelectSession(session.id)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: 12,
                      background: activeSessionId === session.id ? 'var(--accent-glow)' : 'transparent',
                      color: 'var(--text-primary)',
                      border: activeSessionId === session.id ? '1px solid var(--accent-glow)' : '1px solid transparent',
                      borderRadius: 8,
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (activeSessionId !== session.id) e.currentTarget.style.background = 'var(--bg-input)'
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
                        <span style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          flex: 1,
                          fontWeight: 500
                        }}>
                          {session.title}
                        </span>
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
                      <HiEllipsisHorizontal style={{ fontSize: 22 }} />
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
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
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
                ))
              )}
            </div>
          </>
        ) : null}
      </div>

      <div style={{ 
        marginTop: 'auto', 
        padding: '12px 0', 
        borderTop: '1px solid rgba(255,255,255,0.03)', 
        background: 'transparent', 
        width: '100%',
        overflow: 'visible'
      }}>
        <div style={{ padding: isOpen ? '0 8px' : '0', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ textDecoration: 'none', width: '100%' }}>
                  <NavButton 
                    icon={HiCog8Tooth}
                    label="Settings"
                    onClick={() => {}}
                    collapsed={!isOpen}
                  />
                </Link>
              )}
              
              <div 
                onClick={onLogout}
                style={{ width: '100%' }}
              >
                <div style={{
                  padding: isOpen ? '8px 12px' : '0',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  minHeight: 44
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: 13, flexShrink: 0
                  }}>
                    {user?.email?.[0].toUpperCase() || <HiUser style={{ fontSize: 18 }} />}
                  </div>
                  {isOpen && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.email?.split('@')[0] || 'User'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Logout</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div 
              onClick={onLoginClick}
              style={{ width: '100%' }}
            >
              <NavButton 
                icon={HiArrowRightOnRectangle}
                label="Sign in"
                onClick={() => {}}
                collapsed={!isOpen}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function MenuSkeleton() {
  return (
    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="skeleton-pulse" style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      <div className="skeleton-pulse" style={{ width: '70%', height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
    </div>
  )
}

function NavButton({ icon: Icon, label, onClick, collapsed, isLoading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative', height: collapsed ? 36 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: collapsed ? 36 : '100%', margin: collapsed ? '0 auto' : '0' }}>
      {collapsed && (
        <motion.div 
          initial={{ opacity: 0, x: -5, y: '-50%' }}
          animate={{ opacity: hovered ? 1 : 0, x: 0, y: '-50%' }}
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            marginLeft: 12,
            padding: '4px 10px',
            background: '#065f46',
            color: 'white',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none',
            transition: { duration: 0.1, ease: 'easeOut' }
          }}
        >
          {label}
        </motion.div>
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: collapsed ? 36 : '100%',
          height: collapsed ? 36 : 'auto',
          margin: collapsed ? '0 auto' : '0',
          padding: collapsed ? '0' : '4px 0',
          background: !collapsed && hovered ? 'var(--accent-glow)' : 'transparent',
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
          minHeight: collapsed ? 36 : 32
        }}
      >
        <div style={{ 
          width: 36, height: 36, borderRadius: 8, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s', flexShrink: 0,
          background: collapsed && hovered ? 'var(--accent-glow)' : 'transparent'
        }}>
          <Icon style={{ fontSize: 20, color: 'var(--text-secondary)', flexShrink: 0 }} />
        </div>
        {!collapsed && (
          isLoading ? (
            <div className="skeleton-pulse" style={{ height: 16, width: 80, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginLeft: 0 }} />
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'left', marginLeft: 0 }}>{label}</span>
          )
        )}
      </button>
    </div>
  )
}

function MenuButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        color: danger ? '#ef4444' : 'var(--text-primary)',
        fontSize: 14,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.2s'
      }}
      onMouseEnter={() => (document.getElementById(`menu-icon-${id}`) || {}).style && (document.getElementById(`menu-icon-${id}`).style.background = 'white')}
      onMouseLeave={() => (document.getElementById(`menu-icon-${id}`) || {}).style && (document.getElementById(`menu-icon-${id}`).style.background = 'transparent')}
    >
      <div id={`menu-icon-${id}`} className="icon-circle" style={{ 
        width: 32, height: 32, borderRadius: 8, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s', flexShrink: 0
      }}>
        <Icon style={{ fontSize: 20, color: 'var(--text-secondary)', flexShrink: 0 }} />
      </div>
      <span style={{ marginLeft: 8 }}>{label}</span>
    </button>
  )
}
