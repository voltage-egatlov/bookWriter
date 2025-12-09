import { Book } from '@/lib/types';

interface SidebarProps {
  book: Book;
  isOpen: boolean;
  onToggle: () => void;
  currentChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
}

export function Sidebar({
  book,
  isOpen,
  onToggle,
  currentChapterId,
  onChapterSelect,
}: SidebarProps) {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: '20px',
          left: isOpen ? '320px' : '20px',
          zIndex: 1000,
          padding: '10px 15px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'left 0.3s ease',
        }}
      >
        {isOpen ? '←' : '☰'}
      </button>

      {/* Sidebar Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-300px',
          width: '300px',
          height: '100vh',
          background: '#f5f5f5',
          borderRight: '1px solid #ddd',
          padding: '20px',
          overflowY: 'auto',
          transition: 'left 0.3s ease',
          zIndex: 999,
        }}
      >
        {/* Book Metadata */}
        <div style={{ marginBottom: '30px', paddingTop: '40px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{book.title}</h2>
          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
            by {book.author}
          </p>
          {book.dedication && (
            <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', fontSize: '12px', color: '#888' }}>
              {book.dedication}
            </p>
          )}
        </div>

        {/* Chapters List */}
        <div>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>Chapters</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {book.chapters.map((chapter) => (
              <li key={chapter.id} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => onChapterSelect(chapter.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px',
                    background: chapter.id === currentChapterId ? '#007bff' : 'white',
                    color: chapter.id === currentChapterId ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {chapter.title}
                  <span style={{ marginLeft: '10px', opacity: 0.7, fontSize: '12px' }}>
                    ({chapter.blocks.length} pages)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
