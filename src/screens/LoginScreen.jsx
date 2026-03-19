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
      client_id: '841638036444-to2sas1o1d8ar49kn4tcg6i06mo46k7p.apps.googleusercontent.com',
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
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
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
