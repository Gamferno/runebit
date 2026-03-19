import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import './HUD.css'

export default function HUD() {
  const { user, logout } = useAuth()
  const { stats } = useGame()
  const navigate = useNavigate()
  const location = useLocation()

  const playerData = stats?.user || user || {}
  const xpPercent = playerData.xpToNext ? (playerData.xp / playerData.xpToNext) * 100 : 0
  const isOnMap = location.pathname === '/map'
  const isOnBattle = location.pathname.startsWith('/battle')

  return (
    <div className="hud">
      {/* Left — context-sensitive back button or home icon */}
      <div className="hud__left">
        {isOnBattle ? (
          <button className="hud__back-btn" onClick={() => navigate('/map')} title="Back to Map">
            ❮ MAP
          </button>
        ) : isOnMap ? (
          <button className="hud__back-btn" onClick={() => navigate('/')} title="Home">
            ❮ HOME
          </button>
        ) : (
          <button className="hud__back-btn hud__back-btn--invisible" aria-hidden>
            &nbsp;
          </button>
        )}
      </div>

      {/* Center — XP bar */}
      <div className="hud__stats">
        <div className="hud__stat">
          <span className="hud__stat-label">⭐ XP</span>
          <div className="stat-bar">
            <div className="stat-bar__fill stat-bar__fill--xp" style={{ width: `${xpPercent}%` }} />
            <span className="stat-bar__label">{playerData.xp || 0}/{playerData.xpToNext || 100}</span>
          </div>
        </div>
      </div>

      {/* Right — Level, Streak, Player Name, Logout */}
      <div className="hud__right">
        <span className="hud__level">Lv.{playerData.level || 1}</span>
        <div className="hud__streak">
          <div className="hud__streak-top">
            <span className="hud__streak-fire">🔥</span>
            <span className="hud__streak-count">{playerData.streak || 0}</span>
          </div>
          <span className="hud__streak-label">day streak</span>
        </div>
        <div className="hud__player">
          <div className="hud__info">
            <span className="hud__name">{playerData.name || 'Hero'}</span>
            <span className="hud__title">{playerData.title || 'Newbie Coder'}</span>
          </div>
          <button className="hud__avatar-circle" onClick={() => navigate('/dashboard')} title="Go to Dashboard">
            {playerData.name?.[0]?.toUpperCase() || '?'}
          </button>
        </div>
        <button className="hud__logout" onClick={logout} title="Logout">⏏</button>
      </div>
    </div>
  )
}
