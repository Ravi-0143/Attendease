import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, X } from 'lucide-react'

export default function SheetModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleSheetInaccessible = () => {
      setIsOpen(true)
    }

    window.addEventListener('sheetInaccessible', handleSheetInaccessible)
    return () => window.removeEventListener('sheetInaccessible', handleSheetInaccessible)
  }, [])

  const handleCreateNew = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/sheets/force-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setIsOpen(false)
        // Refresh the page so the failed actions can be retried 
        // and the UI reflects the new state properly
        window.location.reload()
      } else {
        setError(data.error || 'Failed to create a new sheet.')
      }
    } catch (err) {
      setError(err.message || 'Network error while creating sheet.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{ 
        maxWidth: '450px', 
        width: '90%',
        padding: '2rem', 
        backgroundColor: 'var(--color-bg)',
        boxShadow: 'var(--shadow-xl)',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--color-danger)' }}>
          <AlertTriangle size={28} />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Google Sheet Inaccessible</h2>
        </div>
        
        <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          The Google Sheet previously used for attendance is no longer accessible. It may have been deleted, moved, or its permissions changed.
        </p>
        
        <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
          <strong>Warning:</strong> Creating a new sheet will start fresh. Historical data from the previous sheet will not be visible here unless you manually merge it.
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-ghost" 
            onClick={handleDismiss}
            disabled={isCreating}
          >
            <X size={16} /> Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCreateNew}
            disabled={isCreating}
          >
            {isCreating ? (
              <>Creating...</>
            ) : (
              <><Plus size={16} /> Create New Sheet</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
