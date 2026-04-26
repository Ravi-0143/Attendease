import { useState, useEffect } from 'react'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function ServiceStatus() {
  const [issues, setIssues] = useState([])
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          const problems = Object.values(data.services).filter(s => !s.configured || s.connected === false)
          setIssues(problems)
        }
      })
      .catch(() => {}) // silently ignore if health check itself fails
  }, [])

  if (dismissed || issues.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      width: 360,
      background: '#1e1a16',
      border: '1px solid #f59e0b',
      borderRadius: '0.75rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: '#78350f',
        cursor: 'pointer'
      }} onClick={() => setExpanded(e => !e)}>
        <AlertTriangle size={16} color="#fbbf24" />
        <span style={{ color: '#fde68a', fontWeight: 700, fontSize: 14, flex: 1 }}>
          {issues.length} service{issues.length > 1 ? 's' : ''} not configured
        </span>
        {expanded ? <ChevronDown size={16} color="#fbbf24" /> : <ChevronUp size={16} color="#fbbf24" />}
        <X
          size={16}
          color="#fbbf24"
          style={{ cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); setDismissed(true) }}
        />
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0.75rem 1rem' }}>
          {issues.map((service, i) => (
            <div key={i} style={{
              marginBottom: i < issues.length - 1 ? '0.75rem' : 0,
              paddingBottom: i < issues.length - 1 ? '0.75rem' : 0,
              borderBottom: i < issues.length - 1 ? '1px solid #292524' : 'none'
            }}>
              <p style={{ color: '#fde68a', fontWeight: 600, fontSize: 13, margin: '0 0 0.2rem' }}>
                ⚠️ {service.label}
              </p>
              <p style={{ color: '#a8a29e', fontSize: 12, margin: 0 }}>
                {service.connected === false && service.configured
                  ? 'Credentials set but connection failed. Check your URI / password.'
                  : `Missing env var: ${service.envVar}`
                }
              </p>
            </div>
          ))}
          <p style={{ color: '#57534e', fontSize: 11, marginTop: '0.75rem', marginBottom: 0 }}>
            Go to Render → Environment to add these variables.
          </p>
        </div>
      )}
    </div>
  )
}
