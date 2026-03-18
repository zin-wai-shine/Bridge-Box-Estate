import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineHome, HiOutlineClipboardCheck, HiOutlineShieldCheck,
  HiOutlinePencil, HiOutlineCheck, HiOutlineX, HiOutlineTrash,
  HiOutlineExternalLink, HiOutlineChat, HiOutlineLogout,
  HiOutlinePlus, HiOutlineRefresh, HiOutlineLink
} from 'react-icons/hi'
import {
  getDashboardStats, getDraftListings, getActiveListings, getPermissions,
  updateProperty, approveProperty, deleteProperty,
  approvePermission, denyPermission, scrapeProperty
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
  const [scrapeMsg, setScrapeMsg] = useState('')

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

  const handleScrape = async (e) => {
    e.preventDefault()
    if (!scrapeUrl.trim()) return
    setScrapeLoading(true)
    setScrapeMsg('')
    try {
      await scrapeProperty(scrapeUrl)
      setScrapeMsg('✅ Property scraped and saved as draft!')
      setScrapeUrl('')
      loadData()
    } catch (err) {
      setScrapeMsg('❌ ' + (err.response?.data?.error || 'Scraping failed'))
    }
    setScrapeLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('bribox_token')
    localStorage.removeItem('bribox_user')
    navigate('/login')
  }

  // Column Definitions
  const draftColumns = [
    { accessorKey: 'address', header: 'Address', cell: (info) => `${info.row.original.address}, ${info.row.original.city}` },
    { accessorKey: 'price', header: 'Price', cell: (info) => `$${info.getValue()?.toLocaleString()}` },
    { header: 'Beds / Baths', cell: (info) => `${info.row.original.bedrooms}bd / ${info.row.original.bathrooms}ba` },
    { accessorKey: 'status', header: 'Status', cell: (info) => <span className="badge badge-draft">{info.getValue()}</span> },
    {
      header: 'Actions',
      cell: (info) => (
        <div className="flex gap-2">
          <button onClick={() => setEditProp(info.row.original)} className="btn btn-secondary btn-sm">
            <HiOutlinePencil /> Edit
          </button>
          <button onClick={() => handleApprove(info.row.original.id)} className="btn btn-success btn-sm">
            <HiOutlineCheck /> Approve
          </button>
          <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-danger btn-sm">
            <HiOutlineTrash />
          </button>
        </div>
      )
    }
  ]

  const activeColumns = [
    { accessorKey: 'address', header: 'Address', cell: (info) => `${info.row.original.address}, ${info.row.original.city}` },
    { accessorKey: 'price', header: 'Price', cell: (info) => `$${info.getValue()?.toLocaleString()}` },
    { header: 'Beds / Baths', cell: (info) => `${info.row.original.bedrooms}bd / ${info.row.original.bathrooms}ba` },
    { accessorKey: 'square_footage', header: 'Sq.Ft', cell: (info) => info.getValue()?.toLocaleString() },
    { accessorKey: 'status', header: 'Status', cell: (info) => <span className="badge badge-active">{info.getValue()}</span> },
  ]

  const permissionColumns = [
    { accessorKey: 'property_id', header: 'Property ID' },
    { accessorKey: 'owner_user_id', header: 'Owner ID' },
    { accessorKey: 'status', header: 'Status', cell: (info) => <span className={`badge badge-${info.getValue()?.toLowerCase()}`}>{info.getValue()}</span> },
    { accessorKey: 'chat_log_snippet', header: 'Request Context', cell: (info) => info.getValue() ? `"${info.getValue()}"` : '-' },
    {
      header: 'Actions',
      cell: (info) => info.row.original.status === 'Pending' ? (
        <div className="flex gap-2">
          <button onClick={() => handlePermApprove(info.row.original.id)} className="btn btn-success btn-sm">
            <HiOutlineCheck /> Approve
          </button>
          <button onClick={() => handlePermDeny(info.row.original.id)} className="btn btn-danger btn-sm">
            <HiOutlineX /> Deny
          </button>
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
    <div className="page-container" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: 'white'
          }}>B</div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Compiler</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email} • {user.role}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/chat" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <HiOutlineChat /> Chat
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <HiOutlineLogout /> Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav style={{
          width: 240, padding: '24px 16px', borderRight: '1px solid var(--border)',
          background: 'var(--bg-card)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          {tabs.map(t => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.4 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: tab === t.id ? '#f3f4f6' : 'transparent',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: tab === t.id ? 600 : 500,
                fontFamily: 'inherit', textAlign: 'left', transition: 'all var(--transition)',
                width: '100%'
              }}
            >
              <t.icon style={{ fontSize: 20 }} /> {t.label}
            </motion.button>
          ))}
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <AnimatePresence mode="wait">
            {/* Dashboard Tab */}
            {tab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h2>
                  <button onClick={loadData} className="btn btn-secondary btn-sm" disabled={loading}>
                    <HiOutlineRefresh className={loading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  <div className="metric-card">
                    <div className="metric-value">{stats.draft_listings}</div>
                    <div className="metric-label">Draft Listings</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{stats.active_listings}</div>
                    <div className="metric-label">Active Listings</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{stats.pending_permissions}</div>
                    <div className="metric-label">Pending Permissions</div>
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

            {/* Scrape Tab */}
            {tab === 'scrape' && (
              <motion.div key="scrape" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Bridge Scraper</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24 }}>
                  Paste a property listing URL to automatically scrape, parse with AI, and enhance images.
                </p>

                <form onSubmit={handleScrape} className="glass" style={{ padding: 32 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
                    Property URL
                  </label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <HiOutlineLink style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 20 }} />
                      <motion.input
                        id="scrape-url"
                        type="url"
                        className="input"
                        style={{ paddingLeft: 46, fontSize: 15, padding: '14px 16px 14px 46px' }}
                        placeholder="https://example.com/listing/123"
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        required
                        whileFocus={{ borderColor: '#a3a3a3' }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <motion.button
                      type="submit"
                      className="btn btn-primary"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.4 }}
                      disabled={scrapeLoading}
                      style={{ padding: '0 28px' }}
                    >
                      {scrapeLoading ? 'Scraping...' : <><HiOutlinePlus /> Scrape</>}
                    </motion.button>
                  </div>
                  {scrapeMsg && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                      style={{ marginTop: 16, fontSize: 14, color: scrapeMsg.includes('❌') ? 'var(--danger)' : 'var(--success)' }}>
                      {scrapeMsg}
                    </motion.p>
                  )}
                </form>
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
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
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
              whileFocus={{ borderColor: '#a3a3a3' }}
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
          whileFocus={{ borderColor: '#a3a3a3' }}
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
