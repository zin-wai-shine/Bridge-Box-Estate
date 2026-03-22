import React from 'react'

export function ChatSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-secondary)', display: 'flex', overflow: 'hidden', zIndex: 999 }}>
      {/* Sidebar Skeleton */}
      <div style={{ width: 280, height: '100%', borderRight: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ padding: '24px 20px' }}>
          <div className="skeleton-pulse" style={{ width: 100, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 32 }} />
          <div className="skeleton-pulse" style={{ width: '100%', height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }} />
          <div className="skeleton-pulse" style={{ width: '100%', height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.03)', marginBottom: 24 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-pulse" style={{ width: '100%', height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.02)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Main Area Skeleton */}
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="skeleton-pulse" style={{ width: 120, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
        </div>
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ alignSelf: 'flex-start', width: '60%', height: 100, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }} className="skeleton-pulse" />
          <div style={{ alignSelf: 'flex-end', width: '40%', height: 60, borderRadius: 12, background: 'rgba(16, 185, 129, 0.05)' }} className="skeleton-pulse" />
          <div style={{ alignSelf: 'flex-start', width: '55%', height: 120, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }} className="skeleton-pulse" />
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export function AdminSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-secondary)', display: 'flex', overflow: 'hidden', zIndex: 999 }}>
      {/* Sidebar Skeleton */}
      <div style={{ width: 280, height: '100%', borderRight: '1px solid rgba(255,255,255,0.03)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px' }}>
          <div className="skeleton-pulse" style={{ width: 100, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 32 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-pulse" style={{ width: '100%', height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        </div>
      </div>
      {/* Main Area Skeleton */}
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <div style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div className="skeleton-pulse" style={{ width: 150, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
        </div>
        <div style={{ flex: 1, padding: 32, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: 120, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }} />
            ))}
          </div>
          <div className="skeleton-pulse" style={{ width: '100%', height: 200, borderRadius: 12, background: 'rgba(255,255,255,0.01)' }} />
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
