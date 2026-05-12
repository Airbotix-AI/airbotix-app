import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Setup from './pages/Setup'
import KidPicker from './pages/KidPicker'
import KidHome from './pages/KidHome'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/picker" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/setup"
            element={<ProtectedRoute><Setup /></ProtectedRoute>}
          />
          <Route
            path="/picker"
            element={<ProtectedRoute><KidPicker /></ProtectedRoute>}
          />
          <Route
            path="/kid/:kidId/home"
            element={<ProtectedRoute><KidHome /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/picker" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
