import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiOutlineHome, 
  HiOutlineClipboardList, 
  HiOutlineCheckCircle, 
  HiOutlineShieldExclamation,
  HiOutlineLightningBolt, 
  HiOutlineRefresh, 
  HiOutlinePlus,
  HiOutlineExternalLink, 
  HiOutlineTrendingUp,
  HiOutlineChevronRight, 
  HiOutlinePhotograph,
  HiOutlineChatAlt,
  HiOutlineLogout,
  HiDotsVertical,
  HiViewGrid,
  HiArrowUp
} from 'react-icons/hi'
import {
  getDashboardStats, getDraftListings, getActiveListings, getPermissions,
  updateProperty, approveProperty, deleteProperty,
  approvePermission, denyPermission, scrapeProperty, refineDraft, publishProperty
} from '../services/api'
import DataTable from '../components/DataTable'

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
  const scraperEndRef = useRef(null)
  
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

  const handleLogout = () => {
    localStorage.removeItem('bribox_token')
    localStorage.removeItem('bribox_user')
    navigate('/login')
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
    
    setScraperLog(prev => prev.filter(l => !l.content?.includes('❌')))
    
    setScraperLog(prev => [...prev, { 
      role: 'user', 
      content: url || "No URL provided", 
      hasImages: currentFiles.length > 0 
    }])
    
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
      const formData = new FormData()
      if (url) formData.append('source_url', url)
      currentFiles.forEach(file => formData.append('images', file))

      const token = localStorage.getItem('bribox_token')
      const resp = await axios.post('/api/v1/bridge/hybrid', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const property = resp.data.property

      await new Promise(r => setTimeout(r, 1000))
      updateLastLogStep(0, 'success')
      updateLastLogStep(1, 'loading')
      
      await new Promise(r => setTimeout(r, 1500))
      updateLastLogStep(1, 'success')
      updateLastLogStep(2, 'loading')

      await new Promise(r => setTimeout(r, 1500))
      updateLastLogStep(2, 'success')

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
        const steps = [...last.steps]
        steps[stepIdx].status = status
        last.steps = steps
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

  const draftColumns = [
    { 
      field: 'address', 
      headerName: 'PROJECT', 
      flex: 3, 
      cellRenderer: (params) => (
        <div className="flex flex-col py-2">
          <span style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 13 }}>{params.data.address}</span>
          <span style={{ color: '#868e96', fontSize: 11 }}>{params.data.city}, {params.data.state}</span>
        </div>
      ) 
    },
    { 
      field: 'price', 
      headerName: 'PRICE', 
      cellRenderer: (params) => (
        <div style={{ color: '#1a1a1a', fontWeight: 500 }}>${params.value?.toLocaleString()}</div>
      )
    },
    { 
      headerName: 'STATUS', 
      cellRenderer: (params) => (
        <span style={{ 
          background: '#fff9db', color: '#f08c00', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
        }}>{params.data.status}</span>
      ) 
    },
    {
      headerName: 'ACTIONS',
      cellRenderer: (params) => (
        <div className="flex gap-4 h-full items-center">
          <HiOutlineCheckCircle 
            className="cursor-pointer hover:text-[var(--success)]" 
            style={{ fontSize: 18, color: '#868e96' }} 
            onClick={() => handleApprove(params.data.id)}
          />
          <HiOutlinePhotograph 
            className="cursor-pointer hover:text-[var(--danger)]" 
            style={{ fontSize: 18, color: '#868e96' }} 
            onClick={() => handleDelete(params.data.id)}
          />
        </div>
      )
    }
  ]

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: HiViewGrid },
    { id: 'drafts', label: 'Drafts', icon: HiOutlineClipboardList },
    { id: 'active', label: 'Active', icon: HiOutlineCheckCircle },
    { id: 'permissions', label: 'Permissions', icon: HiOutlineShieldExclamation },
    { id: 'scrape', label: 'Bridge Scraper', icon: HiOutlineLightningBolt },
  ]

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb', color: '#1a1a1a', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      {/* Premium Minimalist Sidebar */}
      <motion.nav 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        style={{ 
          background: 'white', 
          borderRight: '1px solid #f1f3f5',
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          zIndex: 50,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', marginBottom: 20 }}>
          {sidebarOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontWeight: 800, fontSize: 18, color: '#1a1a1a', letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, background: '#1a1a1a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>B</div>
              BriBox Admin
            </motion.div>
          ) : (
            <div style={{ width: 32, height: 32, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>B</div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#868e96', cursor: 'pointer', padding: 4 }}>
             <HiViewGrid style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '0 12px' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                gap: 12,
                padding: '12px 16px',
                marginBottom: 4,
                background: 'transparent',
                border: 'none',
                color: tab === item.id ? '#1a1a1a' : '#868e96',
                cursor: 'pointer',
                borderRadius: 8,
                transition: 'all 0.2s',
                position: 'relative',
                fontWeight: tab === item.id ? 600 : 500,
                fontSize: 14
              }}
              onMouseOver={(e) => {
                if (tab !== item.id) e.currentTarget.style.background = '#f8f9fa'
              }}
              onMouseOut={(e) => {
                if (tab !== item.id) e.currentTarget.style.background = 'transparent'
              }}
            >
              {tab === item.id && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 2, background: '#1a1a1a', borderRadius: 2 }} 
                />
              )}
              <item.icon style={{ fontSize: 20, flexShrink: 0 }} />
              {sidebarOpen && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{item.label}</motion.span>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '24px' }}>
             {sidebarOpen && (
               <div style={{ padding: '24px 16px', borderRadius: 16, background: '#f8f9fa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                     <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#495057', fontWeight: 700 }}>{user.email[0].toUpperCase()}</div>
                     <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{user.email.split('@')[0]}</div>
                        <div style={{ fontSize: 11, color: '#868e96', textTransform: 'uppercase' }}>{user.role}</div>
                     </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to="/chat" 
                      style={{ 
                        textDecoration: 'none', color: '#1a1a1a', flex: 1,
                        fontSize: 12, fontWeight: 600, padding: '10px', borderRadius: 10,
                        background: 'white', border: '1px solid #f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <HiOutlineChatAlt size={14} />
                    </Link>
                    <button onClick={handleLogout} 
                      style={{ 
                        background: 'white', border: '1px solid #f1f3f5', color: '#1a1a1a', flex: 1,
                        fontSize: 12, fontWeight: 600, padding: '10px', borderRadius: 10,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <HiOutlineLogout size={14} />
                    </button>
                  </div>
               </div>
             )}
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '48px 64px', background: '#f9fafb' }}>
        <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            <motion.div key="dashboard" variants={containerVariants} initial="hidden" animate="show" exit="hidden">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <div>
                  <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', letterSpacing: -1, marginBottom: 8 }}>Overview</h2>
                  <p style={{ color: '#868e96', fontSize: 14 }}>Real-time statistics across your property estate.</p>
                </div>
                <button 
                  onClick={loadData} 
                  disabled={loading}
                  style={{
                    background: 'white', border: '1px solid #f1f3f5', color: '#1a1a1a',
                    fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 10,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s'
                  }}
                >
                  <HiOutlineRefresh className={loading ? 'animate-spin' : ''} style={{ fontSize: 14 }} /> Refresh
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                {[
                  { label: 'Draft Listings', value: stats.draft_listings, trend: '+4 this week', icon: HiOutlineClipboardList },
                  { label: 'Active Listings', value: stats.active_listings, trend: '+12.5% vs last week', icon: HiOutlineCheckCircle },
                  { label: 'Pending Requests', value: stats.pending_permissions, trend: '2 urgent', icon: HiOutlineShieldExclamation }
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    variants={itemVariants}
                    style={{ 
                      background: 'white', 
                      padding: '24px', 
                      borderRadius: 16, 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)', 
                      border: '1px solid #f1f3f5',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#868e96', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{stat.label}</div>
                      <stat.icon style={{ color: '#adb5bd', fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 36, fontWeight: 300, color: '#1a1a1a', letterSpacing: -1 }}>{stat.value}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#40c057', fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                        <HiOutlineTrendingUp size={12} />
                        {stat.trend}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'active' && (
            <motion.div key="active" variants={containerVariants} initial="hidden" animate="show" exit="hidden">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                <div>
                  <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', letterSpacing: -1, marginBottom: 8 }}>Active Listings</h2>
                  <p style={{ color: '#868e96', fontSize: 14 }}>Managing {actives.length} premium property listings.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {actives.length > 0 ? actives.map((item, i) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                    style={{
                      background: 'white', 
                      padding: '16px 20px', 
                      borderRadius: 12,
                      border: '1px solid #f1f3f5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 20, 
                      transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f8f9fa', overflow: 'hidden', border: '1px solid #f1f3f5' }}>
                      {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd' }}><HiOutlinePhotograph size={24} /></div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#1a1a1a', marginBottom: 2 }}>{item.title || item.property_name || 'Listing #' + item.id}</div>
                      <div style={{ color: '#868e96', fontSize: 12, display: 'flex', gap: 12 }}><span>{item.location || 'N/A'}</span><span style={{ color: '#adb5bd' }}>•</span><span>{item.price ? '$' + item.price.toLocaleString() : 'Negotiable'}</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                       <div style={{ padding: '4px 10px', borderRadius: 6, background: '#e6fcf5', color: '#099268', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>ACTIVE</div>
                       <div style={{ color: '#adb5bd', cursor: 'pointer', padding: 8, borderRadius: 8 }} onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                         <HiDotsVertical size={18} />
                       </div>
                    </div>
                  </motion.div>
                )) : (
                  <motion.div variants={itemVariants} style={{ textAlign: 'center', padding: '80px 0', color: '#868e96' }}>
                     <HiOutlineHome size={64} style={{ margin: '0 auto', opacity: 0.1, marginBottom: 24 }} />
                     <h3 style={{ fontSize: 20, color: '#1a1a1a', fontWeight: 600, marginBottom: 8 }}>Your bridge is clear.</h3>
                     <p>Paste a URL to begin populating your estate.</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'drafts' && (
            <motion.div key="drafts" variants={containerVariants} initial="hidden" animate="show">
               <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', letterSpacing: -1, marginBottom: 40 }}>Draft Listings</h2>
               <div style={{ background: 'white', padding: 32, borderRadius: 20, border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <DataTable columns={draftColumns} data={drafts} isLoading={loading} theme="light" />
               </div>
            </motion.div>
          )}

          {tab === 'permissions' && (
            <motion.div key="permissions" variants={containerVariants} initial="hidden" animate="show">
               <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', letterSpacing: -1, marginBottom: 40 }}>Permission Requests</h2>
               <div style={{ background: 'white', padding: 32, borderRadius: 20, border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <DataTable columns={[
                    { field: 'property_id', headerName: 'ID' },
                    { field: 'owner_user_id', headerName: 'OWNER' },
                    { field: 'status', headerName: 'STATUS' },
                    { 
                      headerName: 'ACTIONS',
                      cellRenderer: (p) => p.data.status === 'Pending' ? (
                        <div className="flex gap-4">
                          <button onClick={() => handlePermApprove(p.data.id)} style={{ color: '#099268', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handlePermDeny(p.data.id)} style={{ color: '#e03131', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Deny</button>
                        </div>
                      ) : '-'
                    }
                  ]} data={permissions} isLoading={loading} theme="light" />
               </div>
            </motion.div>
          )}

          {tab === 'scrape' && (
            <motion.div key="scrape" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 0 24px 0', borderBottom: '1px solid #f1f3f5', backdropFilter: 'blur(10px)', background: 'rgba(249, 250, 251, 0.8)', position: 'sticky', top: 0, zIndex: 20 }}>
                <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1a1a1a', letterSpacing: -1 }}>Bridge Scraper</h2>
                <p style={{ color: '#868e96', fontSize: 13, marginTop: 4 }}>AI-powered property extraction and multi-platform publishing.</p>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 40 }}>
                  {scraperLog.map((log, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: log.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '85%', padding: log.role === 'user' ? '12px 20px' : '0', background: log.role === 'user' ? '#f1f3f5' : 'transparent', borderRadius: 20, color: '#1a1a1a', fontSize: 15, lineHeight: 1.6 }}>
                        {log.role === 'ai' ? (
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white' }} /></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {log.type === 'progress' && (
                                <div style={{ background: 'white', border: '1px solid #f1f3f5', padding: 24, borderRadius: 20, width: 320, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                  {log.steps.map((s, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      {s.status === 'success' ? <HiOutlineCheckCircle style={{ color: '#099268', fontSize: 18 }} /> : s.status === 'loading' ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #1a1a1a', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #f1f3f5' }} />}
                                      <span style={{ fontSize: 13, color: s.status === 'pending' ? '#adb5bd' : '#495057' }}>{s.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {log.type === 'result' && log.data && (
                                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f3f5', overflow: 'hidden', maxWidth: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                  {log.images && log.images.length > 0 && <img src={log.images[0].url} style={{ width: '100%', height: 240, objectFit: 'cover' }} />}
                                  <div style={{ padding: 20 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Premium Bridge Result</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, letterSpacing: -0.5 }}>{log.data.address}</div>
                                    <div style={{ fontSize: 13, color: '#868e96', marginBottom: 20, lineHeight: 1.5 }}>{log.data.description}</div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                      <button onClick={() => { loadData(); alert('Saved to Drafts') }} style={{ flex: 1, background: '#1a1a1a', color: 'white', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Save Draft</button>
                                      <button style={{ flex: 1, background: '#f8f9fa', color: '#1a1a1a', border: '1px solid #f1f3f5', padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Push Live</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {!log.type && <div>{log.content}</div>}
                            </div>
                          </div>
                        ) : log.content}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={scraperEndRef} />
                </div>
              </div>

              <div style={{ padding: '24px 0 0 0', position: 'sticky', bottom: 0, background: '#f9fafb' }}>
                <div style={{ maxWidth: 800, margin: '0 auto', background: 'white', padding: '16px 20px', borderRadius: 24, display: 'flex', flexDirection: 'column', minHeight: 120, border: '1px solid #f1f3f5', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <textarea placeholder="Paste listing URL..." value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 16, resize: 'none', flex: 1 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                       <label style={{ cursor: 'pointer' }}><HiOutlinePlus style={{ color: '#868e96' }} /><input type="file" multiple hidden onChange={handleFileChange} /></label>
                       <HiOutlineLightningBolt style={{ color: '#868e96' }} />
                    </div>
                    <button onClick={handleScrape} style={{ background: '#1a1a1a', color: 'white', width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer' }}><HiArrowUp /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
