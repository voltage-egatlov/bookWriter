import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Book } from '@/lib/types';

interface FileDialogProps {
  onBookLoaded: (book: Book) => void;
}

export function FileDialog({ onBookLoaded }: FileDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenFile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Open file dialog
      const filePath = await invoke<string | null>('open_file_dialog');

      if (!filePath) {
        // User cancelled
        setIsLoading(false);
        return;
      }

      // Load and parse the .bk file
      const book = await invoke<Book>('load_bk_file', { path: filePath });

      onBookLoaded(book);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        background: '#fafafa',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: '0 0 20px 0', fontSize: '28px', color: '#333' }}>
          Book Viewer
        </h1>
        <p style={{ margin: '0 0 30px 0', color: '#666', fontSize: '16px' }}>
          Open a .bk file to start reading
        </p>

        <button
          onClick={handleOpenFile}
          disabled={isLoading}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            background: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {isLoading ? 'Loading...' : 'Open Book File'}
        </button>

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              color: '#856404',
              fontSize: '14px',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong>Error:</strong>
            <br />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
