import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { GameProvider } from './contexts/GameContext'
import LandingPage from './screens/LandingPage'
import LoginScreen from './screens/LoginScreen'
import WorldMap from './screens/WorldMap'
import BattleScreen from './screens/BattleScreen'
import VictoryScreen from './screens/VictoryScreen'
import Dashboard from './screens/Dashboard'
import './App.css'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><span style={{ color: 'var(--neon-gold)', fontSize: 14 }}>⏳ Loading...</span></div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/map" element={<ProtectedRoute><WorldMap /></ProtectedRoute>} />
      <Route path="/battle/:id" element={<ProtectedRoute><BattleScreen /></ProtectedRoute>} />
      <Route path="/victory" element={<ProtectedRoute><VictoryScreen /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <AppRoutes />
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
