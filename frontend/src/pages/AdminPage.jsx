import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineHome, HiOutlineClipboardCheck, HiOutlineShieldCheck,
  HiOutlinePencil, HiOutlineCheck, HiOutlineX, HiOutlineTrash,
  HiOutlineExternalLink, HiOutlineChat, HiOutlineLogout,
  HiOutlinePlus, HiOutlineRefresh, HiOutlineLink,
  HiOutlineAdjustments, HiOutlineScale, HiOutlineSparkles
} from 'react-icons/hi'
import {
  getDashboardStats, getDraftListings, getActiveListings, getPermissions,
  updateProperty, approveProperty, deleteProperty,
  approvePermission, denyPermission, scrapeProperty, refineDraft, publishProperty
} from '../services/api'
import { 
  HiOutlineMicrophone, HiArrowUp, HiPlus, 
  HiOutlineAdjustments as HiAdjustments,
  HiOutlineLightningBolt
} from 'react-icons/hi'
import DataTable from '../components/DataTable'
import whiteIcon from '../assets/logo/white_icon.png'
import whiteLogo from '../assets/logo/white_logo.png'

export default function AdminPage() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('bribox_user') || '{}')
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState({ draft_listings: 0, active_listings: 0, pending_permissions: 0 })
  const [drafts, setDrafts] = useState([])
  const [actives, setActives] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [editProp, setEditProp] = useState(null)
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isToggleHovered, setIsToggleHovered] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [filePreviews, setFilePreviews] = useState([])
  const [scraperLog, setScraperLog] = useState([
    { role: 'ai', content: 'Ready to bridge listings. Paste a property URL or upload photos below.' }
  ])
  const scraperEndRef = React.useRef(null)
  
  const scrollToBottom = () => {
    scraperEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (tab === 'scrape') scrollToBottom()
  }, [scraperLog, tab])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, d, a, p] = await Promise.all([
        getDashboardStats(),
        getDraftListings(),
        getActiveListings(),
        getPermissions()
      ])
      setStats(s.data)
      setDrafts(d.data.listings || [])
      setActives(a.data.listings || [])
      setPermissions(p.data.permissions || [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleApprove = async (id) => {
    await approveProperty(id)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return
    await deleteProperty(id)
    loadData()
  }

  const handlePermApprove = async (id) => {
    await approvePermission(id)
    loadData()
  }

  const handlePermDeny = async (id) => {
    await denyPermission(id)
    loadData()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setPendingFiles(prev => [...prev, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreviews(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
    setFilePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleScrape = async (e) => {
    if (e) e.preventDefault()
    if (!scrapeUrl && pendingFiles.length === 0) return
    
    const url = scrapeUrl
    const currentFiles = [...pendingFiles]
    
    setScrapeUrl('')
    setPendingFiles([])
    setFilePreviews([])
    setScrapeLoading(true)
    
    // 1. CLEANUP PREVIOUS FAILURES
    setScraperLog(prev => prev.filter(l => !l.content?.includes('❌')))
    
    // 2. USER PASTE / UPLOAD
    setScraperLog(prev => [...prev, { 
      role: 'user', 
      content: url || "No URL provided", 
      hasImages: currentFiles.length > 0 
    }])
    
    // 3. VISUAL PROGRESS CARD
    setScraperLog(prev => [...prev, { 
      role: 'ai', 
      type: 'progress', 
      steps: [
        { label: url ? 'Extracting listing data from URL...' : 'Analyzing uploaded photos...', status: 'loading' },
        { label: 'Upscaling all assets to 4K...', status: 'pending' },
        { label: 'Combining into premium gallery...', status: 'pending' }
      ]
    }])
    
    try {
      // Use FormData for hybrid upload
      const formData = new FormData()
      if (url) formData.append('source_url', url)
      currentFiles.forEach(file => formData.append('images', file))

      // Update API service call to handle FormData (or just use axios here for simplicity)
      const token = localStorage.getItem('bribox_token')
      const resp = await axios.post('/api/v1/bridge/hybrid', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const property = resp.data.property

      // Simulate step transitions
      await new Promise(r => setTimeout(r, 1000))
      updateLastLogStep(0, 'success')
      updateLastLogStep(1, 'loading')
      
      await new Promise(r => setTimeout(r, 1500))
      updateLastLogStep(1, 'success')
      updateLastLogStep(2, 'loading')

      await new Promise(r => setTimeout(r, 1500))
      updateLastLogStep(2, 'success')

      // FINAL RESULT CARD
      setScraperLog(prev => [...prev, { 
        role: 'ai', 
        type: 'result',
        content: `**Hybrid Bridge Success.** I've combined your **${currentFiles.length}** manual uploads with the **${resp.data.media?.length - currentFiles.length || 0}** discovered images. All assets have been enhanced.`,
        data: property,
        images: resp.data.media || [],
        isFinal: true
      }])
    } catch (err) {
      setScraperLog(prev => [...prev, { role: 'ai', content: '❌ Bridging failed. Please check your URL/Images and try again.' }])
    }
    setScrapeLoading(false)
  }

  const updateLastLogStep = (stepIdx, status) => {
    setScraperLog(prev => {
      const newLog = [...prev]
      const last = newLog[newLog.length - 1]
      if (last.type === 'progress') {
        last.steps[stepIdx].status = status
      }
      return newLog
    })
  }

  const handleUpdateListing = async (text, lastProperty) => {
    setScrapeLoading(true)
    setScraperLog(prev => [...prev, { role: 'user', content: text }])
    
    try {
      const resp = await refineDraft(lastProperty.id, text)
      const updatedProperty = resp.data.property

      setScraperLog(prev => [...prev, { 
        role: 'ai', 
        content: `I've updated the listing based on your instructions: "${text}". The description and assets have been re-calibrated.`,
        data: updatedProperty,
        image: updatedProperty.images && updatedProperty.images.length > 0 ? updatedProperty.images[0].url : (lastProperty.images ? lastProperty.images[0].url : null),
        isFinal: true
      }])
    } catch (err) {
      setScraperLog(prev => [...prev, { role: 'ai', content: '❌ Failed to refine listing. Please try a different instruction.' }])
    }
    setScrapeLoading(false)
  }

  const handlePush = async (propertyId, platform) => {
    try {
      await publishProperty(propertyId, platform)
      alert(`Successfully pushed property ${propertyId} to ${platform}!`)
    } catch (err) {
      alert('❌ Failed to publish to ' + platform)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('bribox_token')
    localStorage.removeItem('bribox_user')
    navigate('/login')
  }

  // Column Definitions for AG-Grid (Google AI Studio Theme)
  const draftColumns = [
    { 
      field: 'address', 
      headerName: 'PROJECT', 
      flex: 3, 
      cellRenderer: (params) => (
        <div className="flex flex-col py-2">
          <span style={{ color: '#8ab4f8', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>{params.data.address}</span>
          <span style={{ color: '#9aa0a6', fontSize: 11 }}>{params.data.city}, {params.data.state}</span>
        </div>
      ) 
    },
    { 
      field: 'price', 
      headerName: 'PRICE', 
      cellRenderer: (params) => (
        <div style={{ color: '#e8eaed', fontWeight: 400 }}>${params.value?.toLocaleString()}</div>
      )
    },
    { 
      headerName: 'BEDS / BATHS', 
      cellRenderer: (params) => (
        <div style={{ color: '#9aa0a6' }}>{params.data.bedrooms}bd / {params.data.bathrooms}ba</div>
      )
    },
    { 
      field: 'status', 
      headerName: 'STATUS', 
      cellRenderer: (params) => (
        <span style={{ 
          background: 'rgba(255,255,255,0.05)', color: '#9aa0a6', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500
        }}>{params.value}</span>
      ) 
    },
    {
      headerName: 'ACTIONS',
      minWidth: 160,
      cellRenderer: (params) => (
        <div className="flex gap-4 h-full items-center justify-end pr-4 text-[var(--text-muted)]">
          <HiOutlinePencil 
            className="cursor-pointer hover:text-[var(--text-primary)] transition-colors" 
            style={{ fontSize: 18 }} 
            onClick={() => setEditProp(params.data)}
            title="Edit"
          />
          <HiOutlineCheck 
            className="cursor-pointer hover:text-[var(--success)] transition-colors" 
            style={{ fontSize: 18 }} 
            onClick={() => handleApprove(params.data.id)}
            title="Approve"
          />
          <HiOutlineTrash 
            className="cursor-pointer hover:text-[var(--danger)] transition-colors" 
            style={{ fontSize: 18 }} 
            onClick={() => handleDelete(params.data.id)}
            title="Delete"
          />
        </div>
      )
    }
  ]

  const activeColumns = [
    { 
      field: 'address', 
      headerName: 'PROJECT', 
      flex: 3, 
      cellRenderer: (params) => (
        <div className="flex flex-col py-2">
          <span style={{ color: '#8ab4f8', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>{params.data.address}</span>
          <span style={{ color: '#9aa0a6', fontSize: 11 }}>{params.data.city}, {params.data.state}</span>
        </div>
      ) 
    },
    { 
      field: 'price', 
      headerName: 'PRICE', 
      cellRenderer: (params) => (
        <div style={{ color: '#e8eaed', fontWeight: 400 }}>${params.value?.toLocaleString()}</div>
      )
    },
    { 
      headerName: 'BEDS / BATHS', 
      cellRenderer: (params) => (
        <div style={{ color: '#9aa0a6' }}>{params.data.bedrooms}bd / {params.data.bathrooms}ba</div>
      )
    },
    { 
      field: 'square_footage', 
      headerName: 'SQUARE FOOTAGE', 
      cellRenderer: (params) => (
        <div style={{ color: '#9aa0a6' }}>{params.value?.toLocaleString()} sq.ft</div>
      )
    },
    { 
      field: 'status', 
      headerName: 'STATUS', 
      cellRenderer: (params) => (
        <span style={{ 
          background: 'rgba(59, 130, 246, 0.1)', color: '#8ab4f8', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500
        }}>{params.value}</span>
      ) 
    },
  ]

  const permissionColumns = [
    { field: 'property_id', headerName: 'PROPERTY ID', cellStyle: { color: '#9aa0a6' } },
    { field: 'owner_user_id', headerName: 'OWNER ID', cellStyle: { color: '#9aa0a6' } },
    { field: 'status', headerName: 'STATUS', cellRenderer: (params) => (
      <span style={{ 
        background: params.value === 'Approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', 
        color: params.value === 'Approved' ? '#4ade80' : '#9aa0a6', 
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500
      }}>{params.value}</span>
    ) },
    { 
      field: 'chat_log_snippet', 
      headerName: 'REQUEST CONTEXT', 
      flex: 2, 
      cellRenderer: (params) => (
        <span style={{ color: '#9aa0a6', fontStyle: 'italic', fontSize: 12 }}>{params.value ? `"${params.value}"` : '-'}</span>
      ) 
    },
    {
      headerName: 'ACTIONS',
      cellRenderer: (params) => params.data.status === 'Pending' ? (
        <div className="flex gap-4 h-full items-center">
           <HiOutlineCheck 
            className="cursor-pointer hover:text-[var(--success)] transition-colors" 
            style={{ fontSize: 18, color: '#9aa0a6' }} 
            onClick={() => handlePermApprove(params.data.id)}
            title="Approve"
          />
          <HiOutlineX 
            className="cursor-pointer hover:text-[var(--danger)] transition-colors" 
            style={{ fontSize: 18, color: '#9aa0a6' }} 
            onClick={() => handlePermDeny(params.data.id)}
            title="Deny"
          />
        </div>
      ) : '-'
    }
  ]

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { id: 'drafts', label: 'Draft Listings', icon: HiOutlineClipboardCheck },
    { id: 'active', label: 'Active Listings', icon: HiOutlineExternalLink },
    { id: 'permissions', label: 'Permissions', icon: HiOutlineShieldCheck },
    { id: 'scrape', label: 'Bridge Scraper', icon: HiOutlineLink },
  ]

  return (
    <div className="page-container" style={{ background: 'var(--bg-primary)', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <motion.nav 
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 60 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{
            height: '100%',
            background: '#090909',
            display: 'flex',
            flexDirection: 'column',
            borderRight: 'none',
            zIndex: 20,
            overflow: 'hidden',
          }}
        >
          {/* Sidebar Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: sidebarOpen ? 'space-between' : 'center', 
            padding: '12px 0',
            margin: '0 16px',
            marginBottom: 8,
            minHeight: 88
          }}>
            {sidebarOpen ? (
              <>
                <img src={whiteLogo} alt="BriBox" style={{ height: 64, width: 'auto', marginLeft: 0 }} />
                <button 
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                    fontSize: 20, cursor: 'pointer', padding: 8, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSidebarOpen(true)}
                onMouseEnter={() => setIsToggleHovered(true)}
                onMouseLeave={() => setIsToggleHovered(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                  fontSize: 20, cursor: 'pointer', padding: 8, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s', width: 40, height: 40
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isToggleHovered ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                ) : (
                <img src={whiteIcon} alt="B" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                )}
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <div style={{ padding: sidebarOpen ? '0 12px 10px' : '0 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map(t => (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                whileHover={{ x: sidebarOpen ? 4 : 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  gap: 12, padding: '10px 16px', minHeight: 44,
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: tab === t.id ? 'var(--bg-input)' : 'transparent',
                  color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 14, fontWeight: tab === t.id ? 600 : 500,
                  fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s',
                  width: '100%'
                }}
                onMouseOver={(e) => { if (tab !== t.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseOut={(e) => { if (tab !== t.id) e.currentTarget.style.background = 'transparent' }}
                title={!sidebarOpen ? t.label : ''}
              >
                <t.icon style={{ fontSize: 20, color: tab === t.id ? 'var(--accent-primary)' : 'inherit', flexShrink: 0 }} />
                {sidebarOpen && <span>{t.label}</span>}
              </motion.button>
            ))}
          </div>

          {/* User Info & Header Actions (Moved to sidebar bottom if desired, but I'll skip for now to keep it clean) */}
          <div style={{ marginTop: 'auto', padding: '16px' }}>
             {sidebarOpen && (
               <div style={{ padding: '8px 4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{user.email.split('@')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</div>
                  
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <Link to="/chat" 
                      style={{ 
                        textDecoration: 'none', color: 'var(--text-secondary)', flex: 1,
                        fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <HiOutlineChat /> Chat
                    </Link>
                    <button onClick={handleLogout} 
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', flex: 1,
                        fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 8,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <HiOutlineLogout /> Exit
                    </button>
                  </div>
               </div>
             )}
          </div>
        </motion.nav>

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <AnimatePresence mode="wait">
            {/* Dashboard Tab */}
            {tab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h2>
                  <button 
                    onClick={loadData} 
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 500, padding: '8px 16px', borderRadius: 8,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    <HiOutlineRefresh className={loading ? 'animate-spin' : ''} style={{ fontSize: 16 }} /> Refresh
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                  <div className="metric-card" style={{ padding: '20px 24px', border: 'none', boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="metric-value" style={{ fontSize: 28, color: 'var(--text-primary)' }}>{stats.draft_listings}</div>
                    <div className="metric-label" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Draft Listings</div>
                  </div>
                  <div className="metric-card" style={{ padding: '20px 24px', border: 'none', boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="metric-value" style={{ fontSize: 28, color: 'var(--accent-primary)' }}>{stats.active_listings}</div>
                    <div className="metric-label" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Active Listings</div>
                  </div>
                  <div className="metric-card" style={{ padding: '20px 24px', border: 'none', boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="metric-value" style={{ fontSize: 28, color: 'var(--text-primary)' }}>{stats.pending_permissions}</div>
                    <div className="metric-label" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Pending Permissions</div>
                  </div>
                  <div className="metric-card" style={{ padding: '20px 24px', border: 'none', boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="metric-value" style={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.5 }}>0</div>
                    <div className="metric-label" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Active Sessions</div>
                  </div>
                  <div className="metric-card" style={{ padding: '20px 24px', border: 'none', boxShadow: 'none', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="metric-value" style={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.5 }}>0</div>
                    <div className="metric-label" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Total Views</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Drafts Tab */}
            {tab === 'drafts' && (
              <motion.div key="drafts" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Draft Listings</h2>
                <DataTable columns={draftColumns} data={drafts} isLoading={loading} />
              </motion.div>
            )}

            {/* Active Tab */}
            {tab === 'active' && (
              <motion.div key="active" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Active Listings</h2>
                <DataTable columns={activeColumns} data={actives} isLoading={loading} />
              </motion.div>
            )}

            {/* Permissions Tab */}
            {tab === 'permissions' && (
              <motion.div key="permissions" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Permission Requests</h2>
                <DataTable columns={permissionColumns} data={permissions} isLoading={loading} />
              </motion.div>
            )}

            {/* Scrape Tab (Refined Chat Interface) */}
            {tab === 'scrape' && (
              <motion.div key="scrape" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
                {/* Chat Header */}
                <div style={{ padding: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>Bridge Scraper</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>AI-powered property extraction and multi-platform publishing.</p>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 40 }}>
                    {scraperLog.map((log, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: log.role === 'user' ? 'flex-end' : 'flex-start' }}
                      >
                        <div style={{ 
                          maxWidth: '85%', 
                          padding: log.role === 'user' ? '12px 20px' : '0',
                          background: log.role === 'user' ? 'var(--bg-input)' : 'transparent',
                          borderRadius: 20,
                          color: log.role === 'user' ? 'var(--text-primary)' : '#e8eaed',
                          fontSize: 15,
                          lineHeight: 1.6
                        }}>
                          {log.role === 'ai' && (
                             <div style={{ display: 'flex', gap: 16 }}>
                               <div style={{ 
                                 width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary)', 
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4
                               }}>
                                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white' }} />
                               </div>
                               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                 {/* 1. PROGRESS CARD TYPE */}
                                 {log.type === 'progress' && (
                                   <div className="glass-strong" style={{ padding: 24, width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                     {log.steps.map((s, idx) => (
                                       <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                         {s.status === 'success' ? <HiOutlineCheck style={{ color: 'var(--success)', fontSize: 18 }} /> :
                                          s.status === 'loading' ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #8ab4f8', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> :
                                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />}
                                         <span style={{ fontSize: 13, color: s.status === 'pending' ? '#5f6368' : '#e8eaed' }}>{s.label}</span>
                                       </div>
                                     ))}
                                   </div>
                                 )}

                                 {/* 2. RESULT CARD TYPE */}
                                 {log.type === 'result' && log.data && (
                                   <motion.div 
                                     initial={{ opacity: 0, scale: 0.98 }} 
                                     animate={{ opacity: 1, scale: 1 }}
                                     className="glass-strong" 
                                     style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: 500, border: '1px solid rgba(255,255,255,0.1)' }}
                                   >
                                      {/* High-Res Image Slider (Simplified with Management) */}
                                      {log.images && log.images.length > 0 && (
                                        <div style={{ position: 'relative', width: '100%', height: 300, background: '#131314' }}>
                                           <img src={log.images[0].url} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                           <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                                              <button style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                 <HiOutlineAdjustments /> Manage
                                              </button>
                                              <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '6px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>4K HD</div>
                                           </div>
                                           <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                                              {log.images.slice(0, 5).map((_, i) => (
                                                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? 'white' : 'rgba(255,255,255,0.3)' }} />
                                              ))}
                                           </div>
                                        </div>
                                      )}
                                     
                                     <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                         <div style={{ color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Premium Bridge Result</div>
                                         <div style={{ fontSize: 20, fontWeight: 700 }}>{log.data.address}</div>
                                         <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>${log.data.price?.toLocaleString()}</span>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{log.data.square_footage || 0} SQM</span>
                                         </div>
                                       </div>

                                       <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{log.data.description}</div>

                                       <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                         <button 
                                           className="btn btn-primary" 
                                           style={{ flex: 1, fontSize: 13, height: 44, borderRadius: 12 }}
                                           onClick={() => { loadData(); alert('Saved to Drafts') }}
                                         >
                                           <HiOutlineClipboardCheck /> Save Draft
                                         </button>
                                         
                                         <div style={{ position: 'relative', flex: 1 }}>
                                           <button 
                                             className="btn btn-secondary" 
                                             style={{ width: '100%', fontSize: 13, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none' }}
                                             onClick={(e) => {
                                               const menu = e.currentTarget.nextElementSibling
                                               menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
                                             }}
                                           >
                                             <HiOutlineExternalLink /> Push live
                                           </button>
                                           <div className="glass-strong" style={{ display: 'none', position: 'absolute', bottom: 'calc(100% + 12px)', right: 0, width: 220, zIndex: 10, padding: 8, boxShadow: '0 20px 40px rgba(0,0,0,0.6)', borderRadius: 12 }}>
                                             {['Facebook Real Estate', 'Instagram Stories', 'Bribox Prime', 'Dot Property'].map(p => (
                                               <div key={p} className="hover:bg-white/5 p-3 rounded-lg cursor-pointer text-sm transition-colors" onClick={() => handlePush(log.data.id, p)}>{p}</div>
                                             ))}
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   </motion.div>
                                 )}

                                 <div dangerouslySetInnerHTML={{ __html: log.content?.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--accent-primary)">$1</strong>') || '' }} />

                               </div>
                             </div>
                          )}
                          {log.role === 'user' && log.content}
                        </div>
                      </motion.div>
                    ))}
                    {scrapeLoading && (
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.5, animation: 'pulse 2s infinite' }} />
                        <div style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>Analyzing listing URL...</div>
                      </div>
                    )}
                    <div ref={scraperEndRef} />
                  </div>
                </div>

                {/* Scrape Input (Pill Style - Refined) */}
                <div style={{ padding: '0 0 32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  {/* Image Previews Pop-in */}
                  <AnimatePresence>
                    {filePreviews.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ display: 'flex', gap: 12, marginBottom: 8, maxWidth: 800, width: '100%', overflowX: 'auto', padding: '8px 4px' }}
                      >
                        {filePreviews.map((p, i) => (
                          <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={p} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                            <button 
                              onClick={() => handleRemoveFile(i)}
                              style={{ position: 'absolute', top: -10, right: -10, background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                            >
                              <HiOutlineX />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ maxWidth: 850, margin: '0 auto', width: '100%', position: 'relative' }}>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!scrapeUrl.startsWith('http') && scrapeUrl) {
                          const lastAiLog = [...scraperLog].reverse().find(l => l.role === 'ai' && l.data)
                          if (lastAiLog) {
                            handleUpdateListing(scrapeUrl, lastAiLog.data)
                            setScrapeUrl('')
                            return
                          }
                        }
                        handleScrape(e)
                      }}
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
                        placeholder="Bridge a listing URL, or ask to refine the details..."
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            e.currentTarget.form.requestSubmit()
                          }
                        }}
                        style={{
                          width: '100%', background: 'transparent', border: 'none',
                          color: '#e8eaed', fontSize: 16, outline: 'none',
                          resize: 'none', flex: 1, padding: '4px 0',
                          lineHeight: 1.5
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', color: '#9aa0a6', transition: 'all 0.2s' }}>
                            <HiPlus style={{ fontSize: 18 }} />
                            <input type="file" multiple hidden onChange={handleFileChange} />
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', color: '#9aa0a6' }}>
                            <HiOutlineLightningBolt style={{ fontSize: 16 }} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <HiOutlineMicrophone style={{ color: '#9aa0a6', fontSize: 20, cursor: 'pointer' }} />
                          <button 
                            type="submit"
                            disabled={scrapeLoading || (!scrapeUrl && pendingFiles.length === 0)}
                            style={{ 
                              background: 'white', color: 'black', border: 'none', borderRadius: '50%',
                              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', opacity: (scrapeLoading || (!scrapeUrl && pendingFiles.length === 0)) ? 0.3 : 1, 
                              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                          >
                            <HiArrowUp style={{ fontSize: 20 }} />
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Modal */}
          <AnimatePresence>
            {editProp && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 100, padding: 24
                }}
                onClick={() => setEditProp(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="glass-strong"
                  style={{ width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', padding: 40 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Edit Property</h3>
                  <EditForm
                    property={editProp}
                    onSave={async (data) => {
                      await updateProperty(editProp.id, data)
                      setEditProp(null)
                      loadData()
                    }}
                    onCancel={() => setEditProp(null)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function EditForm({ property, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: property.address || '',
    city: property.city || '',
    state: property.state || '',
    zip: property.zip || '',
    price: property.price || 0,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    square_footage: property.square_footage || 0,
    description: property.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const fields = [
    { label: 'Address', field: 'address', type: 'text' },
    { label: 'City', field: 'city', type: 'text', half: true },
    { label: 'State', field: 'state', type: 'text', half: true },
    { label: 'Zip', field: 'zip', type: 'text', half: true },
    { label: 'Price ($)', field: 'price', type: 'number', half: true },
    { label: 'Bedrooms', field: 'bedrooms', type: 'number', half: true },
    { label: 'Bathrooms', field: 'bathrooms', type: 'number', half: true },
    { label: 'Sq. Footage', field: 'square_footage', type: 'number' },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {fields.map(f => (
          <div key={f.field} style={{ gridColumn: f.half ? 'auto' : '1 / -1' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {f.label}
            </label>
            <motion.input
              type={f.type}
              className="input"
              value={form[f.field]}
              onChange={(e) => handleChange(f.field, f.type === 'number' ? Number(e.target.value) : e.target.value)}
              whileFocus={{ borderColor: 'var(--accent-primary)' }}
              transition={{ duration: 0.4 }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Description
        </label>
        <motion.textarea
          className="input"
          rows={5}
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          style={{ resize: 'vertical' }}
          whileFocus={{ borderColor: 'var(--accent-primary)' }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <motion.button 
          type="submit" 
          className="btn btn-primary" 
          disabled={saving}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.4 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>
    </form>
  )
}
