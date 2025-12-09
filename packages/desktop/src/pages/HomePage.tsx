import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          textAlign: 'center',
          background: 'white',
          padding: '60px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ margin: '0 0 20px 0', fontSize: '36px', color: '#333' }}>Book Writer</h1>
        <p style={{ margin: '0 0 40px 0', fontSize: '18px', color: '#666', lineHeight: '1.6' }}>
          Welcome to Book Writer Desktop - your native book reading and writing platform.
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/viewer')}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Open Book Viewer
          </button>

          <button
            onClick={() => navigate('/editor')}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Book Editor
          </button>
        </div>

        <p style={{ marginTop: '30px', fontSize: '14px', color: '#999' }}>
          The viewer allows you to read .bk files with a beautiful reading experience.
        </p>
      </div>
    </div>
  )
}

export default HomePage
