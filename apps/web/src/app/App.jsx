import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getSession } from '@features/auth/authService.js'
import LoginPage from '@features/auth/LoginPage.jsx'

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getSession().then(session => {
      setAuthed(!!session)
      setChecking(false)
      if (!session) navigate('/')
    })
  }, [])

  if (checking) return null
  return authed ? children : null
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={
        <ProtectedRoute>
          <div style={{ padding: '2rem' }}>
            <h1>Dashboard coming soon</h1>
          </div>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
