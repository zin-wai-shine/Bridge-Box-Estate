import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi'

const DataTable = ({ columns, data, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  // 1. Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
      const matchesStatus = filterStatus === 'All' || row.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [data, searchQuery, filterStatus])

  // 2. Pagination Logic
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // Reset to first page when search/filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // Unique statuses for filter dropdown
  const statusOptions = useMemo(() => {
    const statusSet = new Set(data.map(r => r.status))
    return ['All', ...Array.from(statusSet).filter(Boolean)]
  }, [data])

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Search and Filter Bar (Google AI Studio Style) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 24,
        gap: 16
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <HiOutlineSearch style={{ 
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', 
            color: '#9aa0a6', fontSize: 18 
          }} />
          <input 
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 14px 10px 42px', color: '#e8eaed', fontSize: 14, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#8ab4f8')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, paddingLeft: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <HiOutlineFilter style={{ color: '#9aa0a6' }} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e8eaed', padding: '8px 12px', outline: 'none', cursor: 'pointer', fontSize: 13
              }}
            >
              {statusOptions.map(s => <option key={s} value={s} style={{ background: '#131314' }}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#e8eaed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {columns.map((col, idx) => (
                <th key={idx} style={{ 
                  padding: '12px 16px', fontSize: 11, fontWeight: 500, color: '#9aa0a6', textTransform: 'uppercase',
                  letterSpacing: '0.05em', width: col.flex ? `${(col.flex / 10) * 100}%` : 'auto', minWidth: col.minWidth || 100
                }}>
                  {col.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ position: 'relative', minHeight: '300px' }}>
            <AnimatePresence mode="popLayout">
              {currentData.length > 0 ? (
                currentData.map((row, rowIdx) => (
                  <motion.tr 
                    key={row.id || rowIdx}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.03 }}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        {col.cellRenderer ? col.cellRenderer({ data: row, value: row[col.field] }) : row[col.field]}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={columns.length} style={{ padding: '100px 0', textAlign: 'center', color: '#9aa0a6', fontStyle: 'italic' }}>
                    No matching results found.
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {filteredData.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 0', gap: 24, color: '#9aa0a6', fontSize: 12 }}>
          <div>
            {(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                background: 'transparent', border: 'none', color: '#9aa0a6', cursor: currentPage === 1 ? 'default' : 'pointer',
                opacity: currentPage === 1 ? 0.3 : 1, fontSize: 20, display: 'flex'
              }}
            >
              <HiOutlineChevronLeft />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: 'transparent', border: 'none', color: '#9aa0a6', cursor: currentPage === totalPages ? 'default' : 'pointer',
                opacity: currentPage === totalPages ? 0.3 : 1, fontSize: 20, display: 'flex'
              }}
            >
              <HiOutlineChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
