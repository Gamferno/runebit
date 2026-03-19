import { createContext, useContext, useState, useEffect } from 'react'

const API = 'http://localhost:3001/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('cq-token') || null)
  const [loading, setLoading] = useState(true)

  // Restore session
  useEffect(() => {
    if (token) {
      fetchMe(token)
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchMe(t) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  async function register(email, password, name) {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cq-token', data.token)
    return data.user
  }

  async function login(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cq-token', data.token)
    return data.user
  }

  async function googleLogin(googleData) {
    const res = await fetch(`${API}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googleData),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Google login failed')
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('cq-token', data.token)
    return data.user
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('cq-token')
    localStorage.removeItem('runebit-save')
  }

  // Authenticated API helper
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'API error')
    return data
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      register, login, googleLogin, logout,
      apiFetch, setUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
