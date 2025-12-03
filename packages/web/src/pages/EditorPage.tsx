import { useState } from 'react'
import { useParams } from 'react-router-dom'

function EditorPage() {
  const { bookId } = useParams()
  const [content, setContent] = useState('')

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h2>{bookId ? `Editing Book ${bookId}` : 'New Book'}</h2>
      </header>
      <div className="editor-workspace">
        <textarea
          className="editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your story..."
        />
      </div>
    </div>
  )
}

export default EditorPage
