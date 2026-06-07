import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LoginScreen.css'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { login, register, googleLogin } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, name || undefined)
      } else {
        await login(email, password)
      }
      navigate('/map')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    if (!window.google) {
      setError('Google SDK not loaded yet. Please try again in a moment.')
      return
    }
    setError('')
    setLoading(true)

    // Use token client for a direct popup — no One Tap, no double-button
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setError('Google sign-in cancelled or failed.')
          setLoading(false)
          return
        }
        try {
          // Fetch user info using the access token
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          })
          const info = await res.json()
          await googleLogin({
            googleId: info.sub,
            email: info.email,
            name: info.name,
            avatarUrl: info.picture,
          })
          navigate('/map')
        } catch (err) {
          setError(err.message || 'Google sign-in failed')
        } finally {
          setLoading(false)
        }
      },
    })
    tokenClient.requestAccessToken({ prompt: 'select_account' })
  }

  return (
    <div className="login page-container">
      {/* Magical particles */}
      <div className="login__particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="login__particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
          }} />
        ))}
      </div>

      <div className="login__card pixel-panel">
        <div className="login__header">
          <h1 className="login__title">
            <span className="login__title-code">RUNE</span>
            <span className="login__title-quest">BIT</span>
          </h1>
          <p className="login__subtitle">The Runebit Realms Await</p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="login__field">
              <label className="login__label">Hero Name</label>
              <input
                className="login__input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your hero name"
              />
            </div>
          )}

          <div className="login__field">
            <label className="login__label">Email</label>
            <input
              className="login__input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hero@runebit.gg"
              required
            />
          </div>

          <div className="login__field">
            <label className="login__label">Password</label>
            <input
              className="login__input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={4}
            />
          </div>

          {error && <div className="login__error">⚠ {error}</div>}

          <button className="pixel-btn pixel-btn--gold login__submit" type="submit" disabled={loading}>
            {loading ? '⏳ ...' : isRegister ? '✨ Create Account' : '⚔️ Enter the Realms'}
          </button>
        </form>

        <div className="login__divider">
          <span>or</span>
        </div>

        <button className="login__google-btn" onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5[...]
          {loading ? '⏳ Signing in...' : 'Sign in with Google'}
        </button>

        <div className="login__toggle">
          <button className="login__toggle-btn" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? '← Already have an account? Sign in' : '✨ New hero? Create an account'}
          </button>
        </div>
      </div>
    </div>
  )
}
