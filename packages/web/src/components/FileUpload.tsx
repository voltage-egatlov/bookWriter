import { useState } from 'react';
import { parseBk } from '@/lib/wasm';
import { Book } from '@/lib/types';

interface FileUploadProps {
  onBookParsed: (book: Book) => void;
}

export function FileUpload({ onBookParsed }: FileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const content = await file.text();

      // Parse using WASM
      const book = await parseBk(content);

      // Pass parsed book to parent
      onBookParsed(book);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      console.error('Parse error:', err);
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
        padding: '40px',
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
        <h1 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>Book Viewer</h1>
        <p style={{ margin: '0 0 30px 0', color: '#666' }}>
          Upload a .bk file to start reading
        </p>

        <label
          htmlFor="file-upload"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Loading...' : 'Choose File'}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".bk"
          onChange={handleFileSelect}
          disabled={isLoading}
          style={{ display: 'none' }}
        />

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              background: '#ffebee',
              border: '1px solid #ef5350',
              borderRadius: '4px',
              color: '#c62828',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
            }}
          >
            <strong>Error:</strong>
            <br />
            {error}
          </div>
        )}

        <div style={{ marginTop: '30px', fontSize: '12px', color: '#999' }}>
          <p>Supported format: .bk files</p>
          <p>Example:</p>
          <pre
            style={{
              textAlign: 'left',
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            {`@title: My Book
@author: Author Name

#chapter: Chapter One
@page:
Content here...`}
          </pre>
        </div>
      </div>
    </div>
  );
}
