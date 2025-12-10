import { useState, useEffect, useRef } from 'react'

interface EditorOverlayProps {
  initialContent: string
  onSave: (newContent: string) => void
  onCancel: () => void
  title?: string
}

export function EditorOverlay({ initialContent, onSave, onCancel, title }: EditorOverlayProps) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [])

  // Handle escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
      // Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(content)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            {title || 'Edit Block'}
          </h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0 8px',
            }}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '300px',
              padding: '12px',
              fontSize: '16px',
              lineHeight: '1.6',
              border: '1px solid #ddd',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'monospace',
            }}
            placeholder="Enter block content..."
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666' }}>
            <kbd style={{ padding: '2px 6px', background: '#f5f5f5', borderRadius: '3px' }}>
              Esc
            </kbd>{' '}
            to cancel •{' '}
            <kbd style={{ padding: '2px 6px', background: '#f5f5f5', borderRadius: '3px' }}>
              Ctrl+Enter
            </kbd>{' '}
            to save
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onCancel}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                background: 'white',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                background: isSaving ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
