import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ViewerPage from './pages/ViewerPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </Router>
  )
}

export default App
