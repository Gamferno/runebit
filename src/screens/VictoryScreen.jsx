import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGame } from '../contexts/GameContext'
import './VictoryScreen.css'

export default function VictoryScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { stars = 0, xp = 0, problem = {} } = state || {}
  const { fetchStats } = useGame()

  // Refresh stats immediately so HUD shows updated streak/XP/level on next screen
  useEffect(() => {
    fetchStats()
  }, [])


  const starLabels = ['', 'Good Effort', 'Well Done', 'OPTIMAL!']

  return (
    <div className="victory page-container">
      {/* Sparkle particles */}
      <div className="victory__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="victory__sparkle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
          }} />
        ))}
      </div>

      <div className="victory__card pixel-panel">
        <h1 className="victory__heading">✨ Victory! ✨</h1>
        <p className="victory__enemy">You defeated {problem?.enemyName || 'the enemy'}!</p>

        <div className="victory__emblem">
          <img src="/assets/victory-emblem.png" alt="Victory" onError={e => { e.target.style.display = 'none' }} />
        </div>

        <div className="victory__stars">
          {[1, 2, 3].map(i => (
            <span key={i} className={`victory__star ${i <= stars ? 'victory__star--earned' : ''}`}>
              {i <= stars ? '★' : '☆'}
            </span>
          ))}
        </div>
        <p className="victory__star-label">{starLabels[stars]}</p>

        <div className="victory__rewards">
          <div className="victory__reward">
            <span className="victory__reward-icon">⚡</span>
            <span className="victory__reward-text">+{xp} XP</span>
          </div>
        </div>

        <div className="victory__actions">
          <button className="pixel-btn pixel-btn--gold" onClick={() => navigate('/map')}>🗺 Return to Realms</button>
          <button className="pixel-btn pixel-btn--blue" onClick={() => navigate('/dashboard')}>📊 Dashboard</button>
        </div>
      </div>
    </div>
  )
}
