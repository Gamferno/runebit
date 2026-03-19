import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../contexts/GameContext'
import HUD from '../components/HUD'
import './WorldMap.css'

// Tier themes — each tier gets its own background image + styled header
const TIER_THEMES = [
  null, // index 0 unused
  {
    label: 'Crystal Caverns',
    bg: '#0a1a2e', accent: '#1a4a7a', bgImage: '/assets/tier1_bg.png',
    nameColor: '#7ec8ff', nameGlow: 'rgba(126,200,255,0.6)',
    symbol: '❄', deco: ['✦', '◆', '❄', '◆', '✦'],
    wallColor: '#1a4a7a', wallGlow: 'rgba(30,100,200,0.8)',
  },
  {
    label: 'The Runic Archives',
    bg: '#1a0e2e', accent: '#4a1a6e', bgImage: '/assets/tier2_bg.png',
    nameColor: '#c77dff', nameGlow: 'rgba(179,71,217,0.7)',
    symbol: '᛭', deco: ['᛭', '✧', '᛭', '✧', '᛭'],
    wallColor: '#6a1a9e', wallGlow: 'rgba(130,30,210,0.8)',
  },
  {
    label: "The Dragon's Hoard",
    bg: '#1a0800', accent: '#5a1a00', bgImage: '/assets/tier3_bg.png',
    nameColor: '#ff8c42', nameGlow: 'rgba(255,100,0,0.7)',
    symbol: '🐉', deco: ['🔥', '⚔', '🐉', '⚔', '🔥'],
    wallColor: '#8a3000', wallGlow: 'rgba(200,80,0,0.8)',
  },
  {
    label: 'The Sky Fortress',
    bg: '#001a1a', accent: '#005a5a', bgImage: '/assets/tier4_bg.png',
    nameColor: '#00e5ff', nameGlow: 'rgba(0,229,255,0.6)',
    symbol: '⛅', deco: ['☁', '⚡', '⛅', '⚡', '☁'],
    wallColor: '#006080', wallGlow: 'rgba(0,180,220,0.8)',
  },
  {
    label: 'The Shadow Network',
    bg: '#0d0d0d', accent: '#2a002a', bgImage: '/assets/tier5_bg.png',
    nameColor: '#b030b0', nameGlow: 'rgba(176,48,176,0.7)',
    symbol: '👁', deco: ['◈', '▲', '👁', '▲', '◈'],
    wallColor: '#500050', wallGlow: 'rgba(160,0,160,0.8)',
  },
  {
    label: 'The Chrono Spire',
    bg: '#00001a', accent: '#00004a', bgImage: '/assets/tier6_bg.png',
    nameColor: '#a0a0ff', nameGlow: 'rgba(100,100,255,0.7)',
    symbol: '⏳', deco: ['⧖', '◇', '⏳', '◇', '⧖'],
    wallColor: '#1a1a6a', wallGlow: 'rgba(80,80,220,0.8)',
  },
  {
    label: 'The Void Sovereign',
    bg: '#050005', accent: '#1a001a', bgImage: '/assets/tier7_bg.png',
    nameColor: '#ff2060', nameGlow: 'rgba(255,32,96,0.8)',
    symbol: '☠', deco: ['★', '✖', '☠', '✖', '★'],
    wallColor: '#600020', wallGlow: 'rgba(200,0,60,0.8)',
  },
]

// How many nodes worth of width each tier "section" starts at (px, approx)
const NODE_SPACING = 230 // matches margin-right: 130px + node width ~100px

export default function WorldMap() {
  const navigate = useNavigate()
  const { skillTree, fetchTree, fetchStats, loading, assets } = useGame()
  const mapRef = useRef(null)
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [viewTier, setViewTier] = useState(1) // tier currently visible in viewport

  useEffect(() => {
    fetchTree()
    fetchStats()
  }, [])

  // Redirect vertical wheel scroll → horizontal scroll
  useEffect(() => {
    const viewport = mapRef.current
    if (!viewport) return
    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        viewport.scrollLeft += e.deltaY * 2.5
      }
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [loading])

  // Flatten the skill tree
  const pathNodes = useMemo(() => {
    if (!skillTree) return { nodes: [], currentTier: 1, tierStartIndexes: {} }
    const sortedTopics = [...skillTree].sort((a, b) => a.tier - b.tier || a.id - b.id)

    const nodes = []
    const tierStartIndexes = {} // tierNum → flat node index where that tier starts
    let previousCompleted = true
    let heroAssigned = false
    let currentTier = 1

    sortedTopics.forEach((topic) => {
      const sortedProbs = [...topic.problems].sort((a, b) => {
        const val = { easy: 1, medium: 2, boss: 3 }
        return val[a.difficulty] - val[b.difficulty]
      })

      sortedProbs.forEach((p) => {
        const isUnlocked = previousCompleted || p.completed

        let isCurrent = false
        if (!p.completed && isUnlocked && !heroAssigned) {
          isCurrent = true
          heroAssigned = true
          currentTier = topic.tier
        }

        if (tierStartIndexes[topic.tier] === undefined) {
          tierStartIndexes[topic.tier] = nodes.length
        }

        nodes.push({
          ...p,
          topicName: topic.name,
          rpgName: topic.rpgName,
          tier: topic.tier,
          isUnlocked,
          isCurrent,
        })

        if (!p.completed) previousCompleted = false
      })
    })

    if (!heroAssigned && nodes.length > 0) {
      nodes[nodes.length - 1].isCurrent = true
      currentTier = nodes[nodes.length - 1].tier
    }

    return { nodes, currentTier, tierStartIndexes }
  }, [skillTree])

  // Update viewTier as user scrolls
  useEffect(() => {
    const viewport = mapRef.current
    if (!viewport || !pathNodes.nodes.length) return

    const { tierStartIndexes } = pathNodes

    const onScroll = () => {
      const scrollX = viewport.scrollLeft
      const tierEntries = Object.entries(tierStartIndexes)
        .map(([t, idx]) => ({ tier: Number(t), scrollStart: idx * NODE_SPACING }))
        .sort((a, b) => a.scrollStart - b.scrollStart)

      // Find the last tier whose scroll start is <= current scrollLeft (accounting for the 50vw padding)
      let active = tierEntries[0]?.tier || 1
      for (const { tier, scrollStart } of tierEntries) {
        if (scrollX >= scrollStart) active = tier
        else break
      }
      setViewTier(active)
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [loading, pathNodes])

  // Auto-scroll to the Hero
  useEffect(() => {
    if (!loading && pathNodes.nodes.length > 0 && mapRef.current) {
      setTimeout(() => {
        const heroNode = document.querySelector('.worldmap__node--current')
        if (heroNode) {
          heroNode.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' })
        }
      }, 500)
    }
  }, [loading, pathNodes])

  const handleNodeClick = (node) => {
    if (!node.isUnlocked) return
    setSelectedQuest(node)
  }

  const startQuest = () => {
    if (selectedQuest) navigate(`/battle/${selectedQuest.id}`)
  }

  if (loading || !skillTree) {
    return (
      <div className="worldmap page-container">
        <HUD />
        <div className="worldmap__loading">
          <span className="worldmap__loading-text">🌀 Opening Portal...</span>
        </div>
      </div>
    )
  }

  const currentTheme = TIER_THEMES[viewTier] || TIER_THEMES[1]

  return (
    <div
      className="worldmap page-container"
      style={{
        backgroundColor: currentTheme.bg,
        backgroundImage: currentTheme.bgImage ? `url(${currentTheme.bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* HUD Bar */}
      <HUD />

      {/* Dark overlay so nodes/text remain readable over background images */}
      <div className="worldmap__bg-overlay" />

      {/* Fixed header: Arcane Realms + dynamically changing tier name */}
      <div className="worldmap__header-overlay">
        <h2 className="worldmap__heading">✦ Runebit ✦</h2>

        {/* Tier name updates as user scrolls */}
        <div
          className="worldmap__tier-title"
          style={{
            color: currentTheme.nameColor,
            textShadow: `0 0 20px ${currentTheme.nameGlow}, 0 0 40px ${currentTheme.nameGlow}, 0 2px 4px #000`,
          }}
        >
          <span className="worldmap__tier-deco">{currentTheme.deco.join('  ')}</span>
          <span className="worldmap__tier-name-text">{currentTheme.label}</span>
          <span className="worldmap__tier-deco">{[...currentTheme.deco].reverse().join('  ')}</span>
        </div>

        <div className="worldmap__nav-actions">
          <button className="pixel-btn pixel-btn--blue" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="pixel-btn pixel-btn--gold" onClick={() => navigate('/')}>Home</button>
        </div>
      </div>

      {/* Side-Scrolling Viewport */}
      <div className="worldmap__viewport" ref={mapRef}>
        <div className="worldmap__path-container">

          {pathNodes.nodes.map((node, index) => {
            const yOffset = Math.sin(index * 0.6) * 80
            const isLast = index === pathNodes.nodes.length - 1
            const nodeTheme = TIER_THEMES[node.tier] || TIER_THEMES[1]

            const prevNode = index > 0 ? pathNodes.nodes[index - 1] : null
            const isTierStart = prevNode === null || prevNode.tier !== node.tier

            return (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>

                {/* Full-height Divider Wall between tiers */}
                {isTierStart && index > 0 && (
                  <div
                    className="worldmap__divider-wall"
                    style={{
                      '--wall-color': nodeTheme.wallColor,
                      '--wall-glow': nodeTheme.wallGlow,
                      '--wall-name-color': nodeTheme.nameColor,
                    }}
                  >
                    {/* Left side glow pillar */}
                    <div className="worldmap__wall-pillar worldmap__wall-pillar--left" />

                    {/* Center gate panel */}
                    <div className="worldmap__wall-gate">
                      <div className="worldmap__wall-gate-top">
                        <span className="worldmap__wall-symbol">{nodeTheme.symbol}</span>
                      </div>
                      <div className="worldmap__wall-gate-label">
                        <span className="worldmap__wall-tier-num">TIER {node.tier}</span>
                        <span className="worldmap__wall-tier-name" style={{ color: nodeTheme.nameColor }}>
                          {nodeTheme.label}
                        </span>
                      </div>
                      <div className="worldmap__wall-gate-bottom">
                        <span className="worldmap__wall-symbol">{nodeTheme.symbol}</span>
                      </div>
                    </div>

                    {/* Right side glow pillar */}
                    <div className="worldmap__wall-pillar worldmap__wall-pillar--right" />
                  </div>
                )}

                <div
                  className="worldmap__node-wrapper"
                  style={{ transform: `translateY(${yOffset}px)` }}
                >
                  {/* SVG Connector */}
                  {!isLast && (
                    <svg className="worldmap__path-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path
                        d={`M 30 50 Q 80 50 130 ${(Math.sin((index + 1) * 0.6) * 80) - yOffset + 50}`}
                        className={`worldmap__path-line ${node.completed ? 'worldmap__path-line--glow' : ''}`}
                      />
                    </svg>
                  )}

                  {/* Difficulty badge */}
                  <div className={`worldmap__diff-badge worldmap__diff-badge--${node.difficulty}`}>
                    {node.difficulty === 'boss' ? 'BOSS' : node.difficulty === 'medium' ? 'MED' : 'EASY'}
                  </div>

                  {/* Platform Node */}
                  <button
                    id={`node-${node.id}`}
                    data-difficulty={node.difficulty}
                    className={[
                      'worldmap__node',
                      node.isUnlocked ? 'worldmap__node--unlocked' : 'worldmap__node--locked',
                      node.completed ? 'worldmap__node--done' : '',
                      node.isCurrent ? 'worldmap__node--current' : '',
                      node.difficulty === 'boss' ? 'worldmap__node--boss' : '',
                    ].join(' ')}
                    onClick={() => handleNodeClick(node)}
                    disabled={!node.isUnlocked}
                  >
                    {node.completed && <span className="worldmap__node-check">✓</span>}
                  </button>

                  {/* Hero marker */}
                  {node.isCurrent && (
                    <div className="m-4 worldmap__hero-marker">
                      <img src={assets.player} alt="Hero" />
                    </div>
                  )}

                  {/* Label */}
                  <div className="worldmap__node-label">
                    <span className="worldmap__node-title">{node.title}</span>
                    {node.completed && (
                      <span className="worldmap__node-stars">{'★'.repeat(node.stars || 0)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quest Modal */}
      {selectedQuest && (
        <div className="worldmap__modal-overlay" onClick={() => setSelectedQuest(null)}>
          <div className="worldmap__modal" onClick={e => e.stopPropagation()}>
            <div className="worldmap__modal-header">
              <h3>⚔️ Start Quest?</h3>
              <button className="worldmap__modal-close" onClick={() => setSelectedQuest(null)}>✖</button>
            </div>
            <div className="worldmap__modal-body">
              <div className="worldmap__modal-icon">
                {selectedQuest.difficulty === 'boss' ? '🏰' : selectedQuest.difficulty === 'medium' ? '⚔️' : '📜'}
              </div>
              <h2 className="worldmap__modal-title">{selectedQuest.title}</h2>
              <p className="worldmap__modal-rpg">{selectedQuest.rpgName}</p>
              <div className="worldmap__modal-stats">
                <span className="worldmap__modal-diff" data-diff={selectedQuest.difficulty}>
                  {selectedQuest.difficulty.toUpperCase()}
                </span>
                <span className="worldmap__modal-xp">Yields {selectedQuest.xpReward} XP</span>
              </div>
              <div className="worldmap__modal-enemy">
                <img src={
                  assets.villainsByDifficulty[selectedQuest.difficulty]
                  || assets.villains[selectedQuest.tier]
                  || assets.villains[1]
                } alt="Enemy" />
                <span>Enemy: {selectedQuest.enemyName}</span>
              </div>
            </div>
            <div className="worldmap__modal-actions">
              <button className="pixel-btn pixel-btn--red" onClick={() => setSelectedQuest(null)}>
                🏃 Retreat
              </button>
              <button className="pixel-btn pixel-btn--green" onClick={startQuest}>
                ⚔️ Start Quest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
