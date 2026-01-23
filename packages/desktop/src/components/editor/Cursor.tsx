import { useState, useEffect } from 'react'
import { CURSOR_CONFIG } from '@/lib/editor/constants'

export function Cursor() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v)
    }, CURSOR_CONFIG.blinkRate)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      className="editor-cursor"
      style={{
        display: 'inline-block',
        width: `${CURSOR_CONFIG.width}px`,
        height: '1.2em',
        backgroundColor: visible ? '#000' : 'transparent',
        marginLeft: '-1px',
        marginRight: '-1px',
        verticalAlign: 'text-bottom',
        pointerEvents: 'none',
      }}
    />
  )
}
