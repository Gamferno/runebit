import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LandingPage.css'

const FEATURES = [
  { icon: '🗺️', title: 'Explore Realms', desc: '17 magical realms with 85+ challenges across all DSA topics' },
  { icon: '⚔️', title: 'Battle Enemies', desc: 'Fight 7 tiers of enemies by writing real code that passes tests' },
  { icon: '📈', title: 'Level Up', desc: 'Earn XP, unlock skills, and climb through the Runebit realms' },
  { icon: '🏆', title: 'Prove Mastery', desc: 'Earn 3-star mastery and collect achievement badges' },
]


export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="landing page-container">
      {/* Particles */}
      <div className="landing__particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="landing__particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 8}s`,
          }} />
        ))}
      </div>

      <div className="landing__content">
        {/* Hero */}
        <div className="landing__hero">
          <h1 className="landing__title">
            <span className="landing__title-code">RUNE</span>{' '}
            <span className="landing__title-quest">BIT</span>
          </h1>
          <p className="landing__tagline">A Coding RPG Adventure</p>
          <p className="landing__desc">Battle bugs. Solve algorithms. Level up your skills.</p>

          <div className="landing__cta">
            {isAuthenticated ? (
              <>
                <button className="pixel-btn pixel-btn--gold landing__cta-btn" onClick={() => navigate('/map')}>
                  Continue Quest
                </button>
                <button className="pixel-btn pixel-btn--blue landing__cta-btn" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              </>
            ) : (
              <>
                <button className="pixel-btn pixel-btn--gold landing__cta-btn" onClick={() => navigate('/login')}>
                  Start Your Quest
                </button>
                <button className="pixel-btn pixel-btn--outline landing__cta-btn" onClick={() => navigate('/login')}>
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="landing__features">
          {FEATURES.map(f => (
            <div key={f.title} className="landing__feature pixel-panel">
              <span className="landing__feature-icon">{f.icon}</span>
              <h3 className="landing__feature-title">{f.title}</h3>
              <p className="landing__feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Skill tree preview */}
        <div className="landing__tree-preview pixel-panel">
          <h2 className="landing__section-title">7 Tiers of Challenge</h2>
          <div className="landing__tiers">
            {['I · Foundation', 'II · Fundamentals', 'III · Core', 'IV · Trees', 'V · Patterns', 'VI · Complex', 'VII · Final'].map((t, i) => (
              <div key={i} className="landing__tier-item">
                <span className="landing__tier-num">{i + 1}</span>
                <span className="landing__tier-name">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
