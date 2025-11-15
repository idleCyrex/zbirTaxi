import './assets/style.css'
import { useState } from 'react'
import Quiz from './components/Quiz.jsx'
import questions from './data/questions.js'
import AdminDashboard from './components/AdminDashboard.jsx'

function App() {
  const [adminMode, setAdminMode] = useState(false)
  return (
    <div className="app-root">
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000 }}>
        <button className="btn" onClick={() => setAdminMode((s) => !s)}>{adminMode ? 'Back to Quiz' : 'Open Admin'}</button>
      </div>
      {adminMode ? <AdminDashboard /> : <Quiz questions={questions} />}
    </div>
  )
}

export default App
