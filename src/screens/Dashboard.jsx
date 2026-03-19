import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import HUD from '../components/HUD'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats, fetchStats } = useGame()

  useEffect(() => { fetchStats() }, [])

  if (!stats) return <div className="dashboard page-container"><HUD /><div className="dashboard__loading">⏳ Loading stats...</div></div>

  const { totalSolved, totalStars, topicSkills, tierProgress, highestTier } = stats

  return (
    <div className="dashboard page-container">
      <HUD />

      <div className="dashboard__content">
        {/* Back to Map button */}
        <div className="dashboard__back-row">
          <button className="pixel-btn pixel-btn--outline dashboard__back-btn" onClick={() => navigate('/map')}>
            ❮ Back to Map
          </button>
        </div>
        {/* Profile card */}
        <div className="dashboard__profile pixel-panel">
          <div className="dashboard__avatar-circle">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="dashboard__profile-info">
            <h2 className="dashboard__name">{user?.name || 'Hero'}</h2>
            <p className="dashboard__title-text">{stats.user.title}</p>
            <p className="dashboard__level">Level {stats.user.level}</p>
          </div>
          <div className="dashboard__quick-stats">
            <div className="dashboard__qstat"><span className="dashboard__qstat-val">{totalSolved}</span><span className="dashboard__qstat-label">Solved</span></div>
            <div className="dashboard__qstat"><span className="dashboard__qstat-val">{totalStars}</span><span className="dashboard__qstat-label">Stars</span></div>
            <div className="dashboard__qstat"><span className="dashboard__qstat-val">{stats.user.streak}</span><span className="dashboard__qstat-label">Streak 🔥</span></div>
          </div>
        </div>

        <div className="dashboard__grid">
          {/* XP bar */}
          <div className="dashboard__xp-card pixel-panel">
            <span className="dashboard__section-title">⭐ XP to Next Level</span>
            <div className="stat-bar stat-bar--lg">
              <div className="stat-bar__fill stat-bar__fill--xp" style={{ width: `${(stats.user.xp / stats.user.xpToNext) * 100}%` }} />
              <span className="stat-bar__label">{stats.user.xp} / {stats.user.xpToNext} XP</span>
            </div>
          </div>

          {/* Tier progress */}
          <div className="dashboard__tiers pixel-panel">
            <span className="dashboard__section-title">🗺 Realm Progress</span>
            {Object.entries(tierProgress).map(([tier, data]) => (
              <div key={tier} className="dashboard__tier-row">
                <span className="dashboard__tier-label">Tier {tier}</span>
                <div className="stat-bar stat-bar--sm">
                  <div className="stat-bar__fill stat-bar__fill--purple" style={{ width: `${data.total ? (data.completed / data.total) * 100 : 0}%` }} />
                </div>
                <span className="dashboard__tier-count">{data.completed}/{data.total}</span>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="dashboard__skills pixel-panel">
            <span className="dashboard__section-title">⚔ Topic Skills</span>
            {Object.entries(topicSkills).length === 0
              ? <p className="dashboard__empty">No skills unlocked yet. Start solving!</p>
              : Object.entries(topicSkills).map(([slug, count]) => (
                  <div key={slug} className="dashboard__skill-row">
                    <span className="dashboard__skill-name">{slug.replace(/-/g, ' ')}</span>
                    <span className="dashboard__skill-count">{count} solved</span>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Achievements */}
        <div className="dashboard__achievements pixel-panel">
          <span className="dashboard__section-title">🏆 Achievements</span>
          <div className="dashboard__badges-grid">
            {(() => {
              const BADGES = [
                { id: 'first-blood',  icon: '🗡️', name: 'First Blood',       desc: 'Solve your first problem',     check: totalSolved >= 1 },
                { id: 'apprentice',   icon: '📜', name: 'Apprentice',        desc: 'Solve 5 problems',             check: totalSolved >= 5 },
                { id: 'warrior',      icon: '⚔️', name: 'Code Warrior',      desc: 'Solve 15 problems',            check: totalSolved >= 15 },
                { id: 'champion',     icon: '🛡️', name: 'Champion',          desc: 'Solve 30 problems',            check: totalSolved >= 30 },
                { id: 'legend',       icon: '👑', name: 'Legendary',         desc: 'Solve 50 problems',            check: totalSolved >= 50 },
                { id: 'all-clear',    icon: '🌟', name: 'All Clear',         desc: 'Solve all 85 problems',        check: totalSolved >= 85 },
                { id: 'perfectionist',icon: '⭐', name: 'Perfectionist',    desc: 'Earn 10 three-star ratings',   check: totalStars >= 30 },
                { id: 'star-hunter',  icon: '✨', name: 'Star Hunter',       desc: 'Earn 100+ total stars',        check: totalStars >= 100 },
                { id: 'streak-3',     icon: '🔥', name: 'On Fire',           desc: '3-day streak',                 check: (stats.user.streak || 0) >= 3 },
                { id: 'streak-7',     icon: '💥', name: 'Unstoppable',       desc: '7-day streak',                 check: (stats.user.streak || 0) >= 7 },
                { id: 'tier-boss',    icon: '🐉', name: 'Dragon Slayer',     desc: 'Reach Tier 7',                 check: highestTier >= 7 },
                { id: 'leveled',      icon: '🎮', name: 'Level 10',          desc: 'Reach Level 10',               check: stats.user.level >= 10 },
              ]
              return BADGES.map(b => (
                <div key={b.id} className={`dashboard__badge ${b.check ? 'dashboard__badge--unlocked' : ''}`}>
                  <span className="dashboard__badge-icon">{b.icon}</span>
                  <span className="dashboard__badge-name">{b.name}</span>
                  <span className="dashboard__badge-desc">{b.desc}</span>
                  {b.check
                    ? <span className="dashboard__badge-status">✅ Unlocked</span>
                    : <span className="dashboard__badge-status dashboard__badge-status--locked">🔒 Locked</span>
                  }
                </div>
              ))
            })()}
          </div>
        </div>

        <div className="dashboard__actions">
          <button className="pixel-btn pixel-btn--gold" onClick={() => navigate('/map')}>Continue Quest</button>
          <button className="pixel-btn pixel-btn--blue" onClick={() => navigate('/')}>Home</button>
        </div>
      </div>
    </div>
  )
}
