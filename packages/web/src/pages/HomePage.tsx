import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <h1>Book Writer</h1>
      <p>Welcome to your book-writing platform</p>
      <button onClick={() => navigate('/editor')}>
        Start Writing
      </button>
    </div>
  )
}

export default HomePage
